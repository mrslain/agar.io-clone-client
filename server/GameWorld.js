const Player = require('./Player');
const Food = require('./Food');
const Base = require('./Base');

// Faction definitions with colors and bonuses
const FACTIONS = {
    RED: { 
        name: 'Crimson Legion', 
        color: '#E74C3C', 
        darkColor: '#C0392B',
        bonus: 'speed', // 10% speed boost
        bonusValue: 1.1
    },
    BLUE: { 
        name: 'Azure Dynasty', 
        color: '#3498DB', 
        darkColor: '#2980B9',
        bonus: 'mass', // 10% more mass from food
        bonusValue: 1.1
    },
    GREEN: { 
        name: 'Emerald Order', 
        color: '#2ECC71', 
        darkColor: '#27AE60',
        bonus: 'regen', // Slow mass regeneration
        bonusValue: 0.1
    },
    PURPLE: { 
        name: 'Violet Empire', 
        color: '#9B59B6', 
        darkColor: '#8E44AD',
        bonus: 'split', // Faster split cooldown
        bonusValue: 0.8
    }
};

class GameWorld {
    constructor(config) {
        this.width = config.width || 5000;
        this.height = config.height || 5000;
        this.foodCount = config.foodCount || 500;
        this.baseCount = config.baseCount || 4;

        this.players = new Map();
        this.food = [];
        this.ejectedMass = [];
        this.bases = [];

        this.initFood();
        this.initBases();
    }

    initFood() {
        for (let i = 0; i < this.foodCount; i++) {
            this.spawnFood();
        }
    }

    initBases() {
        const factionKeys = Object.keys(FACTIONS);
        const positions = [
            { x: this.width * 0.15, y: this.height * 0.15 },
            { x: this.width * 0.85, y: this.height * 0.15 },
            { x: this.width * 0.15, y: this.height * 0.85 },
            { x: this.width * 0.85, y: this.height * 0.85 }
        ];

        factionKeys.forEach((factionKey, index) => {
            if (index < this.baseCount) {
                this.bases.push(new Base({
                    id: `base_${factionKey}`,
                    faction: factionKey,
                    x: positions[index].x,
                    y: positions[index].y,
                    radius: 200,
                    controlPoints: 100
                }));
            }
        });
    }

    spawnFood() {
        const food = new Food({
            id: `food_${Date.now()}_${Math.random()}`,
            x: Math.random() * this.width,
            y: Math.random() * this.height,
            mass: Math.random() * 5 + 1
        });
        this.food.push(food);
        return food;
    }

    addPlayer(socketId, name, faction) {
        if (!FACTIONS[faction]) {
            faction = Object.keys(FACTIONS)[Math.floor(Math.random() * 4)];
        }

        const player = new Player({
            id: socketId,
            name: name || 'Player',
            faction: faction,
            factionData: FACTIONS[faction],
            x: Math.random() * (this.width - 400) + 200,
            y: Math.random() * (this.height - 400) + 200,
            mass: 20
        });

        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
    }

    getPlayer(socketId) {
        return this.players.get(socketId);
    }

    updatePlayerTarget(socketId, x, y) {
        const player = this.players.get(socketId);
        if (player) {
            player.setTarget(x, y);
        }
    }

    splitPlayer(socketId) {
        const player = this.players.get(socketId);
        if (player && player.canSplit()) {
            const newCells = player.split();
            // Split cells are handled within player
        }
    }

    ejectMass(socketId) {
        const player = this.players.get(socketId);
        if (player && player.canEject()) {
            const ejected = player.eject();
            if (ejected) {
                this.ejectedMass.push(ejected);
            }
        }
    }

    update() {
        // Update all players
        this.players.forEach((player) => {
            player.update(this.width, this.height);
        });

        // Update ejected mass
        this.ejectedMass = this.ejectedMass.filter(mass => {
            mass.update();
            mass.lifetime--;
            return mass.lifetime > 0;
        });

        // Check food collisions
        this.checkFoodCollisions();

        // Check ejected mass collisions
        this.checkEjectedMassCollisions();

        // Check player vs player collisions
        this.checkPlayerCollisions();

        // Check base capture progress
        this.updateBases();

        // Respawn food
        while (this.food.length < this.foodCount) {
            this.spawnFood();
        }
    }

