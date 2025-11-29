import { Player } from './Player';
import { Food } from './Food';
import { Base } from './Base';
import { 
    FactionType, 
    FactionStats, 
    GameState, 
    LeaderboardEntry,
    FACTIONS,
    GAME_CONFIG 
} from '../shared/types';

interface EjectedMass {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    mass: number;
    lifetime: number;
}

interface GameWorldConfig {
    width?: number;
    height?: number;
    foodCount?: number;
    baseCount?: number;
}

export class GameWorld {
    public width: number;
    public height: number;
    public foodCount: number;
    public baseCount: number;

    public players: Map<string, Player> = new Map();
    public food: Food[] = [];
    public ejectedMass: EjectedMass[] = [];
    public bases: Base[] = [];

    constructor(config: GameWorldConfig = {}) {
        this.width = config.width || GAME_CONFIG.WORLD_WIDTH;
        this.height = config.height || GAME_CONFIG.WORLD_HEIGHT;
        this.foodCount = config.foodCount || GAME_CONFIG.FOOD_COUNT;
        this.baseCount = config.baseCount || GAME_CONFIG.BASE_COUNT;

        this.initFood();
        this.initBases();
    }

    private initFood(): void {
        for (let i = 0; i < this.foodCount; i++) {
            this.spawnFood();
        }
    }

    private initBases(): void {
        const factionKeys = Object.keys(FACTIONS) as FactionType[];
        const positions = [
            { x: this.width * 0.15, y: this.height * 0.15 },
            { x: this.width * 0.85, y: this.height * 0.15 },
            { x: this.width * 0.15, y: this.height * 0.85 },
            { x: this.width * 0.85, y: this.height * 0.85 }
        ];

        factionKeys.forEach((factionKey, index) => {
            if (index < this.baseCount) {
                this.bases.push(new Base(
                    `base_${factionKey}`,
                    factionKey,
                    positions[index].x,
                    positions[index].y,
                    200,
                    100
                ));
            }
        });
    }

    private spawnFood(): Food {
        const food = new Food(
            `food_${Date.now()}_${Math.random()}`,
            Math.random() * this.width,
            Math.random() * this.height,
            Math.random() * 5 + 1
        );
        this.food.push(food);
        return food;
    }

    addPlayer(socketId: string, name: string, faction: FactionType): Player | null {
        if (!FACTIONS[faction]) {
            const keys = Object.keys(FACTIONS) as FactionType[];
            faction = keys[Math.floor(Math.random() * keys.length)];
        }

        const player = new Player(
            socketId,
            name || 'Player',
            faction,
            Math.random() * (this.width - 400) + 200,
            Math.random() * (this.height - 400) + 200,
            20
        );

        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId: string): void {
        this.players.delete(socketId);
    }

    getPlayer(socketId: string): Player | undefined {
        return this.players.get(socketId);
    }

    updatePlayerTarget(socketId: string, x: number, y: number): void {
        const player = this.players.get(socketId);
        if (player) {
            player.setTarget(x, y);
        }
    }

    splitPlayer(socketId: string): void {
        const player = this.players.get(socketId);
        if (player && player.canSplit()) {
            player.split();
        }
    }

    ejectMass(socketId: string): void {
        const player = this.players.get(socketId);
        if (player && player.canEject()) {
            const ejected = player.eject();
            if (ejected) {
                this.ejectedMass.push(ejected);
            }
        }
    }

    update(): void {
        // Update all players
        this.players.forEach((player) => {
            player.update(this.width, this.height);
        });

        // Update ejected mass
        this.ejectedMass = this.ejectedMass.filter(mass => {
            mass.x += mass.velocityX;
            mass.y += mass.velocityY;
            mass.velocityX *= 0.95;
            mass.velocityY *= 0.95;
            mass.lifetime--;
            return mass.lifetime > 0;
        });

        // Check collisions
        this.checkFoodCollisions();
        this.checkEjectedMassCollisions();
        this.checkPlayerCollisions();
        this.updateBases();

        // Respawn food
        while (this.food.length < this.foodCount) {
            this.spawnFood();
        }
    }

    private checkFoodCollisions(): void {
        this.players.forEach((player) => {
            player.cells.forEach((cell) => {
                this.food = this.food.filter((food) => {
                    const dist = Math.sqrt((cell.x - food.x) ** 2 + (cell.y - food.y) ** 2);
                    if (dist < cell.radius) {
                        let massGain = food.mass;
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

    private checkEjectedMassCollisions(): void {
        this.players.forEach((player) => {
            player.cells.forEach((cell) => {
                this.ejectedMass = this.ejectedMass.filter((mass) => {
                    const dist = Math.sqrt((cell.x - mass.x) ** 2 + (cell.y - mass.y) ** 2);
                    if (dist < cell.radius && mass.ownerId !== player.id) {
                        cell.mass += mass.mass;
                        return false;
                    }
                    return true;
                });
            });
        });
    }

    private checkPlayerCollisions(): void {
        const playersArray = Array.from(this.players.values());

        for (let i = 0; i < playersArray.length; i++) {
            for (let j = i + 1; j < playersArray.length; j++) {
                const player1 = playersArray[i];
                const player2 = playersArray[j];

                if (player1.faction === player2.faction) continue;

                player1.cells.forEach((cell1) => {
                    player2.cells.forEach((cell2) => {
                        const dist = Math.sqrt((cell1.x - cell2.x) ** 2 + (cell1.y - cell2.y) ** 2);

                        if (cell1.mass > cell2.mass * GAME_CONFIG.EATING_SIZE_RATIO) {
                            if (dist < cell1.radius - cell2.radius * GAME_CONFIG.COLLISION_OVERLAP) {
                                cell1.mass += cell2.mass * GAME_CONFIG.MASS_ABSORPTION_RATE;
                                cell2.mass = 0;
                            }
                        } else if (cell2.mass > cell1.mass * GAME_CONFIG.EATING_SIZE_RATIO) {
                            if (dist < cell2.radius - cell1.radius * GAME_CONFIG.COLLISION_OVERLAP) {
                                cell2.mass += cell1.mass * GAME_CONFIG.MASS_ABSORPTION_RATE;
                                cell1.mass = 0;
                            }
                        }
                    });
                });

                player1.cells = player1.cells.filter(c => c.mass > 0);
                player2.cells = player2.cells.filter(c => c.mass > 0);

                if (player1.cells.length === 0) {
                    player1.respawn(this.width, this.height);
                }
                if (player2.cells.length === 0) {
                    player2.respawn(this.width, this.height);
                }
            }
        }
    }

    private updateBases(): void {
        this.bases.forEach((base) => {
            const playersInBase: { faction: FactionType; mass: number }[] = [];

            this.players.forEach((player) => {
                player.cells.forEach((cell) => {
                    const dist = Math.sqrt((cell.x - base.x) ** 2 + (cell.y - base.y) ** 2);
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

    getState(): GameState {
        const players = Array.from(this.players.values()).map(p => p.serialize());

        return {
            players,
            food: this.food.map(f => f.serialize()),
            ejectedMass: this.ejectedMass.map(m => ({
                id: m.id,
                x: m.x,
                y: m.y,
                mass: m.mass,
                radius: Math.sqrt(m.mass) * 4
            })),
            bases: this.bases.map(b => b.serialize())
        };
    }

    getLeaderboard(): LeaderboardEntry[] {
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

    getFactionStats(): Record<FactionType, FactionStats> {
        const stats: Record<FactionType, FactionStats> = {} as Record<FactionType, FactionStats>;
        
        (Object.keys(FACTIONS) as FactionType[]).forEach(key => {
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
