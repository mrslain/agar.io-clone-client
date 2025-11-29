# ⚔️ Clan Wars - Multiplayer Arena

A multiplayer browser-based game inspired by Agar.io with faction warfare mechanics.

![Clan Wars](https://img.shields.io/badge/Game-Multiplayer-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-blue)

## 🎮 Features

### Core Gameplay
- **Real-time Multiplayer**: Play with other players in real-time using WebSocket connections
- **Smooth Movement**: Move your cell by following your mouse cursor
- **Eat & Grow**: Consume food and smaller players to grow larger
- **Split Mechanic**: Press Space to split your cell and catch enemies
- **Mass Ejection**: Press W to eject mass and feed teammates

### 🏰 Faction System
Choose from 4 unique factions, each with special bonuses:

| Faction | Bonus | Description |
|---------|-------|-------------|
| 🔴 **Crimson Legion** | +10% Speed | Move faster than other factions |
| 🔵 **Azure Dynasty** | +10% Mass Gain | Get more mass from eating food |
| 🟢 **Emerald Order** | Mass Regen | Slowly regenerate mass over time |
| 🟣 **Violet Empire** | Fast Split | Reduced cooldown on split ability |

### ⚔️ Clan Warfare
- **Team Play**: Same-faction players cannot eat each other
- **Base Capture**: Control strategic bases on the map
- **Faction Leaderboard**: Compete for your faction's glory
- **Team Chat**: Coordinate with faction members

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/mrslain/agar.io-clone-client.git
cd agar.io-clone-client
```

2. Install dependencies
```bash
npm install
```

3. Start the server
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## 🎯 Controls

| Key | Action |
|-----|--------|
| Mouse | Move your cell |
| Space | Split cell |
| W | Eject mass |
| Enter | Open chat |
| Escape | Close chat |

## 🏗️ Architecture

```
├── server/
│   ├── index.js      # Express + Socket.io server
│   ├── GameWorld.js  # Game world logic
│   ├── Player.js     # Player & cell mechanics
│   ├── Food.js       # Food spawning
│   └── Base.js       # Base capture mechanics
├── public/
│   ├── index.html    # Game UI
│   └── game.js       # Client-side game logic
└── package.json
```

## 🎨 Game Mechanics

### Growth Formula
- Cell radius is calculated as: `radius = sqrt(mass) * 4`
- Larger cells move slower: `speed = min(10, 200 / sqrt(mass))`
- Cells naturally lose mass when above 100: `mass *= 0.9998` per tick

### Combat
- A cell can eat another if it's 10% larger
- When eaten, the predator gains 80% of the prey's mass
- Same-faction players are protected from each other

### Bases
- 4 bases positioned at map corners
- Capture bases by staying in them with mass
- Controlling faction gets defensive bonuses

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is open source and available under the MIT License.
