import { FoodData } from '../shared/types';

const FOOD_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#52BE80'
];

export class Food {
    public id: string;
    public x: number;
    public y: number;
    public mass: number;
    public color: string;

    constructor(id: string, x: number, y: number, mass: number = 1) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.color = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    }

    get radius(): number {
        return Math.sqrt(this.mass) * 3;
    }

    serialize(): FoodData {
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
