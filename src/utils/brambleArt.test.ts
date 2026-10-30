import { describe, expect, it } from "vitest";
import {
	BRAMBLE_TILE_SIZE,
	type BrambleLinks,
	createBrambleArt,
} from "./brambleArt";

const NO_LINKS: BrambleLinks = {
	up: false,
	down: false,
	left: false,
	right: false,
};

/** All coordinates where a cane starts or ends ("M x y" and the final point of "C ...") */
function caneEnds(d: string): { x: number; y: number }[] {
	const numbers = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
	return [
		{ x: numbers[0] ?? 0, y: numbers[1] ?? 0 },
		{
			x: numbers[numbers.length - 2] ?? 0,
			y: numbers[numbers.length - 1] ?? 0,
		},
	];
}

function allNumbers(d: string): number[] {
	return d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
}

describe("createBrambleArt", () => {
	it("draws the same tile the same way every time", () => {
		const links = { ...NO_LINKS, right: true };
		expect(createBrambleArt({ x: 3, y: 5 }, links)).toEqual(
			createBrambleArt({ x: 3, y: 5 }, links),
		);
	});

	it("draws different tiles differently", () => {
		expect(createBrambleArt({ x: 1, y: 1 }, NO_LINKS)).not.toEqual(
			createBrambleArt({ x: 2, y: 1 }, NO_LINKS),
		);
	});

	it("has thorny canes", () => {
		const art = createBrambleArt({ x: 0, y: 0 }, NO_LINKS);
		expect(art.canes.length).toBeGreaterThanOrEqual(3);
		expect(art.thorns.length).toBeGreaterThan(0);
	});

	it("meets a horizontal neighbour's canes at the same points on the shared edge", () => {
		const left = createBrambleArt({ x: 4, y: 2 }, { ...NO_LINKS, right: true });
		const right = createBrambleArt({ x: 5, y: 2 }, { ...NO_LINKS, left: true });

		const crossings = (canes: { d: string }[], edgeX: number) =>
			new Set(
				canes
					.flatMap((cane) => caneEnds(cane.d))
					.filter((p) => p.x === edgeX)
					.map((p) => p.y),
			);

		const fromLeft = crossings(left.canes, BRAMBLE_TILE_SIZE + 2);
		const fromRight = crossings(right.canes, -2);
		expect(fromLeft.size).toBeGreaterThan(0);
		expect(fromLeft).toEqual(fromRight);
	});

	it("meets a vertical neighbour's canes at the same points on the shared edge", () => {
		const top = createBrambleArt({ x: 1, y: 6 }, { ...NO_LINKS, down: true });
		const bottom = createBrambleArt({ x: 1, y: 7 }, { ...NO_LINKS, up: true });

		const crossings = (canes: { d: string }[], edgeY: number) =>
			new Set(
				canes
					.flatMap((cane) => caneEnds(cane.d))
					.filter((p) => p.y === edgeY)
					.map((p) => p.x),
			);

		const fromTop = crossings(top.canes, BRAMBLE_TILE_SIZE + 2);
		const fromBottom = crossings(bottom.canes, -2);
		expect(fromTop.size).toBeGreaterThan(0);
		expect(fromTop).toEqual(fromBottom);
	});

	it("keeps a lone bramble's canes inside its tile", () => {
		for (let x = 0; x < 20; x++) {
			const art = createBrambleArt({ x, y: x * 3 }, NO_LINKS);
			for (const cane of art.canes) {
				for (const p of caneEnds(cane.d)) {
					expect(p.x).toBeGreaterThanOrEqual(0);
					expect(p.x).toBeLessThanOrEqual(BRAMBLE_TILE_SIZE);
					expect(p.y).toBeGreaterThanOrEqual(0);
					expect(p.y).toBeLessThanOrEqual(BRAMBLE_TILE_SIZE);
				}
			}
			// Nothing (curl control points included) strays far outside
			for (const n of allNumbers(art.canes.map((c) => c.d).join(" "))) {
				expect(Math.abs(n - BRAMBLE_TILE_SIZE / 2)).toBeLessThan(
					BRAMBLE_TILE_SIZE,
				);
			}
		}
	});
});
