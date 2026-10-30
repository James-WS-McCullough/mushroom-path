/**
 * Farming mode simulation.
 *
 * Plain data and functions only - no Vue, timers or sounds - so the farm can
 * be tested with fake time and fast-forwarded for offline progress.
 * Functions update the state they're given in place, since the farm ticks
 * many times a second.
 */

import type { Position } from "../types/game";
import {
	DIRECTIONS,
	getDirectionDelta,
	parseKey,
	posKey,
} from "../utils/positionUtils";

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
	/** How long a helper takes to walk one tile */
	HELPER_STEP_MS: 1000,
	/** Mushrooms a helper can carry */
	HELPER_BASKET: 5,
	HELPER_BASE_COST: 100,
	HELPER_COST_GROWTH: 1.4,
	/** Mushrooms a barrel holds */
	BARREL_CAPACITY: 20,
} as const;

/** What each kind of building costs, and how much more each extra one costs */
export const BUILDING_COSTS = {
	sprinkler: { base: 40, growth: 1.3 },
	barrel: { base: 25, growth: 1.2 },
	path: { base: 2, growth: 1.02 },
} as const;

export type BuildingKind = keyof typeof BUILDING_COSTS;

// =============================================================================
// TYPES
// =============================================================================

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

/** Holds mushrooms so one helper can hand them to another */
export interface BarrelTile {
	kind: "barrel";
	items: number;
}

/** Stepping stones: helpers walk them but nothing grows */
export interface PathTile {
	kind: "path";
}

export type FarmTile =
	| PlotTile
	| LogTile
	| SprinklerTile
	| BarrelTile
	| PathTile;

export type HelperType = "sprout" | "dew";

/** What a helper does at a station beside her route */
export type StationSetting = "dropOff" | "pickUp" | "ignore";

export interface Helper {
	id: number;
	type: HelperType;
	x: number;
	y: number;
	/** Which way along her line she's walking */
	dir: 1 | -1;
	basket: number;
	/** Time built up towards her next step */
	stepMs: number;
	/** Her setting for each station, keyed by the station's "x,y" */
	stations: Record<string, StationSetting>;
	/** What she did on her last step, for animation */
	lastMove: "walk" | "jump" | "wait" | "turn" | "none";
	stats: {
		harvested: number;
		sold: number;
		activeMs: number;
		waitingMs: number;
	};
}

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
	helpers: Helper[];
	nextHelperId: number;
}

export type TapResult =
	| { kind: "planted" }
	| { kind: "watered" }
	| { kind: "harvested" }
	| { kind: "basketFull" }
	| { kind: "sold"; count: number; earned: number }
	| { kind: "nothing" };

/** Things helpers did during a tick, for sounds and popups */
export type FarmEvent =
	| { kind: "helperHarvested"; helperId: number; position: Position }
	| {
			kind: "helperSold";
			helperId: number;
			position: Position;
			earned: number;
	  };

// =============================================================================
// SETUP & QUERIES
// =============================================================================

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
		helpers: [],
		nextHelperId: 1,
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

/** Stations are where helpers drop off or pick up mushrooms */
export function isStation(tile: FarmTile | undefined): boolean {
	return tile?.kind === "log" || tile?.kind === "barrel";
}

function helperAt(state: FarmState, pos: Position): Helper | undefined {
	return state.helpers.find((h) => h.x === pos.x && h.y === pos.y);
}

/** Keys of every tile a sprinkler is keeping watered */
export function getSprinkledKeys(state: FarmState): Set<string> {
	const sprinkled = new Set<string>();
	for (const [key, tile] of Object.entries(state.tiles)) {
		if (tile.kind !== "sprinkler") continue;
		const { x, y } = parseKey(key);
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx !== 0 || dy !== 0) sprinkled.add(posKey(x + dx, y + dy));
			}
		}
	}
	return sprinkled;
}

// =============================================================================
// TIME
// =============================================================================

