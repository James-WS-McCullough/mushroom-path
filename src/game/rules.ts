/**
 * Pure game rules for Mushroom Path.
 *
 * Everything here works on plain data and returns new data: no Vue state,
 * timers or sounds. The game (useGame), the hint system and the level
 * generator all use these functions, so they can never disagree about what
 * a move does.
 */

import { MECHANICS } from "../constants/game";
import type {
	Direction,
	FlowDirection,
	Level,
	PortalType,
	Position,
} from "../types/game";
import {
	isRequiredTile,
	isWalkableTile,
	PortalTypes,
	TileType,
} from "../types/game";
import { DIRECTIONS, getDirectionDelta, posKey } from "../utils/positionUtils";

// =============================================================================
// TYPES
// =============================================================================

export interface LilypadState {
	submerged: boolean;
	cooldown: number;
}

/** Everything that changes while playing a level */
export interface GameState {
	tiles: TileType[][];
	player: Position;
	/** 0 = flooded; advances by one every move */
	tidePhase: number;
	acorns: number;
	/** Keyed by "x,y" */
	lilypads: Record<string, LilypadState>;
}

/** Everything about a level that never changes while playing it */
export interface LevelRules {
	width: number;
	height: number;
	waterFlow: Record<string, FlowDirection>;
	squirrelRequirements: Record<string, number>;
	/** Star path tiles bloomed by each base star ("x,y"), in bloom order */
	starPaths: Record<string, Position[]>;
}

/** One animated piece of a move, in the order it happens */
export type MoveSegment =
	| { kind: "hop"; from: Position; to: Position; isJump: boolean }
	| { kind: "water"; path: Position[] }
	| { kind: "ice"; path: Position[] }
	| { kind: "bounce"; pad: Position; path: Position[] }
	| { kind: "teleport"; from: Position; to: Position };

/** What happened when the player settled on their final tile */
export type LandingEffect =
	| { kind: "acorn"; position: Position }
	| { kind: "squirrel"; position: Position; cost: number }
	| { kind: "bloom"; position: Position; bloomed: Position[] };

export interface MoveResult {
	direction: Direction;
	/** The tile the player stepped or jumped onto */
	target: Position;
	/** Where the player ended up after any slides, bounces or teleports */
	settled: Position;
	segments: MoveSegment[];
	/** State once the player has left their tile (planted, tide and lily-pads ticked) */
	afterLeave: GameState;
	/** State once the move has fully resolved, including landing effects */
	final: GameState;
	/** What the left tile turned into (null if it didn't change) */
	leftTileBecame: TileType | null;
	/** The left tile was a lily-pad that sank */
	sankLilypad: boolean;
	/** Lily-pads that came back up during this move */
	resurfaced: Position[];
	landing: LandingEffect | null;
}

// =============================================================================
// TILE CATEGORIES
// =============================================================================

/** Tiles that convert when the player LEAVES them */
const TILE_LEAVE_CONVERSIONS: Partial<Record<TileType, TileType>> = {
	[TileType.GRASS]: TileType.MUSHROOM,
	[TileType.DIRT]: TileType.GRASS,
	[TileType.LOW_SAND]: TileType.SAND_MUSHROOM,
	[TileType.HONEY]: TileType.HONEY_MUSHROOM,
	[TileType.BASE_STAR]: TileType.STAR_MUSHROOM,
	[TileType.STAR_PATH]: TileType.STAR_MUSHROOM,
};

/** Tiles nobody can ever stand on again (they can still be jumped over) */
const PERMANENTLY_BLOCKED: ReadonlySet<TileType> = new Set([
	TileType.VOID,
	TileType.BRAMBLE,
	TileType.MUSHROOM,
	TileType.SAND_MUSHROOM,
	TileType.HONEY_MUSHROOM,
	TileType.STAR_MUSHROOM,
	TileType.POND_WATER,
	TileType.SEA,
]);

/** Tiles that can never become an obstacle, so they can never be jumped over */
const NEVER_OBSTACLE: ReadonlySet<TileType> = new Set([
	TileType.STONE,
	TileType.WATER,
	TileType.ICE,
	TileType.BOUNCE_PAD,
	...PortalTypes,
]);

