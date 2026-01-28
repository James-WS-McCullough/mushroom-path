import type { FlowDirection, Level } from "../types/game";
import { TileType } from "../types/game";

const G = TileType.GRASS;
const B = TileType.BRAMBLE;
const V = TileType.VOID;
const M = TileType.MUSHROOM_BAG;
const S = TileType.STONE;
const W = TileType.WATER;
const I = TileType.ICE;
const P = TileType.BOUNCE_PAD;

/**
 * Classic Arena - the original symmetric arena
 * Player 1 starts at top-left, Player 2 at bottom-right
 */
export const classicArena: Level = {
	name: "Classic Arena",
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
 * Frozen Lake - ice in the center forces players to slide
 */
export const frozenLake: Level = {
	name: "Frozen Lake",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, B, G, G, G, B, V, V],
		[V, G, G, G, S, G, G, G, V],
		[B, G, M, G, I, G, G, G, B],
		[G, G, G, I, I, I, G, G, G],
		[G, S, I, I, B, I, I, S, G],
		[G, G, G, I, I, I, G, G, G],
		[B, G, G, G, I, G, M, G, B],
		[V, G, G, G, S, G, G, G, V],
		[V, V, B, G, G, G, B, V, V],
	],
};

/**
 * Bouncy Castle - bounce pads add chaos
 */
export const bouncyCastle: Level = {
	name: "Bouncy Castle",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, V, B, G, B, V, V, V],
		[V, G, G, G, P, G, G, G, V],
		[V, G, M, G, G, G, G, G, V],
		[B, G, G, G, B, G, G, G, B],
		[G, P, G, B, G, B, G, P, G],
		[B, G, G, G, B, G, G, G, B],
		[V, G, G, G, G, G, M, G, V],
		[V, G, G, G, P, G, G, G, V],
		[V, V, V, B, G, B, V, V, V],
	],
};

/**
 * River Crossing - water flows to stone exits
 * Water flows from top-center down to stone, or from sides to stone
 */
export const riverCrossing: Level = {
	name: "River Crossing",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	waterFlow: {
		// Top section flows down to stone at row 2
		"4,1": "down",
		// Middle section flows left/right to stone exits
		"4,3": "left",
		"4,4": "left",
		"4,5": "right",
		// Bottom section flows down to stone at row 6
		"4,7": "up",
	} as Record<string, FlowDirection>,
	grid: [
		[V, V, B, G, G, G, B, V, V],
		[V, G, G, G, W, G, G, G, V],
		[B, G, M, S, S, S, G, G, B],
		[G, G, G, S, W, G, G, G, G],
		[G, G, B, S, W, G, B, G, G],
		[G, G, G, G, W, S, G, G, G],
		[B, G, G, S, S, S, M, G, B],
		[V, G, G, G, W, G, G, G, V],
		[V, V, B, G, G, G, B, V, V],
	],
};

/**
 * Stone Garden - stones provide safe spots amid chaos
 */
export const stoneGarden: Level = {
	name: "Stone Garden",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, V, B, G, B, V, V, V],
		[V, G, G, G, S, G, G, G, V],
		[V, G, M, G, G, G, S, G, V],
		[B, G, G, S, B, G, G, G, B],
		[G, S, G, B, G, B, G, S, G],
		[B, G, G, G, B, S, G, G, B],
		[V, G, S, G, G, G, M, G, V],
		[V, G, G, G, S, G, G, G, V],
		[V, V, V, B, G, B, V, V, V],
	],
};

/**
 * Ice Rink - mostly ice with grass edges
 */
export const iceRink: Level = {
	name: "Ice Rink",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, B, G, G, G, B, V, V],
		[V, G, G, I, I, I, G, G, V],
		[B, G, I, I, I, I, I, M, B],
		[G, I, I, B, I, B, I, I, G],
		[G, I, I, I, S, I, I, I, G],
		[G, I, I, B, I, B, I, I, G],
		[B, M, I, I, I, I, I, G, B],
		[V, G, G, I, I, I, G, G, V],
		[V, V, B, G, G, G, B, V, V],
	],
};

/**
 * The Gauntlet - narrow passages with various hazards
 */
export const theGauntlet: Level = {
	name: "The Gauntlet",
	width: 11,
	height: 7,
	startPosition: { x: 1, y: 3 },
	grid: [
		[V, V, B, G, G, G, G, G, B, V, V],
		[V, B, G, G, B, I, B, G, G, B, V],
		[B, G, G, P, G, I, G, P, G, G, B],
		[G, G, M, G, S, I, S, G, M, G, G],
		[B, G, G, P, G, I, G, P, G, G, B],
		[V, B, G, G, B, I, B, G, G, B, V],
		[V, V, B, G, G, G, G, G, B, V, V],
	],
};

/**
 * Mixed Mayhem - a bit of everything (water flows to stone exits)
 */
export const mixedMayhem: Level = {
	name: "Mixed Mayhem",
	width: 11,
	height: 11,
	startPosition: { x: 1, y: 1 },
	waterFlow: {
		// Top water flows down to stone
		"5,3": "down",
		// Left water flows right to stone
		"3,4": "right",
		"3,5": "right",
		"3,6": "right",
		// Right water flows left to stone
		"7,4": "left",
		"7,5": "left",
		"7,6": "left",
		// Bottom water flows up to stone
		"5,7": "up",
	} as Record<string, FlowDirection>,
	grid: [
		[V, V, V, B, G, G, G, B, V, V, V],
		[V, G, G, G, G, B, G, G, G, G, V],
		[V, G, M, G, I, I, I, G, G, G, V],
		[B, G, G, S, S, W, S, S, G, G, B],
		[G, G, I, W, S, S, S, W, I, G, G],
		[G, B, I, W, S, P, S, W, I, B, G],
		[G, G, I, W, S, S, S, W, I, G, G],
		[B, G, G, S, S, W, S, S, G, G, B],
		[V, G, G, G, I, I, I, G, M, G, V],
		[V, G, G, G, G, B, G, G, G, G, V],
		[V, V, V, B, G, G, G, B, V, V, V],
	],
};

/**
 * Quick Match - smaller arena for fast games
 */
export const quickMatch: Level = {
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
 * Bounce Battle - bounce pads everywhere
 */
export const bounceBattle: Level = {
	name: "Bounce Battle",
	width: 9,
	height: 9,
	startPosition: { x: 1, y: 1 },
	grid: [
		[V, V, V, G, G, G, V, V, V],
		[V, G, G, P, G, P, G, G, V],
		[V, G, M, G, B, G, G, G, V],
		[G, P, G, G, P, G, G, P, G],
		[G, G, B, P, G, P, B, G, G],
		[G, P, G, G, P, G, G, P, G],
		[V, G, G, G, B, G, M, G, V],
		[V, G, G, P, G, P, G, G, V],
		[V, V, V, G, G, G, V, V, V],
	],
};

export const competitiveLevels = [
	classicArena,
	frozenLake,
	bouncyCastle,
	riverCrossing,
	stoneGarden,
	iceRink,
	theGauntlet,
	mixedMayhem,
	quickMatch,
	bounceBattle,
];

// Get a random competitive level
export function getRandomCompetitiveLevel(): Level {
	const index = Math.floor(Math.random() * competitiveLevels.length);
	return competitiveLevels[index] ?? classicArena;
}
