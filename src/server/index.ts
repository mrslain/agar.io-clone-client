import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameWorld } from './GameWorld';
import { GAME_CONFIG, FactionType } from '../shared/types';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Create game world
const gameWorld = new GameWorld({
    width: GAME_CONFIG.WORLD_WIDTH,
    height: GAME_CONFIG.WORLD_HEIGHT,
    foodCount: GAME_CONFIG.FOOD_COUNT,
    baseCount: GAME_CONFIG.BASE_COUNT
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle player joining
    socket.on('join', (data: { name: string; faction: FactionType }) => {
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
    socket.on('move', (data: { x: number; y: number }) => {
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
    socket.on('chat', (message: string) => {
        const player = gameWorld.getPlayer(socket.id);
        if (player) {
            io.emit('chat', {
                playerId: socket.id,
                playerName: player.name,
                faction: player.faction,
                message: message.substring(0, GAME_CONFIG.MAX_CHAT_MESSAGE_LENGTH)
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

// Game loop
setInterval(() => {
    gameWorld.update();
    const state = gameWorld.getState();
    io.emit('gameState', state);
}, 1000 / GAME_CONFIG.TICK_RATE);

// Leaderboard updates
setInterval(() => {
    const leaderboard = gameWorld.getLeaderboard();
    const factionStats = gameWorld.getFactionStats();
    io.emit('leaderboard', { players: leaderboard, factions: factionStats });
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Game server running on port ${PORT}`);
});