export function isPortalTile(tileType: TileType): tileType is PortalType {
	return (PortalTypes as readonly TileType[]).includes(tileType);
}

/** Landing on these sends the player somewhere else */
export function isForcedMovementTile(tileType: TileType | null): boolean {
	return (
		tileType === TileType.WATER ||
		tileType === TileType.ICE ||
		tileType === TileType.BOUNCE_PAD ||
		(tileType !== null && isPortalTile(tileType))
	);
}

// =============================================================================
// SETUP
// =============================================================================

export function createLevelRules(level: Level): LevelRules {
	const connections = level.starConnections ?? {};
	const trailTo = level.starTrailTo ?? {};

	// Order each base star's paths by following its trail, then add any
	// connected tiles the trail didn't reach
	const starPaths: Record<string, Position[]> = {};
	const baseKeys = new Set(Object.values(connections));
	for (const baseKey of baseKeys) {
		const ordered: string[] = [];
		let current = baseKey;
		let next = trailTo[current];
		while (next && connections[next] === baseKey && !ordered.includes(next)) {
			ordered.push(next);
			current = next;
			next = trailTo[current];
		}
		for (const [pathKey, owner] of Object.entries(connections)) {
			if (owner === baseKey && !ordered.includes(pathKey)) {
				ordered.push(pathKey);
			}
		}
		starPaths[baseKey] = ordered.map(parsePosKey);
	}

	return {
		width: level.width,
		height: level.height,
		waterFlow: level.waterFlow ?? {},
		squirrelRequirements: level.squirrelRequirements ?? {},
		starPaths,
	};
}

export function createInitialState(level: Level): GameState {
	const lilypads: Record<string, LilypadState> = {};
	level.grid.forEach((row, y) => {
		row.forEach((type, x) => {
			if (type === TileType.POND) {
				lilypads[posKey(x, y)] = { submerged: false, cooldown: 0 };
			}
		});
	});
	return {
		tiles: level.grid.map((row) => [...row]),
		player: { ...level.startPosition },
		// Start at phase 1, so there are 4 moves until the first flood
		tidePhase: 1,
		acorns: 0,
		lilypads,
	};
}

export function cloneState(state: GameState): GameState {
	const lilypads: Record<string, LilypadState> = {};
	for (const key in state.lilypads) {
		const pad = state.lilypads[key];
		if (pad) lilypads[key] = { ...pad };
	}
	return {
		tiles: state.tiles.map((row) => [...row]),
		player: { ...state.player },
		tidePhase: state.tidePhase,
		acorns: state.acorns,
		lilypads,
	};
}

// =============================================================================
// QUERIES
// =============================================================================

function parsePosKey(key: string): Position {
	const [x, y] = key.split(",").map(Number);
	return { x: x ?? 0, y: y ?? 0 };
}

function samePosition(a: Position, b: Position): boolean {
	return a.x === b.x && a.y === b.y;
}

function offset(pos: Position, direction: Direction, distance = 1): Position {
	const delta = getDirectionDelta(direction);
	return { x: pos.x + delta.x * distance, y: pos.y + delta.y * distance };
}

export function getTileType(state: GameState, pos: Position): TileType | null {
	return state.tiles[pos.y]?.[pos.x] ?? null;
}

function setTileType(state: GameState, pos: Position, type: TileType): void {
	const row = state.tiles[pos.y];
	if (row && row[pos.x] !== undefined) row[pos.x] = type;
}

export function getSquirrelRequirement(rules: LevelRules, pos: Position): number {
	return rules.squirrelRequirements[posKey(pos.x, pos.y)] ?? 1;
}

function canFeedSquirrel(rules: LevelRules, state: GameState, pos: Position): boolean {
	return state.acorns >= getSquirrelRequirement(rules, pos);
}

function isLilypadSubmerged(state: GameState, pos: Position): boolean {
	return state.lilypads[posKey(pos.x, pos.y)]?.submerged ?? false;
}

/** The tide phase after the player's next move */
function nextTidePhase(state: GameState): number {
	return (state.tidePhase + 1) % MECHANICS.TIDE_PERIOD;
}

/**
 * Can the player walk or jump onto this tile with their next move?
 * Checked before the move, so low sand looks at the tide the move will bring.
 */