function grow(state: FarmState, ms: number): void {
	const sprinkled = getSprinkledKeys(state);
	for (const [key, tile] of Object.entries(state.tiles)) {
		if (tile.kind !== "plot" || tile.growth === null || tile.growth >= 1) {
			continue;
		}
		const isWet = tile.watered || sprinkled.has(key);
		const speed = isWet ? FARM.WATERED_SPEEDUP : 1;
		const growth = tile.growth + (ms * speed) / FARM.GROW_MS;
		// Snap to ripe so adding up small steps can't leave it a hair short
		tile.growth = growth >= 1 - 1e-9 ? 1 : growth;
	}
}

/**
 * Advance the farm by `ms` milliseconds. Long stretches are played out in
 * small steps so helpers and crops stay in sync. Returns what helpers did.
 */
export function tick(state: FarmState, ms: number): FarmEvent[] {
	const events: FarmEvent[] = [];
	let remaining = ms;
	while (remaining > 0) {
		const chunk = Math.min(remaining, FARM.HELPER_STEP_MS);
		grow(state, chunk);
		for (const helper of state.helpers) {
			helper.stepMs += chunk;
			helper.stats.activeMs += chunk;
			while (helper.stepMs >= FARM.HELPER_STEP_MS) {
				helper.stepMs -= FARM.HELPER_STEP_MS;
				stepHelper(state, helper, events);
			}
		}
		remaining -= chunk;
	}
	return events;
}

// =============================================================================
// THE PLAYER
// =============================================================================

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

	if (tile.kind !== "plot") return { kind: "nothing" };

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
// HELPERS
// =============================================================================

/** One step along a helper's line */
function helperDelta(helper: Helper): Position {
	return helper.type === "sprout"
		? { x: helper.dir, y: 0 }
		: { x: 0, y: helper.dir };
}

/** Helpers can stand on empty or ripe plots, and on paths */
function canHelperStand(tile: FarmTile | undefined): boolean {
	if (tile?.kind === "path") return true;
	return tile?.kind === "plot" && (tile.growth === null || tile.growth === 1);
}

/** Tiles a helper's line runs along, whether or not something is growing there */
function isOnRoute(tile: FarmTile | undefined): boolean {
	return tile?.kind === "plot" || tile?.kind === "path";
}

export function getStationSetting(
	helper: Helper,
	key: string,
	tile: FarmTile,
): StationSetting {
	const setting = helper.stations[key];
	if (setting) return setting;
	// The log is where mushrooms go by default; barrels wait to be set up
	return tile.kind === "log" ? "dropOff" : "ignore";
}

/** Walk, jump, wait or turn, then deal with the stations beside her */
function stepHelper(
	state: FarmState,
	helper: Helper,
	events: FarmEvent[],
): void {
	const delta = helperDelta(helper);
	const next = { x: helper.x + delta.x, y: helper.y + delta.y };
	const nextTile = getTile(state, next);

	if (canHelperStand(nextTile)) {
		moveHelperTo(state, helper, next, "walk", events);
	} else if (isGrowing(nextTile)) {
		const beyond = { x: next.x + delta.x, y: next.y + delta.y };
		if (canHelperStand(getTile(state, beyond))) {
			moveHelperTo(state, helper, beyond, "jump", events);
		} else {
			// Wait for the mushroom ahead to ripen
			helper.lastMove = "wait";
			helper.stats.waitingMs += FARM.HELPER_STEP_MS;
		}
	} else {
		// A building or the edge of the farm
		helper.dir = helper.dir === 1 ? -1 : 1;
		helper.lastMove = "turn";
	}

	useStations(state, helper, events);
}

function moveHelperTo(
	state: FarmState,
	helper: Helper,
	to: Position,
	move: "walk" | "jump",
	events: FarmEvent[],
): void {
	// Plant the plot she's leaving
	const leaving = getTile(state, helper);
	if (leaving?.kind === "plot" && leaving.growth === null) {
		leaving.growth = 0;
	}

	helper.x = to.x;
	helper.y = to.y;
	helper.lastMove = move;

	// Pick a ripe mushroom where she lands
	const arrived = getTile(state, to);
	if (
		arrived?.kind === "plot" &&
		arrived.growth === 1 &&
		helper.basket < FARM.HELPER_BASKET
	) {
		helper.basket += 1;
		helper.stats.harvested += 1;
		arrived.growth = null;
		arrived.watered = false;
		events.push({
			kind: "helperHarvested",
			helperId: helper.id,
			position: { ...to },
		});
	}
}

