export const TileType = {
	GRASS: "grass",
	BRAMBLE: "bramble",
	MUSHROOM: "mushroom",
	VOID: "void",
	STONE: "stone",
	WATER: "water",
	DIRT: "dirt",
	ICE: "ice",
	POND: "pond", // Lily-pad tiles (walkable bridge)
	POND_WATER: "pond_water", // Deep pond water (impassable obstacle)
	// Fairy ring portal flowers - each color pairs with its match
	PORTAL_PINK: "portal_pink",
	PORTAL_BLUE: "portal_blue",
	PORTAL_YELLOW: "portal_yellow",
	// Beach/tides tiles
	LOW_SAND: "low_sand", // Tidal zone - floods periodically
	SEA: "sea", // Always impassable, visual tide sync
	SAND_MUSHROOM: "sand_mushroom", // Mushroom planted on sand - still floods
	// Bounce pad
	BOUNCE_PAD: "bounce_pad", // Bounces player 3 tiles in movement direction
	// Honey
	HONEY: "honey", // Sticky tile - can walk off but cannot jump from here
	HONEY_MUSHROOM: "honey_mushroom", // Mushroom planted on honey - shows honey underneath
	// Acorn/Autumn tiles
	ACORN: "acorn", // Collectible - gives player an acorn when landed on
	SQUIRREL: "squirrel", // Obstacle that requires acorns to pass, becomes grass when fed
	// Star path tiles
	BASE_STAR: "base_star", // Landing here blooms all connected STAR_PATH tiles into mushrooms
	STAR_PATH: "star_path", // Connected to BASE_STAR, blooms when BASE_STAR is landed on
	STAR_MUSHROOM: "star_mushroom", // Mushroom planted on star tiles - unique starlit design
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
	solutionPath?: Position[]; // Pre-computed winning path from level generation
	squirrelRequirements?: Record<string, number>; // key: "x,y" -> acorns required (1-3)
	starConnections?: Record<string, string>; // key: STAR_PATH "x,y" -> BASE_STAR "x,y" it belongs to
	starTrailFrom?: Record<string, string>; // key: STAR_PATH "x,y" -> previous tile "x,y" in the chain (for visual trail)
	starTrailTo?: Record<string, string>; // key: tile "x,y" -> next tile "x,y" in the chain (for visual trail)
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
	ICE: "ice",
	FAIRY: "fairy",
	POND: "pond",
	TIDES: "tides",
	BOUNCE: "bounce",
	HONEY: "honey",
	ACORN: "acorn", // Autumn biome - squirrels need acorns to pass
	STAR: "star", // Starlit Plains - star paths that bloom when base star is stepped on
} as const;

export type WorldElement = (typeof WorldElement)[keyof typeof WorldElement];

// Portal tile types for easy iteration
export const PortalTypes = [
	TileType.PORTAL_PINK,
	TileType.PORTAL_BLUE,
	TileType.PORTAL_YELLOW,
] as const;

export type PortalType = (typeof PortalTypes)[number];

// Required tile types - tiles that must be visited to complete a level
// These tiles convert to mushrooms (or grass first) when stepped on/left
export const RequiredTileTypes = [
	TileType.GRASS,
	TileType.LOW_SAND,
	TileType.DIRT,
	TileType.HONEY,
	TileType.ACORN,
	TileType.SQUIRREL,
	TileType.BASE_STAR,
	TileType.STAR_PATH,
] as const;

export type RequiredTileType = (typeof RequiredTileTypes)[number];

// Helper to check if a tile type is required
export function isRequiredTile(
	tileType: TileType,
): tileType is RequiredTileType {
	return (RequiredTileTypes as readonly TileType[]).includes(tileType);
}

// Core walkable tile types - tiles the player can always walk/land on
// Note: Some tiles have conditional walkability (LOW_SAND+tide, POND+lilypad, SQUIRREL+acorns)
// and portals are also walkable but checked separately via isPortalTile()
export const WalkableTileTypes = [
	TileType.GRASS,
	TileType.STONE,
	TileType.WATER,
	TileType.DIRT,
	TileType.ICE,
	TileType.BOUNCE_PAD,
	TileType.HONEY,
	TileType.ACORN,
	TileType.BASE_STAR,
	TileType.STAR_PATH,
] as const;

export type WalkableTileType = (typeof WalkableTileTypes)[number];

// Helper to check if a tile type is walkable (core set, excludes conditional tiles)
export function isWalkableTile(
	tileType: TileType,
): tileType is WalkableTileType {
	return (WalkableTileTypes as readonly TileType[]).includes(tileType);
}
