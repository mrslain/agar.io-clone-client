class Cell {
    constructor(config) {
        this.id = config.id || `cell_${Date.now()}_${Math.random()}`;
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.mass = config.mass || 20;
        this.targetX = config.x;
        this.targetY = config.y;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    get radius() {
        return Math.sqrt(this.mass) * 4;
    }

    update(worldWidth, worldHeight, speedMultiplier = 1) {
        // Calculate direction to target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            // Speed decreases with mass
            const speed = Math.min(10, 200 / Math.sqrt(this.mass)) * speedMultiplier;
            
            this.velocityX = (dx / dist) * speed;
            this.velocityY = (dy / dist) * speed;
        } else {
            this.velocityX *= 0.9;
            this.velocityY *= 0.9;
        }

        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Keep within bounds
        this.x = Math.max(this.radius, Math.min(worldWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(worldHeight - this.radius, this.y));

        // Mass decay for large cells
        if (this.mass > 100) {
            this.mass *= 0.9998;
        }
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            mass: this.mass,
            radius: this.radius
        };
    }
}

class Player {
    constructor(config) {
        this.id = config.id;
        this.name = config.name || 'Player';
        this.faction = config.faction;
        this.factionData = config.factionData;
        this.cells = [];
        this.score = 0;
        this.lastSplit = 0;
        this.lastEject = 0;
        this.splitCooldown = 500; // ms

        // Apply faction bonuses
        if (this.factionData.bonus === 'split') {
            this.splitCooldown *= this.factionData.bonusValue;
        }

        // Create initial cell
        this.cells.push(new Cell({
            id: `${this.id}_cell_0`,
            x: config.x,
            y: config.y,
            mass: config.mass || 20
        }));
    }

    setTarget(x, y) {
        this.cells.forEach(cell => {
            cell.targetX = x;
            cell.targetY = y;
        });
    }

    update(worldWidth, worldHeight) {
        const speedMultiplier = this.factionData.bonus === 'speed' ? this.factionData.bonusValue : 1;
        
        this.cells.forEach(cell => {
            cell.update(worldWidth, worldHeight, speedMultiplier);
        });

        // Apply faction regen bonus
        if (this.factionData.bonus === 'regen' && this.cells.length > 0) {
            this.cells.forEach(cell => {
                if (cell.mass < 50) {
                    cell.mass += this.factionData.bonusValue;
                }
            });
        }

        // Merge cells if they're close enough and split recently
        this.mergeCells();
    }

    mergeCells() {
        const now = Date.now();
        if (now - this.lastSplit < 5000) return; // 5 seconds before merging

        for (let i = 0; i < this.cells.length; i++) {
            for (let j = i + 1; j < this.cells.length; j++) {
                const cell1 = this.cells[i];
                const cell2 = this.cells[j];
                
                const dist = Math.sqrt((cell2.x - cell1.x) ** 2 + (cell2.y - cell1.y) ** 2);
                const mergeDistance = (cell1.radius + cell2.radius) * 0.5;

                if (dist < mergeDistance) {
                    // Merge into larger cell
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

    canSplit() {
        const now = Date.now();
        return this.cells.length < 16 && 
               now - this.lastSplit > this.splitCooldown &&
               this.cells.some(c => c.mass >= 40);
    }

    split() {
        const newCells = [];
        
        this.cells.forEach((cell, index) => {
            if (cell.mass >= 40 && this.cells.length + newCells.length < 16) {
                const newMass = cell.mass / 2;
                cell.mass = newMass;
                
                // Calculate split direction
                const angle = Math.atan2(cell.targetY - cell.y, cell.targetX - cell.x);
                const splitDistance = cell.radius * 2;
                
                const newCell = new Cell({
                    id: `${this.id}_cell_${Date.now()}_${Math.random()}`,
                    x: cell.x + Math.cos(angle) * splitDistance,
                    y: cell.y + Math.sin(angle) * splitDistance,
                    mass: newMass
                });
                
                // Give momentum to new cell
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

    canEject() {
        const now = Date.now();
        return now - this.lastEject > 100 && this.cells.some(c => c.mass >= 30);
    }

    eject() {
        // Find largest cell
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
            lifetime: 300, // 5 seconds at 60fps
            update() {
                this.x += this.velocityX;
                this.y += this.velocityY;
                this.velocityX *= 0.95;
                this.velocityY *= 0.95;
            },
            serialize() {
                return {
                    id: this.id,
                    x: this.x,
                    y: this.y,
                    mass: this.mass,
                    radius: Math.sqrt(this.mass) * 4
                };
            }
        };
    }

    getTotalMass() {
        return this.cells.reduce((total, cell) => total + cell.mass, 0);
    }

    getCenter() {
        if (this.cells.length === 0) return { x: 0, y: 0 };
        
        const totalMass = this.getTotalMass();
        let centerX = 0;
        let centerY = 0;
        
        this.cells.forEach(cell => {
            centerX += cell.x * cell.mass;
            centerY += cell.y * cell.mass;
        });
        
        return {
            x: centerX / totalMass,
            y: centerY / totalMass
        };
    }

    respawn(worldWidth, worldHeight) {
        this.cells = [new Cell({
            id: `${this.id}_cell_${Date.now()}`,
            x: Math.random() * (worldWidth - 400) + 200,
            y: Math.random() * (worldHeight - 400) + 200,
            mass: 20
        })];
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

module.exports = Player;
