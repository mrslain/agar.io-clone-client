import { Vector } from '../shared/Vector';
import { CellData, FactionType, FactionInfo, GAME_CONFIG, FACTIONS } from '../shared/types';

export class Cell {
    public id: string;
    public x: number;
    public y: number;
    public mass: number;
    public targetX: number;
    public targetY: number;
    public velocityX: number = 0;
    public velocityY: number = 0;

    constructor(id: string, x: number, y: number, mass: number = 20) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.targetX = x;
        this.targetY = y;
    }

    get radius(): number {
        return Math.sqrt(this.mass) * GAME_CONFIG.RADIUS_MULTIPLIER;
    }

    update(worldWidth: number, worldHeight: number, speedMultiplier: number = 1): void {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const speed = Math.min(GAME_CONFIG.MAX_SPEED, GAME_CONFIG.SPEED_DIVISOR / Math.sqrt(this.mass)) * speedMultiplier;
            this.velocityX = (dx / dist) * speed;
            this.velocityY = (dy / dist) * speed;
        } else {
            this.velocityX *= 0.9;
            this.velocityY *= 0.9;
        }

        this.x += this.velocityX;
        this.y += this.velocityY;

        // Keep within bounds
        this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));

        // Mass decay for large cells
        if (this.mass > GAME_CONFIG.MASS_DECAY_THRESHOLD) {
            this.mass *= GAME_CONFIG.MASS_DECAY_RATE;
        }
    }

    serialize(): CellData {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            mass: this.mass,
            radius: this.radius
        };
    }
}

export class Player {
    public id: string;
    public name: string;
    public faction: FactionType;
    public factionData: FactionInfo;
    public cells: Cell[] = [];
    public score: number = 0;
    public lastSplit: number = 0;
    public lastEject: number = 0;
    public splitCooldown: number = 500;

    constructor(id: string, name: string, faction: FactionType, x: number, y: number, mass: number = 20) {
        this.id = id;
        this.name = name || 'Player';
        this.faction = faction;
        this.factionData = FACTIONS[faction];

        if (this.factionData.bonus === 'split') {
            this.splitCooldown *= this.factionData.bonusValue;
        }

        this.cells.push(new Cell(`${id}_cell_0`, x, y, mass));
    }

    setTarget(x: number, y: number): void {
        this.cells.forEach(cell => {
            cell.targetX = x;
            cell.targetY = y;
        });
    }

    update(worldWidth: number, worldHeight: number): void {
        const speedMultiplier = this.factionData.bonus === 'speed' ? this.factionData.bonusValue : 1;

        this.cells.forEach(cell => {
            cell.update(worldWidth, worldHeight, speedMultiplier);
        });

        // Apply regen bonus
        if (this.factionData.bonus === 'regen' && this.cells.length > 0) {
            this.cells.forEach(cell => {
                if (cell.mass < 50) {
                    cell.mass += this.factionData.bonusValue;
                }
            });
        }

        this.mergeCells();
    }

    mergeCells(): void {
        const now = Date.now();
        if (now - this.lastSplit < 5000) return;

        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cell1 = this.cells[i];
                const cell2 = this.cells[j];

                const dist = Math.sqrt((cell2.x - cell1.x) ** 2 + (cell2.y - cell1.y) ** 2);
                const mergeDistance = (cell1.radius + cell2.radius) * 0.5;

                if (dist < mergeDistance) {
                    if (cell1.mass >= cell2.mass) {
                        cell1.mass += cell2.mass;
                        cell1.x = (cell1.x + cell2.x) / 2;
                        cell1.y = (cell1.y + cell2.y) / 2;
                        this.cells.splice(j, 1);
                        j--;
                    } else {
                        cell2.mass += cell1.mass;
                        cell2.x = (cell1.x + cell2.x) / 2;
                        cell2.y = (cell1.y + cell2.y) / 2;
                        this.cells.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }
        }
    }

    canSplit(): boolean {
        const now = Date.now();
        return this.cells.length < 16 &&
               now - this.lastSplit > this.splitCooldown &&
               this.cells.some(c => c.mass >= 40);
    }

    split(): Cell[] {
        const newCells: Cell[] = [];

        this.cells.forEach((cell) => {
            if (cell.mass >= 40 && this.cells.length + newCells.length < 16) {
                const newMass = cell.mass / 2;
                cell.mass = newMass;

                const angle = Math.atan2(cell.targetY - cell.y, cell.targetX - cell.x);
                const splitDistance = cell.radius * 2;

                const newCell = new Cell(
                    `${this.id}_cell_${Date.now()}_${Math.random()}`,
                    cell.x + Math.cos(angle) * splitDistance,
                    cell.y + Math.sin(angle) * splitDistance,
                    newMass
                );

                newCell.velocityX = Math.cos(angle) * 20;
                newCell.velocityY = Math.sin(angle) * 20;
                newCell.targetX = cell.targetX;
                newCell.targetY = cell.targetY;

                newCells.push(newCell);
            }
        });

        this.cells.push(...newCells);
        this.lastSplit = Date.now();
        return newCells;
    }

    canEject(): boolean {
        const now = Date.now();
        return now - this.lastEject > 100 && this.cells.some(c => c.mass >= 30);
    }

    eject(): { id: string; ownerId: string; x: number; y: number; velocityX: number; velocityY: number; mass: number; lifetime: number } | null {
        const largestCell = this.cells.reduce((max, cell) =>
            cell.mass > max.mass ? cell : max, this.cells[0]);

        if (largestCell.mass < 30) return null;

        const ejectMass = 12;
        largestCell.mass -= ejectMass;

        const angle = Math.atan2(largestCell.targetY - largestCell.y, largestCell.targetX - largestCell.x);

        this.lastEject = Date.now();

        return {
            id: `eject_${Date.now()}_${Math.random()}`,
            ownerId: this.id,
            x: largestCell.x + Math.cos(angle) * largestCell.radius,
            y: largestCell.y + Math.sin(angle) * largestCell.radius,
            velocityX: Math.cos(angle) * 15,
            velocityY: Math.sin(angle) * 15,
            mass: ejectMass,
            lifetime: 300
        };
    }

    getTotalMass(): number {
        return this.cells.reduce((total, cell) => total + cell.mass, 0);
    }

    respawn(worldWidth: number, worldHeight: number): void {
        this.cells = [new Cell(
            `${this.id}_cell_${Date.now()}`,
            Math.random() * (worldWidth - 400) + 200,
            Math.random() * (worldHeight - 400) + 200,
            20
        )];
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            faction: this.faction,
            color: this.factionData.color,
            darkColor: this.factionData.darkColor,
            cells: this.cells.map(c => c.serialize()),
            totalMass: this.getTotalMass()
        };
    }
}
