import { describe, expect, it } from "vitest";
import {
	buyPlot,
	createFarm,
	deserializeFarm,
	FARM,
	type FarmState,
	getBuildingCost,
	getExpansionSpots,
	getPlotCost,
	getTile,
	isRipe,
	moveBuilding,
	placeBuilding,
	removeBuilding,
	serializeFarm,
	tapTile,
	tick,
} from "./simulation";

const PLOT = { x: 0, y: 0 };
const LOG = { x: 3, y: 1 };

function growthAt(state: FarmState, pos = PLOT): number | null {
	const tile = getTile(state, pos);
	return tile?.kind === "plot" ? tile.growth : null;
}

describe("farm simulation", () => {
	it("starts with a 3x3 patch of empty plots and a hollow log", () => {
		const farm = createFarm();
		const kinds = Object.values(farm.tiles).map((tile) => tile.kind);
		expect(kinds.filter((kind) => kind === "plot")).toHaveLength(9);
		expect(getTile(farm, LOG)?.kind).toBe("log");
		expect(farm.money).toBe(0);
		expect(farm.basket).toEqual({});
	});

	it("plants an empty plot when tapped", () => {
		const farm = createFarm();
		expect(tapTile(farm, PLOT)).toEqual({ kind: "planted" });
		expect(growthAt(farm)).toBe(0);
	});

	it("grows a mushroom in 10 seconds", () => {
		const farm = createFarm();
		tapTile(farm, PLOT);
		tick(farm, FARM.GROW_MS / 2);
		expect(growthAt(farm)).toBeCloseTo(0.5);
		expect(isRipe(getTile(farm, PLOT))).toBe(false);
		tick(farm, FARM.GROW_MS / 2);
		expect(isRipe(getTile(farm, PLOT))).toBe(true);
	});

	it("grows a watered mushroom in half the time", () => {
		const farm = createFarm();
		tapTile(farm, PLOT);
		expect(tapTile(farm, PLOT)).toEqual({ kind: "watered" });
		tick(farm, FARM.GROW_MS / 2);
		expect(isRipe(getTile(farm, PLOT))).toBe(true);
	});

	it("only waters a mushroom once", () => {
		const farm = createFarm();
		tapTile(farm, PLOT);
		tapTile(farm, PLOT);
		expect(tapTile(farm, PLOT)).toEqual({ kind: "nothing" });
	});

	it("never grows past ripe", () => {
		const farm = createFarm();
		tapTile(farm, PLOT);
		tick(farm, FARM.GROW_MS * 5);
		expect(growthAt(farm)).toBe(1);
	});

	it("picks a ripe mushroom into the basket and leaves the plot empty and dry", () => {
		const farm = createFarm();
		tapTile(farm, PLOT);
		tapTile(farm, PLOT);
		tick(farm, FARM.GROW_MS);

		expect(tapTile(farm, PLOT)).toEqual({
			kind: "harvested",
			item: "mushroom",
		});
		expect(farm.basket).toEqual({ mushroom: 1 });
		expect(getTile(farm, PLOT)).toEqual({
			kind: "plot",
			growth: null,
			watered: false,
		});
	});

	it("won't pick when the basket is full", () => {
		const farm = createFarm();
		farm.basket = { mushroom: farm.basketCapacity };
		tapTile(farm, PLOT);
		tick(farm, FARM.GROW_MS);

		expect(tapTile(farm, PLOT)).toEqual({ kind: "basketFull" });
		expect(isRipe(getTile(farm, PLOT))).toBe(true);
	});

	it("sells the basket at the log", () => {
		const farm = createFarm();
		farm.basket = { mushroom: 4 };

		expect(tapTile(farm, LOG)).toEqual({ kind: "sold", count: 4, earned: 4 });
		expect(farm.basket).toEqual({});
		expect(farm.money).toBe(4);
		expect(farm.totalSold).toBe(4);
	});

	it("does nothing at the log with an empty basket, or off the farm", () => {
		const farm = createFarm();
		expect(tapTile(farm, LOG)).toEqual({ kind: "nothing" });
		expect(tapTile(farm, { x: 10, y: 10 })).toEqual({ kind: "nothing" });
	});

	describe("saving", () => {
		it("round-trips a farm", () => {
			const farm = createFarm();
			tapTile(farm, PLOT);
			farm.money = 12;
			const loaded = deserializeFarm(serializeFarm(farm, 1000), 1000);
			expect(loaded?.state).toEqual(farm);
			expect(loaded?.awayMs).toBe(0);
		});

		it("catches up on growth while the player was away", () => {
			const farm = createFarm();
			tapTile(farm, PLOT);
			const loaded = deserializeFarm(serializeFarm(farm, 0), FARM.GROW_MS);
			expect(isRipe(loaded && getTile(loaded.state, PLOT))).toBe(true);
			expect(loaded?.awayMs).toBe(FARM.GROW_MS);
		});

		it("caps time away", () => {
			const loaded = deserializeFarm(
				serializeFarm(createFarm(), 0),
				FARM.OFFLINE_CAP_MS * 3,
			);
			expect(loaded?.awayMs).toBe(FARM.OFFLINE_CAP_MS);
		});

		it("rejects broken or unknown saves", () => {
			expect(deserializeFarm("not json", 0)).toBeNull();
			expect(deserializeFarm("null", 0)).toBeNull();
			expect(
				deserializeFarm(
					JSON.stringify({ version: 99, savedAt: 0, state: createFarm() }),
					0,
				),
			).toBeNull();
			expect(
				deserializeFarm(
					JSON.stringify({ version: 1, savedAt: 0, state: {} }),
					0,
				),
			).toBeNull();
		});
	});

	describe("expanding", () => {
		it("offers every empty spot beside the farm", () => {
			const farm = createFarm();
			const spots = getExpansionSpots(farm).map((p) => `${p.x},${p.y}`);
			// 3 above, 3 below and 1 left of each row, plus around the log
			expect(spots).toContain("0,-1");
			expect(spots).toContain("-1,1");
			expect(spots).toContain("4,1");
			expect(spots).toContain("3,0");
			expect(spots).not.toContain("1,1");
			expect(spots).not.toContain("5,5");
		});

		it("buys a plot beside the farm and raises the next price", () => {
			const farm = createFarm();
			farm.money = 100;
			const firstCost = getPlotCost(farm);

			expect(buyPlot(farm, { x: 0, y: -1 })).toBe("plot");
			expect(getTile(farm, { x: 0, y: -1 })).toEqual({
				kind: "plot",
				growth: null,
				watered: false,
			});
			expect(farm.money).toBe(100 - firstCost);
			expect(getPlotCost(farm)).toBeGreaterThan(firstCost);
		});

		it("won't buy without enough mushrooms, or away from the farm", () => {
			const farm = createFarm();
			farm.money = getPlotCost(farm) - 1;
			expect(buyPlot(farm, { x: 0, y: -1 })).toBeNull();

			farm.money = 1000;
			expect(buyPlot(farm, { x: 7, y: 7 })).toBeNull();
			expect(buyPlot(farm, { x: 1, y: 1 })).toBeNull();
			expect(farm.money).toBe(1000);
		});
	});

	describe("sprinklers", () => {
		const CENTRE = { x: 1, y: 1 };

		it("builds on a plot and costs more each time", () => {
			const farm = createFarm();
			farm.money = 1000;
			const firstCost = getBuildingCost(farm, "sprinkler");

			expect(placeBuilding(farm, "sprinkler", CENTRE)).toBe(true);
			expect(getTile(farm, CENTRE)?.kind).toBe("sprinkler");
			expect(farm.money).toBe(1000 - firstCost);
			expect(getBuildingCost(farm, "sprinkler")).toBeGreaterThan(firstCost);
		});

		it("can't be built on the log or without enough mushrooms", () => {
			const farm = createFarm();
			farm.money = 1000;
			expect(placeBuilding(farm, "sprinkler", LOG)).toBe(false);
			farm.money = 0;
			expect(placeBuilding(farm, "sprinkler", CENTRE)).toBe(false);
		});

		it("waters all 8 surrounding plots so they grow twice as fast", () => {
			const farm = createFarm();
			farm.money = 1000;
			placeBuilding(farm, "sprinkler", CENTRE);
			for (const pos of [PLOT, { x: 2, y: 2 }, { x: 1, y: 0 }])
				tapTile(farm, pos);

			tick(farm, FARM.GROW_MS / 2);
			expect(isRipe(getTile(farm, PLOT))).toBe(true);
			expect(isRipe(getTile(farm, { x: 2, y: 2 }))).toBe(true);
			expect(isRipe(getTile(farm, { x: 1, y: 0 }))).toBe(true);
		});

		it("doesn't water plots further away", () => {
			const farm = createFarm();
			farm.money = 1000;
			placeBuilding(farm, "sprinkler", PLOT);
			tapTile(farm, { x: 2, y: 2 });

			tick(farm, FARM.GROW_MS / 2);
			expect(isRipe(getTile(farm, { x: 2, y: 2 }))).toBe(false);
		});

		it("means there's nothing to water by hand", () => {
			const farm = createFarm();
			farm.money = 1000;
			placeBuilding(farm, "sprinkler", CENTRE);
			tapTile(farm, PLOT);
			expect(tapTile(farm, PLOT)).toEqual({ kind: "nothing" });
			expect(tapTile(farm, CENTRE)).toEqual({ kind: "nothing" });
		});
	});

	describe("moving and removing", () => {
		it("moves the log onto a plot, leaving an empty plot behind", () => {
			const farm = createFarm();
			expect(moveBuilding(farm, LOG, PLOT)).toBe(true);
			expect(getTile(farm, PLOT)?.kind).toBe("log");
			expect(getTile(farm, LOG)).toEqual({
				kind: "plot",
				growth: null,
				watered: false,
			});
		});

		it("won't move plots, or onto anything but a plot", () => {
			const farm = createFarm();
			expect(moveBuilding(farm, PLOT, { x: 1, y: 0 })).toBe(false);
			expect(moveBuilding(farm, LOG, { x: 9, y: 9 })).toBe(false);
			farm.money = 1000;
			placeBuilding(farm, "sprinkler", PLOT);
			expect(moveBuilding(farm, LOG, PLOT)).toBe(false);
		});

		it("removes a sprinkler but never the log", () => {
			const farm = createFarm();
			farm.money = 1000;
			placeBuilding(farm, "sprinkler", PLOT);
			expect(removeBuilding(farm, PLOT)).toBe(true);
			expect(getTile(farm, PLOT)?.kind).toBe("plot");
			expect(removeBuilding(farm, LOG)).toBe(false);
			expect(removeBuilding(farm, { x: 1, y: 1 })).toBe(false);
		});
	});
});
