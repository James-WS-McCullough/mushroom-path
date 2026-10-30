import { describe, expect, it } from "vitest";
import { level1 } from "../data/levels";
import { tutorialLevels } from "../data/tutorialLevels";
import type { FlowDirection, Level } from "../types/game";
import { TileType } from "../types/game";
import unsolvableLevels from "./__fixtures__/unsolvableLevels.json";
import {
	applyMove,
	canReachAllRequired,
	createInitialState,
	createLevelRules,
	isWin,
	replayMoves,
	solve,
} from "./rules";

const TILE_CODES: Record<string, TileType> = {
	G: TileType.GRASS,
	B: TileType.BRAMBLE,
	M: TileType.MUSHROOM,
	V: TileType.VOID,
	S: TileType.STONE,
	W: TileType.WATER,
	D: TileType.DIRT,
	I: TileType.ICE,
	P: TileType.PORTAL_PINK,
	L: TileType.LOW_SAND,
	E: TileType.SEA,
	O: TileType.POND,
	T: TileType.BOUNCE_PAD,
	A: TileType.ACORN,
	X: TileType.SQUIRREL,
};

function makeLevel(
	rows: string[],
	start: { x: number; y: number },
	extra: Partial<Level> = {},
): Level {
	const grid = rows.map((row) =>
		row.split("").map((code) => TILE_CODES[code] ?? TileType.VOID),
	);
	return {
		name: "Rules Test",
		width: grid[0]?.length ?? 0,
		height: grid.length,
		grid,
		startPosition: start,
		...extra,
	};
}

function setup(level: Level) {
	return { rules: createLevelRules(level), state: createInitialState(level) };
}

