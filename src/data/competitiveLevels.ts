import type { Level } from "../types/game";
import { TileType } from "../types/game";

const G = TileType.GRASS;
const B = TileType.BRAMBLE;
const V = TileType.VOID;
const M = TileType.MUSHROOM_BAG;

/**
 * Competitive test level - a symmetric arena for 2 players
 * Player 1 starts at top-left, Player 2 at bottom-right
 * Mushroom bags are scattered symmetrically
 */
export const competitiveLevel1: Level = {
	name: "Dew's Challenge",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, V, B, G, B, V, V, V],
		[V, G, G, G, G, G, G, G, V],
		[V, G, M, G, B, G, G, G, V],
		[B, G, G, G, G, G, G, G, B],
		[G, G, B, G, G, G, B, G, G],
		[B, G, G, G, G, G, G, G, B],
		[V, G, G, G, B, G, M, G, V],
		[V, G, G, G, G, G, G, G, V],
		[V, V, V, B, G, B, V, V, V],
	],
};

/**
 * Smaller test level for quick games
 */
export const competitiveLevel2: Level = {
	name: "Quick Match",
	width: 7,
	height: 7,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, B, G, B, V, V],
		[V, G, G, G, G, G, V],
		[B, G, M, B, G, G, B],
		[G, G, B, G, B, G, G],
		[B, G, G, B, M, G, B],
		[V, G, G, G, G, G, V],
		[V, V, B, G, B, V, V],
	],
};

/**
 * Larger arena with more mushroom bags
 */
export const competitiveLevel3: Level = {
	name: "Grand Arena",
	width: 11,
	height: 11,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, V, B, G, G, G, B, V, V, V],
		[V, G, G, G, G, B, G, G, G, G, V],
		[V, G, M, G, G, G, G, G, G, G, V],
		[B, G, G, G, B, G, B, G, G, G, B],
		[G, G, G, B, G, G, G, B, G, G, G],
		[G, B, G, G, G, M, G, G, G, B, G],
		[G, G, G, B, G, G, G, B, G, G, G],
		[B, G, G, G, B, G, B, G, G, G, B],
		[V, G, G, G, G, G, G, G, M, G, V],
		[V, G, G, G, G, B, G, G, G, G, V],
		[V, V, V, B, G, G, G, B, V, V, V],
	],
};

export const competitiveLevels = [
	competitiveLevel1,
	competitiveLevel2,
	competitiveLevel3,
];
