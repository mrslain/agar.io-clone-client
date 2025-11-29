// Clan Wars - Multiplayer Arena Game Client
(function() {
    'use strict';

    // =====================
    // Configuration
    // =====================
    const CONFIG = {
        smoothing: 0.08,           // Camera smoothing (lower = smoother)
        gridSize: 50,
        minimapScale: 0.03,
        // Camera zoom settings
        minZoom: 0.3,
        maxZoom: 1,
        zoomMassBase: 100,         // Base mass for zoom calculation
        // Chat settings
        maxChatMessages: 50,
        // Blob physics settings (from original CoffeeScript)
        blobQuality: 24,           // Number of nodes around blob (reduced for performance)
        blobFriction: 1.035,       // Movement friction
        blobNodeSmoothing: 0.08,   // How fast nodes return to normal position
        blobPositionSmoothing: 0.15,// How fast node positions update
        blobJointStrength: 0.5,    // Spring strength between nodes
        blobSpeed: 5               // Base movement speed
    };

    // =====================
    // Vector Class (from original CoffeeScript)
    // =====================
    class Vector {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }

        add(v) { this.x += v.x; this.y += v.y; return this; }
        subtract(v) { this.x -= v.x; this.y -= v.y; return this; }
        multiply(v) { this.x *= v.x; this.y *= v.y; return this; }
        divide(v) { this.x /= v.x; this.y /= v.y; return this; }
        invert() { this.x *= -1; this.y *= -1; return this; }
        copy(v) { this.x = v.x; this.y = v.y; return this; }
        clone() { return new Vector(this.x, this.y); }
        magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    }

    // =====================
    // Blob Node & Joint Classes (from original CoffeeScript)
    // =====================
    class Joint {
        constructor(node, strength = CONFIG.blobJointStrength) {
            this.node = node;
            this.strength = new Vector(strength, strength);
            this.strain = new Vector();
        }
    }

    class Node {
        constructor(position) {
            this.normal = new Vector();
            this.target = new Vector();
            this.position = position ? position.clone() : new Vector();
            this.ghost = position ? position.clone() : new Vector();
            this.angle = 0;
            this.joints = [];
        }
    }

    // =====================
    // Client-side Blob representation
    // =====================
    class ClientBlob {
        constructor(serverCell, color, darkColor) {
            this.id = serverCell.id;
            this.serverX = serverCell.x;
            this.serverY = serverCell.y;
            this.serverMass = serverCell.mass;
            this.serverRadius = serverCell.radius;
            
            this.x = serverCell.x;
            this.y = serverCell.y;
            this.mass = serverCell.mass;
            this.radius = serverCell.radius;
            
            this.color = color;
            this.darkColor = darkColor;
            
            this.velocity = new Vector();
            this.friction = new Vector(CONFIG.blobFriction, CONFIG.blobFriction);
            this.nodes = [];
            this.quality = CONFIG.blobQuality;
            
            this.createNodes();
        }

        createNodes() {
            this.nodes = [];
            
            for (let i = 0; i < this.quality; i++) {
                const node = new Node(new Vector(this.x, this.y));
                // Set initial angle and normal
                node.angle = (i / this.quality) * Math.PI * 2;
                node.target = new Vector(
                    Math.cos(node.angle) * this.radius,
                    Math.sin(node.angle) * this.radius
                );
                node.normal = node.target.clone();
                // Set initial position in world space
                node.position = new Vector(
                    this.x + node.normal.x,
                    this.y + node.normal.y
                );
                node.ghost = node.position.clone();
                this.nodes.push(node);
            }
            
            this.updateJoints();
        }

        // Get element by offset with circular wrapping
        getNodeByOffset(index, offset) {
            let newIndex = index + offset;
            if (newIndex >= this.quality) newIndex -= this.quality;
            if (newIndex < 0) newIndex += this.quality;
            return this.nodes[newIndex];
        }

        updateJoints() {
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                node.joints = [
                    new Joint(this.getNodeByOffset(i, -1)),
                    new Joint(this.getNodeByOffset(i, 1)),
                    new Joint(this.getNodeByOffset(i, -2)),
                    new Joint(this.getNodeByOffset(i, 2))
                ];
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

        updateFromServer(serverCell) {
            this.serverX = serverCell.x;
            this.serverY = serverCell.y;
            this.serverMass = serverCell.mass;
            this.serverRadius = serverCell.radius;
        }

        update(cameraX, cameraY) {
            // Smoothly interpolate to server position
            const dx = this.serverX - this.x;
            const dy = this.serverY - this.y;
            
            this.velocity.x += dx * 0.15;
            this.velocity.y += dy * 0.15;
            this.velocity.divide(this.friction);
            
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            
            // Smoothly interpolate mass and radius
            this.mass += (this.serverMass - this.mass) * 0.1;
            this.radius += (this.serverRadius - this.radius) * 0.1;
            
            // Update node normals for new radius
            this.updateNormals();
            
            // Update node physics in world space
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                node.ghost.copy(node.position);
                
                // Smoothly move normal toward target
                const normalDiff = node.target.clone().subtract(node.normal);
                normalDiff.multiply(new Vector(CONFIG.blobNodeSmoothing, CONFIG.blobNodeSmoothing));
                node.normal.add(normalDiff);
                
                // Calculate position with joint strain (in world space)
                const position = new Vector(this.x, this.y);
                
                for (let j = 0; j < node.joints.length; j++) {
                    const joint = node.joints[j];
                    const normal = joint.node.normal.clone().subtract(node.normal);
                    const ghost = joint.node.ghost.clone().subtract(node.ghost);
                    joint.strain.copy(ghost.subtract(normal));
                    position.add(joint.strain.clone().multiply(joint.strength));
                }
                
                position.add(node.normal);
                
                // Smoothly move node position
                const positionDiff = position.subtract(node.position);
                positionDiff.multiply(new Vector(CONFIG.blobPositionSmoothing, CONFIG.blobPositionSmoothing));
                node.position.add(positionDiff);
            }
        }

        draw(ctx, cameraX, cameraY) {
            ctx.save();
            ctx.beginPath();
            
            // Create gradient fill (using world coordinates since camera transform is applied)
            const gradient = ctx.createRadialGradient(
                this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, this.darkColor);
            
            ctx.fillStyle = gradient;
            ctx.strokeStyle = this.darkColor;
            ctx.lineWidth = Math.max(3, this.radius * 0.08);
            
            // Draw blob shape using quadratic curves through nodes
            const firstNode = this.getNodeByOffset(0, -1);
            const secondNode = this.nodes[0];
            
            const startX = firstNode.position.x + (secondNode.position.x - firstNode.position.x) / 2;
            const startY = firstNode.position.y + (secondNode.position.y - firstNode.position.y) / 2;
            ctx.moveTo(startX, startY);
            
            for (let i = 0; i < this.quality; i++) {
                const node = this.nodes[i];
                const next = this.getNodeByOffset(i, 1);
                
                const midX = node.position.x + (next.position.x - node.position.x) / 2;
                const midY = node.position.y + (next.position.y - node.position.y) / 2;
                
                ctx.quadraticCurveTo(node.position.x, node.position.y, midX, midY);
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }

    // =====================
    // Blob Manager - manages client-side blob instances
    // =====================
    const blobManager = {
        blobs: new Map(),  // cellId -> ClientBlob
        
        updateFromServer(players, cameraX, cameraY) {
            const activeCellIds = new Set();
            
            players.forEach(player => {
                if (!player.cells) return;
                
                player.cells.forEach(cell => {
                    activeCellIds.add(cell.id);
                    
                    let blob = this.blobs.get(cell.id);
                    if (!blob) {
                        // Create new blob
                        blob = new ClientBlob(cell, player.color, player.darkColor);
                        this.blobs.set(cell.id, blob);
                    } else {
                        // Update existing blob
                        blob.updateFromServer(cell);
                        blob.color = player.color;
                        blob.darkColor = player.darkColor;
                    }
                    
                    // Store player info on blob for name rendering
                    blob.playerName = player.name;
                    blob.totalMass = player.totalMass;
                    blob.playerId = player.id;
                });
            });
            
            // Remove blobs that no longer exist
            for (const [cellId, blob] of this.blobs) {
                if (!activeCellIds.has(cellId)) {
                    this.blobs.delete(cellId);
                }
            }
        },
        
        update(cameraX, cameraY) {
            for (const blob of this.blobs.values()) {
                blob.update(cameraX, cameraY);
            }
        },
        
        draw(ctx, cameraX, cameraY) {
            // Sort by mass for proper layering
            const sortedBlobs = Array.from(this.blobs.values())
                .sort((a, b) => a.mass - b.mass);
            
            // Draw all blobs
            sortedBlobs.forEach(blob => {
                blob.draw(ctx, cameraX, cameraY);
            });
            
            // Draw names on top (using world coordinates since camera transform is applied)
            const drawnPlayers = new Set();
            sortedBlobs.forEach(blob => {
                if (drawnPlayers.has(blob.playerId)) return;
                drawnPlayers.add(blob.playerId);
                
                // Find largest blob for this player
                const playerBlobs = sortedBlobs.filter(b => b.playerId === blob.playerId);
                const largestBlob = playerBlobs.reduce((max, b) => b.mass > max.mass ? b : max, playerBlobs[0]);
                
                const fontSize = Math.max(12, Math.min(24, largestBlob.radius * 0.4));
                
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Text shadow
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillText(largestBlob.playerName, largestBlob.x + 2, largestBlob.y + 2);
                
                // Text
                ctx.fillStyle = '#fff';
                ctx.fillText(largestBlob.playerName, largestBlob.x, largestBlob.y);
                
                // Mass
                ctx.font = `${fontSize * 0.6}px Arial`;
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.fillText(Math.round(largestBlob.totalMass), largestBlob.x, largestBlob.y + fontSize);
            });
        },
        
        clear() {
            this.blobs.clear();
        }
    };

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
        camera: { x: 0, y: 0 },
        targetCamera: { x: 0, y: 0 },
        zoom: 1,
        targetZoom: 1,
        players: new Map(),
        food: [],
        ejectedMass: [],
        bases: [],
        myPlayer: null,
        lastMass: 0,
        isAlive: false
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
        chatInput: document.getElementById('chat-input')
    };

    const ctx = elements.canvas.getContext('2d');
    const minimapCtx = elements.minimap.getContext('2d');

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
    function init() {
        setupCanvas();
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

        // Setup minimap
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

        // Select first faction by default
        document.querySelector('.faction-btn.red').classList.add('selected');

        // Play button
        elements.playBtn.addEventListener('click', joinGame);
        elements.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinGame();
        });

        // Respawn button
        elements.respawnBtn.addEventListener('click', () => {
            elements.deathScreen.classList.remove('visible');
            joinGame();
        });

        // Mouse movement
        elements.canvas.addEventListener('mousemove', (e) => {
            input.mouseX = e.clientX;
            input.mouseY = e.clientY;
            updateTarget();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === elements.chatInput) {
                if (e.key === 'Enter') {
                    sendChat();
                }
                return;
            }

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (game.socket && game.isAlive) {
                        game.socket.emit('split');
                    }
                    break;
                case 'w':
                case 'W':
                    if (game.socket && game.isAlive) {
                        game.socket.emit('eject');
                    }
                    break;
                case 'Enter':
                    elements.chatInput.focus();
                    break;
                case 'Escape':
                    elements.chatInput.blur();
                    break;
            }
        });

        // Chat input blur
        elements.chatInput.addEventListener('blur', () => {
            // Allow game input again
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

        game.socket.on('connect', () => {
            console.log('Connected to server');
        });

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
            // Update players
            game.players.clear();
            state.players.forEach(player => {
                game.players.set(player.id, player);
                if (player.id === game.playerId) {
                    game.myPlayer = player;
                    game.myPlayer.center = calculateCenter(player.cells);
                }
            });

            // Update blob manager with server data
            blobManager.updateFromServer(Array.from(game.players.values()), game.camera.x, game.camera.y);

            // Check if player died
            if (game.myPlayer && game.myPlayer.cells.length === 0) {
                handleDeath();
            }

            // Update food
            game.food = state.food || [];
            
            // Update ejected mass
            game.ejectedMass = state.ejectedMass || [];

            // Update bases
            game.bases = state.bases || [];
        });

        game.socket.on('leaderboard', (data) => {
            updateLeaderboard(data.players);
            updateFactionStats(data.factions);
        });

        game.socket.on('playerJoined', (player) => {
            console.log(`${player.name} joined the game`);
        });

        game.socket.on('playerLeft', (playerId) => {
            game.players.delete(playerId);
        });

        game.socket.on('chat', (data) => {
            addChatMessage(data);
        });

        game.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            game.isAlive = false;
        });
    }

    // =====================
    // Game Functions
    // =====================
    function joinGame() {
        game.playerName = elements.playerNameInput.value.trim() || 'Player';
        game.socket.emit('join', {
            name: game.playerName,
            faction: game.playerFaction
        });
    }

    function calculateCenter(cells) {
        if (!cells || cells.length === 0) return { x: 0, y: 0 };
        
        let totalMass = 0;
        let centerX = 0;
        let centerY = 0;
        
        cells.forEach(cell => {
            centerX += cell.x * cell.mass;
            centerY += cell.y * cell.mass;
            totalMass += cell.mass;
        });
        
        return {
            x: centerX / totalMass,
            y: centerY / totalMass
        };
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

        // Limit messages to prevent memory issues
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
        const colors = {
            RED: '#E74C3C',
            BLUE: '#3498DB',
            GREEN: '#2ECC71',
            PURPLE: '#9B59B6'
        };
        return colors[faction] || '#fff';
    }

    // =====================
    // UI Updates
    // =====================
    function updateLeaderboard(players) {
        let html = '';
        players.forEach((player, index) => {
            const color = getFactionColor(player.faction);
            html += `
                <div class="leaderboard-entry">
                    <span class="rank">${index + 1}.</span>
                    <span class="name" style="color: ${color}">${escapeHtml(player.name)}</span>
                    <span class="mass">${Math.round(player.mass)}</span>
                </div>
            `;
        });
        elements.leaderboardList.innerHTML = html;
    }

    function updateFactionStats(factions) {
        let html = '';
        Object.entries(factions).forEach(([key, faction]) => {
            html += `
                <div class="faction-stat">
                    <div class="color-dot" style="background: ${faction.color}"></div>
                    <div class="info">
                        <div>${faction.playerCount} players</div>
                        <div class="bases">⛳ ${faction.basesControlled} bases</div>
                    </div>
                </div>
            `;
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

        // Update camera to follow player
        const center = game.myPlayer.center;
        if (center) {
            game.targetCamera.x = center.x;
            game.targetCamera.y = center.y;
        }

        // Smooth camera movement (slower for smoother feel)
        game.camera.x += (game.targetCamera.x - game.camera.x) * CONFIG.smoothing;
        game.camera.y += (game.targetCamera.y - game.camera.y) * CONFIG.smoothing;

        // Update zoom based on mass
        const totalMass = game.myPlayer.totalMass || 20;
        game.lastMass = totalMass;
        game.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, CONFIG.zoomMassBase / Math.sqrt(totalMass)));
        game.zoom += (game.targetZoom - game.zoom) * 0.05; // Slower zoom for smoother feel

        // Update blob physics
        blobManager.update(game.camera.x, game.camera.y);

        // Update player mass display
        elements.playerMass.textContent = Math.round(totalMass);

        // Update target for movement
        updateTarget();
    }

    function render() {
        const width = elements.canvas.width;
        const height = elements.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        // Save context state
        ctx.save();

        // Apply camera transform
        ctx.translate(width / 2, height / 2);
        ctx.scale(game.zoom, game.zoom);
        ctx.translate(-game.camera.x, -game.camera.y);

        // Draw grid
        drawGrid();

        // Draw bases
        drawBases();

        // Draw food
        drawFood();

        // Draw ejected mass
        drawEjectedMass();

        // Draw players using blob physics system
        blobManager.draw(ctx, 0, 0); // Camera offset already applied via transform

        // Draw world border
        drawWorldBorder();

        // Restore context state
        ctx.restore();

        // Draw minimap
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
            // Draw base zone
            const gradient = ctx.createRadialGradient(
                base.x, base.y, 0,
                base.x, base.y, base.radius
            );
            const color = getFactionColor(base.controllingFaction);
            gradient.addColorStop(0, color + '33');
            gradient.addColorStop(0.7, color + '11');
            gradient.addColorStop(1, color + '00');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(base.x, base.y, base.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw base border
            ctx.strokeStyle = color + '88';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw flag
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(base.x, base.y - 40);
            ctx.lineTo(base.x + 30, base.y - 25);
            ctx.lineTo(base.x, base.y - 10);
            ctx.fill();

            // Draw pole
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(base.x, base.y - 40);
            ctx.lineTo(base.x, base.y + 10);
            ctx.stroke();

            // Draw capture progress
            if (base.captureProgress) {
                let yOffset = 30;
                Object.entries(base.captureProgress).forEach(([faction, progress]) => {
                    if (progress > 0) {
                        const factionColor = getFactionColor(faction);
                        const barWidth = 80;
                        const filledWidth = (progress / base.controlPoints) * barWidth;

                        ctx.fillStyle = 'rgba(0,0,0,0.5)';
                        ctx.fillRect(base.x - barWidth/2, base.y + yOffset, barWidth, 8);
                        ctx.fillStyle = factionColor;
                        ctx.fillRect(base.x - barWidth/2, base.y + yOffset, filledWidth, 8);
                        yOffset += 12;
                    }
                });
            }
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

    function drawPlayers() {
        // Sort by mass so larger players are drawn on top
        const sortedPlayers = Array.from(game.players.values())
            .sort((a, b) => (a.totalMass || 0) - (b.totalMass || 0));

        sortedPlayers.forEach(player => {
            drawPlayer(player);
        });
    }

    function drawPlayer(player) {
        if (!player.cells) return;

        player.cells.forEach(cell => {
            // Draw cell shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.arc(cell.x + 5, cell.y + 5, cell.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw cell
            const gradient = ctx.createRadialGradient(
                cell.x - cell.radius * 0.3, cell.y - cell.radius * 0.3, 0,
                cell.x, cell.y, cell.radius
            );
            gradient.addColorStop(0, player.color || '#E74C3C');
            gradient.addColorStop(1, player.darkColor || '#C0392B');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = player.darkColor || '#C0392B';
            ctx.lineWidth = Math.max(2, cell.radius * 0.05);
            ctx.stroke();
        });

        // Draw name on largest cell
        if (player.cells.length > 0) {
            const largestCell = player.cells.reduce((max, cell) => 
                cell.mass > max.mass ? cell : max, player.cells[0]);

            const fontSize = Math.max(12, Math.min(24, largestCell.radius * 0.4));
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillText(player.name, largestCell.x + 2, largestCell.y + 2);

            // Text
            ctx.fillStyle = '#fff';
            ctx.fillText(player.name, largestCell.x, largestCell.y);

            // Mass below name
            const massText = Math.round(player.totalMass);
            ctx.font = `${fontSize * 0.6}px Arial`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText(massText, largestCell.x, largestCell.y + fontSize);
        }
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

        // Clear minimap
        minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        minimapCtx.fillRect(0, 0, mapWidth, mapHeight);

        // Draw bases
        game.bases.forEach(base => {
            minimapCtx.fillStyle = getFactionColor(base.controllingFaction) + '88';
            minimapCtx.beginPath();
            minimapCtx.arc(base.x * scale, base.y * scale, 5, 0, Math.PI * 2);
            minimapCtx.fill();
        });

        // Draw players
        game.players.forEach(player => {
            if (player.cells) {
                player.cells.forEach(cell => {
                    const isMe = player.id === game.playerId;
                    minimapCtx.fillStyle = isMe ? '#fff' : (player.color || '#888');
                    minimapCtx.beginPath();
                    minimapCtx.arc(
                        cell.x * scale,
                        cell.y * scale,
                        isMe ? 4 : 2,
                        0, Math.PI * 2
                    );
                    minimapCtx.fill();
                });
            }
        });

        // Draw viewport rectangle
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
