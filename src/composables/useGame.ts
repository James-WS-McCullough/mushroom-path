import { computed, ref, shallowRef } from "vue";
import { ANIMATION, HINTS, MECHANICS } from "../constants/game";
import {
	applyMove,
	canReachAllRequired,
	createInitialState,
	createLevelRules,
	type GameState,
	getAvailableMoves,
	getDirectionToTarget,
	getMoveTarget,
	getSquirrelRequirement as getRequirement,
	isWin,
	type LandingEffect,
	type MoveResult,
	type MoveSegment,
	solve,
} from "../game/rules";
import type { Direction, FlowDirection, Level, Position, Tile } from "../types/game";
import { isRequiredTile, TileType } from "../types/game";
import { DIRECTIONS, getDirectionDelta, posKey } from "../utils/positionUtils";
import {
	playAcorn,
	playBouncepad,
	playHoneyLand,
	playJump,
	playLand,
	playLilypadSink,
	playLilypadSurface,
	playRandomDirt,
	playRandomPop,
	playSandLand,
	playShovelDirt,
	playSquirrel,
	playStone,
	playTeleportPoof,
	playWater,
	playWavesFall,
	playWavesRise,
	startIceSlide,
	stopIceSlide,
} from "./useSound";

// =============================================================================
// LANDING SOUND HELPER
// =============================================================================

/** Map of tile types to their landing sound functions */
const LANDING_SOUNDS: Partial<Record<TileType, () => void>> = {
	[TileType.GRASS]: playLand,
	[TileType.DIRT]: playRandomDirt,
	[TileType.STONE]: playStone,
	[TileType.POND]: playWater,
	[TileType.LOW_SAND]: playSandLand,
	[TileType.HONEY]: playHoneyLand,
	[TileType.BASE_STAR]: playLand,
	[TileType.STAR_PATH]: playLand,
};

/** Play the appropriate landing sound for a tile type */
function playLandingSound(tileType: TileType | undefined): void {
	if (tileType) {
		LANDING_SOUNDS[tileType]?.();
	}
}

/** Tile types a mushroom is planted on */
const MUSHROOM_TILES: readonly TileType[] = [
	TileType.MUSHROOM,
	TileType.SAND_MUSHROOM,
	TileType.HONEY_MUSHROOM,
	TileType.STAR_MUSHROOM,
];

interface LilypadState {
	submerged: boolean;
	cooldown: number;
	resurfacing?: boolean;
}

export type FacingDirection = "left" | "right";
export type TeleportPhase = "shrinking" | "growing" | null;

/**
 * Reactive game for one level. The rules (what a move does) live in
 * `game/rules.ts`; this composable animates the results and keeps the
 * reactive state the board renders from.
 */
