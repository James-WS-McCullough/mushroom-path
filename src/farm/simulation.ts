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
	/** Items you can carry at once */
	BASKET_CAPACITY: 10,
	/** Most time away that counts towards offline progress */
	OFFLINE_CAP_MS: 8 * 60 * 60 * 1000,
	/** The first extra plot costs this, and each one after costs more */
	PLOT_BASE_COST: 10,
	PLOT_COST_GROWTH: 1.15,
	/** How long a helper takes to walk one tile */
	HELPER_STEP_MS: 1000,
	/** Items a helper can carry */
	HELPER_BASKET: 5,
	HELPER_BASE_COST: 100,
	HELPER_COST_GROWTH: 1.4,
	/** Items a barrel holds */
	BARREL_CAPACITY: 20,
} as const;

// =============================================================================
// ITEMS & RECIPES
// =============================================================================

export type ItemKind = "mushroom" | "skewer" | "water" | "stew";

/** Counts of each item, e.g. a basket or a barrel */
export type Inventory = Partial<Record<ItemKind, number>>;

/** What each item sells for at the log (0 = can't be sold) */
export const ITEMS: Record<
	ItemKind,
	{ name: string; icon: string; value: number }
> = {
	mushroom: { name: "Mushroom", icon: "🍄", value: 1 },
	skewer: { name: "Roasted skewer", icon: "🍢", value: 5 },
	water: { name: "Water bucket", icon: "💧", value: 0 },
	stew: { name: "Mushroom stew", icon: "🍲", value: 14 },
};

/** Most valuable first, so helpers grab the good stuff */
const ITEM_ORDER: ItemKind[] = ["stew", "skewer", "mushroom", "water"];

export type MachineKind = "campfire" | "stewpot" | "well";

export interface Recipe {
	/** Items used up for each batch (none for the well) */
	inputs: Inventory;
	output: ItemKind;
	timeMs: number;
	/** How many batches' worth of inputs it can hold */
	maxBatches: number;
	/** How many finished items it holds before it stops */
	outputCap: number;
}

export const RECIPES: Record<MachineKind, Recipe> = {
	campfire: {
		inputs: { mushroom: 3 },
		output: "skewer",
		timeMs: 5000,
		maxBatches: 2,
		outputCap: 3,
	},
	stewpot: {
		inputs: { mushroom: 4, water: 1 },
		output: "stew",
		timeMs: 8000,
		maxBatches: 2,
		outputCap: 2,
	},
	well: {
		inputs: {},
		output: "water",
		timeMs: 4000,
		maxBatches: 0,
		outputCap: 3,
	},
};

export function countItems(inventory: Inventory): number {
	let total = 0;
	for (const kind of ITEM_ORDER) total += inventory[kind] ?? 0;
	return total;
}

function addItems(inventory: Inventory, kind: ItemKind, count: number): void {
	if (count <= 0) return;
	inventory[kind] = (inventory[kind] ?? 0) + count;
}

function removeItems(
	inventory: Inventory,
	kind: ItemKind,
	count: number,
): void {
	const left = (inventory[kind] ?? 0) - count;
	if (left > 0) inventory[kind] = left;
	else delete inventory[kind];
}

/** Move as much as fits from one inventory to another; returns how many moved */
function transfer(
	from: Inventory,
	to: Inventory,
	space: (kind: ItemKind) => number,
	kinds: ItemKind[] = ITEM_ORDER,
): number {
	let moved = 0;
	for (const kind of kinds) {
		const count = Math.min(from[kind] ?? 0, Math.max(0, space(kind)));
		if (count <= 0) continue;
		removeItems(from, kind, count);
		addItems(to, kind, count);
		moved += count;
	}
	return moved;
}

/** Room left in a basket or barrel holding up to `capacity` items in total */
function roomIn(
	inventory: Inventory,
	capacity: number,
): (kind: ItemKind) => number {
	return () => capacity - countItems(inventory);
}

/** Room left for one ingredient in a machine */
function machineRoom(machine: MachineTile): (kind: ItemKind) => number {
	const recipe = RECIPES[machine.kind];
	return (kind) => {
		const perBatch = recipe.inputs[kind];
		if (!perBatch) return 0;
		return perBatch * recipe.maxBatches - (machine.input[kind] ?? 0);
	};
}

/** Sell everything sellable; returns the count sold and 🍄 earned */
function sell(inventory: Inventory): { count: number; earned: number } {
	let count = 0;
	let earned = 0;
	for (const kind of ITEM_ORDER) {
		const value = ITEMS[kind].value;
		const amount = inventory[kind] ?? 0;
		if (value <= 0 || amount === 0) continue;
		count += amount;
		earned += amount * value;
		delete inventory[kind];
	}
	return { count, earned };
}