export function canLandOn(rules: LevelRules, state: GameState, pos: Position): boolean {
	const type = getTileType(state, pos);
	if (type === null) return false;

	switch (type) {
		case TileType.POND:
			return !isLilypadSubmerged(state, pos);
		case TileType.LOW_SAND:
			return nextTidePhase(state) !== 0;
		case TileType.SEA:
			return false;
		case TileType.SQUIRREL:
			return canFeedSquirrel(rules, state, pos);
		default:
			return isWalkableTile(type) || isPortalTile(type);
	}
}

/** Can this tile be jumped over with the player's next move? */
export function isObstacle(state: GameState, pos: Position): boolean {
	const type = getTileType(state, pos);
	if (type === null) return true;

	switch (type) {
		case TileType.POND:
			return isLilypadSubmerged(state, pos);
		case TileType.LOW_SAND:
			// Low sand that will be flooded when we land
			return nextTidePhase(state) === 0;
		case TileType.SEA:
		case TileType.SQUIRREL:
			// Squirrels can never be jumped over - only fed
			return true;
		default:
			return PERMANENTLY_BLOCKED.has(type) && type !== TileType.VOID;
	}
}

/**
 * Can the player end up on this tile partway through a move (slides,
 * bounces)? Checked after the move's tide and lily-pad tick.
 */
function canSettleOn(rules: LevelRules, state: GameState, pos: Position): boolean {
	const type = getTileType(state, pos);
	if (type === null || PERMANENTLY_BLOCKED.has(type)) return false;

	switch (type) {
		case TileType.POND:
			return !isLilypadSubmerged(state, pos);
		case TileType.LOW_SAND:
			return state.tidePhase !== 0;
		case TileType.SQUIRREL:
			return canFeedSquirrel(rules, state, pos);
		default:
			return isWalkableTile(type) || isPortalTile(type);
	}
}

/** The tile a move in this direction steps onto (walking, or jumping over an obstacle) */
export function getMoveTarget(
	rules: LevelRules,
	state: GameState,
	direction: Direction,
): Position | null {
	const adjacent = offset(state.player, direction);
	if (canLandOn(rules, state, adjacent)) {
		return adjacent;
	}

	// Honey is too sticky to jump from
	if (getTileType(state, state.player) === TileType.HONEY) {
		return null;
	}

	if (isObstacle(state, adjacent)) {
		const jump = offset(state.player, direction, 2);
		if (canLandOn(rules, state, jump)) {
			return jump;
		}
	}

	return null;
}

/** The direction that steps onto `target`, if the player can reach it in one move */
export function getDirectionToTarget(
	rules: LevelRules,
	state: GameState,
	target: Position,
): Direction | null {
	for (const direction of DIRECTIONS) {
		const moveTarget = getMoveTarget(rules, state, direction);
		if (moveTarget && samePosition(moveTarget, target)) {
			return direction;
		}
	}
	return null;
}

export function countRequiredTiles(state: GameState): number {
	let count = 0;
	for (const row of state.tiles) {
		for (const type of row) {
			if (isRequiredTile(type)) count++;
		}
	}
	return count;
}

/** Won when the player stands on the last required tile (and it isn't dirt, which needs a second visit) */
export function isWin(state: GameState): boolean {
	const playerTile = getTileType(state, state.player);
	return (
		playerTile !== null &&
		isRequiredTile(playerTile) &&
		playerTile !== TileType.DIRT &&
		countRequiredTiles(state) === 1
	);
}

// =============================================================================
// FORCED MOVEMENT
// =============================================================================

/** Follow a river from `start` until it reaches a stone (or stops flowing) */
export function computeWaterSlide(
	rules: LevelRules,
	state: GameState,
	start: Position,
): Position[] {
	const path = [start];
	const seen = new Set([posKey(start.x, start.y)]);
	let current = start;

	while (true) {
		const flow = rules.waterFlow[posKey(current.x, current.y)];
		if (!flow) break;

		const next = offset(current, flow);
		const nextType = getTileType(state, next);
		const nextKey = posKey(next.x, next.y);
		if (seen.has(nextKey)) break;

		if (nextType === TileType.WATER) {
			path.push(next);
			seen.add(nextKey);
			current = next;
		} else {
			// Rivers end on a stone; anything else stops the slide on the water
			if (nextType === TileType.STONE) path.push(next);
			break;
		}
	}

	return path;
}

