/**
 * Game constants - centralized magic numbers and timing values
 */

import { type WorldElement, WorldElement as WE } from "../types/game";

// =============================================================================
// ANIMATION TIMINGS (milliseconds)
// =============================================================================

export const ANIMATION = {
	/** Time for hop animation to complete before next action */
	HOP_DURATION: 200,
	/** Time between slide path steps (water, ice, bounce) */
	SLIDE_STEP: 150,
	/** Portal shrink phase duration */
	PORTAL_SHRINK: 200,
	/** Pause between portal poof effects */
	PORTAL_POOF_PAUSE: 350,
	/** Portal grow phase duration */
	PORTAL_GROW: 200,
	/** Mushroom plant popup display time */
	MUSHROOM_POPUP: 400,
	/** Dirt cleanup animation display time */
	DIRT_CLEANUP: 800,
	/** Acorn collection popup display time */
	ACORN_POPUP: 1600,
	/** Bounce pad effect display time */
	BOUNCE_PAD_EFFECT: 500,
	/** Bounce animation total duration */
	BOUNCE_DURATION: 400,
} as const;

// =============================================================================
// GAME MECHANICS
// =============================================================================

export const MECHANICS = {
	/** Tide floods every N moves (phase 0 = flooded) */
	TIDE_PERIOD: 5,
	/** Maximum pathfinding iterations before giving up */
	MAX_PATHFINDING_ITERATIONS: 5000,
	/** How far bounce pads launch the player */
	MAX_BOUNCE_DISTANCE: 3,
	/** Lilypad cooldown after being submerged */
	LILYPAD_COOLDOWN: 4,
} as const;

// =============================================================================
// HINT SYSTEM
// =============================================================================

export const HINTS = {
	/** Milliseconds of idle time before showing hint */
	IDLE_THRESHOLD_MS: 4000,
	/** Show hints when this many or fewer tiles remain */
	TILES_THRESHOLD: 8,
} as const;

// =============================================================================
// LEVEL GENERATION
// =============================================================================

/** Levels in each world */
export const LEVELS_PER_WORLD = 8;

export const LEVEL_GEN = {
	/** Most tiles to plant on a world's first level - worlds start small... */
	FIRST_LEVEL_MAX_TILES: 22,
	/** ...and build up to this on their last level (never bigger) */
	LAST_LEVEL_MAX_TILES: 40,
	/** Each level has between (max - this) and max tiles to plant */
	TILE_RANGE: 12,
	/** Maximum recursion depth for path finding */
	MAX_RECURSION_DEPTH: 500,
	/** Maximum attempts for various generation steps */
	MAX_GENERATION_ATTEMPTS: 30,
	/** Maximum retries for full level generation */
	MAX_LEVEL_RETRIES: 100,
	/** Maximum puddle placement attempts */
	MAX_PUDDLE_ATTEMPTS: 30,
	/** Minimum grass tiles needed for strip generation */
	MIN_GRASS_FOR_STRIP: 12,
	/** Minimum grid dimension for strip generation */
	MIN_DIMENSION_FOR_STRIP: 5,
} as const;

// =============================================================================
// WORLD ELEMENTS
// =============================================================================

/** World elements that never appear in the same world (clashing mechanics or vibes) */
export const INCOMPATIBLE_ELEMENTS: readonly (readonly [WorldElement, WorldElement])[] = [
	[WE.RIVERS, WE.POND], // Both water-based, conflicting mechanics
	[WE.ICE, WE.POND], // Vibes don't match (frozen vs lily-pads)
	[WE.TIDES, WE.ICE], // Beach and frozen don't mix
	[WE.TIDES, WE.POND], // Too much water mechanics confusion
	[WE.TIDES, WE.RIVERS], // Too much water mechanics confusion
	[WE.ACORN, WE.ICE], // Autumn doesn't mix with frozen
	[WE.ACORN, WE.POND], // Autumn doesn't mix with night/lily-pads
	[WE.ACORN, WE.TIDES], // Autumn doesn't mix with beach
	[WE.STAR, WE.ICE], // Starlit doesn't mix with frozen
	[WE.STAR, WE.POND], // Starlit doesn't mix with night/lily-pads
	[WE.STAR, WE.TIDES], // Starlit doesn't mix with beach
];
