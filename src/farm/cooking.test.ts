import { describe, expect, it } from "vitest";
import { posKey } from "../utils/positionUtils";
import {
	cycleStationSetting,
	deserializeFarm,
	FARM,
	type FarmState,
	type FarmTile,
	getStationSetting,
	hireHelper,
	ITEMS,
	type MachineKind,
	type MachineTile,
	RECIPES,
	tapTile,
	tick,
} from "./simulation";

function machine(
	kind: MachineKind,
	extra: Partial<MachineTile> = {},
): MachineTile {
	return { kind, input: {}, output: {}, progress: 0, ...extra };
}

/** A one-row farm from the given tiles, with plenty of 🍄 */
function farmOf(row: FarmTile[]): FarmState {
	const tiles: Record<string, FarmTile> = {};
	row.forEach((tile, x) => {
		tiles[posKey(x, 0)] = tile;
	});
	return {
		tiles,
		money: 10_000,
		basket: {},
		basketCapacity: FARM.BASKET_CAPACITY,
		totalSold: 0,
		plotsBought: 0,
		helpers: [],
		nextHelperId: 1,
		upgrades: {},
		seed: 1,
	};
}

const plot = (growth: number | null = null): FarmTile => ({
	kind: "plot",
	growth,
	watered: false,
});

function tileAt(farm: FarmState, x: number): FarmTile | undefined {
	return farm.tiles[posKey(x, 0)];
}