/** Slide across ice in `direction` until reaching a non-ice tile, or stopping before a blocked one */
export function computeIceSlide(
	rules: LevelRules,
	state: GameState,
	start: Position,
	direction: Direction,
): Position[] {
	const path = [start];
	let current = start;

	while (true) {
		const next = offset(current, direction);
		if (!canSettleOn(rules, state, next)) break;

		path.push(next);
		current = next;
		if (getTileType(state, next) !== TileType.ICE) break;
	}

	return path;
}

/** Bounce up to three tiles from a pad, landing on the furthest tile that can be stood on */
export function computeBounce(
	rules: LevelRules,
	state: GameState,
	pad: Position,
	direction: Direction,
): Position[] | null {
	for (let distance = MECHANICS.MAX_BOUNCE_DISTANCE; distance >= 1; distance--) {
		const landing = offset(pad, direction, distance);
		if (canSettleOn(rules, state, landing)) {
			const path = [pad];
			for (let i = 1; i <= distance; i++) {
				path.push(offset(pad, direction, i));
			}
			return path;
		}
	}
	return null;
}

export function findMatchingPortal(state: GameState, pos: Position): Position | null {
	const type = getTileType(state, pos);
	if (type === null || !isPortalTile(type)) return null;

	for (let y = 0; y < state.tiles.length; y++) {
		const row = state.tiles[y];
		if (!row) continue;
		for (let x = 0; x < row.length; x++) {
			if (row[x] === type && (x !== pos.x || y !== pos.y)) {
				return { x, y };
			}
		}
	}
	return null;
}

/**
 * Carry the player through any forced movement starting at `start` (water
 * slide, ice slide, bounce, portal), chaining from one into the next.
 * Appends the animated segments and returns where the player settles.
 */
function resolveForcedMovement(
	rules: LevelRules,
	state: GameState,
	start: Position,
	direction: Direction,
	segments: MoveSegment[],
): Position {
	let pos = start;

	while (true) {
		const type = getTileType(state, pos);

		if (type === TileType.WATER) {
			// Rivers always end the move
			const path = computeWaterSlide(rules, state, pos);
			if (path.length > 1) segments.push({ kind: "water", path });
			return path[path.length - 1] ?? pos;
		}

		if (type === TileType.ICE) {
			const path = computeIceSlide(rules, state, pos, direction);
			if (path.length === 1) return pos;
			segments.push({ kind: "ice", path });
			const end = path[path.length - 1] ?? pos;
			// Stopped on ice (blocked or at the edge) - nowhere else to go
			if (getTileType(state, end) === TileType.ICE) return end;
			pos = end;
			continue;
		}

		if (type === TileType.BOUNCE_PAD) {
			const path = computeBounce(rules, state, pos, direction);
			if (!path) return pos;
			segments.push({ kind: "bounce", pad: pos, path });
			pos = path[path.length - 1] ?? pos;
			continue;
		}

		if (type !== null && isPortalTile(type)) {
			// The arrival portal doesn't fire again, so the chain ends there
			const partner = findMatchingPortal(state, pos);
			if (!partner) return pos;
			segments.push({ kind: "teleport", from: pos, to: partner });
			return partner;
		}

		return pos;
	}
}

// =============================================================================
// APPLYING MOVES
// =============================================================================

