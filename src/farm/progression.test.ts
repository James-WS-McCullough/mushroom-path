import { describe, expect, it } from "vitest";
import { posKey } from "../utils/positionUtils";
import {
	buyPlot,
	buyUpgrade,
	createFarm,
	FARM,
	type FarmState,
	type FarmTile,
	getBuildingCost,
	getGrowMs,
	getHelperBasketCapacity,
	getHelperCost,
	getHelperRoute,
	getTile,
	getUpgradeCost,
	getUpgradeLevel,
	type Helper,
	type HelperType,
	hireHelper,
	moveHelper,
	placeBuilding,
	removeHelper,
	setFairyRing,
	tapTile,
	tick,
	turnHelper,
	UPGRADES,
} from "./simulation";

/** Draw a farm: "." empty plot, "r" ripe, "g" growing, "L" log, "S" sprinkler, "P" path */
function makeFarm(rows: string[]): FarmState {
	const tiles: Record<string, FarmTile> = {};
	const codes: Record<string, FarmTile> = {
		".": { kind: "plot", growth: null, watered: false },
		r: { kind: "plot", growth: 1, watered: false },
		g: { kind: "plot", growth: 0.5, watered: false },
		L: { kind: "log" },
		S: { kind: "sprinkler" },
		P: { kind: "path" },
	};
	rows.forEach((row, y) => {
		[...row].forEach((code, x) => {
			const tile = codes[code];
			if (tile) tiles[posKey(x, y)] = structuredClone(tile);
		});
	});
	return {
		tiles,
		money: 100_000,
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

function growthAt(farm: FarmState, x: number, y: number) {
	const tile = getTile(farm, { x, y });
	return tile?.kind === "plot" ? tile.growth : tile?.kind;
}

describe("more helpers", () => {
	describe("Hopper", () => {
		it("leaps two tiles at a time, over buildings, skipping the tile between", () => {
			const farm = makeFarm(["PSrr"]);
			const hopper = hire(farm, "hopper", 0, 0);
			tick(farm, 1000);
			expect(hopper).toMatchObject({ x: 2, lastMove: "jump" });
			expect(hopper.basket).toEqual({ mushroom: 1 });
			expect(growthAt(farm, 3, 0)).toBe(1); // untouched
		});

		it("waits when she'd land on a growing mushroom, and turns at the edge", () => {
			const farm = makeFarm(["P.g"]);
			const hopper = hire(farm, "hopper", 0, 0);
			tick(farm, 1000);
			expect(hopper).toMatchObject({ x: 0, lastMove: "wait" });

			const edge = makeFarm(["P."]);
			const other = hire(edge, "hopper", 0, 0);
			tick(edge, 1000);
			expect(other).toMatchObject({ x: 0, dir: -1, lastMove: "turn" });
		});

		it("routes over every other tile", () => {
			const farm = makeFarm(["....."]);
			const hopper = hire(farm, "hopper", 0, 0);
			expect(
				getHelperRoute(farm, hopper)
					.map((p) => p.x)
					.sort(),
			).toEqual([0, 2, 4]);
		});
	});

	describe("Skater", () => {
		it("slides on, then turns right when blocked, looping round a ring of path", () => {
			const farm = makeFarm(["PPP", "PSP", "PPP"]);
			const skater = hire(farm, "skater", 0, 0);
			const visited = new Set<string>();
			for (let i = 0; i < 12; i++) {
				tick(farm, 600);
				visited.add(`${skater.x},${skater.y}`);
			}
			expect(visited).toEqual(
				new Set(["0,0", "1,0", "2,0", "2,1", "2,2", "1,2", "0,2", "0,1"]),
			);
			expect(getHelperRoute(farm, skater)).toHaveLength(8);
		});

		it("turns right when asked", () => {
			const farm = makeFarm(["PP", "PP"]);
			const skater = hire(farm, "skater", 0, 0);
			turnHelper(farm, skater.id);
			expect(skater.heading).toBe("down");
		});

		it("is quicker than the walkers", () => {
			const farm = makeFarm(["PPPPPPPPPP"]);
			const skater = hire(farm, "skater", 0, 0);
			tick(farm, 3000);
			expect(skater.x).toBe(5);
		});
	});

	describe("Fairy", () => {
		it("zips between her rings, picking and planting the patch around each", () => {
			const farm = makeFarm(["rrr...", "rrr...", "rrr..L"]);
			const fairy = hire(farm, "fairy", 1, 1);
			expect(setFairyRing(farm, fairy.id, { x: 4, y: 1 })).toBe(true);

			tick(farm, 3000); // zips to the ring by the log
			expect(fairy).toMatchObject({ x: 4, y: 1, lastMove: "teleport" });
			expect(growthAt(farm, 3, 0)).toBe(0); // planted around her

			tick(farm, 3000); // back home: picks the ripe patch
			expect(fairy).toMatchObject({ x: 1, y: 1 });
			expect(fairy.stats.harvested).toBe(getHelperBasketCapacity(farm));
		});

		it("sells at a log beside a ring", () => {
			const farm = makeFarm(["...", ".L.", "..."]);
			const fairy = hire(farm, "fairy", 0, 1);
			setFairyRing(farm, fairy.id, { x: 2, y: 1 });
			fairy.basket = { mushroom: 3 };
			const before = farm.money;
			tick(farm, 3000);
			expect(farm.money).toBe(before + 3);
		});

		it("only takes rings on plots and paths, and moves her home with her", () => {
			const farm = makeFarm(["..L"]);
			const fairy = hire(farm, "fairy", 0, 0);
			const sprout = hire(farm, "sprout", 1, 0);
			expect(setFairyRing(farm, fairy.id, { x: 2, y: 0 })).toBe(false);
			expect(setFairyRing(farm, sprout.id, { x: 0, y: 0 })).toBe(false);

			removeHelper(farm, sprout.id);
			expect(moveHelper(farm, fairy.id, { x: 1, y: 0 })).toBe(true);
			expect(fairy.home).toEqual({ x: 1, y: 0 });
		});
	});

	it("prices fancier helpers higher", () => {
		const farm = makeFarm(["."]);
		expect(getHelperCost(farm, "hopper")).toBeGreaterThan(
			getHelperCost(farm, "sprout"),
		);
		expect(getHelperCost(farm, "fairy")).toBeGreaterThan(
			getHelperCost(farm, "skater"),
		);
	});
});

describe("upgrades", () => {
	it("cost more each level and stop at the max", () => {
		const farm = makeFarm(["."]);
		farm.money = 1e12;
		const first = getUpgradeCost(farm, "helperSpeed");
		expect(buyUpgrade(farm, "helperSpeed")).toBe(true);
		expect(getUpgradeCost(farm, "helperSpeed")).toBeGreaterThan(first ?? 0);
		for (let i = 1; i < UPGRADES.helperSpeed.max; i++)
			buyUpgrade(farm, "helperSpeed");
		expect(getUpgradeLevel(farm, "helperSpeed")).toBe(UPGRADES.helperSpeed.max);
		expect(getUpgradeCost(farm, "helperSpeed")).toBeNull();
		expect(buyUpgrade(farm, "helperSpeed")).toBe(false);
	});

	it("won't sell an upgrade you can't afford", () => {
		const farm = makeFarm(["."]);
		farm.money = 0;
		expect(buyUpgrade(farm, "basket")).toBe(false);
		expect(getUpgradeLevel(farm, "basket")).toBe(0);
	});

	it("grow your basket, helpers' baskets, growth and helper speed", () => {
		const farm = makeFarm(["PPPPPPPPPP"]);
		const sprout = hire(farm, "sprout", 0, 0);
		buyUpgrade(farm, "basket");
		buyUpgrade(farm, "helperBasket");
		buyUpgrade(farm, "growth");
		buyUpgrade(farm, "helperSpeed");

		expect(farm.basketCapacity).toBe(FARM.BASKET_CAPACITY + 5);
		expect(getHelperBasketCapacity(farm)).toBe(FARM.HELPER_BASKET + 2);
		expect(getGrowMs(farm)).toBeCloseTo(FARM.GROW_MS * 0.85);
		tick(farm, 850 * 4);
		expect(sprout.x).toBe(4);
	});

	it("make golden mushrooms turn up now and then, repeatably", () => {
		const pick = (goldenLevel: number) => {
			const farm = makeFarm(["r"]);
			farm.upgrades.golden = goldenLevel;
			farm.basketCapacity = 1000;
			let golden = 0;
			for (let i = 0; i < 500; i++) {
				const tile = farm.tiles["0,0"];
				if (tile?.kind === "plot") tile.growth = 1;
				tapTile(farm, { x: 0, y: 0 });
			}
			golden = farm.basket.golden ?? 0;
			return golden;
		};
		expect(pick(0)).toBe(0);
		const atMax = pick(UPGRADES.golden.max);
		// 10% chance: somewhere around 50 of 500
		expect(atMax).toBeGreaterThan(25);
		expect(atMax).toBeLessThan(80);
		expect(pick(UPGRADES.golden.max)).toBe(atMax);
	});
});

describe("hollow logs", () => {
	it("turn up in plots bought far from every log", () => {
		const farm = createFarm(1);
		farm.money = 1e9;
		// Walk a line of plots out to the left of the farm
		const results: string[] = [];
		for (let x = -1; x >= -4; x--)
			results.push(String(buyPlot(farm, { x, y: 1 })));
		expect(results).toEqual(["plot", "plot", "log", "plot"]);
		expect(getTile(farm, { x: -3, y: 1 })).toEqual({ kind: "log" });
	});

	it("can be built, the first extra one costing the base price", () => {
		const farm = makeFarm(["L."]);
		const first = getBuildingCost(farm, "log");
		expect(placeBuilding(farm, "log", { x: 1, y: 0 })).toBe(true);
		expect(getBuildingCost(farm, "log")).toBeGreaterThan(first);
	});
});