// =============================================================================
// BUILDINGS & STATE
// =============================================================================

/** What each kind of building costs, and how much more each extra one costs */
export const BUILDING_COSTS = {
	sprinkler: { base: 40, growth: 1.3 },
	barrel: { base: 25, growth: 1.2 },
	path: { base: 2, growth: 1.02 },
	campfire: { base: 60, growth: 1.3 },
	well: { base: 120, growth: 1.3 },
	stewpot: { base: 250, growth: 1.35 },
} as const;

export type BuildingKind = keyof typeof BUILDING_COSTS;

/** A patch of soil. `growth` is null when empty, then 0 → 1 while growing; 1 is ripe */
export interface PlotTile {
	kind: "plot";
	growth: number | null;
	watered: boolean;
}

/** Where everything is sold */
export interface LogTile {
	kind: "log";
}

/** Keeps the 8 tiles around it watered */
export interface SprinklerTile {
	kind: "sprinkler";
}

/** Holds items so one helper can hand them to another */
export interface BarrelTile {
	kind: "barrel";
	items: Inventory;
}

/** Stepping stones: helpers walk them but nothing grows */
export interface PathTile {
	kind: "path";
}

/** Cooks (or draws water) following its recipe */
export interface MachineTile {
	kind: MachineKind;
	input: Inventory;
	output: Inventory;
	/** Time spent on the current batch */
	progress: number;
}

export type FarmTile =
	| PlotTile
	| LogTile
	| SprinklerTile
	| BarrelTile
	| PathTile
	| MachineTile;

export type HelperType = "sprout" | "dew";

/** What a helper does at a station beside her route */
export type StationSetting = "both" | "dropOff" | "pickUp" | "ignore";