/** Plant or convert the tile being left, then tick lily-pads and the tide */
function leaveTile(
	state: GameState,
	pos: Position,
): { became: TileType | null; sankLilypad: boolean; resurfaced: Position[] } {
	const type = getTileType(state, pos);
	let became: TileType | null = null;
	let sankLilypad = false;

	const conversion = type !== null ? TILE_LEAVE_CONVERSIONS[type] : undefined;
	if (conversion) {
		setTileType(state, pos, conversion);
		became = conversion;
	} else if (type === TileType.POND) {
		const pad = state.lilypads[posKey(pos.x, pos.y)];
		if (pad && !pad.submerged) {
			pad.submerged = true;
			pad.cooldown = MECHANICS.LILYPAD_COOLDOWN;
			sankLilypad = true;
		}
	}

	// Lily-pads count down every move (including the one that just sank)
	const resurfaced: Position[] = [];
	for (const key in state.lilypads) {
		const pad = state.lilypads[key];
		if (pad?.submerged && pad.cooldown > 0) {
			pad.cooldown--;
			if (pad.cooldown === 0) {
				pad.submerged = false;
				resurfaced.push(parsePosKey(key));
			}
		}
	}

	state.tidePhase = nextTidePhase(state);

	return { became, sankLilypad, resurfaced };
}

/** Collect acorns, feed squirrels and bloom star paths on the tile the player settled on */
function applyLanding(
	rules: LevelRules,
	state: GameState,
	pos: Position,
): LandingEffect | null {
	const type = getTileType(state, pos);

	if (type === TileType.ACORN) {
		state.acorns += 1;
		setTileType(state, pos, TileType.GRASS);
		return { kind: "acorn", position: { ...pos } };
	}

	if (type === TileType.SQUIRREL) {
		const cost = getSquirrelRequirement(rules, pos);
		state.acorns -= cost;
		setTileType(state, pos, TileType.GRASS);
		return { kind: "squirrel", position: { ...pos }, cost };
	}

	if (type === TileType.BASE_STAR) {
		const bloomed: Position[] = [];
		for (const pathPos of rules.starPaths[posKey(pos.x, pos.y)] ?? []) {
			if (getTileType(state, pathPos) === TileType.STAR_PATH) {
				setTileType(state, pathPos, TileType.STAR_MUSHROOM);
				bloomed.push(pathPos);
			}
		}
		return { kind: "bloom", position: { ...pos }, bloomed };
	}

	return null;
}

/** Work out everything a move does, without changing `state` */
export function applyMove(
	rules: LevelRules,
	state: GameState,
	direction: Direction,
): MoveResult | null {
	const target = getMoveTarget(rules, state, direction);
	if (!target) return null;

	const from = state.player;
	const afterLeave = cloneState(state);
	const { became, sankLilypad, resurfaced } = leaveTile(afterLeave, from);

	const isJump =
		Math.abs(target.x - from.x) === 2 || Math.abs(target.y - from.y) === 2;
	const segments: MoveSegment[] = [
		{ kind: "hop", from: { ...from }, to: target, isJump },
	];
	const settled = resolveForcedMovement(
		rules,
		afterLeave,
		target,
		direction,
		segments,
	);
	afterLeave.player = { ...settled };

	const final = cloneState(afterLeave);
	const landing = applyLanding(rules, final, settled);

	return {
		direction,
		target,
		settled,
		segments,
		afterLeave,
		final,
		leftTileBecame: became,
		sankLilypad,
		resurfaced,
		landing,
	};
}

/** Every move the player could make from this state */
export function getAvailableMoves(rules: LevelRules, state: GameState): MoveResult[] {
	const moves: MoveResult[] = [];
	for (const direction of DIRECTIONS) {
		const result = applyMove(rules, state, direction);
		if (result) moves.push(result);
	}
	return moves;
}

// =============================================================================
// REACHABILITY & SOLVING
// =============================================================================

/**
 * Could every required tile still be reached from here?
 *
 * Generous on purpose: it links every tile that might ever be stood on to
 * anything a walk, jump, bounce, slide or portal could connect it to. So a
 * `false` answer always means the level can no longer be finished.
 */
