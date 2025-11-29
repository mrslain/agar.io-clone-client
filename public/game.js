/**
 * Clan Wars - Multiplayer Arena Game Client
 * TypeScript-style JavaScript with WebGL/WebGPU rendering
 * Blob system with bones and quadratic curves from original CoffeeScript
 */
(function() {
    'use strict';

    // =====================
    // Configuration
    // =====================
    const CONFIG = {
        // Camera settings
        smoothing: 0.08,
        gridSize: 50,
        minZoom: 0.3,
        maxZoom: 1,
        zoomMassBase: 100,
        
        // Chat
        maxChatMessages: 50,
        
        // Blob physics (from original CoffeeScript)
        blobQuality: 32,
        blobFriction: 1.035,
        blobNodeSmoothing: 0.05,
        blobPositionSmoothing: 0.1,
        blobJointStrength: 0.6,
        blobSpeed: 5
    };

    // =====================
    // Vector Class (TypeScript-style)
    // =====================
    class Vector {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        add(v) { this.x += v.x; this.y += v.y; return this; }
        subtract(v) { this.x -= v.x; this.y -= v.y; return this; }
        multiply(v) { this.x *= v.x; this.y *= v.y; return this; }
        multiplyScalar(s) { this.x *= s; this.y *= s; return this; }
        divide(v) { this.x /= v.x; this.y /= v.y; return this; }
        divideScalar(s) { if (s !== 0) { this.x /= s; this.y /= s; } return this; }
        invert() { this.x *= -1; this.y *= -1; return this; }
        copy(v) { this.x = v.x; this.y = v.y; return this; }
        clone() { return new Vector(this.x, this.y); }
        magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
        normalize() { const m = this.magnitude(); if (m !== 0) { this.x /= m; this.y /= m; } return this; }
    }

    // =====================
    // Joint Class (from original CoffeeScript)
    // =====================
    class Joint {
        constructor(node, strength = CONFIG.blobJointStrength) {
            this.node = node;
            this.strength = new Vector(strength, strength);
            this.strain = new Vector();
        }
    }

    // =====================
    // Node Class (from original CoffeeScript)
    // =====================
    class Node {
        constructor(config = {}) {
            this.normal = config.normal || new Vector();
            this.target = config.target || new Vector();
            this.position = config.position || new Vector();
            this.ghost = config.ghost || new Vector();
            this.angle = config.angle || 0;
            this.joints = config.joints || [];
        }
    }

    // =====================
    // Blob Class (from original CoffeeScript with quadratic curves)
    // =====================
    class Blob {
        constructor(config) {
            this.id = config.id;
            this.name = config.name || '';
            this.color = config.color || { r: 255, g: 0, b: 0 };
            this.darkColor = config.darkColor || { r: 200, g: 0, b: 0 };
            
            this.position = config.position || new Vector();
            this.velocity = config.velocity || new Vector();
            this.radius = config.radius || 50;
            this.quality = config.quality || CONFIG.blobQuality;
            
            this.friction = config.friction || new Vector(CONFIG.blobFriction, CONFIG.blobFriction);
            this.nodes = [];
            
            // Server sync
            this.serverX = this.position.x;
            this.serverY = this.position.y;
            this.serverRadius = this.radius;
            
            this.createNodes();
        }

        // Get element by offset with circular wrapping (from original)
        elementByOffset(index, offset) {
            let newIndex = index + offset;
            if (newIndex > this.quality - 1) newIndex = newIndex - this.quality;
            if (newIndex < 0) newIndex = this.quality + newIndex;
            return this.nodes[newIndex];
        }

        createNodes() {
            this.nodes = [];
            for (let i = 0; i < this.quality; i++) {
                const node = new Node({
                    ghost: this.position.clone(),
                    position: this.position.clone()
                });
                this.nodes.push(node);
            }
            this.updateJoints();
            this.updateNormals();
        }

        updateJoints() {
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                node.joints = [];
                node.joints.push(new Joint(this.elementByOffset(i, -1)));
                node.joints.push(new Joint(this.elementByOffset(i, 1)));
                node.joints.push(new Joint(this.elementByOffset(i, -2)));
                node.joints.push(new Joint(this.elementByOffset(i, 2)));
            }
        }

        updateNormals() {
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                node.angle = (i / this.quality) * Math.PI * 2;
                node.target.copy(new Vector(
                    Math.cos(node.angle) * this.radius,
                    Math.sin(node.angle) * this.radius
                ));
                if (node.normal.x === 0 && node.normal.y === 0) {
                    node.normal.copy(node.target);
                }
            }
        }

        updateFromServer(x, y, radius) {
            this.serverX = x;
            this.serverY = y;
            this.serverRadius = radius;
        }

        update() {
            // Smooth interpolation to server position
            const dx = this.serverX - this.position.x;
            const dy = this.serverY - this.position.y;
            this.velocity.x += dx * 0.1;
            this.velocity.y += dy * 0.1;
            this.velocity.divide(this.friction);
            this.position.add(this.velocity);

            // Smooth radius interpolation
            this.radius += (this.serverRadius - this.radius) * 0.1;
            this.updateNormals();

            // Update node physics in world space
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                node.ghost.copy(node.position);

                // Smooth normal transition
                const normalDiff = node.target.clone().subtract(node.normal);
                normalDiff.multiply(new Vector(CONFIG.blobNodeSmoothing, CONFIG.blobNodeSmoothing));
                node.normal.add(normalDiff);

                // Calculate position in world space (no camera offset - canvas handles that)
                const position = this.position.clone();

                // Apply joint strain (spring physics)
                for (let j = 0; j < node.joints.length; j++) {
                    const joint = node.joints[j];
                    const normal = joint.node.normal.clone().subtract(node.normal);
                    const ghost = joint.node.ghost.clone().subtract(node.ghost);
                    joint.strain.copy(ghost.subtract(normal));
                    position.add(joint.strain.clone().multiply(joint.strength));
                }

                position.add(node.normal);

                // Smooth position update
                const positionDiff = position.clone().subtract(node.position);
                positionDiff.multiply(new Vector(CONFIG.blobPositionSmoothing, CONFIG.blobPositionSmoothing));
                node.position.add(positionDiff);
            }
        }

        // Draw using quadratic curves (from original CoffeeScript)
        draw(ctx) {
            ctx.save();
            ctx.beginPath();

            // Set colors
            if (typeof this.color === 'string') {
                ctx.fillStyle = this.color;
                ctx.strokeStyle = this.darkColor;
            } else {
                ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
                ctx.strokeStyle = `rgb(${Math.max(0, this.color.r - 30)}, ${Math.max(0, this.color.g - 30)}, ${Math.max(0, this.color.b - 30)})`;
            }
            ctx.lineWidth = Math.max(3, this.radius * 0.08);

            // Start point - midpoint between last and first node
            const firstNode = this.elementByOffset(0, -1);
            const secondNode = this.elementByOffset(0, 0);
            
            ctx.moveTo(
                firstNode.position.x + (secondNode.position.x - firstNode.position.x) / 2,
                firstNode.position.y + (secondNode.position.y - firstNode.position.y) / 2
            );

            // Draw quadratic curves through all nodes
            for (let i = 0; i < this.quality; i++) {
                const node = this.elementByOffset(i, 0);
                const next = this.elementByOffset(i, 1);

                ctx.quadraticCurveTo(
                    node.position.x,
                    node.position.y,
                    node.position.x + (next.position.x - node.position.x) / 2,
                    node.position.y + (next.position.y - node.position.y) / 2
                );
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Draw name
        drawName(ctx, name, mass) {
            const fontSize = Math.max(12, Math.min(24, this.radius * 0.4));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(name, this.position.x + 2, this.position.y + 2);

            // Text
            ctx.fillStyle = '#fff';
            ctx.fillText(name, this.position.x, this.position.y);

            // Mass
            ctx.font = `${fontSize * 0.6}px Arial`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(Math.round(mass), this.position.x, this.position.y + fontSize);
        }
    }

    // =====================
    // BlobSystem Class (from original CoffeeScript)
    // =====================
    class BlobSystem {
        constructor() {
            this.blobs = new Map(); // cellId -> Blob
        }

        createBlob(config) {
            const blob = new Blob(config);
            this.blobs.set(config.id, blob);
            return blob;
        }

        getBlob(id) {
            return this.blobs.get(id);
        }

        removeBlob(id) {
            this.blobs.delete(id);
        }

        updateFromServer(players, cameraLoc) {
            const activeCellIds = new Set();

            players.forEach(player => {
                if (!player.cells) return;

                player.cells.forEach(cell => {
                    activeCellIds.add(cell.id);

                    let blob = this.blobs.get(cell.id);
                    if (!blob) {
                        // Parse colors
                        let color = player.color;
                        let darkColor = player.darkColor;
                        
                        blob = this.createBlob({
                            id: cell.id,
                            name: player.name,
                            color: color,
                            darkColor: darkColor,
                            position: new Vector(cell.x, cell.y),
                            radius: cell.radius
                        });
                    }

                    blob.updateFromServer(cell.x, cell.y, cell.radius);
                    blob.playerName = player.name;
                    blob.totalMass = player.totalMass;
                    blob.playerId = player.id;
                    blob.color = player.color;
                    blob.darkColor = player.darkColor;
                });
            });

            // Remove blobs that no longer exist
            for (const [cellId] of this.blobs) {
                if (!activeCellIds.has(cellId)) {
                    this.blobs.delete(cellId);
                }
            }
        }

        update() {
            for (const blob of this.blobs.values()) {
                blob.update();
            }
        }

        draw(ctx) {
            // Sort by radius for proper layering
            const sortedBlobs = Array.from(this.blobs.values())
                .sort((a, b) => a.radius - b.radius);

            // Draw all blobs
            sortedBlobs.forEach(blob => {
                blob.draw(ctx);
            });

            // Draw names on top
            const drawnPlayers = new Set();
            sortedBlobs.forEach(blob => {
                if (drawnPlayers.has(blob.playerId)) return;
                drawnPlayers.add(blob.playerId);

                // Find largest blob for this player
                const playerBlobs = sortedBlobs.filter(b => b.playerId === blob.playerId);
                const largestBlob = playerBlobs.reduce((max, b) => 
                    b.radius > max.radius ? b : max, playerBlobs[0]);

                if (largestBlob && largestBlob.playerName) {
                    largestBlob.drawName(ctx, largestBlob.playerName, largestBlob.totalMass || 0);
                }
            });
        }

        clear() {
            this.blobs.clear();
        }
    }

    // =====================
    // WebGL Renderer (with Canvas2D fallback)
    // =====================
    class Renderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.gl = null;
            this.ctx = null;
            this.useWebGL = false;
            this.useWebGPU = false;
            
            this.init();
        }

        async init() {
            // Try WebGPU first
            if (navigator.gpu) {
                try {
                    const adapter = await navigator.gpu.requestAdapter();
                    if (adapter) {
                        this.gpuDevice = await adapter.requestDevice();
                        this.useWebGPU = true;
                        console.log('WebGPU initialized');
                        document.getElementById('renderer-info').textContent = 'Renderer: WebGPU';
                        this.initWebGPU();
                        return;
                    }
                } catch (e) {
                    console.log('WebGPU not available:', e);
                }
            }

            // Try WebGL
            this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (this.gl) {
                this.useWebGL = true;
                console.log('WebGL initialized');
                document.getElementById('renderer-info').textContent = 'Renderer: WebGL';
                this.initWebGL();
                return;
            }

            // Fall back to Canvas2D
            this.ctx = canvas.getContext('2d');
            console.log('Canvas2D fallback');
            document.getElementById('renderer-info').textContent = 'Renderer: Canvas2D';
        }

        initWebGL() {
            const gl = this.gl;
            
            // Vertex shader for blobs
            const vsSource = `
                attribute vec2 aPosition;
                uniform mat3 uMatrix;
                void main() {
                    vec3 pos = uMatrix * vec3(aPosition, 1.0);
                    gl_Position = vec4(pos.xy, 0.0, 1.0);
                }
            `;

            // Fragment shader for blobs
            const fsSource = `
                precision mediump float;
                uniform vec4 uColor;
                void main() {
                    gl_FragColor = uColor;
                }
            `;

            this.shaderProgram = this.createShaderProgram(vsSource, fsSource);
            this.positionBuffer = gl.createBuffer();
            
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }

        initWebGPU() {
            // WebGPU initialization - simplified for now
            // Full implementation would require more setup
            this.ctx = this.canvas.getContext('2d');
        }

        createShaderProgram(vsSource, fsSource) {
            const gl = this.gl;
            
            const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
            const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Shader program error:', gl.getProgramInfoLog(program));
                return null;
            }

            return program;
        }

        compileShader(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        clear(color = [10/255, 10/255, 26/255, 1]) {
            if (this.useWebGL && this.gl) {
                const gl = this.gl;
                gl.clearColor(color[0], color[1], color[2], color[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            } else if (this.ctx) {
                this.ctx.fillStyle = `rgb(${color[0]*255}, ${color[1]*255}, ${color[2]*255})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        getContext() {
            return this.ctx || this.gl;
        }

        isWebGL() {
            return this.useWebGL;
        }

        isWebGPU() {
            return this.useWebGPU;
        }
    }

    // =====================
    // Game State
    // =====================
    const game = {
        socket: null,
        playerId: null,
        playerName: '',
        playerFaction: 'RED',
        worldWidth: 5000,
        worldHeight: 5000,
        camera: new Vector(),
        targetCamera: new Vector(),
        zoom: 1,
        targetZoom: 1,
        players: new Map(),
        food: [],
        ejectedMass: [],
        bases: [],
        myPlayer: null,
        lastMass: 0,
        isAlive: false,
        blobSystem: new BlobSystem(),
        renderer: null
    };

    // =====================
    // DOM Elements
    // =====================
    const elements = {
        loginScreen: document.getElementById('login-screen'),
        gameUI: document.getElementById('game-ui'),
        deathScreen: document.getElementById('death-screen'),
        playerNameInput: document.getElementById('player-name'),
        playBtn: document.getElementById('play-btn'),
        respawnBtn: document.getElementById('respawn-btn'),
        canvas: document.getElementById('canvas'),
        minimap: document.getElementById('minimap'),
        leaderboardList: document.getElementById('leaderboard-list'),
        factionStatsList: document.getElementById('faction-stats-list'),
        playerMass: document.getElementById('player-mass'),
        finalScore: document.getElementById('final-score'),
        chatMessages: document.getElementById('chat-messages'),
        chatInput: document.getElementById('chat-input'),
        rendererInfo: document.getElementById('renderer-info')
    };

    let ctx;
    let minimapCtx;

    // =====================
    // Input State
    // =====================
    const input = {
        mouseX: 0,
        mouseY: 0,
        targetX: 0,
        targetY: 0
    };

    // =====================
    // Initialize
    // =====================
    async function init() {
        setupCanvas();
        game.renderer = new Renderer(elements.canvas);
        
        // Wait for renderer to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        ctx = elements.canvas.getContext('2d');
        minimapCtx = elements.minimap.getContext('2d');
        
        setupEventListeners();
        setupSocket();
        requestAnimationFrame(gameLoop);
    }

    function setupCanvas() {
        function resize() {
            elements.canvas.width = window.innerWidth;
            elements.canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        elements.minimap.width = 150;
        elements.minimap.height = 150;
    }

    function setupEventListeners() {
        // Faction selection
        document.querySelectorAll('.faction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.faction-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                game.playerFaction = btn.dataset.faction;
            });
        });

        document.querySelector('.faction-btn.red').classList.add('selected');

        elements.playBtn.addEventListener('click', joinGame);
        elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinGame();
        });

        elements.respawnBtn.addEventListener('click', () => {
            elements.deathScreen.classList.remove('visible');
            joinGame();
        });

        elements.canvas.addEventListener('mousemove', (e) => {
            input.mouseX = e.clientX;
            input.mouseY = e.clientY;
            updateTarget();
        });

        document.addEventListener('keydown', (e) => {
            if (document.activeElement === elements.chatInput) {
                if (e.key === 'Enter') sendChat();
                return;
            }

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (game.socket && game.isAlive) game.socket.emit('split');
                    break;
                case 'w':
                case 'W':
                    if (game.socket && game.isAlive) game.socket.emit('eject');
                    break;
                case 'Enter':
                    elements.chatInput.focus();
                    break;
                case 'Escape':
                    elements.chatInput.blur();
                    break;
            }
        });
    }

    function updateTarget() {
        if (!game.myPlayer) return;

        const center = game.myPlayer.center || { x: game.camera.x, y: game.camera.y };
        const screenCenterX = elements.canvas.width / 2;
        const screenCenterY = elements.canvas.height / 2;

        input.targetX = center.x + (input.mouseX - screenCenterX) / game.zoom;
        input.targetY = center.y + (input.mouseY - screenCenterY) / game.zoom;

        if (game.socket && game.isAlive) {
            game.socket.emit('move', { x: input.targetX, y: input.targetY });
        }
    }

    // =====================
    // Socket.io Setup
    // =====================
    function setupSocket() {
        game.socket = io();

        game.socket.on('connect', () => console.log('Connected to server'));

        game.socket.on('joined', (data) => {
            game.playerId = data.id;
            game.worldWidth = 5000;
            game.worldHeight = 5000;
            game.bases = data.bases || [];
            game.isAlive = true;

            elements.loginScreen.style.display = 'none';
            elements.gameUI.classList.add('visible');
        });

        game.socket.on('gameState', (state) => {
            game.players.clear();
            state.players.forEach(player => {
                game.players.set(player.id, player);
                if (player.id === game.playerId) {
                    game.myPlayer = player;
                    game.myPlayer.center = calculateCenter(player.cells);
                }
            });

            // Update blob system
            game.blobSystem.updateFromServer(
                Array.from(game.players.values()),
                game.camera
            );

            if (game.myPlayer && game.myPlayer.cells.length === 0) {
                handleDeath();
            }

            game.food = state.food || [];
            game.ejectedMass = state.ejectedMass || [];
            game.bases = state.bases || [];
        });

        game.socket.on('leaderboard', (data) => {
            updateLeaderboard(data.players);
            updateFactionStats(data.factions);
        });

        game.socket.on('playerJoined', (player) => console.log(`${player.name} joined`));
        game.socket.on('playerLeft', (playerId) => game.players.delete(playerId));
        game.socket.on('chat', addChatMessage);
        game.socket.on('disconnect', () => { console.log('Disconnected'); game.isAlive = false; });
    }

    // =====================
    // Game Functions
    // =====================
    function joinGame() {
        game.playerName = elements.playerNameInput.value.trim() || 'Player';
        game.socket.emit('join', { name: game.playerName, faction: game.playerFaction });
    }

    function calculateCenter(cells) {
        if (!cells || cells.length === 0) return { x: 0, y: 0 };
        
        let totalMass = 0, centerX = 0, centerY = 0;
        cells.forEach(cell => {
            centerX += cell.x * cell.mass;
            centerY += cell.y * cell.mass;
            totalMass += cell.mass;
        });
        
        return { x: centerX / totalMass, y: centerY / totalMass };
    }

    function handleDeath() {
        if (!game.isAlive) return;
        game.isAlive = false;
        elements.finalScore.textContent = Math.round(game.lastMass);
        elements.deathScreen.classList.add('visible');
    }

    function sendChat() {
        const message = elements.chatInput.value.trim();
        if (message && game.socket) {
            game.socket.emit('chat', message);
            elements.chatInput.value = '';
        }
        elements.chatInput.blur();
    }

    function addChatMessage(data) {
        const div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = `<span class="sender" style="color: ${getFactionColor(data.faction)}">${escapeHtml(data.playerName)}:</span> ${escapeHtml(data.message)}`;
        elements.chatMessages.appendChild(div);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

        while (elements.chatMessages.children.length > CONFIG.maxChatMessages) {
            elements.chatMessages.removeChild(elements.chatMessages.firstChild);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getFactionColor(faction) {
        const colors = { RED: '#E74C3C', BLUE: '#3498DB', GREEN: '#2ECC71', PURPLE: '#9B59B6' };
        return colors[faction] || '#fff';
    }

    function updateLeaderboard(players) {
        let html = '';
        players.forEach((player, index) => {
            const color = getFactionColor(player.faction);
            html += `<div class="leaderboard-entry">
                <span class="rank">${index + 1}.</span>
                <span class="name" style="color: ${color}">${escapeHtml(player.name)}</span>
                <span class="mass">${Math.round(player.mass)}</span>
            </div>`;
        });
        elements.leaderboardList.innerHTML = html;
    }

    function updateFactionStats(factions) {
        let html = '';
        Object.entries(factions).forEach(([key, faction]) => {
            html += `<div class="faction-stat">
                <div class="color-dot" style="background: ${faction.color}"></div>
                <div class="info">
                    <div>${faction.playerCount} players</div>
                    <div class="bases">⛳ ${faction.basesControlled} bases</div>
                </div>
            </div>`;
        });
        elements.factionStatsList.innerHTML = html;
    }

    // =====================
    // Game Loop
    // =====================
    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        if (!game.myPlayer) return;

        const center = game.myPlayer.center;
        if (center) {
            game.targetCamera.x = center.x;
            game.targetCamera.y = center.y;
        }

        game.camera.x += (game.targetCamera.x - game.camera.x) * CONFIG.smoothing;
        game.camera.y += (game.targetCamera.y - game.camera.y) * CONFIG.smoothing;

        const totalMass = game.myPlayer.totalMass || 20;
        game.lastMass = totalMass;
        game.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, CONFIG.zoomMassBase / Math.sqrt(totalMass)));
        game.zoom += (game.targetZoom - game.zoom) * 0.05;

        // Update blob physics
        game.blobSystem.update();

        elements.playerMass.textContent = Math.round(totalMass);
        updateTarget();
    }

    function render() {
        if (!ctx) return;
        
        const width = elements.canvas.width;
        const height = elements.canvas.height;

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(game.zoom, game.zoom);
        ctx.translate(-game.camera.x, -game.camera.y);

        drawGrid();
        drawBases();
        drawFood();
        drawEjectedMass();
        
        // Draw players using blob system with quadratic curves
        game.blobSystem.draw(ctx);
        
        drawWorldBorder();

        ctx.restore();
        drawMinimap();
    }

    function drawGrid() {
        const gridSize = CONFIG.gridSize;
        const startX = Math.floor((game.camera.x - elements.canvas.width / game.zoom / 2) / gridSize) * gridSize;
        const startY = Math.floor((game.camera.y - elements.canvas.height / game.zoom / 2) / gridSize) * gridSize;
        const endX = startX + elements.canvas.width / game.zoom + gridSize * 2;
        const endY = startY + elements.canvas.height / game.zoom + gridSize * 2;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = startX; x < endX; x += gridSize) {
            if (x >= 0 && x <= game.worldWidth) {
                ctx.moveTo(x, Math.max(0, startY));
                ctx.lineTo(x, Math.min(game.worldHeight, endY));
            }
        }
        for (let y = startY; y < endY; y += gridSize) {
            if (y >= 0 && y <= game.worldHeight) {
                ctx.moveTo(Math.max(0, startX), y);
                ctx.lineTo(Math.min(game.worldWidth, endX), y);
            }
        }
        ctx.stroke();
    }

    function drawBases() {
        game.bases.forEach(base => {
            const color = getFactionColor(base.controllingFaction);
            
            const gradient = ctx.createRadialGradient(base.x, base.y, 0, base.x, base.y, base.radius);
            gradient.addColorStop(0, color + '33');
            gradient.addColorStop(0.7, color + '11');
            gradient.addColorStop(1, color + '00');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = color + '88';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Flag
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(base.x, base.y - 40);
            ctx.lineTo(base.x + 30, base.y - 25);
            ctx.lineTo(base.x, base.y - 10);
            ctx.fill();

            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(base.x, base.y - 40);
            ctx.lineTo(base.x, base.y + 10);
            ctx.stroke();
        });
    }

    function drawFood() {
        game.food.forEach(food => {
            ctx.fillStyle = food.color || '#4ECDC4';
            ctx.beginPath();
            ctx.arc(food.x, food.y, food.radius || 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawEjectedMass() {
        game.ejectedMass.forEach(mass => {
            ctx.fillStyle = '#888';
            ctx.beginPath();
            ctx.arc(mass.x, mass.y, mass.radius || 10, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawWorldBorder() {
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, game.worldWidth, game.worldHeight);
    }

    function drawMinimap() {
        const mapWidth = elements.minimap.width;
        const mapHeight = elements.minimap.height;
        const scale = mapWidth / game.worldWidth;

        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

        game.bases.forEach(base => {
            minimapCtx.fillStyle = getFactionColor(base.controllingFaction) + '88';
            minimapCtx.beginPath();
            minimapCtx.arc(base.x * scale, base.y * scale, 5, 0, Math.PI * 2);
            minimapCtx.fill();
        });

        game.players.forEach(player => {
            if (player.cells) {
                player.cells.forEach(cell => {
                    const isMe = player.id === game.playerId;
                    minimapCtx.fillStyle = isMe ? '#fff' : (player.color || '#888');
                    minimapCtx.beginPath();
                    minimapCtx.arc(cell.x * scale, cell.y * scale, isMe ? 4 : 2, 0, Math.PI * 2);
                    minimapCtx.fill();
                });
            }
        });

        if (game.myPlayer) {
            const viewX = (game.camera.x - elements.canvas.width / game.zoom / 2) * scale;
            const viewY = (game.camera.y - elements.canvas.height / game.zoom / 2) * scale;
            const viewW = (elements.canvas.width / game.zoom) * scale;
            const viewH = (elements.canvas.height / game.zoom) * scale;

            minimapCtx.strokeStyle = '#fff';
            minimapCtx.lineWidth = 1;
            minimapCtx.strokeRect(viewX, viewY, viewW, viewH);
        }
    }

    // =====================
    // Start Game
    // =====================
    window.addEventListener('load', init);
})();
