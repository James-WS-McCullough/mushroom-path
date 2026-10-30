/**
 * Farming mode simulation.
 *
 * Plain data and functions only - no Vue, timers or sounds - so the farm can
 * be tested with fake time and fast-forwarded for offline progress.
 * Functions update the state they're given in place, since the farm ticks
 * many times a second.
 */

import type { Position } from "../types/game";
import { DIRECTIONS, getDirectionDelta, posKey } from "../utils/positionUtils";

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
	/** The first extra plot costs this, and each one after costs more */
	PLOT_BASE_COST: 10,
	PLOT_COST_GROWTH: 1.15,
	SPRINKLER_BASE_COST: 40,
	SPRINKLER_COST_GROWTH: 1.3,
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

/** Keeps the 8 tiles around it watered */
export interface SprinklerTile {
	kind: "sprinkler";
}

export type FarmTile = PlotTile | LogTile | SprinklerTile;

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
	/** Extra plots bought so far, which sets the price of the next */
	plotsBought: number;
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
		plotsBought: 0,
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

/** Keys of every tile a sprinkler is keeping watered */
export function getSprinkledKeys(state: FarmState): Set<string> {
	const sprinkled = new Set<string>();
	for (const [key, tile] of Object.entries(state.tiles)) {
		if (tile.kind !== "sprinkler") continue;
		const [x = 0, y = 0] = key.split(",").map(Number);
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx !== 0 || dy !== 0) sprinkled.add(posKey(x + dx, y + dy));
			}
		}
	}
	return sprinkled;
}

/** Advance the farm by `ms` milliseconds */
export function tick(state: FarmState, ms: number): void {
	if (ms <= 0) return;
	const sprinkled = getSprinkledKeys(state);
	for (const [key, tile] of Object.entries(state.tiles)) {
		if (tile.kind !== "plot" || tile.growth === null || tile.growth >= 1) {
			continue;
		}
		const isWet = tile.watered || sprinkled.has(key);
		const speed = isWet ? FARM.WATERED_SPEEDUP : 1;
		tile.growth = Math.min(1, tile.growth + (ms * speed) / FARM.GROW_MS);
	}
}

/**
 * The player taps a tile: plant an empty plot, water a growing one, pick a
 * ripe one, or sell the basket at the log.
 */
export function tapTile(state: FarmState, pos: Position): TapResult {
	const tile = getTile(state, pos);
	if (!tile || tile.kind === "sprinkler") return { kind: "nothing" };

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
		if (tile.watered || getSprinkledKeys(state).has(posKey(pos.x, pos.y))) {
			return { kind: "nothing" };
		}
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
// BUILDING
// =============================================================================

/** Empty spots beside the farm where a new plot can be bought */
export function getExpansionSpots(state: FarmState): Position[] {
	const spots = new Map<string, Position>();
	for (const key of Object.keys(state.tiles)) {
		const [x = 0, y = 0] = key.split(",").map(Number);
		for (const direction of DIRECTIONS) {
			const delta = getDirectionDelta(direction);
			const spot = { x: x + delta.x, y: y + delta.y };
			const spotKey = posKey(spot.x, spot.y);
			if (!state.tiles[spotKey]) spots.set(spotKey, spot);
		}
	}
	return [...spots.values()];
}

export function getPlotCost(state: FarmState): number {
	return Math.round(
		FARM.PLOT_BASE_COST * FARM.PLOT_COST_GROWTH ** state.plotsBought,
	);
}

export function getSprinklerCost(state: FarmState): number {
	const owned = Object.values(state.tiles).filter(
		(tile) => tile.kind === "sprinkler",
	).length;
	return Math.round(
		FARM.SPRINKLER_BASE_COST * FARM.SPRINKLER_COST_GROWTH ** owned,
	);
}

/** Buy a new plot on an empty spot beside the farm */
export function buyPlot(state: FarmState, pos: Position): boolean {
	const cost = getPlotCost(state);
	const isSpot = getExpansionSpots(state).some(
		(spot) => spot.x === pos.x && spot.y === pos.y,
	);
	if (!isSpot || state.money < cost) return false;

	state.money -= cost;
	state.plotsBought += 1;
	state.tiles[posKey(pos.x, pos.y)] = emptyPlot();
	return true;
}

/** Build a sprinkler on a plot (anything growing there is cleared) */
export function placeSprinkler(state: FarmState, pos: Position): boolean {
	const cost = getSprinklerCost(state);
	if (getTile(state, pos)?.kind !== "plot" || state.money < cost) return false;

	state.money -= cost;
	state.tiles[posKey(pos.x, pos.y)] = { kind: "sprinkler" };
	return true;
}

/** Move a building onto a plot; the spot it left becomes an empty plot */
export function moveBuilding(
	state: FarmState,
	from: Position,
	to: Position,
): boolean {
	const building = getTile(state, from);
	if (!building || building.kind === "plot") return false;
	if (getTile(state, to)?.kind !== "plot") return false;

	state.tiles[posKey(to.x, to.y)] = building;
	state.tiles[posKey(from.x, from.y)] = emptyPlot();
	return true;
}

/** Take down a building (the hollow log stays), leaving an empty plot */
export function removeBuilding(state: FarmState, pos: Position): boolean {
	if (getTile(state, pos)?.kind !== "sprinkler") return false;
	state.tiles[posKey(pos.x, pos.y)] = emptyPlot();
	return true;
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
		plotsBought: state.plotsBought ?? 0,
	};
	const awayMs = Math.min(Math.max(now - save.savedAt, 0), FARM.OFFLINE_CAP_MS);
	tick(restored, awayMs);
	return { state: restored, awayMs };
}
