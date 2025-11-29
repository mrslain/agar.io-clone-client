/**
 * 2D Vector class for game physics calculations
 * Ported from original CoffeeScript implementation
 */
export class Vector {
    public x: number;
    public y: number;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    add(v: Vector): Vector {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    subtract(v: Vector): Vector {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    multiply(v: Vector): Vector {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    multiplyScalar(s: number): Vector {
        this.x *= s;
        this.y *= s;
        return this;
    }

    divide(v: Vector): Vector {
        this.x /= v.x;
        this.y /= v.y;
        return this;
    }

    divideScalar(s: number): Vector {
        if (s !== 0) {
            this.x /= s;
            this.y /= s;
        }
        return this;
    }

    invert(): Vector {
        this.x *= -1;
        this.y *= -1;
        return this;
    }

    copy(v: Vector): Vector {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    clone(): Vector {
        return new Vector(this.x, this.y);
    }

    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vector {
        const mag = this.magnitude();
        if (mag !== 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }

    distance(v: Vector): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    dot(v: Vector): number {
        return this.x * v.x + this.y * v.y;
    }

    angle(): number {
        return Math.atan2(this.y, this.x);
    }

    static fromAngle(angle: number, length: number = 1): Vector {
        return new Vector(Math.cos(angle) * length, Math.sin(angle) * length);
    }
}
