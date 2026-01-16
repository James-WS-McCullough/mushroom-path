import { type Level, TileType } from "../types/game";

const G = TileType.GRASS;
const B = TileType.BRAMBLE;

export const level1: Level = {
	name: "Garden Path",
	width: 7,
	height: 7,
	grid: [
		[G, G, G, G, G, G, G],
		[G, B, G, B, G, B, G],
		[G, G, G, G, G, G, G],
		[G, B, G, B, G, B, G],
		[G, G, G, G, G, G, G],
		[G, B, G, B, G, B, G],
		[G, G, G, G, G, G, G],
	],
	startPosition: { x: 0, y: 6 },
};

export const levels: Level[] = [level1];
