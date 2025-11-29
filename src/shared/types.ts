/**
 * Shared type definitions for the game
 */

export interface Color {
    r: number;
    g: number;
    b: number;
    a?: number;
}

export interface CellData {
    id: string;
    x: number;
    y: number;
    mass: number;
    radius: number;
}

export interface PlayerData {
    id: string;
    name: string;
    faction: FactionType;
    color: string;
    darkColor: string;
    cells: CellData[];
    totalMass: number;
}

export interface FoodData {
    id: string;
    x: number;
    y: number;
    mass: number;
    radius: number;
    color: string;
}

export interface BaseData {
    id: string;
    originalFaction: FactionType;
    controllingFaction: FactionType;
    x: number;
    y: number;
    radius: number;
    captureProgress: Record<FactionType, number>;
    controlPoints: number;
}

export interface EjectedMassData {
    id: string;
    x: number;
    y: number;
    mass: number;
    radius: number;
}

export type FactionType = 'RED' | 'BLUE' | 'GREEN' | 'PURPLE';

export interface FactionInfo {
    name: string;
    color: string;
    darkColor: string;
    bonus: 'speed' | 'mass' | 'regen' | 'split';
    bonusValue: number;
}

export interface FactionStats extends FactionInfo {
    totalMass: number;
    playerCount: number;
    basesControlled: number;
}

export interface GameState {
    players: PlayerData[];
    food: FoodData[];
    ejectedMass: EjectedMassData[];
    bases: BaseData[];
}

export interface LeaderboardEntry {
    id: string;
    name: string;
    faction: FactionType;
    mass: number;
}

export interface LeaderboardData {
    players: LeaderboardEntry[];
    factions: Record<FactionType, FactionStats>;
}

// Game configuration constants
export const GAME_CONFIG = {
    WORLD_WIDTH: 5000,
    WORLD_HEIGHT: 5000,
    FOOD_COUNT: 500,
    BASE_COUNT: 4,
    TICK_RATE: 60,
    
    // Combat mechanics
    EATING_SIZE_RATIO: 1.1,
    COLLISION_OVERLAP: 0.4,
    MASS_ABSORPTION_RATE: 0.8,
    
    // Cell mechanics
    MASS_DECAY_RATE: 0.9998,
    MASS_DECAY_THRESHOLD: 100,
    RADIUS_MULTIPLIER: 4,
    MAX_SPEED: 10,
    SPEED_DIVISOR: 200,
    
    // Blob physics
    BLOB_QUALITY: 32,
    BLOB_FRICTION: 1.035,
    BLOB_NODE_SMOOTHING: 0.05,
    BLOB_POSITION_SMOOTHING: 0.1,
    BLOB_JOINT_STRENGTH: 0.6,
    
    // Chat
    MAX_CHAT_MESSAGE_LENGTH: 200
};

export const FACTIONS: Record<FactionType, FactionInfo> = {
    RED: {
        name: 'Crimson Legion',
        color: '#E74C3C',
        darkColor: '#C0392B',
        bonus: 'speed',
        bonusValue: 1.1
    },
    BLUE: {
        name: 'Azure Dynasty',
        color: '#3498DB',
        darkColor: '#2980B9',
        bonus: 'mass',
        bonusValue: 1.1
    },
    GREEN: {
        name: 'Emerald Order',
        color: '#2ECC71',
        darkColor: '#27AE60',
        bonus: 'regen',
        bonusValue: 0.1
    },
    PURPLE: {
        name: 'Violet Empire',
        color: '#9B59B6',
        darkColor: '#8E44AD',
        bonus: 'split',
        bonusValue: 0.8
    }
};