export function canReachAllRequired(rules: LevelRules, state: GameState): boolean {
	const { width, height } = rules;
	const canEverStand = (x: number, y: number): boolean => {
		const type = state.tiles[y]?.[x];
		return type !== undefined && !PERMANENTLY_BLOCKED.has(type);
	};

	const reached = new Uint8Array(width * height);
	const queue: number[] = [];
	const visit = (x: number, y: number) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return;
		const index = y * width + x;
		if (reached[index] || !canEverStand(x, y)) return;
		reached[index] = 1;
		queue.push(index);
	};

	visit(state.player.x, state.player.y);
	while (queue.length > 0) {
		const index = queue.pop() as number;
		const x = index % width;
		const y = (index - x) / width;
		const type = state.tiles[y]?.[x];

		for (const direction of DIRECTIONS) {
			const delta = getDirectionDelta(direction);
			visit(x + delta.x, y + delta.y);

			// Jumps (only over tiles that could ever be an obstacle)
			const middle = state.tiles[y + delta.y]?.[x + delta.x];
			if (middle === undefined || !NEVER_OBSTACLE.has(middle)) {
				visit(x + delta.x * 2, y + delta.y * 2);
			}

			if (type === TileType.BOUNCE_PAD) {
				visit(x + delta.x * 2, y + delta.y * 2);
				visit(x + delta.x * 3, y + delta.y * 3);
			}
		}

		if (type !== undefined && isPortalTile(type)) {
			const partner = findMatchingPortal(state, { x, y });
			if (partner) visit(partner.x, partner.y);
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const type = state.tiles[y]?.[x];
			if (type !== undefined && isRequiredTile(type) && !reached[y * width + x]) {
				return false;
			}
		}
	}
	return true;
}

/** Compact string identifying a state, for remembering dead ends */
function stateKey(state: GameState): string {
	let key = `${state.player.x},${state.player.y}|${state.tidePhase}|${state.acorns}|`;
	for (const row of state.tiles) {
		key += row.join(",");
		key += ";";
	}
	for (const pad in state.lilypads) {
		key += state.lilypads[pad]?.cooldown ?? 0;
	}
	return key;
}

export interface SolveResult {
	/** The moves of a winning line, or null if none was found */
	moves: { direction: Direction; target: Position; settled: Position }[] | null;
	/** Gave up before searching everything, so "no solution" isn't certain */
	timedOut: boolean;
}

/**
 * Search for a sequence of moves that wins from `state`.
 * Depth-first, trying the most constrained moves first, skipping states
 * where some required tile can no longer be reached and remembering dead ends.
 */
export function solve(
	rules: LevelRules,
	state: GameState,
	maxIterations: number = MECHANICS.MAX_PATHFINDING_ITERATIONS,
): SolveResult {
	if (isWin(state)) return { moves: [], timedOut: false };
	if (!canReachAllRequired(rules, state)) return { moves: null, timedOut: false };

	const deadEnds = new Set<string>();
	const line: { direction: Direction; target: Position; settled: Position }[] = [];
	let iterations = 0;
	let timedOut = false;

	const search = (current: GameState): boolean => {
		if (++iterations > maxIterations) {
			timedOut = true;
			return false;
		}

		const key = stateKey(current);
		if (deadEnds.has(key)) return false;
		// Mark before exploring so cycles through this state are cut off too
		deadEnds.add(key);

		const candidates: { move: MoveResult; exits: number; required: boolean }[] = [];
		for (const move of getAvailableMoves(rules, current)) {
			if (isWin(move.final)) {
				line.push({ direction: move.direction, target: move.target, settled: move.settled });
				return true;
			}
			if (!canReachAllRequired(rules, move.final)) continue;

			const settledType = getTileType(current, move.settled);
			let exits = 0;
			for (const direction of DIRECTIONS) {
				if (getMoveTarget(rules, move.final, direction)) exits++;
			}
			candidates.push({
				move,
				exits,
				required: settledType !== null && isRequiredTile(settledType),
			});
		}

		// Required tiles first, then the tiles with the fewest ways out
		candidates.sort(
			(a, b) => Number(b.required) - Number(a.required) || a.exits - b.exits,
		);

		for (const { move } of candidates) {
			line.push({ direction: move.direction, target: move.target, settled: move.settled });
			if (search(move.final)) return true;
			line.pop();
			if (timedOut) return false;
		}
		return false;
	};

	const found = search(state);
	return { moves: found ? line : null, timedOut: !found && timedOut };
}

/** Play a list of directions from a state; returns the final state, or null if a move is impossible */
export function replayMoves(
	rules: LevelRules,
	state: GameState,
	directions: Direction[],
): GameState | null {
	let current = state;
	for (const direction of directions) {
		const result = applyMove(rules, current, direction);
		if (!result) return null;
		current = result.final;
	}
	return current;
}
