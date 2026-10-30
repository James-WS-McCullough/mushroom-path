/**
 * Farming mode simulation.
 *
 * Plain data and functions only - no Vue, timers or sounds - so the farm can
 * be tested with fake time and fast-forwarded for offline progress.
 * Functions update the state they're given in place, since the farm ticks
 * many times a second.
 */

import type { Position } from "../types/game";
import { posKey } from "../utils/positionUtils";

export const FARM = {
	/** How long a mushroom takes to grow */
	GROW_MS: 10_000,
	/** Watered mushrooms grow this many times faster */
	WATERED_SPEEDUP: 2,
	/** Mushrooms you can carry at once */
	BASKET_CAPACITY: 10,
	/** 🍄 earned per mushroom sold */
	MUSHROOM_VALUE: 1,
	/** Most time away that counts towards offline progress */
	OFFLINE_CAP_MS: 8 * 60 * 60 * 1000,
} as const;

/** A patch of soil. `growth` is null when empty, then 0 → 1 while growing; 1 is ripe */
export interface PlotTile {
	kind: "plot";
	growth: number | null;
	watered: boolean;
}

/** Where mushrooms are sold */
export interface LogTile {
	kind: "log";
}

export type FarmTile = PlotTile | LogTile;

export interface FarmState {
	/** Keyed by "x,y" */
	tiles: Record<string, FarmTile>;
	/** 🍄 to spend */
	money: number;
	/** Mushrooms in the player's basket */
	basket: number;
	basketCapacity: number;
	/** Lifetime mushrooms sold, for stats */
	totalSold: number;
}

export type TapResult =
	| { kind: "planted" }
	| { kind: "watered" }
	| { kind: "harvested" }
	| { kind: "basketFull" }
	| { kind: "sold"; count: number; earned: number }
	| { kind: "nothing" };

const START_SIZE = 3;

/** A new farm: a 3x3 patch of plots with the hollow log beside it */
export function createFarm(): FarmState {
	const tiles: Record<string, FarmTile> = {};
	for (let y = 0; y < START_SIZE; y++) {
		for (let x = 0; x < START_SIZE; x++) {
			tiles[posKey(x, y)] = emptyPlot();
		}
	}
	tiles[posKey(START_SIZE, 1)] = { kind: "log" };

	return {
		tiles,
		money: 0,
		basket: 0,
		basketCapacity: FARM.BASKET_CAPACITY,
		totalSold: 0,
	};
}

function emptyPlot(): PlotTile {
	return { kind: "plot", growth: null, watered: false };
}

export function getTile(state: FarmState, pos: Position): FarmTile | undefined {
	return state.tiles[posKey(pos.x, pos.y)];
}

export function isRipe(tile: FarmTile | undefined): boolean {
	return tile?.kind === "plot" && tile.growth === 1;
}

export function isGrowing(tile: FarmTile | undefined): boolean {
	return tile?.kind === "plot" && tile.growth !== null && tile.growth < 1;
}

/** Advance the farm by `ms` milliseconds */
export function tick(state: FarmState, ms: number): void {
	if (ms <= 0) return;
	for (const tile of Object.values(state.tiles)) {
		if (tile.kind !== "plot" || tile.growth === null || tile.growth >= 1) {
			continue;
		}
		const speed = tile.watered ? FARM.WATERED_SPEEDUP : 1;
		tile.growth = Math.min(1, tile.growth + (ms * speed) / FARM.GROW_MS);
	}
}

/**
 * The player taps a tile: plant an empty plot, water a growing one, pick a
 * ripe one, or sell the basket at the log.
 */
export function tapTile(state: FarmState, pos: Position): TapResult {
	const tile = getTile(state, pos);
	if (!tile) return { kind: "nothing" };

	if (tile.kind === "log") {
		if (state.basket === 0) return { kind: "nothing" };
		const count = state.basket;
		const earned = count * FARM.MUSHROOM_VALUE;
		state.basket = 0;
		state.money += earned;
		state.totalSold += count;
		return { kind: "sold", count, earned };
	}

	if (tile.growth === null) {
		tile.growth = 0;
		return { kind: "planted" };
	}

	if (tile.growth < 1) {
		if (tile.watered) return { kind: "nothing" };
		tile.watered = true;
		return { kind: "watered" };
	}

	if (state.basket >= state.basketCapacity) {
		return { kind: "basketFull" };
	}
	state.basket += 1;
	tile.growth = null;
	tile.watered = false;
	return { kind: "harvested" };
}

// =============================================================================
// SAVING
// =============================================================================

const SAVE_VERSION = 1;

interface FarmSave {
	version: number;
	savedAt: number;
	state: FarmState;
}

export function serializeFarm(state: FarmState, now: number): string {
	const save: FarmSave = { version: SAVE_VERSION, savedAt: now, state };
	return JSON.stringify(save);
}

/**
 * Load a saved farm and catch it up on the time that passed since it was
 * saved (up to the offline cap). Returns null if the save can't be used.
 */
export function deserializeFarm(
	json: string,
	now: number,
): { state: FarmState; awayMs: number } | null {
	let save: Partial<FarmSave> | null;
	try {
		save = JSON.parse(json) as Partial<FarmSave> | null;
	} catch {
		return null;
	}
	const state = save?.state;
	if (
		!save ||
		save.version !== SAVE_VERSION ||
		typeof save.savedAt !== "number" ||
		!state ||
		typeof state.tiles !== "object" ||
		typeof state.money !== "number" ||
		typeof state.basket !== "number"
	) {
		return null;
	}

	const restored: FarmState = {
		tiles: state.tiles,
		money: state.money,
		basket: state.basket,
		basketCapacity: state.basketCapacity ?? FARM.BASKET_CAPACITY,
		totalSold: state.totalSold ?? 0,
	};
	const awayMs = Math.min(Math.max(now - save.savedAt, 0), FARM.OFFLINE_CAP_MS);
	tick(restored, awayMs);
	return { state: restored, awayMs };
}
