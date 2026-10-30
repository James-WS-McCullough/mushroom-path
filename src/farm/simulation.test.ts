import { describe, expect, it } from "vitest";
import {
	createFarm,
	deserializeFarm,
	FARM,
	type FarmState,
	getTile,
	isRipe,
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
		expect(farm.basket).toBe(0);
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

		expect(tapTile(farm, PLOT)).toEqual({ kind: "harvested" });
		expect(farm.basket).toBe(1);
		expect(getTile(farm, PLOT)).toEqual({
			kind: "plot",
			growth: null,
			watered: false,
		});
	});

	it("won't pick when the basket is full", () => {
		const farm = createFarm();
		farm.basket = farm.basketCapacity;
		tapTile(farm, PLOT);
		tick(farm, FARM.GROW_MS);

		expect(tapTile(farm, PLOT)).toEqual({ kind: "basketFull" });
		expect(isRipe(getTile(farm, PLOT))).toBe(true);
	});

	it("sells the basket at the log", () => {
		const farm = createFarm();
		farm.basket = 4;

		expect(tapTile(farm, LOG)).toEqual({ kind: "sold", count: 4, earned: 4 });
		expect(farm.basket).toBe(0);
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
});