    checkFoodCollisions() {
        this.players.forEach((player) => {
            player.cells.forEach((cell) => {
                this.food = this.food.filter((food) => {
                    const dist = this.distance(cell.x, cell.y, food.x, food.y);
                    if (dist < cell.radius) {
                        let massGain = food.mass;
                        // Apply faction bonus
                        if (player.factionData.bonus === 'mass') {
                            massGain *= player.factionData.bonusValue;
                        }
                        cell.mass += massGain;
                        return false;
                    }
                    return true;
                });
            });
        });
    }

    checkEjectedMassCollisions() {
        this.players.forEach((player) => {
            player.cells.forEach((cell) => {
                this.ejectedMass = this.ejectedMass.filter((mass) => {
                    const dist = this.distance(cell.x, cell.y, mass.x, mass.y);
                    if (dist < cell.radius && mass.ownerId !== player.id) {
                        cell.mass += mass.mass;
                        return false;
                    }
                    return true;
                });
            });
        });
    }

    checkPlayerCollisions() {
        const playersArray = Array.from(this.players.values());
        
        for (let i = 0; i < playersArray.length; i++) {
            for (let j = i + 1; j < playersArray.length; j++) {
                const player1 = playersArray[i];
                const player2 = playersArray[j];

                // Same faction players can't eat each other
                if (player1.faction === player2.faction) continue;

                player1.cells.forEach((cell1) => {
                    player2.cells.forEach((cell2) => {
                        const dist = this.distance(cell1.x, cell1.y, cell2.x, cell2.y);
                        
                        // One cell can eat another if it's 10% larger
                        if (cell1.mass > cell2.mass * 1.1) {
                            if (dist < cell1.radius - cell2.radius * 0.4) {
                                cell1.mass += cell2.mass * 0.8;
                                cell2.mass = 0;
                            }
                        } else if (cell2.mass > cell1.mass * 1.1) {
                            if (dist < cell2.radius - cell1.radius * 0.4) {
                                cell2.mass += cell1.mass * 0.8;
                                cell1.mass = 0;
                            }
                        }
                    });
                });

                // Remove dead cells
                player1.cells = player1.cells.filter(c => c.mass > 0);
                player2.cells = player2.cells.filter(c => c.mass > 0);

                // Respawn dead players
                if (player1.cells.length === 0) {
                    player1.respawn(this.width, this.height);
                }
                if (player2.cells.length === 0) {
                    player2.respawn(this.width, this.height);
                }
            }
        }
    }

    updateBases() {
        this.bases.forEach((base) => {
            const playersInBase = [];
            
            this.players.forEach((player) => {
                player.cells.forEach((cell) => {
                    const dist = this.distance(cell.x, cell.y, base.x, base.y);
                    if (dist < base.radius + cell.radius) {
                        playersInBase.push({
                            faction: player.faction,
                            mass: cell.mass
                        });
                    }
                });
            });

            base.updateCapture(playersInBase);
        });
    }

    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    getState() {
        const players = [];
        this.players.forEach((player) => {
            players.push(player.serialize());
        });

        return {
            players,
            food: this.food.map(f => f.serialize()),
            ejectedMass: this.ejectedMass.map(m => m.serialize()),
            bases: this.bases.map(b => b.serialize())
        };
    }

    getLeaderboard() {
        const players = Array.from(this.players.values());
        return players
            .map(p => ({
                id: p.id,
                name: p.name,
                faction: p.faction,
                mass: p.getTotalMass()
            }))
            .sort((a, b) => b.mass - a.mass)
            .slice(0, 10);
    }

    getFactionStats() {
        const stats = {};
        Object.keys(FACTIONS).forEach(key => {
            stats[key] = {
                ...FACTIONS[key],
                totalMass: 0,
                playerCount: 0,
                basesControlled: 0
            };
        });

        this.players.forEach((player) => {
            if (stats[player.faction]) {
                stats[player.faction].totalMass += player.getTotalMass();
                stats[player.faction].playerCount++;
            }
        });

        this.bases.forEach((base) => {
            if (base.controllingFaction && stats[base.controllingFaction]) {
                stats[base.controllingFaction].basesControlled++;
            }
        });

        return stats;
    }

    getBases() {
        return this.bases.map(b => b.serialize());
    }
}

module.exports = GameWorld;
