/**
 * Procedural bramble art: thorny canes snaking across a 64x64 tile.
 *
 * Canes run to the edges shared with neighbouring bramble tiles and meet the
 * neighbour's cane at exactly the same point, so a cluster of brambles reads
 * as one tangle. Everything is derived from the tile's position, so each
 * bramble looks different but never changes between renders.
 */

import type { Position } from "../types/game";

export const BRAMBLE_TILE_SIZE = 64;

/** Which neighbouring tiles are also brambles */
export interface BrambleLinks {
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
}

export interface BrambleCane {
	/** SVG path data */
	d: string;
	width: number;
	/** Back canes are darker, so the tangle has some depth */
	layer: "back" | "front";
}

export interface BrambleArt {
	canes: BrambleCane[];
	/** SVG path data for every thorn, as one path */
	thorns: string;
	berries: { x: number; y: number; r: number }[];
}

interface Point {
	x: number;
	y: number;
}

/** A cubic bezier from p0 to p3 */
interface Curve {
	p0: Point;
	p1: Point;
	p2: Point;
	p3: Point;
	width: number;
	layer: "back" | "front";
}

const MAIN_WIDTH = 5;
const BACK_WIDTH = 3.4;
const TENDRIL_WIDTH = 2.6;
/** How far a linked cane pokes past the tile edge, to bridge the gap between tiles */
const EDGE_OVERHANG = 2;
const THORN_SPACING = 9.5;

/** Small deterministic PRNG (mulberry32) */
function createRandom(seed: number): () => number {
	let state = seed | 0;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hash(...values: number[]): number {
	let h = 2166136261;
	for (const value of values) {
		h = Math.imul(h ^ (value | 0), 16777619);
	}
	return h >>> 0;
}

/**
 * Where canes cross an edge, shared by both tiles on either side of it:
 * a main strand and a second one further along
 */
function edgeOffsets(
	x: number,
	y: number,
	horizontal: boolean,
): [number, number] {
	const random = createRandom(hash(x, y, horizontal ? 1 : 2));
	const main = (random() - 0.5) * 14;
	const second = main + (main > 0 ? -1 : 1) * (14 + random() * 6);
	return [main, second];
}

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Point, s: number): Point => ({ x: a.x * s, y: a.y * s });
const lerp = (a: Point, b: Point, t: number): Point => ({
	x: a.x + (b.x - a.x) * t,
	y: a.y + (b.y - a.y) * t,
});

function normalize(p: Point): Point {
	const length = Math.hypot(p.x, p.y) || 1;
	return { x: p.x / length, y: p.y / length };
}

function pointAt(c: Curve, t: number): Point {
	const u = 1 - t;
	return {
		x:
			u * u * u * c.p0.x +
			3 * u * u * t * c.p1.x +
			3 * u * t * t * c.p2.x +
			t * t * t * c.p3.x,
		y:
			u * u * u * c.p0.y +
			3 * u * u * t * c.p1.y +
			3 * u * t * t * c.p2.y +
			t * t * t * c.p3.y,
	};
}

function tangentAt(c: Curve, t: number): Point {
	const u = 1 - t;
	return normalize({
		x:
			3 * u * u * (c.p1.x - c.p0.x) +
			6 * u * t * (c.p2.x - c.p1.x) +
			3 * t * t * (c.p3.x - c.p2.x),
		y:
			3 * u * u * (c.p1.y - c.p0.y) +
			6 * u * t * (c.p2.y - c.p1.y) +
			3 * t * t * (c.p3.y - c.p2.y),
	});
}

