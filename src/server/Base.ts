import { BaseData, FactionType } from '../shared/types';

export class Base {
    public id: string;
    public faction: FactionType;
    public controllingFaction: FactionType;
    public x: number;
    public y: number;
    public radius: number;
    public controlPoints: number;
    public captureProgress: Record<string, number> = {};
    public captureRate: number = 0.5;
    public decayRate: number = 0.1;

    constructor(id: string, faction: FactionType, x: number, y: number, radius: number = 200, controlPoints: number = 100) {
        this.id = id;
        this.faction = faction;
        this.controllingFaction = faction;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.controlPoints = controlPoints;
    }

    updateCapture(playersInBase: { faction: FactionType; mass: number }[]): void {
        const factionMass: Record<string, number> = {};
        
        playersInBase.forEach(player => {
            if (!factionMass[player.faction]) {
                factionMass[player.faction] = 0;
            }
            factionMass[player.faction] += player.mass;
        });

        // Update capture progress
        Object.keys(factionMass).forEach(faction => {
            if (!this.captureProgress[faction]) {
                this.captureProgress[faction] = 0;
            }

            // Use logarithmic scaling for capture rate based on mass
            // +1 prevents log(0) which would be -Infinity
            const massBonus = Math.log10(factionMass[faction] + 1);
            this.captureProgress[faction] += this.captureRate * massBonus;

            // Check for capture
            if (this.captureProgress[faction] >= this.controlPoints) {
                this.controllingFaction = faction as FactionType;
                Object.keys(this.captureProgress).forEach(f => {
                    if (f !== faction) {
                        this.captureProgress[f] = 0;
                    }
                });
            }
        });

        // Decay progress for factions not present
        Object.keys(this.captureProgress).forEach(faction => {
            if (!factionMass[faction]) {
                this.captureProgress[faction] = Math.max(0, this.captureProgress[faction] - this.decayRate);
            }
        });
    }

    serialize(): BaseData {
        return {
            id: this.id,
            originalFaction: this.faction,
            controllingFaction: this.controllingFaction,
            x: this.x,
            y: this.y,
            radius: this.radius,
            captureProgress: this.captureProgress as Record<FactionType, number>,
            controlPoints: this.controlPoints
        };
    }
}
