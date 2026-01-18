import type { Level } from "../types/game";
import { TileType } from "../types/game";

// Shorthand tile type constants for compact level definitions
const G = TileType.GRASS;
const B = TileType.BRAMBLE;
const S = TileType.STONE;
const D = TileType.DIRT;
const V = TileType.VOID;

/**
 * Tutorial levels - 5 handcrafted puzzles teaching mechanics progressively
 *
 * Puzzle 1: Movement - Simple straight path (5 tiles)
 * Puzzle 2: Jumping - Brambles to jump over
 * Puzzle 3: Planning - Connected rectangles (easy to get stuck without planning)
 * Puzzle 4: Stone - Stone bridges for backtracking
 * Puzzle 5: Dirt - Mud tiles requiring two visits
 */
export const tutorialLevels: Level[] = [
	// Puzzle 1: First Steps - Simple straight path (5 tiles)
	// Just walk and plant - teaches basic movement
	{
		name: "Grandpa's Garden: First Steps",
		width: 5,
		height: 1,
		grid: [[G, G, G, G, G]],
		startPosition: { x: 0, y: 0 },
	},

	// Puzzle 2: Hop Over - Brambles to jump
	// Teaches jumping mechanic with brambles
	// Layout:
	// G B G
	// G G G
	// G B G
	// Solution: Navigate around while jumping over brambles
	{
		name: "Grandpa's Garden: Hop Over",
		width: 3,
		height: 3,
		grid: [
			[G, B, G],
			[G, G, G],
			[G, B, G],
		],
		startPosition: { x: 0, y: 0 },
	},

	// Puzzle 3: Think Ahead - Connected rectangles
	// Teaches planning - easy to get stuck without thinking ahead
	// Layout:
	// G G V
	// G G G
	// V G G
	// Solution requires visiting corners in right order
	{
		name: "Grandpa's Garden: Think Ahead",
		width: 3,
		height: 3,
		grid: [
			[G, G, V],
			[G, G, G],
			[V, G, G],
		],
		startPosition: { x: 0, y: 0 },
	},

	// Puzzle 4: Stone Bridges - Stone tiles for backtracking
	// Teaches that stone doesn't grow mushrooms and can be reused
	// Layout:
	// G G S G
	// V V S V
	// G G S G
	// Solution: Use stone column to navigate between left and right sides
	{
		name: "Grandpa's Garden: Stone Bridge",
		width: 4,
		height: 3,
		grid: [
			[G, G, S, G],
			[V, V, S, V],
			[G, G, S, G],
		],
		startPosition: { x: 0, y: 0 },
	},

	// Puzzle 5: Muddy Path - Dirt tiles requiring two visits
	// Teaches dirt mechanic (dirt -> grass -> mushroom)
	// Layout:
	// G D G
	// D G D
	// G D G
	// Solution: Plan route to visit dirt tiles twice
	{
		name: "Grandpa's Garden: Muddy Path",
		width: 3,
		height: 3,
		grid: [
			[G, D, G],
			[D, G, D],
			[G, D, G],
		],
		startPosition: { x: 1, y: 1 },
	},
];