function curveLength(c: Curve): number {
	let length = 0;
	let previous = c.p0;
	for (let i = 1; i <= 12; i++) {
		const point = pointAt(c, i / 12);
		length += Math.hypot(point.x - previous.x, point.y - previous.y);
		previous = point;
	}
	return length;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

function curvePath(c: Curve): string {
	return `M${fmt(c.p0.x)} ${fmt(c.p0.y)}C${fmt(c.p1.x)} ${fmt(c.p1.y)} ${fmt(c.p2.x)} ${fmt(c.p2.y)} ${fmt(c.p3.x)} ${fmt(c.p3.y)}`;
}

/**
 * A snaking curve between two points: the control points swing out to
 * opposite sides, giving an S-bend.
 */
function snakingCurve(
	from: Point,
	to: Point,
	width: number,
	random: () => number,
	startDirection?: Point,
	layer: Curve["layer"] = "front",
): Curve {
	const along = { x: to.x - from.x, y: to.y - from.y };
	const length = Math.hypot(along.x, along.y);
	const dir = normalize(along);
	const normal = { x: -dir.y, y: dir.x };
	const swing = length * (0.25 + random() * 0.3) * (random() < 0.5 ? -1 : 1);

	// Linked canes leave the edge straight, so they line up with the neighbour's cane
	const p1 = startDirection
		? add(from, scale(startDirection, length * 0.4))
		: add(lerp(from, to, 0.33), scale(normal, swing));
	const p2 = add(lerp(from, to, 0.66), scale(normal, -swing * 0.8));
	return { p0: from, p1, p2, p3: to, width, layer };
}

/** A thinner offshoot that ends in a hooked curl */
function curlingTendril(
	from: Point,
	direction: Point,
	length: number,
	random: () => number,
): Curve {
	const dir = normalize(direction);
	const normal = { x: -dir.y, y: dir.x };
	const curlSide = random() < 0.5 ? -1 : 1;
	const end = add(from, scale(dir, length));
	return {
		p0: from,
		p1: add(from, scale(dir, length * 0.6)),
		// Overshoot past the end and sweep back round to make the hook
		p2: add(
			end,
			add(scale(dir, length * 0.45), scale(normal, curlSide * length * 0.7)),
		),
		p3: add(end, scale(normal, curlSide * length * 0.35)),
		width: TENDRIL_WIDTH,
		layer: "front",
	};
}

/** Hooked thorns along both sides of a cane */
function thornsAlong(c: Curve, random: () => number): string[] {
	const count = Math.max(1, Math.floor(curveLength(c) / THORN_SPACING));
	const thorns: string[] = [];
	let side = random() < 0.5 ? -1 : 1;

	for (let i = 0; i < count; i++) {
		const t = (i + 0.35 + random() * 0.3) / count;
		const point = pointAt(c, t);
		const tangent = tangentAt(c, t);
		const normal = { x: -tangent.y * side, y: tangent.x * side };
		const size = c.width >= MAIN_WIDTH * 0.8 ? 4.4 : 3.2;

		const base = add(point, scale(normal, c.width * 0.35));
		const back = add(base, scale(tangent, -size * 0.45));
		const front = add(base, scale(tangent, size * 0.45));
		// Thorns hook backwards along the cane, like real brambles
		const tip = add(
			base,
			add(scale(normal, size), scale(tangent, -size * 0.5)),
		);

		thorns.push(
			`M${fmt(back.x)} ${fmt(back.y)}L${fmt(tip.x)} ${fmt(tip.y)}L${fmt(front.x)} ${fmt(front.y)}Z`,
		);
		side = -side;
	}
	return thorns;
}

export function createBrambleArt(
	position: Position,
	links: BrambleLinks,
): BrambleArt {
	const S = BRAMBLE_TILE_SIZE;
	const random = createRandom(hash(position.x, position.y, 7));
	const hub = {
		x: S / 2 + (random() - 0.5) * 14,
		y: S / 2 + (random() - 0.5) * 14,
	};

	const curves: Curve[] = [];
	const randomIn = (min: number, max: number) => min + random() * (max - min);

	// Shared edges with neighbouring brambles: two strands cross each one
	const sides: {
		linked: boolean;
		at: (offset: number) => Point;
		inward: Point;
		offsets: [number, number];
	}[] = [
		{
			linked: links.left,
			at: (o) => ({ x: -EDGE_OVERHANG, y: S / 2 + o }),
			inward: { x: 1, y: 0 },
			offsets: edgeOffsets(position.x - 1, position.y, true),
		},
		{
			linked: links.right,
			at: (o) => ({ x: S + EDGE_OVERHANG, y: S / 2 + o }),
			inward: { x: -1, y: 0 },
			offsets: edgeOffsets(position.x, position.y, true),
		},
		{
			linked: links.up,
			at: (o) => ({ x: S / 2 + o, y: -EDGE_OVERHANG }),
			inward: { x: 0, y: 1 },
			offsets: edgeOffsets(position.x, position.y - 1, false),
		},
		{
			linked: links.down,
			at: (o) => ({ x: S / 2 + o, y: S + EDGE_OVERHANG }),
			inward: { x: 0, y: -1 },
			offsets: edgeOffsets(position.x, position.y, false),
		},
	];

	/** A point to aim a cane at: a shared edge, or just inside an open one */
	const anchorOn = (side: (typeof sides)[number], strand: 0 | 1): Point => {
		if (side.linked) return side.at(side.offsets[strand]);
		const inside = side.at(randomIn(-20, 20));
		return {
			x: Math.min(S - 8, Math.max(8, inside.x)),
			y: Math.min(S - 8, Math.max(8, inside.y)),
		};
	};

	// Main strands from each shared edge into the middle of the tangle
	for (const side of sides) {
		if (side.linked) {
			curves.push(
				snakingCurve(
					side.at(side.offsets[0]),
					hub,
					MAIN_WIDTH,
					random,
					side.inward,
				),
			);
		}
	}

	// Canes sweeping from side to side, crossing over each other. Every shared
	// edge sends its second strand across, so it always meets the neighbour's.
	const sweepStarts = sides.filter((side) => side.linked);
	const extraSweeps =
		Math.max(2, 4 - sweepStarts.length) + Math.floor(random() * 2);
	for (let i = 0; i < extraSweeps; i++) {
		const side = sides[Math.floor(random() * 4)];
		if (side) sweepStarts.push(side);
	}
	for (const from of sweepStarts) {
		const others = sides.filter((side) => side !== from);
		const to = others[Math.floor(random() * others.length)];
		if (!to) continue;
		curves.push(
			snakingCurve(
				anchorOn(from, 1),
				anchorOn(to, 1),
				MAIN_WIDTH * 0.85,
				random,
				from.linked ? from.inward : undefined,
			),
		);
	}

	// Darker canes behind, so the tangle looks deep
	const backCanes: Curve[] = [];
	for (let i = 0; i < 3; i++) {
		const start = { x: randomIn(4, S - 4), y: randomIn(4, S - 4) };
		const end = { x: randomIn(4, S - 4), y: randomIn(4, S - 4) };
		if (Math.hypot(end.x - start.x, end.y - start.y) < 24) continue;
		backCanes.push(
			snakingCurve(start, end, BACK_WIDTH, random, undefined, "back"),
		);
	}

	// Curling tendrils sprouting off the canes
	const tendrils: Curve[] = [];
	const tendrilCount = 3 + Math.floor(random() * 2);
	for (let i = 0; i < tendrilCount; i++) {
		const parent = curves[Math.floor(random() * curves.length)];
		if (!parent) break;
		const t = 0.3 + random() * 0.5;
		const start = pointAt(parent, t);
		const tangent = tangentAt(parent, t);
		const side = random() < 0.5 ? -1 : 1;
		const direction = add(
			scale({ x: -tangent.y, y: tangent.x }, side),
			scale(tangent, 0.5),
		);
		const tendril = curlingTendril(start, direction, 9 + random() * 6, random);
		// Keep curls inside the tile
		const end = tendril.p3;
		if (end.x > 4 && end.x < S - 4 && end.y > 4 && end.y < S - 4) {
			tendrils.push(tendril);
		}
	}

	const allCurves = [...backCanes, ...curves, ...tendrils];

	// Now and then, a little cluster of blackberries
	const berries: BrambleArt["berries"] = [];
	const berryCane = curves[0];
	if (berryCane && random() < 0.4) {
		const anchor = pointAt(berryCane, 0.5 + random() * 0.3);
		for (let i = 0; i < 4; i++) {
			berries.push({
				x: anchor.x + (i % 2) * 3.2 - 1.6 + (random() - 0.5),
				y: anchor.y + Math.floor(i / 2) * 3 - 1.5 + (random() - 0.5),
				r: 1.9,
			});
		}
	}

	return {
		canes: allCurves.map((c) => ({
			d: curvePath(c),
			width: c.width,
			layer: c.layer,
		})),
		thorns: allCurves.flatMap((c) => thornsAlong(c, random)).join(""),
		berries,
	};
}
