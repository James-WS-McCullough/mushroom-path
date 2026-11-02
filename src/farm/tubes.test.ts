import { describe, expect, it } from "vitest";
import { posKey } from "../utils/positionUtils";
import {
	canPlaceTube,
	deserializeFarm,
	FARM,
	type FarmState,
	type FarmTile,
	getRouteStations,
	getTile,
	getTubeInlets,
	hireHelper,
	isTubeIntake,
	moveBuilding,
	placeBuilding,
	removeBuilding,
	serializeFarm,
	type TubeTile,
	tapTile,
	tick,
} from "./simulation";

/** Draw a farm: "." empty plot, "B" barrel, "L" log, "P" path */
function makeFarm(rows: string[]): FarmState {
	const tiles: Record<string, FarmTile> = {};
	rows.forEach((row, y) => {
		[...row].forEach((code, x) => {
			const key = posKey(x, y);
			if (code === ".")
				tiles[key] = { kind: "plot", growth: null, watered: false };
			if (code === "B") tiles[key] = { kind: "barrel", items: {} };
			if (code === "L") tiles[key] = { kind: "log" };
			if (code === "P") tiles[key] = { kind: "path" };
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

function tubeAt(farm: FarmState, x: number, y: number): TubeTile {
	const tile = getTile(farm, { x, y });
	if (tile?.kind !== "tube") throw new Error(`no tube at ${x},${y}`);
	return tile;
}

function barrelCount(farm: FarmState, x: number, y: number): number {
	const tile = getTile(farm, { x, y });
	return tile?.kind === "barrel" ? (tile.items.mushroom ?? 0) : -1;
}

/** A barrel on the left with a line of tubes running right from it */
function tubeLine(length: number): FarmState {
	const farm = makeFarm([`B${".".repeat(length)}`]);
	for (let x = 1; x <= length; x++) placeBuilding(farm, "tube", { x, y: 0 });
	return farm;
}

describe("tubes", () => {
	describe("placing", () => {
		it("only go beside a barrel or another tube", () => {
			const farm = makeFarm(["B..", "..."]);
			expect(canPlaceTube(farm, { x: 2, y: 1 })).toBe(false);
			expect(placeBuilding(farm, "tube", { x: 2, y: 1 })).toBe(false);
			expect(farm.money).toBe(10_000);
			expect(placeBuilding(farm, "tube", { x: 1, y: 0 })).toBe(true);
			expect(canPlaceTube(farm, { x: 2, y: 1 })).toBe(false);
			expect(placeBuilding(farm, "tube", { x: 2, y: 0 })).toBe(true);
		});

		it("roll into the barrel beside them, then along the line", () => {
			const farm = tubeLine(3);
			expect(tubeAt(farm, 1, 0).flow).toBe("left");
			expect(tubeAt(farm, 2, 0).flow).toBe("left");
			expect(tubeAt(farm, 3, 0).flow).toBe("left");
			expect(isTubeIntake(farm, { x: 3, y: 0 })).toBe(true);
			expect(isTubeIntake(farm, { x: 1, y: 0 })).toBe(false);
			expect(getTubeInlets(farm, { x: 2, y: 0 })).toEqual(["right"]);
		});

		it("turn corners", () => {
			const farm = makeFarm(["B.", ".."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			placeBuilding(farm, "tube", { x: 1, y: 1 });
			expect(tubeAt(farm, 1, 1).flow).toBe("up");
			expect(getTubeInlets(farm, { x: 1, y: 0 })).toEqual(["down"]);
		});

		it("extend the open end rather than joining the middle of a line", () => {
			const farm = makeFarm(["B..", "..."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			placeBuilding(farm, "tube", { x: 2, y: 0 });
			// Beside both the open end (2,0) and the barrel-end tube (1,0)
			placeBuilding(farm, "tube", { x: 1, y: 1 });
			expect(["up", "right"]).toContain(tubeAt(farm, 1, 1).flow);
			placeBuilding(farm, "tube", { x: 2, y: 1 });
			expect(tubeAt(farm, 2, 1).flow).not.toBe("left");
		});
	});

	describe("rolling", () => {
		it("rolls a dropped mushroom down the line into the barrel", () => {
			const farm = tubeLine(3);
			farm.basket = { mushroom: 1 };
			expect(tapTile(farm, { x: 3, y: 0 })).toEqual({
				kind: "transferred",
				gave: 1,
				took: 0,
			});
			tick(farm, FARM.TUBE_MS_PER_TILE);
			expect(tubeAt(farm, 2, 0).items).toHaveLength(1);
			expect(tubeAt(farm, 2, 0).items[0]?.from).toBe("right");
			tick(farm, FARM.TUBE_MS_PER_TILE * 3);
			expect(barrelCount(farm, 0, 0)).toBe(1);
			expect(tubeAt(farm, 1, 0).items).toHaveLength(0);
		});

		it("keeps items spaced out, and delivers them all in the end", () => {
			const farm = tubeLine(2);
			farm.basket = { mushroom: 5 };
			tapTile(farm, { x: 2, y: 0 });
			tick(farm, 300);
			const progresses = tubeAt(farm, 2, 0).items.map((i) => i.progress);
			for (let i = 1; i < progresses.length; i++) {
				expect(
					(progresses[i - 1] as number) - (progresses[i] as number),
				).toBeGreaterThanOrEqual(FARM.TUBE_SPACING - 1e-9);
			}
			tick(farm, 10_000);
			expect(barrelCount(farm, 0, 0)).toBe(5);
		});

		it("rolls at the same speed whether ticked in big or small steps", () => {
			const big = tubeLine(4);
			const small = tubeLine(4);
			for (const farm of [big, small]) {
				farm.basket = { mushroom: 3 };
				tapTile(farm, { x: 4, y: 0 });
			}
			tick(big, 3000);
			for (let i = 0; i < 300; i++) tick(small, 10);
			expect(barrelCount(big, 0, 0)).toBe(barrelCount(small, 0, 0));
			expect(barrelCount(big, 0, 0)).toBeGreaterThan(0);
		});

		it("backs up when the barrel is full", () => {
			const farm = tubeLine(1);
			const barrel = getTile(farm, { x: 0, y: 0 });
			if (barrel?.kind === "barrel")
				barrel.items = { mushroom: FARM.BARREL_CAPACITY };
			farm.basket = { mushroom: 2 };
			tapTile(farm, { x: 1, y: 0 });
			tick(farm, 10_000);
			expect(tubeAt(farm, 1, 0).items).toHaveLength(2);
			expect(tubeAt(farm, 1, 0).items[0]?.progress).toBe(1);
		});

		it("only takes so much at once", () => {
			const farm = tubeLine(2);
			farm.basket = { mushroom: 10 };
			tapTile(farm, { x: 2, y: 0 });
			expect(farm.basket).toEqual({ mushroom: 10 - FARM.TUBE_FUNNEL });
		});

		it("takes items anywhere along the line, merging them in", () => {
			const farm = tubeLine(3);
			farm.basket = { mushroom: 2 };
			tapTile(farm, { x: 3, y: 0 });
			farm.basket = { skewer: 2 };
			expect(tapTile(farm, { x: 2, y: 0 })).toEqual({
				kind: "transferred",
				gave: 2,
				took: 0,
			});
			tick(farm, 20_000);
			expect(getTile(farm, { x: 0, y: 0 })).toMatchObject({
				items: { mushroom: 2, skewer: 2 },
			});
		});

		it("sells into the log, item by item", () => {
			const farm = makeFarm(["L.."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			placeBuilding(farm, "tube", { x: 2, y: 0 });
			expect(tubeAt(farm, 1, 0).flow).toBe("left");
			const money = farm.money;
			farm.basket = { mushroom: 2, skewer: 1 };
			tapTile(farm, { x: 2, y: 0 });
			const events = tick(farm, 20_000);
			expect(farm.money).toBe(money + 2 + 5);
			expect(farm.totalSold).toBe(3);
			expect(events.filter((e) => e.kind === "tubeSold")).toHaveLength(3);
		});

		it("won't take water down a line into the log", () => {
			const farm = makeFarm(["L."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			farm.basket = { water: 1, mushroom: 1 };
			tapTile(farm, { x: 1, y: 0 });
			expect(farm.basket).toEqual({ water: 1 });
		});
	});

	describe("helpers", () => {
		it("drop off anywhere along a tube by default", () => {
			// Sprout walks the bottom row, under the tubes
			const farm = makeFarm(["B..", "PPP"]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			placeBuilding(farm, "tube", { x: 2, y: 0 });
			const sprout = hireHelper(farm, "sprout", { x: 2, y: 1 });
			if (!sprout) throw new Error("couldn't hire");
			sprout.dir = -1;
			sprout.basket = { mushroom: 3 };
			expect(getRouteStations(farm, sprout)).toContain(posKey(2, 0));
			expect(getRouteStations(farm, sprout)).toContain(posKey(1, 0));

			tick(farm, 1000); // steps under the middle of the line and drops off
			expect(sprout.basket).toEqual({});
			tick(farm, 10_000);
			expect(barrelCount(farm, 0, 0)).toBe(3);
		});
	});

	describe("rebuilding", () => {
		it("reconnects tubes when their barrel moves", () => {
			const farm = makeFarm(["B..", "..."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			expect(moveBuilding(farm, { x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
			expect(tubeAt(farm, 1, 0).flow).toBe("down");
		});

		it("won't move a tube where there's nothing to join", () => {
			const farm = makeFarm(["B...", "...."]);
			placeBuilding(farm, "tube", { x: 1, y: 0 });
			expect(moveBuilding(farm, { x: 1, y: 0 }, { x: 3, y: 1 })).toBe(false);
			expect(tubeAt(farm, 1, 0).flow).toBe("left");
			expect(getTile(farm, { x: 3, y: 1 })?.kind).toBe("plot");
		});

		it("never loops tubes round into each other", () => {
			// A ring of tubes round a sprinkler-free middle, fed from a barrel
			const farm = makeFarm(["B..", "...", "..."]);
			for (const [x, y] of [
				[1, 0],
				[2, 0],
				[2, 1],
				[2, 2],
				[1, 2],
				[0, 2],
				[0, 1],
			] as const)
				expect(placeBuilding(farm, "tube", { x, y })).toBe(true);
			removeBuilding(farm, { x: 1, y: 0 });
			// Every tube still ends up somewhere without going round forever
			farm.basket = { mushroom: 1 };
			tick(farm, 60_000);
			const tubes = Object.values(farm.tiles).filter((t) => t.kind === "tube");
			expect(tubes).toHaveLength(6);
		});

		it("are sold back for 90%, losing what's inside", () => {
			const farm = tubeLine(1);
			expect(removeBuilding(farm, { x: 1, y: 0 })).toBe(Math.floor(15 * 0.9));
		});

		it("save and load what's rolling", () => {
			const farm = tubeLine(2);
			farm.basket = { mushroom: 2 };
			tapTile(farm, { x: 2, y: 0 });
			tick(farm, 500);
			const loaded = deserializeFarm(serializeFarm(farm, 0), 0);
			expect(loaded?.state.tiles).toEqual(farm.tiles);
		});
	});
});