/** Pick up from, then drop off at, the stations on either side of her */
function useStations(
	state: FarmState,
	helper: Helper,
	events: FarmEvent[],
): void {
	const beside = DIRECTIONS.map((direction) => {
		const delta = getDirectionDelta(direction);
		const pos = { x: helper.x + delta.x, y: helper.y + delta.y };
		const key = posKey(pos.x, pos.y);
		return { pos, key, tile: state.tiles[key] };
	}).filter((s) => isStation(s.tile));

	for (const phase of ["pickUp", "dropOff"] as const) {
		for (const { pos, key, tile } of beside) {
			if (!tile || getStationSetting(helper, key, tile) !== phase) continue;

			if (phase === "pickUp" && tile.kind === "barrel") {
				const taken = Math.min(tile.items, FARM.HELPER_BASKET - helper.basket);
				tile.items -= taken;
				helper.basket += taken;
			} else if (phase === "dropOff" && tile.kind === "barrel") {
				const given = Math.min(
					helper.basket,
					FARM.BARREL_CAPACITY - tile.items,
				);
				tile.items += given;
				helper.basket -= given;
			} else if (
				phase === "dropOff" &&
				tile.kind === "log" &&
				helper.basket > 0
			) {
				const earned = helper.basket * FARM.MUSHROOM_VALUE;
				state.money += earned;
				state.totalSold += helper.basket;
				helper.stats.sold += helper.basket;
				helper.basket = 0;
				events.push({
					kind: "helperSold",
					helperId: helper.id,
					position: pos,
					earned,
				});
			}
		}
	}
}

/**
 * The tiles a helper walks back and forth over, from one end of her line to
 * the other (a building or the farm's edge stops it)
 */
export function getHelperRoute(state: FarmState, helper: Helper): Position[] {
	const delta = helperDelta(helper);
	const route: Position[] = [{ x: helper.x, y: helper.y }];
	for (const sign of [-1, 1]) {
		let pos = { x: helper.x + delta.x * sign, y: helper.y + delta.y * sign };
		while (isOnRoute(getTile(state, pos))) {
			route.push(pos);
			pos = { x: pos.x + delta.x * sign, y: pos.y + delta.y * sign };
		}
	}
	return route;
}

/** Stations beside a helper's route, keyed by "x,y" */
export function getRouteStations(state: FarmState, helper: Helper): string[] {
	const stations = new Set<string>();
	for (const pos of getHelperRoute(state, helper)) {
		for (const direction of DIRECTIONS) {
			const delta = getDirectionDelta(direction);
			const key = posKey(pos.x + delta.x, pos.y + delta.y);
			if (isStation(state.tiles[key])) stations.add(key);
		}
	}
	return [...stations];
}

/** Cycle a helper's setting for a station: drop off → pick up → ignore */
export function cycleStationSetting(
	state: FarmState,
	helperId: number,
	stationPos: Position,
): StationSetting | null {
	const helper = state.helpers.find((h) => h.id === helperId);
	const key = posKey(stationPos.x, stationPos.y);
	const tile = state.tiles[key];
	if (!helper || !tile || !isStation(tile)) return null;

	const order: StationSetting[] =
		tile.kind === "log"
			? ["dropOff", "ignore"]
			: ["dropOff", "pickUp", "ignore"];
	const current = getStationSetting(helper, key, tile);
	const next = order[(order.indexOf(current) + 1) % order.length] ?? "ignore";
	helper.stations[key] = next;
	return next;
}

export function getHelperCost(state: FarmState): number {
	return Math.round(
		FARM.HELPER_BASE_COST * FARM.HELPER_COST_GROWTH ** state.helpers.length,
	);
}