describe("cooking", () => {
	describe("campfire", () => {
		it("roasts 3 mushrooms into a skewer in 5 seconds", () => {
			const farm = farmOf([machine("campfire", { input: { mushroom: 4 } })]);
			tick(farm, RECIPES.campfire.timeMs - 1000);
			expect(tileAt(farm, 0)).toMatchObject({
				input: { mushroom: 4 },
				output: {},
			});
			tick(farm, 1000);
			expect(tileAt(farm, 0)).toMatchObject({
				input: { mushroom: 1 },
				output: { skewer: 1 },
			});
		});

		it("waits for enough mushrooms", () => {
			const farm = farmOf([machine("campfire", { input: { mushroom: 2 } })]);
			tick(farm, 30_000);
			expect(tileAt(farm, 0)).toMatchObject({ output: {}, progress: 0 });
		});

		it("stops when its finished skewers pile up", () => {
			const farm = farmOf([
				machine("campfire", {
					input: { mushroom: 6 },
					output: { skewer: RECIPES.campfire.outputCap },
				}),
			]);
			tick(farm, 30_000);
			expect(tileAt(farm, 0)).toMatchObject({ input: { mushroom: 6 } });
		});
	});

	describe("well and stew pot", () => {
		it("draws a bucket of water every 4 seconds, holding up to 3", () => {
			const farm = farmOf([machine("well")]);
			tick(farm, RECIPES.well.timeMs);
			expect(tileAt(farm, 0)).toMatchObject({ output: { water: 1 } });
			tick(farm, 60_000);
			expect(tileAt(farm, 0)).toMatchObject({
				output: { water: RECIPES.well.outputCap },
			});
		});

		it("needs both mushrooms and water for stew", () => {
			const farm = farmOf([
				machine("stewpot", { input: { mushroom: 8 } }),
				machine("stewpot", { input: { mushroom: 4, water: 1 } }),
			]);
			tick(farm, RECIPES.stewpot.timeMs);
			expect(tileAt(farm, 0)).toMatchObject({ output: {} });
			expect(tileAt(farm, 1)).toMatchObject({ input: {}, output: { stew: 1 } });
		});
	});

	describe("the player", () => {
		it("loads mushrooms into a campfire, up to two batches", () => {
			const farm = farmOf([machine("campfire")]);
			farm.basket = { mushroom: 8 };
			expect(tapTile(farm, { x: 0, y: 0 })).toEqual({
				kind: "transferred",
				gave: 6,
				took: 0,
			});
			expect(farm.basket).toEqual({ mushroom: 2 });
		});

		it("collects what's cooked before loading more", () => {
			const farm = farmOf([machine("campfire", { output: { skewer: 2 } })]);
			farm.basket = { mushroom: 3 };
			expect(tapTile(farm, { x: 0, y: 0 })).toEqual({
				kind: "transferred",
				gave: 3,
				took: 2,
			});
			expect(farm.basket).toEqual({ skewer: 2 });
		});

		it("sells cooked food for more, but can't sell water", () => {
			const farm = farmOf([{ kind: "log" }]);
			farm.basket = { mushroom: 1, skewer: 2, stew: 1, water: 1 };
			const expected =
				ITEMS.mushroom.value + 2 * ITEMS.skewer.value + ITEMS.stew.value;
			expect(tapTile(farm, { x: 0, y: 0 })).toEqual({
				kind: "sold",
				count: 4,
				earned: expected,
			});
			expect(farm.basket).toEqual({ water: 1 });
		});

		it("stashes the basket in a barrel, and grabs from it with empty hands", () => {
			const farm = farmOf([{ kind: "barrel", items: {} }]);
			farm.basket = { skewer: 2 };
			tapTile(farm, { x: 0, y: 0 });
			expect(tileAt(farm, 0)).toMatchObject({ items: { skewer: 2 } });
			tapTile(farm, { x: 0, y: 0 });
			expect(farm.basket).toEqual({ skewer: 2 });
		});

		it("only picks mushrooms while there's room among everything carried", () => {
			const farm = farmOf([plot(1)]);
			farm.basket = { skewer: farm.basketCapacity };
			expect(tapTile(farm, { x: 0, y: 0 })).toEqual({ kind: "basketFull" });
		});
	});

	describe("helpers", () => {
		it("feed a campfire and collect skewers on their own, then sell them", () => {
			// A two-tile path: the log above the left end, a campfire above the right
			const farm = farmOf([{ kind: "path" }, { kind: "path" }]);
			farm.tiles[posKey(0, -1)] = { kind: "log" };
			farm.tiles[posKey(1, -1)] = machine("campfire");
			const sprout = hireHelper(farm, "sprout", { x: 0, y: 0 });
			if (!sprout) throw new Error("couldn't hire");
			sprout.basket = { mushroom: 3 };

			tick(farm, 1000); // steps right, under the campfire
			expect(farm.tiles[posKey(1, -1)]).toMatchObject({
				input: { mushroom: 3 },
			});
			expect(sprout.basket).toEqual({});

			const moneyBefore = farm.money;
			tick(farm, 10_000); // it roasts; she collects the skewer and sells it
			expect(farm.money).toBe(moneyBefore + ITEMS.skewer.value);
			expect(sprout.stats.sold).toBe(1);
		});

		it("chain from the well to a stew pot to the log", () => {
			// A path with a well above one end, a stew pot above the other and
			// the log below the middle
			const farm = farmOf([
				{ kind: "path" },
				{ kind: "path" },
				{ kind: "path" },
			]);
			farm.tiles[posKey(0, -1)] = machine("well", { output: { water: 1 } });
			farm.tiles[posKey(2, -1)] = machine("stewpot", {
				input: { mushroom: 4 },
			});
			farm.tiles[posKey(1, 1)] = { kind: "log" };
			const sprout = hireHelper(farm, "sprout", { x: 0, y: 0 });
			if (!sprout) throw new Error("couldn't hire");

			const moneyBefore = farm.money;
			tick(farm, 30_000);
			expect(farm.money).toBe(moneyBefore + ITEMS.stew.value);
			expect(sprout.stats.sold).toBe(1);
		});

		it("default to cooking at machines, picking up at wells, selling at the log and ignoring barrels", () => {
			const farm = farmOf([plot()]);
			const helper = hireHelper(farm, "sprout", { x: 0, y: 0 });
			if (!helper) throw new Error("couldn't hire");
			expect(getStationSetting(helper, "a", machine("campfire"))).toBe("both");
			expect(getStationSetting(helper, "a", machine("well"))).toBe("pickUp");
			expect(getStationSetting(helper, "a", { kind: "log" })).toBe("dropOff");
			expect(
				getStationSetting(helper, "a", { kind: "barrel", items: {} }),
			).toBe("ignore");
		});

		it("cycle machine settings through both, drop off, pick up and ignore", () => {
			const farm = farmOf([plot()]);
			farm.tiles[posKey(0, -1)] = machine("campfire");
			const helper = hireHelper(farm, "sprout", { x: 0, y: 0 });
			if (!helper) throw new Error("couldn't hire");
			const at = { x: 0, y: -1 };
			expect(cycleStationSetting(farm, helper.id, at)).toBe("dropOff");
			expect(cycleStationSetting(farm, helper.id, at)).toBe("pickUp");
			expect(cycleStationSetting(farm, helper.id, at)).toBe("ignore");
			expect(cycleStationSetting(farm, helper.id, at)).toBe("both");
		});
	});

	it("converts old saves that counted mushrooms", () => {
		const old = {
			version: 1,
			savedAt: 0,
			state: {
				tiles: { "0,0": { kind: "barrel", items: 4 } },
				money: 5,
				basket: 3,
				basketCapacity: 10,
				totalSold: 0,
				plotsBought: 0,
				helpers: [
					{
						id: 1,
						type: "sprout",
						x: 9,
						y: 9,
						dir: 1,
						basket: 2,
						stepMs: 0,
						stations: {},
						lastMove: "none",
						stats: { harvested: 0, sold: 0, activeMs: 0, waitingMs: 0 },
					},
				],
				nextHelperId: 2,
			},
		};
		const loaded = deserializeFarm(JSON.stringify(old), 0);
		expect(loaded?.state.basket).toEqual({ mushroom: 3 });
		expect(loaded?.state.tiles["0,0"]).toEqual({
			kind: "barrel",
			items: { mushroom: 4 },
		});
		expect(loaded?.state.helpers[0]?.basket).toEqual({ mushroom: 2 });
	});
});
