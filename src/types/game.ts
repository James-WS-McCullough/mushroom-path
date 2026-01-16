export const TileType = {
	GRASS: "grass",
	BRAMBLE: "bramble",
	MUSHROOM: "mushroom",
	VOID: "void",
	STONE: "stone",
	WATER: "water",
	DIRT: "dirt",
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface Position {
	x: number;
	y: number;
}

export interface Tile {
	type: TileType;
	position: Position;
}

export interface Room {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type FlowDirection = "up" | "down" | "left" | "right";

export interface Level {
	name: string;
	width: number;
	height: number;
	grid: TileType[][];
	startPosition: Position;
	rooms?: Room[];
	waterFlow?: Record<string, FlowDirection>; // key: "x,y" -> flow direction
}

export interface GameState {
	tiles: Tile[][];
	playerPosition: Position;
	hasWon: boolean;
}

export type Direction = "up" | "down" | "left" | "right";

// World elements that modify level generation
export const WorldElement = {
	RIVERS: "rivers",
	DIRT: "dirt",
} as const;

export type WorldElement = (typeof WorldElement)[keyof typeof WorldElement];
