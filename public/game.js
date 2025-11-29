// Clan Wars - Multiplayer Arena Game Client
(function() {
    'use strict';

    // =====================
    // Configuration
    // =====================
    const CONFIG = {
        smoothing: 0.15,
        gridSize: 50,
        minimapScale: 0.03,
        // Camera zoom settings
        minZoom: 0.3,
        maxZoom: 1,
        zoomMassBase: 100,  // Base mass for zoom calculation
        // Chat settings
        maxChatMessages: 50
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

        // Smooth camera movement
        game.camera.x += (game.targetCamera.x - game.camera.x) * CONFIG.smoothing;
        game.camera.y += (game.targetCamera.y - game.camera.y) * CONFIG.smoothing;

        // Update zoom based on mass
        const totalMass = game.myPlayer.totalMass || 20;
        game.lastMass = totalMass;
        game.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, CONFIG.zoomMassBase / Math.sqrt(totalMass)));
        game.zoom += (game.targetZoom - game.zoom) * 0.1;

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

        // Draw players
        drawPlayers();

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