export interface Helper {
	id: number;
	type: HelperType;
	x: number;
	y: number;
	/** Which way along her line she's walking */
	dir: 1 | -1;
	basket: Inventory;
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
	/** What the player is carrying */
	basket: Inventory;
	basketCapacity: number;
	/** Lifetime items sold, for stats */
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
	| { kind: "transferred"; gave: number; took: number }
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

export function isMachine(tile: FarmTile | undefined): tile is MachineTile {
	return (
		tile?.kind === "campfire" ||
		tile?.kind === "stewpot" ||
		tile?.kind === "well"
	);
}

/** Stations are where helpers drop off or pick up items */
export function isStation(tile: FarmTile | undefined): boolean {
	return tile?.kind === "log" || tile?.kind === "barrel" || isMachine(tile);
}

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
		basket: {},
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

/** Does a machine have everything it needs for its next batch? */
export function canCook(machine: MachineTile): boolean {
	const recipe = RECIPES[machine.kind];
	if ((machine.output[recipe.output] ?? 0) >= recipe.outputCap) return false;
	return Object.entries(recipe.inputs).every(
		([kind, needed]) => (machine.input[kind as ItemKind] ?? 0) >= (needed ?? 0),
	);
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

function cook(state: FarmState, ms: number): void {
	for (const tile of Object.values(state.tiles)) {
		if (!isMachine(tile)) continue;
		if (!canCook(tile)) {
			tile.progress = 0;
			continue;
		}
		const recipe = RECIPES[tile.kind];
		tile.progress += ms;
		if (tile.progress >= recipe.timeMs) {
			tile.progress = 0;
			for (const [kind, needed] of Object.entries(recipe.inputs)) {
				removeItems(tile.input, kind as ItemKind, needed ?? 0);
			}
			addItems(tile.output, recipe.output, 1);
		}
	}
}

/**
 * Advance the farm by `ms` milliseconds. Long stretches are played out in
 * small steps so helpers, crops and cooking stay in sync. Returns what
 * helpers did.
 */
export function tick(state: FarmState, ms: number): FarmEvent[] {
	const events: FarmEvent[] = [];
	let remaining = ms;
	while (remaining > 0) {
		const chunk = Math.min(remaining, FARM.HELPER_STEP_MS);
		grow(state, chunk);
		cook(state, chunk);
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
 * ripe one, sell at the log, or swap items with a barrel or machine.
 */
export function tapTile(state: FarmState, pos: Position): TapResult {
	const tile = getTile(state, pos);
	if (!tile) return { kind: "nothing" };
	const basketRoom = roomIn(state.basket, state.basketCapacity);

	if (tile.kind === "log") {
		const { count, earned } = sell(state.basket);
		if (count === 0) return { kind: "nothing" };
		state.money += earned;
		state.totalSold += count;
		return { kind: "sold", count, earned };
	}

	if (tile.kind === "barrel") {
		// Stash what you're carrying, or grab from the barrel with empty hands
		const gave = transfer(
			state.basket,
			tile.items,
			roomIn(tile.items, FARM.BARREL_CAPACITY),
		);
		const took = gave > 0 ? 0 : transfer(tile.items, state.basket, basketRoom);
		return gave + took > 0
			? { kind: "transferred", gave, took }
			: { kind: "nothing" };
	}

	if (isMachine(tile)) {
		// Collect what's ready, then load in what it needs
		const took = transfer(tile.output, state.basket, basketRoom);
		const gave = transfer(state.basket, tile.input, machineRoom(tile));
		return gave + took > 0
			? { kind: "transferred", gave, took }
			: { kind: "nothing" };
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

	if (countItems(state.basket) >= state.basketCapacity) {
		return { kind: "basketFull" };
	}
	addItems(state.basket, "mushroom", 1);
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

/** The settings a station can be given, in the order tapping cycles them */
export function getStationSettings(tile: FarmTile): StationSetting[] {
	if (tile.kind === "log") return ["dropOff", "ignore"];
	if (tile.kind === "barrel") return ["dropOff", "pickUp", "ignore"];
	if (tile.kind === "well") return ["pickUp", "ignore"];
	return ["both", "dropOff", "pickUp", "ignore"];
}

export function getStationSetting(
	helper: Helper,
	key: string,
	tile: FarmTile,
): StationSetting {
	const setting = helper.stations[key];
	if (setting) return setting;
	// The log sells and machines cook by default; barrels wait to be set up
	if (tile.kind === "barrel") return "ignore";
	return getStationSettings(tile)[0] ?? "ignore";
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
		countItems(helper.basket) < FARM.HELPER_BASKET
	) {
		addItems(helper.basket, "mushroom", 1);
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

	const basketRoom = roomIn(helper.basket, FARM.HELPER_BASKET);

	for (const phase of ["pickUp", "dropOff"] as const) {
		for (const { pos, key, tile } of beside) {
			if (!tile) continue;
			const setting = getStationSetting(helper, key, tile);
			if (setting !== phase && setting !== "both") continue;

			if (phase === "pickUp") {
				if (tile.kind === "barrel")
					transfer(tile.items, helper.basket, basketRoom);
				else if (isMachine(tile))
					transfer(tile.output, helper.basket, basketRoom);
				continue;
			}

			if (tile.kind === "barrel") {
				transfer(
					helper.basket,
					tile.items,
					roomIn(tile.items, FARM.BARREL_CAPACITY),
				);
			} else if (isMachine(tile)) {
				transfer(helper.basket, tile.input, machineRoom(tile));
			} else if (tile.kind === "log") {
				const { count, earned } = sell(helper.basket);
				if (count > 0) {
					state.money += earned;
					state.totalSold += count;
					helper.stats.sold += count;
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

/** Cycle a helper's setting for a station to the next one it allows */
export function cycleStationSetting(
	state: FarmState,
	helperId: number,
	stationPos: Position,
): StationSetting | null {
	const helper = state.helpers.find((h) => h.id === helperId);
	const key = posKey(stationPos.x, stationPos.y);
	const tile = state.tiles[key];
	if (!helper || !tile || !isStation(tile)) return null;

	const order = getStationSettings(tile);
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
		basket: {},
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
	if (kind === "barrel") return { kind, items: {} };
	if (kind === "campfire" || kind === "stewpot" || kind === "well") {
		return { kind, input: {}, output: {}, progress: 0 };
	}
	return { kind };
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
	/** Items helpers sold, and 🍄 earned, while the player was away */
	soldWhileAway: number;
	earnedWhileAway: number;
}

/** Saves from before items held a plain count of mushrooms */
function toInventory(value: unknown): Inventory {
	if (typeof value === "number") return value > 0 ? { mushroom: value } : {};
	return value && typeof value === "object" ? (value as Inventory) : {};
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
		typeof state.money !== "number"
	) {
		return null;
	}

	for (const tile of Object.values(state.tiles)) {
		if (tile.kind === "barrel") tile.items = toInventory(tile.items);
	}
	const helpers = Array.isArray(state.helpers) ? state.helpers : [];
	for (const helper of helpers) helper.basket = toInventory(helper.basket);

	const restored: FarmState = {
		tiles: state.tiles,
		money: state.money,
		basket: toInventory(state.basket),
		basketCapacity: state.basketCapacity ?? FARM.BASKET_CAPACITY,
		totalSold: state.totalSold ?? 0,
		plotsBought: state.plotsBought ?? 0,
		helpers,
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