describe("rules", () => {
	describe("applyMove", () => {
		it("plants the tile being left and steps onto the next", () => {
			const { rules, state } = setup(makeLevel(["GGG"], { x: 0, y: 0 }));
			const move = applyMove(rules, state, "right");

			expect(move?.settled).toEqual({ x: 1, y: 0 });
			expect(move?.final.tiles[0]?.[0]).toBe(TileType.MUSHROOM);
			expect(move?.final.tidePhase).toBe(2);
			// The original state is untouched
			expect(state.tiles[0]?.[0]).toBe(TileType.GRASS);
		});

		it("jumps over an obstacle", () => {
			const { rules, state } = setup(makeLevel(["GBG"], { x: 0, y: 0 }));
			const move = applyMove(rules, state, "right");

			expect(move?.target).toEqual({ x: 2, y: 0 });
			expect(move?.segments[0]).toMatchObject({ kind: "hop", isJump: true });
		});

		it("returns null when there is nowhere to go", () => {
			const { rules, state } = setup(makeLevel(["GBB"], { x: 0, y: 0 }));
			expect(applyMove(rules, state, "right")).toBeNull();
		});

		it("chains ice into a bounce into a portal", () => {
			// G I G T B B P G G P G
			const { rules, state } = setup(
				makeLevel(["GIGTBBPGGPG"], { x: 0, y: 0 }),
			);
			// Ice slides onto grass at x=2 and stops there
			const first = applyMove(rules, state, "right");
			expect(first?.settled).toEqual({ x: 2, y: 0 });

			const second = first && applyMove(rules, first.final, "right");
			expect(second?.segments.map((s) => s.kind)).toEqual([
				"hop",
				"bounce",
				"teleport",
			]);
			expect(second?.settled).toEqual({ x: 9, y: 0 });
		});

		it("follows a river to its stone", () => {
			const { rules, state } = setup(
				makeLevel(
					["GWWSG"],
					{ x: 0, y: 0 },
					{
						waterFlow: { "1,0": "right", "2,0": "right" },
					},
				),
			);
			const move = applyMove(rules, state, "right");
			expect(move?.settled).toEqual({ x: 3, y: 0 });
			expect(move?.segments.map((s) => s.kind)).toEqual(["hop", "water"]);
		});

		it("doesn't loop forever on a circular river", () => {
			const waterFlow: Record<string, FlowDirection> = {
				"1,0": "right",
				"2,0": "down",
				"2,1": "left",
				"1,1": "up",
			};
			const { rules, state } = setup(
				makeLevel(["GWW", "VWW"], { x: 0, y: 0 }, { waterFlow }),
			);
			const move = applyMove(rules, state, "right");
			expect(move).not.toBeNull();
		});

		it("stops an ice slide before the sea", () => {
			const { rules, state } = setup(makeLevel(["GIIE"], { x: 0, y: 0 }));
			const move = applyMove(rules, state, "right");
			expect(move?.settled).toEqual({ x: 2, y: 0 });
		});

		it("doesn't bounce onto a sunken lily-pad", () => {
			const level = makeLevel(["GTBBO"], { x: 0, y: 0 });
			const { rules, state } = setup(level);
			const pad = state.lilypads["4,0"];
			if (pad) {
				pad.submerged = true;
				pad.cooldown = 3;
			}
			const move = applyMove(rules, state, "right");
			// Nowhere to land, so the player stays on the bounce pad
			expect(move?.settled).toEqual({ x: 1, y: 0 });
		});

		it("collects an acorn where a slide ends", () => {
			const { rules, state } = setup(makeLevel(["GIAG"], { x: 0, y: 0 }));
			const move = applyMove(rules, state, "right");
			expect(move?.landing).toEqual({
				kind: "acorn",
				position: { x: 2, y: 0 },
			});
			expect(move?.final.acorns).toBe(1);
			expect(move?.final.tiles[0]?.[2]).toBe(TileType.GRASS);
		});

		it("blooms a base star's paths in trail order", () => {
			const level: Level = {
				...makeLevel(["G"], { x: 0, y: 0 }),
				width: 4,
				grid: [
					[
						TileType.GRASS,
						TileType.BASE_STAR,
						TileType.STAR_PATH,
						TileType.STAR_PATH,
					],
				],
				starConnections: { "2,0": "1,0", "3,0": "1,0" },
				starTrailTo: { "1,0": "2,0", "2,0": "3,0" },
			};
			const { rules, state } = setup(level);
			const move = applyMove(rules, state, "right");

			expect(move?.landing).toEqual({
				kind: "bloom",
				position: { x: 1, y: 0 },
				bloomed: [
					{ x: 2, y: 0 },
					{ x: 3, y: 0 },
				],
			});
			// Only the base star is left, and the player is on it
			expect(move && isWin(move.final)).toBe(true);
		});
	});

	describe("canReachAllRequired", () => {
		it("counts tiles reached through a portal", () => {
			const { rules, state } = setup(makeLevel(["GPBBPG"], { x: 0, y: 0 }));
			expect(canReachAllRequired(rules, state)).toBe(true);
		});

		it("counts tiles reached by a bounce pad", () => {
			const { rules, state } = setup(makeLevel(["GTBBGG"], { x: 0, y: 0 }));
			expect(canReachAllRequired(rules, state)).toBe(true);
		});

		it("notices a required tile cut off by mushrooms", () => {
			const { rules, state } = setup(makeLevel(["GMMMG"], { x: 0, y: 0 }));
			expect(canReachAllRequired(rules, state)).toBe(false);
		});
	});

	describe("solve", () => {
		it("finds a winning line that replays to a win", () => {
			const level = makeLevel(["GGG", "GBG", "GGG"], { x: 0, y: 0 });
			const { rules, state } = setup(level);
			const { moves } = solve(rules, state);

			expect(moves).not.toBeNull();
			const end = replayMoves(
				rules,
				state,
				moves?.map((m) => m.direction) ?? [],
			);
			expect(end && isWin(end)).toBe(true);
		});

		it("solves a level that needs a portal", () => {
			const { rules, state } = setup(makeLevel(["GPBBPG"], { x: 0, y: 0 }));
			expect(solve(rules, state).moves).not.toBeNull();
		});

		it("solves a level that needs a bounce", () => {
			const { rules, state } = setup(makeLevel(["GTBBGG"], { x: 0, y: 0 }));
			expect(solve(rules, state).moves).not.toBeNull();
		});

		it.each([
			level1,
			...tutorialLevels,
		])("solves hand-made level $name", (level) => {
			const { rules, state } = setup(level);
			const { moves } = solve(rules, state, 200_000);
			const end = replayMoves(
				rules,
				state,
				moves?.map((m) => m.direction) ?? [],
			);
			expect(end && isWin(end)).toBe(true);
		});

		it.each(
			unsolvableLevels as unknown as Level[],
		)("proves $name has no solution", (level) => {
			const { rules, state } = setup(level);
			const result = solve(rules, state, 2_000_000);
			expect(result.timedOut).toBe(false);
			expect(result.moves).toBeNull();
		});
	});
});
