const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const GameWorld = require('./GameWorld');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Create game world
const gameWorld = new GameWorld({
    width: 5000,
    height: 5000,
    foodCount: 500,
    baseCount: 4
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle player joining
    socket.on('join', (data) => {
        const player = gameWorld.addPlayer(socket.id, data.name, data.faction);
        if (player) {
            socket.emit('joined', {
                id: socket.id,
                player: player.serialize(),
                factions: gameWorld.getFactionStats(),
                bases: gameWorld.getBases()
            });
            socket.broadcast.emit('playerJoined', player.serialize());
        }
    });

    // Handle player movement
    socket.on('move', (data) => {
        gameWorld.updatePlayerTarget(socket.id, data.x, data.y);
    });

    // Handle split action
    socket.on('split', () => {
        gameWorld.splitPlayer(socket.id);
    });

    // Handle eject mass
    socket.on('eject', () => {
        gameWorld.ejectMass(socket.id);
    });

    // Handle chat messages
    socket.on('chat', (message) => {
        const player = gameWorld.getPlayer(socket.id);
        if (player) {
            io.emit('chat', {
                playerId: socket.id,
                playerName: player.name,
                faction: player.faction,
                message: message.substring(0, 200)
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        gameWorld.removePlayer(socket.id);
        io.emit('playerLeft', socket.id);
    });
});

// Game loop - 60 updates per second
const TICK_RATE = 60;
setInterval(() => {
    gameWorld.update();
    
    // Send game state to all players
    const state = gameWorld.getState();
    io.emit('gameState', state);
}, 1000 / TICK_RATE);

// Send leaderboard updates every second
setInterval(() => {
    const leaderboard = gameWorld.getLeaderboard();
    const factionStats = gameWorld.getFactionStats();
    io.emit('leaderboard', { players: leaderboard, factions: factionStats });
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Game server running on port ${PORT}`);
});
