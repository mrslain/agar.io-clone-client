// Faction base for capture mechanics
class Base {
    constructor(config) {
        this.id = config.id;
        this.faction = config.faction; // Original faction
        this.controllingFaction = config.faction; // Current controller
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius || 200;
        this.controlPoints = config.controlPoints || 100; // Points needed to capture
        this.captureProgress = {}; // { faction: points }
        this.captureRate = 0.5; // Points per tick per mass unit
        this.decayRate = 0.1; // Points decay per tick when no players present
    }

    updateCapture(playersInBase) {
        // Count total mass per faction in base
        const factionMass = {};
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
            
            // Increase capture progress based on mass present
            const massBonus = Math.log10(factionMass[faction] + 1);
            this.captureProgress[faction] += this.captureRate * massBonus;
            
            // Check for capture
            if (this.captureProgress[faction] >= this.controlPoints) {
                this.controllingFaction = faction;
                // Reset other factions' progress
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

        // Controlling faction gets defensive bonus
        if (this.controllingFaction && !factionMass[this.controllingFaction]) {
            // If no controlling faction members present, base becomes contestable faster
        }
    }

    serialize() {
        return {
            id: this.id,
            originalFaction: this.faction,
            controllingFaction: this.controllingFaction,
            x: this.x,
            y: this.y,
            radius: this.radius,
            captureProgress: this.captureProgress,
            controlPoints: this.controlPoints
        };
    }
}

module.exports = Base;