/** Hire a helper and set her down on a plot or path */
export function hireHelper(
	state: FarmState,
	type: HelperType,
	pos: Position,
): Helper | null {
	const cost = getHelperCost(state);
	if (!isOnRoute(getTile(state, pos)) || helperAt(state, pos)) return null;
	if (state.money < cost) return null;

	state.money -= cost;
	const helper: Helper = {
		id: state.nextHelperId++,
		type,
		x: pos.x,
		y: pos.y,
		dir: 1,
		basket: 0,
		stepMs: 0,
		stations: {},
		lastMove: "none",
		stats: { harvested: 0, sold: 0, activeMs: 0, waitingMs: 0 },
	};
	state.helpers.push(helper);
	return helper;
}

export function moveHelper(
	state: FarmState,
	helperId: number,
	to: Position,
): boolean {
	const helper = state.helpers.find((h) => h.id === helperId);
	if (!helper || !isOnRoute(getTile(state, to))) return false;
	const other = helperAt(state, to);
	if (other && other !== helper) return false;
	helper.x = to.x;
	helper.y = to.y;
	helper.lastMove = "none";
	return true;
}

export function removeHelper(state: FarmState, helperId: number): boolean {
	const before = state.helpers.length;
	state.helpers = state.helpers.filter((h) => h.id !== helperId);
	return state.helpers.length < before;
}

export function turnHelper(state: FarmState, helperId: number): void {
	const helper = state.helpers.find((h) => h.id === helperId);
	if (helper) helper.dir = helper.dir === 1 ? -1 : 1;
}

// =============================================================================
// BUILDING
// =============================================================================

/** Empty spots beside the farm where a new plot can be bought */
export function getExpansionSpots(state: FarmState): Position[] {
	const spots = new Map<string, Position>();
	for (const key of Object.keys(state.tiles)) {
		const { x, y } = parseKey(key);
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

export function getBuildingCost(state: FarmState, kind: BuildingKind): number {
	const owned = Object.values(state.tiles).filter(
		(t) => t.kind === kind,
	).length;
	const { base, growth } = BUILDING_COSTS[kind];
	return Math.round(base * growth ** owned);
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

function newBuilding(kind: BuildingKind): FarmTile {
	return kind === "barrel" ? { kind, items: 0 } : { kind };
}

/** Helpers can stand on paths, but not on other buildings */
function blocksHelpers(tile: FarmTile): boolean {
	return tile.kind !== "plot" && tile.kind !== "path";
}

/** Build on a plot (anything growing there is cleared) */
export function placeBuilding(
	state: FarmState,
	kind: BuildingKind,
	pos: Position,
): boolean {
	const cost = getBuildingCost(state, kind);
	if (getTile(state, pos)?.kind !== "plot" || state.money < cost) return false;
	const building = newBuilding(kind);
	if (blocksHelpers(building) && helperAt(state, pos)) return false;

	state.money -= cost;
	state.tiles[posKey(pos.x, pos.y)] = building;
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
	if (blocksHelpers(building) && helperAt(state, to)) return false;

	state.tiles[posKey(to.x, to.y)] = building;
	state.tiles[posKey(from.x, from.y)] = emptyPlot();
	return true;
}

/** Take down a building (the hollow log stays), leaving an empty plot */
export function removeBuilding(state: FarmState, pos: Position): boolean {
	const tile = getTile(state, pos);
	if (!tile || tile.kind === "plot" || tile.kind === "log") return false;
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

export interface LoadedFarm {
	state: FarmState;
	awayMs: number;
	/** Mushrooms helpers sold, and 🍄 earned, while the player was away */
	soldWhileAway: number;
	earnedWhileAway: number;
}

/**
 * Load a saved farm and catch it up on the time that passed since it was
 * saved (up to the offline cap). Returns null if the save can't be used.
 */
export function deserializeFarm(json: string, now: number): LoadedFarm | null {
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
		helpers: Array.isArray(state.helpers) ? state.helpers : [],
		nextHelperId: state.nextHelperId ?? 1,
	};
	const awayMs = Math.min(Math.max(now - save.savedAt, 0), FARM.OFFLINE_CAP_MS);
	const soldBefore = restored.totalSold;
	const moneyBefore = restored.money;
	tick(restored, awayMs);
	return {
		state: restored,
		awayMs,
		soldWhileAway: restored.totalSold - soldBefore,
		earnedWhileAway: restored.money - moneyBefore,
	};
}
