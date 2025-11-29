// Color palette for food based on type
const FOOD_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#52BE80'
];

class Food {
    constructor(config) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.mass = config.mass || 1;
        this.color = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    }

    get radius() {
        return Math.sqrt(this.mass) * 3;
    }

    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            mass: this.mass,
            radius: this.radius,
            color: this.color
        };
    }
}

module.exports = Food;
