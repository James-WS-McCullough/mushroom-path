import { describe, expect, it } from "vitest";
import { posKey } from "../utils/positionUtils";
import {
	cycleStationSetting,
	deserializeFarm,
	FARM,
	type FarmState,
	type FarmTile,
	getHelperCost,
	getHelperRoute,
	getRouteStations,
	getTile,
	type Helper,
	type HelperType,
	hireHelper,
	moveBuilding,
	placeBuilding,
	removeHelper,
	serializeFarm,
	tick,
	turnHelper,
} from "./simulation";

/**
 * Draw a farm: "." empty plot, "r" ripe, "g" growing, "L" log, "B" barrel,
 * "S" sprinkler, "P" path, " " nothing
 */
function makeFarm(rows: string[]): FarmState {
	const tiles: Record<string, FarmTile> = {};
	rows.forEach((row, y) => {
		[...row].forEach((code, x) => {
			const tile: FarmTile | null =
				code === "."
					? { kind: "plot", growth: null, watered: false }
					: code === "r"
						? { kind: "plot", growth: 1, watered: false }
						: code === "g"
							? { kind: "plot", growth: 0.5, watered: false }
							: code === "L"
								? { kind: "log" }
								: code === "B"
									? { kind: "barrel", items: {} }
									: code === "S"
										? { kind: "sprinkler" }
										: code === "P"
											? { kind: "path" }
											: null;
			if (tile) tiles[posKey(x, y)] = tile;
		});
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

function hire(farm: FarmState, type: HelperType, x: number, y: number): Helper {
	const helper = hireHelper(farm, type, { x, y });
	if (!helper) throw new Error("couldn't hire");
	return helper;
}

/** Let a helper take `n` steps */
function steps(farm: FarmState, n: number) {
	return tick(farm, FARM.HELPER_STEP_MS * n);
}

function growthAt(
	farm: FarmState,
	x: number,
	y: number,
): number | null | undefined {
	const tile = getTile(farm, { x, y });
	return tile?.kind === "plot" ? tile.growth : undefined;
}

describe("helpers", () => {
	describe("Sprout walking her row", () => {
		it("walks right a tile per step and turns around at the edge", () => {
			const farm = makeFarm(["PPP"]);
			const sprout = hire(farm, "sprout", 0, 0);

			steps(farm, 1);
			expect(sprout.x).toBe(1);
			steps(farm, 1);
			expect(sprout.x).toBe(2);
			steps(farm, 1); // edge ahead: turns
			expect(sprout).toMatchObject({ x: 2, dir: -1, lastMove: "turn" });
			steps(farm, 1);
			expect(sprout.x).toBe(1);
		});

		it("turns around at buildings", () => {
			const farm = makeFarm(["PPS"]);
			const sprout = hire(farm, "sprout", 0, 0);
			steps(farm, 2);
			expect(sprout).toMatchObject({ x: 1, dir: -1 });
		});

		it("plants the empty plot she leaves, and picks the ripe one she lands on", () => {
			const farm = makeFarm([".rP"]);
			const sprout = hire(farm, "sprout", 0, 0);

			const events = steps(farm, 1);
			expect(growthAt(farm, 0, 0)).toBe(0); // planted behind her
			expect(growthAt(farm, 1, 0)).toBeNull(); // picked
			expect(sprout.basket).toEqual({ mushroom: 1 });
			expect(events).toContainEqual({
				kind: "helperHarvested",
				helperId: sprout.id,
				position: { x: 1, y: 0 },
			});
		});

		it("never plants on paths", () => {
			const farm = makeFarm(["PP"]);
			hire(farm, "sprout", 0, 0);
			steps(farm, 1);
			expect(getTile(farm, { x: 0, y: 0 })).toEqual({ kind: "path" });
		});

		it("jumps over a growing mushroom when the tile beyond is free", () => {
			const farm = makeFarm(["PgP"]);
			const sprout = hire(farm, "sprout", 0, 0);
			steps(farm, 1);
			expect(sprout).toMatchObject({ x: 2, lastMove: "jump" });
		});

		it("waits for a growing mushroom when she can't jump it, then carries on", () => {
			const farm = makeFarm(["PggP"]);
			const sprout = hire(farm, "sprout", 0, 0);

			steps(farm, 1);
			expect(sprout).toMatchObject({ x: 0, lastMove: "wait" });
			expect(sprout.stats.waitingMs).toBe(FARM.HELPER_STEP_MS);

			// Both ripen after 5 more seconds; then she walks on and picks them
			steps(farm, 6);
			expect(sprout.x).toBeGreaterThan(0);
			expect(sprout.stats.harvested).toBeGreaterThan(0);
		});

		it("leaves ripe mushrooms when her basket is full", () => {
			const farm = makeFarm(["Pr"]);
			const sprout = hire(farm, "sprout", 0, 0);
			sprout.basket = { mushroom: FARM.HELPER_BASKET };
			steps(farm, 1);
			expect(sprout.x).toBe(1);
			expect(growthAt(farm, 1, 0)).toBe(1);
		});
	});

	describe("Dew walking her column", () => {
		it("walks up and down instead of across", () => {
			const farm = makeFarm(["PP", "PP", "PP"]);
			const dew = hire(farm, "dew", 0, 0);
			steps(farm, 2);
			expect(dew).toMatchObject({ x: 0, y: 2 });
			steps(farm, 2);
			expect(dew).toMatchObject({ x: 0, y: 1, dir: -1 });
		});
	});

	describe("stations", () => {
		it("sells at the log beside her route by default", () => {
			const farm = makeFarm(["L", "P"]);
			const helper = hire(farm, "sprout", 0, 1);
			helper.basket = { mushroom: 3 };
			const moneyBefore = farm.money;

			const events = steps(farm, 1);
			expect(farm.money).toBe(moneyBefore + 3);
			expect(helper.basket).toEqual({});
			expect(helper.stats.sold).toBe(3);
			expect(events).toContainEqual(
				expect.objectContaining({
					kind: "helperSold",
					earned: 3,
					position: { x: 0, y: 0 },
				}),
			);
		});

		it("ignores barrels until told what to do", () => {
			const farm = makeFarm(["B", "P"]);
			const helper = hire(farm, "sprout", 0, 1);
			helper.basket = { mushroom: 2 };
			steps(farm, 1);
			expect(helper.basket).toEqual({ mushroom: 2 });
		});

		it("hands mushrooms along a chain: Sprout fills a barrel, Dew carries them to the log", () => {
			// Sprout picks row 0, which ends at a barrel. Dew walks a path down
			// column 4, past the barrel at the top and the log at the bottom.
			const farm = makeFarm(["rrrBP", "    P", "    L"]);
			const sprout = hire(farm, "sprout", 0, 0);
			const dew = hire(farm, "dew", 4, 0);
			cycleStationSetting(farm, sprout.id, { x: 3, y: 0 }); // drop off
			cycleStationSetting(farm, dew.id, { x: 3, y: 0 }); // drop off
			cycleStationSetting(farm, dew.id, { x: 3, y: 0 }); // pick up

			const moneyBefore = farm.money;
			steps(farm, 20);

			expect(sprout.stats.harvested).toBeGreaterThanOrEqual(2);
			expect(dew.stats.sold).toBeGreaterThan(0);
			expect(farm.money).toBeGreaterThan(moneyBefore);
		});

		it("cycles barrel settings through drop off, pick up and ignore, and the log between drop off and ignore", () => {
			const farm = makeFarm(["BPL"]);
			const helper = hire(farm, "sprout", 1, 0);
			expect(cycleStationSetting(farm, helper.id, { x: 0, y: 0 })).toBe(
				"dropOff",
			);
			expect(cycleStationSetting(farm, helper.id, { x: 0, y: 0 })).toBe(
				"pickUp",
			);
			expect(cycleStationSetting(farm, helper.id, { x: 0, y: 0 })).toBe(
				"ignore",
			);
			expect(cycleStationSetting(farm, helper.id, { x: 2, y: 0 })).toBe(
				"ignore",
			);
			expect(cycleStationSetting(farm, helper.id, { x: 2, y: 0 })).toBe(
				"dropOff",
			);
			expect(cycleStationSetting(farm, helper.id, { x: 1, y: 0 })).toBeNull();
		});

		it("doesn't overfill a barrel", () => {
			const farm = makeFarm(["B", "P"]);
			const helper = hire(farm, "sprout", 0, 1);
			const barrel = farm.tiles[posKey(0, 0)];
			if (barrel?.kind === "barrel")
				barrel.items = { mushroom: FARM.BARREL_CAPACITY - 1 };
			cycleStationSetting(farm, helper.id, { x: 0, y: 0 });
			helper.basket = { mushroom: 4 };
			steps(farm, 1);
			expect(helper.basket).toEqual({ mushroom: 3 });
			expect(barrel).toMatchObject({
				items: { mushroom: FARM.BARREL_CAPACITY },
			});
		});
	});

	describe("routes", () => {
		it("runs along her line until a building or the edge", () => {
			const farm = makeFarm(["S.g.PB."]);
			const sprout = hire(farm, "sprout", 2, 0);
			const xs = getHelperRoute(farm, sprout)
				.map((p) => p.x)
				.sort();
			expect(xs).toEqual([1, 2, 3, 4]);
		});

		it("lists the stations beside her route", () => {
			const farm = makeFarm(["B.L", "...", " B "]);
			const sprout = hire(farm, "sprout", 0, 1);
			expect(getRouteStations(farm, sprout).sort()).toEqual([
				"0,0",
				"1,2",
				"2,0",
			]);
		});
	});

	describe("hiring and placing", () => {
		it("costs more for each helper", () => {
			const farm = makeFarm(["...."]);
			const first = getHelperCost(farm);
			hire(farm, "sprout", 0, 0);
			expect(getHelperCost(farm)).toBeGreaterThan(first);
		});

		it("can only stand on plots and paths, one per tile", () => {
			const farm = makeFarm([".LP"]);
			expect(hireHelper(farm, "sprout", { x: 1, y: 0 })).toBeNull();
			expect(hireHelper(farm, "sprout", { x: 2, y: 0 })).not.toBeNull();
			expect(hireHelper(farm, "dew", { x: 2, y: 0 })).toBeNull();
			expect(hireHelper(farm, "dew", { x: 5, y: 5 })).toBeNull();
		});

		it("won't build on top of a helper, except a path", () => {
			const farm = makeFarm([".."]);
			hire(farm, "sprout", 0, 0);
			expect(placeBuilding(farm, "barrel", { x: 0, y: 0 })).toBe(false);
			expect(placeBuilding(farm, "sprinkler", { x: 0, y: 0 })).toBe(false);
			expect(placeBuilding(farm, "path", { x: 0, y: 0 })).toBe(true);
			farm.tiles[posKey(1, 0)] = { kind: "barrel", items: {} };
			farm.tiles[posKey(2, 0)] = { kind: "plot", growth: null, watered: false };
			expect(moveBuilding(farm, { x: 1, y: 0 }, { x: 0, y: 0 })).toBe(false);
		});

		it("can be sent home", () => {
			const farm = makeFarm(["..."]);
			const sprout = hire(farm, "sprout", 1, 0);
			expect(removeHelper(farm, sprout.id)).toBe(true);
			expect(farm.helpers).toHaveLength(0);
			expect(removeHelper(farm, sprout.id)).toBe(false);
		});

		it("turns around when asked", () => {
			const farm = makeFarm(["..."]);
			const sprout = hire(farm, "sprout", 1, 0);
			turnHelper(farm, sprout.id);
			steps(farm, 1);
			expect(sprout.x).toBe(0);
		});
	});

	describe("time", () => {
		it("does the same in one long tick as in many short ones", () => {
			const build = () => {
				const farm = makeFarm(["r.g.rB", "..L..."]);
				const sprout = hire(farm, "sprout", 0, 0);
				hire(farm, "dew", 1, 0);
				cycleStationSetting(farm, sprout.id, { x: 5, y: 0 });
				return { farm };
			};
			const a = build();
			const b = build();
			tick(a.farm, 37_000);
			for (let i = 0; i < 370; i++) tick(b.farm, 100);
			// Growth adds up in different-sized pieces, so allow for rounding
			const rounded = (farm: FarmState) =>
				JSON.parse(
					JSON.stringify(farm, (key, value) =>
						key === "growth" && typeof value === "number"
							? Math.round(value * 1e6) / 1e6
							: value,
					),
				);
			expect(rounded(a.farm)).toEqual(rounded(b.farm));
		});

		it("reports what helpers sold while the player was away", () => {
			const farm = makeFarm(["L", "r", "."]);
			hire(farm, "dew", 0, 2);
			const loaded = deserializeFarm(serializeFarm(farm, 0), 60_000);
			expect(loaded?.soldWhileAway).toBeGreaterThan(0);
			expect(loaded?.earnedWhileAway).toBe(loaded?.soldWhileAway);
			expect(loaded?.state.helpers).toHaveLength(1);
		});
	});
});