export function useGame(level: Level) {
	const rules = createLevelRules(level);

	const tiles = ref<Tile[][]>([]);
	const playerPosition = ref<Position>({ ...level.startPosition });
	const hasWon = ref(false);
	const isHopping = ref(false);
	const isSliding = ref(false);
	const isBouncing = ref(false);
	const lastBouncePadPosition = ref<Position | null>(null);
	const isTeleporting = ref(false);
	// True from the moment a move lands on a forced-movement tile (water, ice,
	// bounce pad, portal) until the player finally settles
	const isResolvingMove = ref(false);
	const teleportPhase = ref<TeleportPhase>(null);
	const poofPositions = ref<Position[]>([]);
	const facingDirection = ref<FacingDirection>("left"); // Sprites face left by default
	const slidePath = ref<Position[]>([]);
	const lastPlantedPosition = ref<Position | null>(null);
	const lastCleanedPosition = ref<Position | null>(null);
	// State before each move, for undo
	const moveHistory = shallowRef<GameState[]>([]);
	const lilypadState = ref<Map<string, LilypadState>>(new Map());
	const tidePhase = ref(1); // Start at phase 1 (4 moves until first flood, 0 = flooded)
	const collectedAcorns = ref(0);
	const hasLowSand = level.grid.some((row) => row.includes(TileType.LOW_SAND));

	// Acorn popup state (shows +X or -X above player when collecting/spending)
	const acornPopupValue = ref<number | null>(null);
	let acornPopupTimeout: ReturnType<typeof setTimeout> | null = null;

	function showAcornPopup(value: number) {
		if (acornPopupTimeout) {
			clearTimeout(acornPopupTimeout);
		}
		acornPopupValue.value = value;
		acornPopupTimeout = setTimeout(() => {
			acornPopupValue.value = null;
		}, ANIMATION.ACORN_POPUP);
	}

	// Manual hint toggle (keyboard shortcut 'h')
	const forceShowHints = ref(false);

	// Idle hint tracking
	const lastMoveTime = ref(Date.now());
	const currentTime = ref(Date.now());
	let idleIntervalId: ReturnType<typeof setInterval> | null = null;

	// ===========================================================================
	// STATE BRIDGE (reactive refs <-> plain rules state)
	// ===========================================================================

	/** Snapshot the reactive state as a plain rules state */
	function currentState(): GameState {
		const lilypads: GameState["lilypads"] = {};
		for (const [key, pad] of lilypadState.value) {
			lilypads[key] = { submerged: pad.submerged, cooldown: pad.cooldown };
		}
		return {
			tiles: tiles.value.map((row) => row.map((tile) => tile.type)),
			player: { ...playerPosition.value },
			tidePhase: tidePhase.value,
			acorns: collectedAcorns.value,
			lilypads,
		};
	}

	/**
	 * Copy a rules state into the reactive refs. Tiles listed in `skipTiles`
	 * keep their current type (used to animate blooms one by one).
	 */
	function writeState(
		state: GameState,
		options: { resurfaced?: Position[]; skipTiles?: Position[] } = {},
	) {
		const skip = new Set((options.skipTiles ?? []).map((p) => posKey(p.x, p.y)));
		state.tiles.forEach((row, y) => {
			row.forEach((type, x) => {
				const cell = tiles.value[y]?.[x];
				if (cell && cell.type !== type && !skip.has(posKey(x, y))) {
					cell.type = type;
				}
			});
		});

		const resurfaced = new Set(
			(options.resurfaced ?? []).map((p) => posKey(p.x, p.y)),
		);
		const pads = new Map<string, LilypadState>();
		for (const [key, pad] of Object.entries(state.lilypads)) {
			pads.set(key, {
				submerged: pad.submerged,
				cooldown: pad.cooldown,
				resurfacing: resurfaced.has(key),
			});
		}
		lilypadState.value = pads;

		tidePhase.value = state.tidePhase;
		collectedAcorns.value = state.acorns;
	}

	function initializeGame() {
		const state = createInitialState(level);
		tiles.value = state.tiles.map((row, y) =>
			row.map((type, x) => ({ type, position: { x, y } })),
		);
		writeState(state);
		playerPosition.value = { ...state.player };
		hasWon.value = false;
		isHopping.value = false;
		isSliding.value = false;
		isBouncing.value = false;
		isTeleporting.value = false;
		isResolvingMove.value = false;
		teleportPhase.value = null;
		poofPositions.value = [];
		facingDirection.value = "left";
		slidePath.value = [];
		lastPlantedPosition.value = null;
		lastCleanedPosition.value = null;
		moveHistory.value = [];
		forceShowHints.value = false;
		cancelPendingBlooms();

		// Reset idle tracking
		lastMoveTime.value = Date.now();
		currentTime.value = Date.now();
		if (idleIntervalId) clearInterval(idleIntervalId);
		idleIntervalId = setInterval(() => {
			currentTime.value = Date.now();
		}, 500);
	}

	function resetIdleTimer() {
		lastMoveTime.value = Date.now();
	}

	function cleanupIdleTimer() {
		if (idleIntervalId) {
			clearInterval(idleIntervalId);
			idleIntervalId = null;
		}
	}

	// ===========================================================================
	// QUERIES USED BY THE BOARD
	// ===========================================================================

	function getSquirrelRequirement(position: Position): number {
		return getRequirement(rules, position);
	}

	function getWaterFlow(position: Position): FlowDirection | null {
		return rules.waterFlow[posKey(position.x, position.y)] ?? null;
	}

	function getLilypadState(position: Position): LilypadState | undefined {
		return lilypadState.value.get(posKey(position.x, position.y));
	}

	function isLowSandFlooded(): boolean {
		return tidePhase.value === 0;
	}

	function getMovesUntilFlood(): number {
		if (tidePhase.value === 0) return MECHANICS.TIDE_PERIOD;
		return MECHANICS.TIDE_PERIOD - tidePhase.value;
	}

	/** Tiles the player can tap to move to right now */
	const clickTargets = computed(() => {
		const state = currentState();
		const targets = new Set<string>();
		for (const direction of DIRECTIONS) {
			const target = getMoveTarget(rules, state, direction);
			if (target) targets.add(posKey(target.x, target.y));
		}
		return targets;
	});

	function canReachByClick(target: Position): boolean {
		return clickTargets.value.has(posKey(target.x, target.y));
	}

	// ===========================================================================
	// STAR BLOOM ANIMATION
	// ===========================================================================

	// Star path tiles scheduled to bloom but not yet shown as bloomed
	interface PendingBloom {
		position: Position;
		timeoutId: ReturnType<typeof setTimeout>;
	}
	const pendingBlooms = new Set<PendingBloom>();

	/** Show any still-animating blooms immediately (used before undo) */
	function flushPendingBlooms() {
		for (const pending of pendingBlooms) {
			clearTimeout(pending.timeoutId);
			const cell = tiles.value[pending.position.y]?.[pending.position.x];
			if (cell && cell.type === TileType.STAR_PATH) {
				cell.type = TileType.STAR_MUSHROOM;
			}
		}
		pendingBlooms.clear();
	}

	function cancelPendingBlooms() {
		for (const pending of pendingBlooms) {
			clearTimeout(pending.timeoutId);
		}
		pendingBlooms.clear();
	}

	/** Pop bloomed star paths one after another, then check for a win */
	function animateBlooms(bloomed: Position[]) {
		const BLOOM_DELAY = 150; // ms between each pop

		bloomed.forEach((pathPos, index) => {
			const pending: PendingBloom = { position: { ...pathPos }, timeoutId: 0 };
			pendingBlooms.add(pending);
			pending.timeoutId = setTimeout(() => {
				pendingBlooms.delete(pending);
				const cell = tiles.value[pathPos.y]?.[pathPos.x];
				if (cell && cell.type === TileType.STAR_PATH) {
					cell.type = TileType.STAR_MUSHROOM;
					playRandomPop();
					showPlanted(pathPos);
				}

				// The player may have won by blooming the last required tiles
				if (index === bloomed.length - 1) {
					checkWin();
				}
			}, index * BLOOM_DELAY);
		});
	}

	// ===========================================================================
	// MOVE ANIMATION
	// ===========================================================================

	function showPlanted(position: Position) {
		lastPlantedPosition.value = { ...position };
		setTimeout(() => {
			// Only clear if still showing this position
			if (
				lastPlantedPosition.value?.x === position.x &&
				lastPlantedPosition.value?.y === position.y
			) {
				lastPlantedPosition.value = null;
			}
		}, ANIMATION.MUSHROOM_POPUP);
	}

	function showCleaned(position: Position) {
		lastCleanedPosition.value = { ...position };
		setTimeout(() => {
			lastCleanedPosition.value = null;
		}, ANIMATION.DIRT_CLEANUP);
	}

	function checkWin() {
		if (isWin(currentState())) {
			hasWon.value = true;
		}
	}

	/** Animate player along a path with consistent slide animation handling */
	function animateSlide(
		path: Position[],
		onComplete: () => void,
		intervalMs: number = ANIMATION.SLIDE_STEP,
	): void {
		slidePath.value = path;
		isSliding.value = true;

		let pathIndex = 1;
		const interval = setInterval(() => {
			const nextPos = path[pathIndex];
			if (pathIndex < path.length && nextPos) {
				playerPosition.value = nextPos;
				pathIndex++;
			} else {
				clearInterval(interval);
				isSliding.value = false;
				slidePath.value = [];
				onComplete();
			}
		}, intervalMs);
	}

	/** Animate a bounce off a pad along its path */
	function animateBounce(
		pad: Position,
		path: Position[],
		onComplete: () => void,
	): void {
		slidePath.value = path;
		playBouncepad();
		isSliding.value = true;
		isBouncing.value = true;
		lastBouncePadPosition.value = { ...pad };

		// Clear the bounce pad effect after animation completes
		setTimeout(() => {
			lastBouncePadPosition.value = null;
		}, ANIMATION.BOUNCE_PAD_EFFECT);

		// Spread position updates evenly across the bounce animation
		const steps = path.length - 1;
		const intervalTime =
			steps > 0 ? Math.floor(ANIMATION.BOUNCE_DURATION / steps) : 100;

		// Move to first position immediately so horizontal movement starts with vertical
		let pathIndex = 1;
		const firstPos = path[pathIndex];
		if (firstPos) {
			playerPosition.value = firstPos;
			pathIndex++;
		}

		const bounceInterval = setInterval(() => {
			const nextPos = path[pathIndex];
			if (pathIndex < path.length && nextPos) {
				playerPosition.value = nextPos;
				pathIndex++;
			} else {
				clearInterval(bounceInterval);
				isSliding.value = false;
				isBouncing.value = false;
				slidePath.value = [];
				onComplete();
			}
		}, intervalTime);
	}

	/** Portal teleportation animation sequence: shrink -> poof -> move -> poof -> grow */
	function animateTeleport(
		fromPos: Position,
		toPos: Position,
		onComplete: () => void,
	): void {
		isTeleporting.value = true;
		teleportPhase.value = "shrinking";

		setTimeout(() => {
			poofPositions.value = [{ ...fromPos }];
			playTeleportPoof();
			playerPosition.value = { ...toPos };

			setTimeout(() => {
				poofPositions.value = [{ ...toPos }];
				playTeleportPoof();
				teleportPhase.value = "growing";

				setTimeout(() => {
					isTeleporting.value = false;
					teleportPhase.value = null;
					poofPositions.value = [];
					onComplete();
				}, ANIMATION.PORTAL_GROW);
			}, ANIMATION.PORTAL_POOF_PAUSE);
		}, ANIMATION.PORTAL_SHRINK);
	}

	/** Play the forced-movement segments of a move one after another */
	function animateSegments(segments: MoveSegment[], onComplete: () => void) {
		const [segment, ...rest] = segments;
		if (!segment) {
			onComplete();
			return;
		}
		const next = () => animateSegments(rest, onComplete);

		switch (segment.kind) {
			case "hop":
				next();
				break;
			case "water":
				playWater();
				animateSlide(segment.path, next);
				break;
			case "ice":
				startIceSlide();
				animateSlide(segment.path, () => {
					stopIceSlide();
					next();
				});
				break;
			case "bounce":
				animateBounce(segment.pad, segment.path, next);
				break;
			case "teleport":
				animateTeleport(segment.from, segment.to, next);
				break;
		}
	}

	/** Effects of leaving a tile: planting, dirt, lily-pads and tide sounds */
	function playLeaveEffects(move: MoveResult, from: Position, oldTidePhase: number) {
		const became = move.leftTileBecame;
		if (became && MUSHROOM_TILES.includes(became)) {
			playRandomPop();
			showPlanted(from);
		} else if (became === TileType.GRASS) {
			// Dirt becomes grass (needs to be stepped on again)
			playShovelDirt();
			showCleaned(from);
		}
		if (move.sankLilypad) playLilypadSink();
		if (move.resurfaced.length > 0) playLilypadSurface();

		if (hasLowSand) {
			const newPhase = move.afterLeave.tidePhase;
			if (oldTidePhase === MECHANICS.TIDE_PERIOD - 1 && newPhase === 0) {
				playWavesRise();
			} else if (oldTidePhase === 0 && newPhase === 1) {
				playWavesFall();
			}
		}
	}

	/** Effects of settling on a tile: acorns, squirrels and star blooms */
	function applyLandingEffect(
		move: MoveResult,
		effect: LandingEffect | null,
	) {
		const bloomed = effect?.kind === "bloom" ? effect.bloomed : [];
		writeState(move.final, { resurfaced: move.resurfaced, skipTiles: bloomed });

		if (effect?.kind === "acorn") {
			showAcornPopup(1);
			playAcorn();
		} else if (effect?.kind === "squirrel") {
			showAcornPopup(-effect.cost);
			playSquirrel();
		}

		if (bloomed.length > 0) {
			animateBlooms(bloomed);
		} else {
			checkWin();
		}
	}

	function executeMove(move: MoveResult) {
		const from = { ...playerPosition.value };
		const oldTidePhase = tidePhase.value;

		moveHistory.value = [...moveHistory.value, currentState()];
		resetIdleTimer();

		if (move.direction === "left") {
			facingDirection.value = "left";
		} else if (move.direction === "right") {
			facingDirection.value = "right";
		}

		// Leave the old tile and hop onto the new one
		isHopping.value = true;
		writeState(move.afterLeave, { resurfaced: move.resurfaced });
		playerPosition.value = { ...move.target };
		playLeaveEffects(move, from, oldTidePhase);

		const hop = move.segments[0];
		if (hop?.kind === "hop" && hop.isJump) {
			playJump();
		}

		const forced = move.segments.slice(1);
		if (forced.length === 0) {
			// A plain step: landing effects happen straight away
			applyLandingEffect(move, move.landing);
			setTimeout(() => {
				isHopping.value = false;
				playLandingSound(move.afterLeave.tiles[move.target.y]?.[move.target.x]);
			}, ANIMATION.HOP_DURATION);
			return;
		}

		// Preview the slide path during the hop
		const firstForced = forced[0];
		if (firstForced?.kind === "water" || firstForced?.kind === "ice") {
			slidePath.value = firstForced.path;
		}

		isResolvingMove.value = true;
		setTimeout(() => {
			isHopping.value = false;
			animateSegments(forced, () => {
				playerPosition.value = { ...move.settled };
				// Slides and bounces end with a landing sound; rivers and portals have their own
				const last = forced[forced.length - 1];
				if (last?.kind === "ice" || last?.kind === "bounce") {
					playLandingSound(move.afterLeave.tiles[move.settled.y]?.[move.settled.x]);
				}
				isResolvingMove.value = false;
				// Acorns, squirrels and base stars trigger where the player ends up
				applyLandingEffect(move, move.landing);
			});
		}, ANIMATION.HOP_DURATION);
	}

	function canStartMove(): boolean {
		return !hasWon.value && !isSliding.value && !isResolvingMove.value;
	}

	function movePlayer(direction: Direction) {
		if (!canStartMove()) return;
		const move = applyMove(rules, currentState(), direction);
		if (move) executeMove(move);
	}

	function moveToPosition(target: Position) {
		if (!canStartMove()) return;
		const state = currentState();
		const direction = getDirectionToTarget(rules, state, target);
		if (!direction) return;
		const move = applyMove(rules, state, direction);
		if (move) executeMove(move);
	}

	// ===========================================================================
	// COUNTS, HINTS & STUCK DETECTION
	// ===========================================================================

	const grassTilesRemaining = computed(() => {
		let count = 0;
		for (const row of tiles.value) {
			for (const tile of row) {
				// Count required tiles (portal tiles don't count - they stay as portals and can be reused)
				if (isRequiredTile(tile.type)) {
					count++;
					// Dirt counts as +1 extra since it needs two visits (dirt->grass->mushroom)
					if (tile.type === TileType.DIRT) {
						count++;
					}
				}
			}
		}
		return count;
	});

	// Count mushroom tiles on the board (for tracking mushrooms planted this level)
	const mushroomTileCount = computed(() => {
		let count = 0;
		for (const row of tiles.value) {
			for (const tile of row) {
				if (MUSHROOM_TILES.includes(tile.type)) {
					count++;
				}
			}
		}
		return count;
	});

	// Show hints when player is idle for 4+ seconds and remaining tiles < 8
	const showHints = computed(() => {
		if (hasWon.value) return false;
		// Manual hint toggle overrides other conditions
		if (forceShowHints.value) return true;
		if (grassTilesRemaining.value >= HINTS.TILES_THRESHOLD) return false;
		const idleTime = currentTime.value - lastMoveTime.value;
		return idleTime >= HINTS.IDLE_THRESHOLD_MS;
	});

	function toggleHints() {
		forceShowHints.value = !forceShowHints.value;
	}

	const canUndo = computed(
		() => moveHistory.value.length > 0 && !isResolvingMove.value,
	);

	interface HintResult {
		hintTiles?: Position[];
		needsUndo?: boolean;
		stuckTiles?: Position[];
		unsure?: boolean; // Pathfinding took too long, not sure if current state is solvable
	}

	/** Non-void tiles next to the player, highlighted when they need to undo */
	function getAdjacentTiles(): Position[] {
		const pos = playerPosition.value;
		const adjacent: Position[] = [];
		for (const direction of DIRECTIONS) {
			const delta = getDirectionDelta(direction);
			const adjPos = { x: pos.x + delta.x, y: pos.y + delta.y };
			const type = tiles.value[adjPos.y]?.[adjPos.x]?.type;
			if (type && type !== TileType.VOID) {
				adjacent.push(adjPos);
			}
		}
		return adjacent;
	}

	// Check if the current state has any unreachable tiles (player is stuck)
	function hasUnreachableTiles(): boolean {
		return !canReachAllRequired(rules, currentState());
	}

	function getHint(): HintResult {
		const { moves, timedOut } = solve(rules, currentState());

		if (timedOut) {
			// Pathfinding took too long - we're not sure if the current state is solvable
			return { unsure: true };
		}

		if (moves && moves.length > 0) {
			// The tiles to tap for the next three moves
			return { hintTiles: moves.slice(0, 3).map((move) => move.target) };
		}

		// No winning line from here - the player needs to undo
		return { needsUndo: true, stuckTiles: getAdjacentTiles() };
	}

	// Player is stuck if no move takes them anywhere new
	const isStuck = computed(() => {
		if (hasWon.value) return false;
		// Mid-move (sliding, bouncing, teleporting) is never stuck
		if (isResolvingMove.value || isTeleporting.value) return false;

		const state = currentState();
		return !getAvailableMoves(rules, state).some(
			(move) =>
				move.settled.x !== state.player.x || move.settled.y !== state.player.y,
		);
	});

	function undo() {
		if (!canUndo.value) return;
		if (hasWon.value) return;

		// Finish any blooms still animating so the restore below replaces them
		flushPendingBlooms();

		const history = moveHistory.value;
		const previous = history[history.length - 1];
		if (!previous) return;
		moveHistory.value = history.slice(0, -1);

		writeState(previous);
		playerPosition.value = { ...previous.player };
		lastPlantedPosition.value = null;
	}

	initializeGame();

	return {
		tiles,
		playerPosition,
		hasWon,
		isHopping,
		isSliding,
		isBouncing,
		lastBouncePadPosition,
		isTeleporting,
		teleportPhase,
		poofPositions,
		facingDirection,
		slidePath,
		isStuck,
		lastPlantedPosition,
		lastCleanedPosition,
		movePlayer,
		moveToPosition,
		canReachByClick,
		initializeGame,
		grassTilesRemaining,
		canUndo,
		undo,
		getHint,
		getWaterFlow,
		getLilypadState,
		lilypadState,
		showHints,
		toggleHints,
		cleanupIdleTimer,
		mushroomTileCount,
		hasUnreachableTiles,
		levelWidth: level.width,
		levelHeight: level.height,
		// Tides state
		tidePhase,
		isLowSandFlooded,
		getMovesUntilFlood,
		TIDE_PERIOD: MECHANICS.TIDE_PERIOD,
		// Acorn/squirrel state
		collectedAcorns,
		getSquirrelRequirement,
		acornPopupValue,
	};
}
