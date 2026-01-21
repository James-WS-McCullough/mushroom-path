import { computed, ref } from "vue";
import type {
	Direction,
	FlowDirection,
	Level,
	PortalType,
	Position,
	Tile,
} from "../types/game";
import { isRequiredTile, isWalkableTile, PortalTypes, TileType } from "../types/game";
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

interface ChangedTile {
	position: Position;
	originalType: TileType;
}

interface LilypadState {
	submerged: boolean;
	cooldown: number;
	resurfacing?: boolean;
}

interface MoveHistory {
	playerPosition: Position;
	tileState: TileType; // The tile type at the position player left (before mushroom planted)
	additionalChanges?: ChangedTile[]; // For tracking portal conversions, etc.
	lilypadSnapshot?: Map<string, LilypadState>; // Snapshot of lily-pad state for undo
	tidePhase?: number; // Snapshot of tide phase for undo
	collectedAcorns?: number; // Snapshot of collected acorns before this move
}

export type FacingDirection = "left" | "right";
export type TeleportPhase = "shrinking" | "growing" | null;

export function useGame(level: Level) {
	const tiles = ref<Tile[][]>([]);
	const playerPosition = ref<Position>({ ...level.startPosition });
	const hasWon = ref(false);
	const isHopping = ref(false);
	const isSliding = ref(false);
	const isBouncing = ref(false);
	const lastBouncePadPosition = ref<Position | null>(null);
	const isTeleporting = ref(false);
	const teleportPhase = ref<TeleportPhase>(null);
	const poofPositions = ref<Position[]>([]);
	const facingDirection = ref<FacingDirection>("left"); // Sprites face left by default
	const slidePath = ref<Position[]>([]);
	const lastPlantedPosition = ref<Position | null>(null);
	const lastCleanedPosition = ref<Position | null>(null);
	const moveHistory = ref<MoveHistory[]>([]);
	const waterFlow = level.waterFlow ?? {};
	const lilypadState = ref<Map<string, LilypadState>>(new Map());

	// Acorn/squirrel state
	const collectedAcorns = ref(0);
	const squirrelRequirements = level.squirrelRequirements ?? {};

	// Acorn popup state (shows +X or -X above player when collecting/spending)
	const acornPopupValue = ref<number | null>(null);
	let acornPopupTimeout: ReturnType<typeof setTimeout> | null = null;

	function showAcornPopup(value: number) {
		// Clear any existing popup timeout
		if (acornPopupTimeout) {
			clearTimeout(acornPopupTimeout);
		}
		acornPopupValue.value = value;
		// Hide popup after animation
		acornPopupTimeout = setTimeout(() => {
			acornPopupValue.value = null;
		}, 1600);
	}

	// Tides state management
	const TIDE_PERIOD = 5; // Flood every 5 moves
	const tidePhase = ref(1); // Start at phase 1 (4 moves until first flood, 0 = flooded)

	// Manual hint toggle (keyboard shortcut 'h')
	const forceShowHints = ref(false);

	// Check if low sand tiles are currently flooded
	function isLowSandFlooded(): boolean {
		return tidePhase.value === 0;
	}

	// Get moves until next flood (for display)
	function getMovesUntilFlood(): number {
		if (tidePhase.value === 0) return TIDE_PERIOD;
		return TIDE_PERIOD - tidePhase.value;
	}

	// Idle hint tracking
	const lastMoveTime = ref(Date.now());
	const currentTime = ref(Date.now());
	let idleIntervalId: ReturnType<typeof setInterval> | null = null;

	function initializeGame() {
		tiles.value = level.grid.map((row, y) =>
			row.map((type, x) => ({
				type,
				position: { x, y },
			})),
		);
		playerPosition.value = { ...level.startPosition };
		hasWon.value = false;
		isHopping.value = false;
		isSliding.value = false;
		isTeleporting.value = false;
		teleportPhase.value = null;
		poofPositions.value = [];
		facingDirection.value = "left";
		slidePath.value = [];
		lastPlantedPosition.value = null;
		lastCleanedPosition.value = null;
		moveHistory.value = [];
		forceShowHints.value = false;

		// Initialize lily-pad state for all pond tiles
		lilypadState.value = new Map();
		for (let y = 0; y < level.grid.length; y++) {
			const row = level.grid[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				if (row[x] === TileType.POND) {
					lilypadState.value.set(`${x},${y}`, {
						submerged: false,
						cooldown: 0,
					});
				}
			}
		}

		// Reset tide state
		tidePhase.value = 1; // Start at phase 1 (4 moves until first flood)

		// Reset acorn collection
		collectedAcorns.value = 0;

		// Reset idle tracking
		lastMoveTime.value = Date.now();
		currentTime.value = Date.now();

		// Start interval for tracking idle time
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

	function getTile(position: Position): Tile | null {
		if (
			position.x < 0 ||
			position.x >= level.width ||
			position.y < 0 ||
			position.y >= level.height
		) {
			return null;
		}
		const row = tiles.value[position.y];
		if (!row) return null;
		return row[position.x] ?? null;
	}

	// Get the acorn requirement for a squirrel at a position
	function getSquirrelRequirement(position: Position): number {
		const key = `${position.x},${position.y}`;
		return squirrelRequirements[key] ?? 1;
	}

	// Check if player can feed a squirrel at a position
	function canFeedSquirrel(position: Position): boolean {
		const required = getSquirrelRequirement(position);
		return collectedAcorns.value >= required;
	}

	function canLandOn(position: Position): boolean {
		const tile = getTile(position);
		if (!tile) return false;

		// Pond tiles are landable only if lily-pad is surfaced
		if (tile.type === TileType.POND) {
			const key = `${position.x},${position.y}`;
			const state = lilypadState.value.get(key);
			return state ? !state.submerged : false;
		}

		// Low sand tiles are landable if they won't be flooded when we land
		// (tide advances when we leave, so check next phase)
		if (tile.type === TileType.LOW_SAND) {
			const nextPhase = (tidePhase.value + 1) % TIDE_PERIOD;
			return nextPhase !== 0; // Safe to land if next phase isn't flood phase
		}

		// Sea tiles are never landable
		if (tile.type === TileType.SEA) {
			return false;
		}

		// Squirrel tiles are landable only if player has enough acorns
		if (tile.type === TileType.SQUIRREL) {
			return canFeedSquirrel(position);
		}

		// Can land on walkable tiles or portal tiles
		return isWalkableTile(tile.type) || isPortalTile(tile.type);
	}

	function isPortalTile(tileType: TileType): tileType is PortalType {
		return (PortalTypes as readonly TileType[]).includes(tileType);
	}

	function findMatchingPortal(
		portalType: PortalType,
		currentPosition: Position,
	): Position | null {
		// Find the other portal of the same type
		for (let y = 0; y < tiles.value.length; y++) {
			const row = tiles.value[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const tile = row[x];
				if (!tile) continue;
				if (
					tile.type === portalType &&
					(x !== currentPosition.x || y !== currentPosition.y)
				) {
					return { x, y };
				}
			}
		}
		return null;
	}

	function isObstacle(position: Position): boolean {
		const tile = getTile(position);
		if (!tile) return true;
		// Submerged lily-pads count as obstacles (can be jumped over)
		if (tile.type === TileType.POND) {
			const state = getLilypadState(position);
			if (state?.submerged) return true;
		}
		// Low sand that will be flooded when we land counts as obstacle (can be jumped over)
		if (tile.type === TileType.LOW_SAND) {
			const nextPhase = (tidePhase.value + 1) % TIDE_PERIOD;
			if (nextPhase === 0) return true; // Will be flooded, treat as obstacle
		}
		// Sea tiles are always obstacles
		if (tile.type === TileType.SEA) {
			return true;
		}
		// Squirrel tiles are ALWAYS obstacles - you can never jump over them
		// You can only walk directly to a squirrel when you have enough acorns
		if (tile.type === TileType.SQUIRREL) {
			return true;
		}
		return (
			tile.type === TileType.BRAMBLE ||
			tile.type === TileType.MUSHROOM ||
			tile.type === TileType.SAND_MUSHROOM ||
			tile.type === TileType.HONEY_MUSHROOM ||
			tile.type === TileType.POND_WATER
		);
	}

	function isAdjacent(from: Position, to: Position): boolean {
		const dx = Math.abs(from.x - to.x);
		const dy = Math.abs(from.y - to.y);
		return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
	}

	function getDirectionDelta(direction: Direction): Position {
		switch (direction) {
			case "up":
				return { x: 0, y: -1 };
			case "down":
				return { x: 0, y: 1 };
			case "left":
				return { x: -1, y: 0 };
			case "right":
				return { x: 1, y: 0 };
		}
	}

	function getWaterFlow(position: Position): FlowDirection | null {
		const key = `${position.x},${position.y}`;
		return waterFlow[key] ?? null;
	}

	// Clone lilypad state for undo snapshots
	function cloneLilypadState(): Map<string, LilypadState> {
		const clone = new Map<string, LilypadState>();
		for (const [key, state] of lilypadState.value) {
			clone.set(key, { ...state });
		}
		return clone;
	}

	// Decrement lily-pad cooldowns after each move - resurface when cooldown hits 0
	function decrementLilypadCooldowns(): void {
		for (const [, state] of lilypadState.value) {
			// Clear resurfacing flag from previous moves
			if (state.resurfacing) {
				state.resurfacing = false;
			}

			if (state.submerged && state.cooldown > 0) {
				state.cooldown--;
				if (state.cooldown === 0) {
					state.submerged = false;
					state.resurfacing = true;
					playLilypadSurface();
				}
			}
		}
	}

	// Get lily-pad state for a position
	function getLilypadState(position: Position): LilypadState | undefined {
		const key = `${position.x},${position.y}`;
		return lilypadState.value.get(key);
	}

	// ============================================================================
	// GRAPH CONNECTIVITY APPROACH FOR HINTS
	// ============================================================================
	// Instead of computing full solution paths, we use graph connectivity:
	// - Model unvisited tiles as nodes, edges connect reachable tiles
	// - A move is valid if it doesn't disconnect any tiles from the graph
	// - Player is stuck if any unvisited tiles become unreachable
	// ============================================================================

	// Get all positions reachable from a given position via BFS
	// Accounts for walking, jumping over obstacles, and traversal tiles
	// For connectivity checking, LOW_SAND is always considered walkable since tides cycle
	function getReachableTiles(
		fromPos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
		_simulatedTidePhase?: number, // Unused - kept for API compatibility
	): Set<string> {
		const reachable = new Set<string>();
		const queue: Position[] = [fromPos];
		reachable.add(`${fromPos.x},${fromPos.y}`);

		while (queue.length > 0) {
			const current = queue.shift()!;
			const directions = [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: -1, y: 0 },
				{ x: 1, y: 0 },
			];

			for (const dir of directions) {
				const adjacent = { x: current.x + dir.x, y: current.y + dir.y };

				if (
					adjacent.x < 0 ||
					adjacent.x >= level.width ||
					adjacent.y < 0 ||
					adjacent.y >= level.height
				)
					continue;

				const adjKey = `${adjacent.x},${adjacent.y}`;
				const adjType = tileStates[adjacent.y]?.[adjacent.x];
				if (!adjType) continue;

				// Check if adjacent tile is walkable
				// LOW_SAND is always considered walkable for connectivity (tides cycle)
				// SQUIRREL is considered walkable for connectivity (we might collect acorns before reaching it)
				const isWalkable =
					isWalkableTile(adjType) ||
					adjType === TileType.LOW_SAND ||
					adjType === TileType.SQUIRREL ||
					isPortalTile(adjType) ||
					(adjType === TileType.POND && !lilypads.get(adjKey)?.submerged);

				if (isWalkable && !reachable.has(adjKey)) {
					reachable.add(adjKey);
					queue.push(adjacent);
				}

				// Check if we can jump over an obstacle
				// LOW_SAND is NOT an obstacle for connectivity (can walk on it when tide is out)
				const isObstacleType =
					adjType === TileType.BRAMBLE ||
					adjType === TileType.MUSHROOM ||
					adjType === TileType.SAND_MUSHROOM ||
					adjType === TileType.HONEY_MUSHROOM ||
					adjType === TileType.POND_WATER ||
					adjType === TileType.SEA ||
					(adjType === TileType.POND && lilypads.get(adjKey)?.submerged);

				if (isObstacleType) {
					const jumpTarget = {
						x: current.x + dir.x * 2,
						y: current.y + dir.y * 2,
					};
					if (
						jumpTarget.x < 0 ||
						jumpTarget.x >= level.width ||
						jumpTarget.y < 0 ||
						jumpTarget.y >= level.height
					)
						continue;

					const jumpKey = `${jumpTarget.x},${jumpTarget.y}`;
					if (reachable.has(jumpKey)) continue;

					const jumpType = tileStates[jumpTarget.y]?.[jumpTarget.x];
					if (!jumpType) continue;

					// LOW_SAND and SQUIRREL are also landable for connectivity
					const isJumpLandable =
						isWalkableTile(jumpType) ||
						jumpType === TileType.LOW_SAND ||
						jumpType === TileType.SQUIRREL ||
						isPortalTile(jumpType) ||
						(jumpType === TileType.POND && !lilypads.get(jumpKey)?.submerged);

					if (isJumpLandable) {
						reachable.add(jumpKey);
						queue.push(jumpTarget);
					}
				}
			}
		}

		return reachable;
	}

	// Check if all unvisited grass/dirt/low_sand tiles are reachable from player position
	function isGraphConnected(
		playerPos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
		simulatedTidePhase?: number,
	): boolean {
		const reachable = getReachableTiles(playerPos, tileStates, lilypads, simulatedTidePhase);

		// Check every required tile is reachable
		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const t = row[x];
				if (isRequiredTile(t) && !reachable.has(`${x},${y}`)) {
					return false; // Found unreachable tile - graph is disconnected
				}
			}
		}
		return true;
	}

	// Check if the given state is a win (all required tiles converted, player on last required tile)
	function isWinState(tileStates: TileType[][], playerPos: Position): boolean {
		let totalRequired = 0;
		let playerTileType: TileType | null = null;

		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const t = row[x];
				if (isRequiredTile(t)) {
					totalRequired++;
					if (x === playerPos.x && y === playerPos.y) {
						playerTileType = t;
					}
				}
			}
		}

		// Win when exactly 1 required tile remains and player is standing on it,
		// BUT NOT if it's dirt (dirt needs to be left and stepped on again as grass)
		return (
			totalRequired === 1 &&
			playerTileType !== null &&
			playerTileType !== TileType.DIRT
		);
	}

	// Count remaining required tiles
	function countRemainingTiles(tileStates: TileType[][]): number {
		let count = 0;
		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				if (isRequiredTile(row[x])) {
					count++;
				}
			}
		}
		return count;
	}

	// DFS search for a Hamiltonian path (visiting all grass/dirt tiles)
	// Returns: { path, timedOut } where path is null if no solution found
	const MAX_PATHFINDING_ITERATIONS = 5000;

	function findHamiltonianPath(
		pos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
		path: Position[],
		maxDepth: number,
		iterations: { count: number },
		simulatedTidePhase?: number,
		simulatedAcorns?: number,
	): { path: Position[] | null; timedOut: boolean } {
		// Check iteration limit
		iterations.count++;
		if (iterations.count > MAX_PATHFINDING_ITERATIONS) {
			return { path: null, timedOut: true };
		}

		// Check win condition
		if (isWinState(tileStates, pos)) {
			return { path, timedOut: false };
		}

		// Depth limit to prevent infinite loops
		if (path.length >= maxDepth) {
			return { path: null, timedOut: false };
		}

		// Get valid moves (passing current tide phase and acorn count)
		const currentPhase = simulatedTidePhase ?? tidePhase.value;
		const currentAcorns = simulatedAcorns ?? collectedAcorns.value;
		const moves = getValidMovesForPathfinding(pos, tileStates, lilypads, currentPhase, currentAcorns);

		// Filter to moves that preserve connectivity
		const validMoves: {
			move: { target: Position; direction: Direction };
			simResult: {
				finalPos: Position;
				newTiles: TileType[][];
				newLilypads: Map<string, LilypadState>;
				newTidePhase: number;
				newAcorns: number;
			};
		}[] = [];

		for (const move of moves) {
			const simResult = simulateMoveForPathfinding(
				pos,
				move,
				tileStates,
				lilypads,
				currentPhase,
				currentAcorns,
			);

			// Check if graph remains connected (pass new tide phase for LOW_SAND checks)
			if (
				isGraphConnected(
					simResult.finalPos,
					simResult.newTiles,
					simResult.newLilypads,
					simResult.newTidePhase,
				)
			) {
				validMoves.push({ move, simResult });
			}
		}

		// Prioritize moves that go to required tiles and moves to tiles with fewer neighbors (forced moves)
		validMoves.sort((a, b) => {
			const aType = tileStates[a.move.target.y]?.[a.move.target.x];
			const bType = tileStates[b.move.target.y]?.[b.move.target.x];
			const aRequired = aType && isRequiredTile(aType);
			const bRequired = bType && isRequiredTile(bType);

			// Prioritize required tiles
			if (aRequired && !bRequired) return -1;
			if (!aRequired && bRequired) return 1;

			// Among required tiles, prioritize those with fewer escape routes (forced moves)
			if (aRequired && bRequired) {
				const aNeighbors = getValidMovesForPathfinding(
					a.move.target,
					a.simResult.newTiles,
					a.simResult.newLilypads,
					a.simResult.newTidePhase,
					a.simResult.newAcorns,
				).length;
				const bNeighbors = getValidMovesForPathfinding(
					b.move.target,
					b.simResult.newTiles,
					b.simResult.newLilypads,
					b.simResult.newTidePhase,
					b.simResult.newAcorns,
				).length;
				return aNeighbors - bNeighbors; // Prefer tiles with fewer exits (more constrained)
			}

			return 0;
		});

		// Try each move recursively
		for (const { move, simResult } of validMoves) {
			const newPath = [...path, move.target];
			const result = findHamiltonianPath(
				simResult.finalPos,
				simResult.newTiles,
				simResult.newLilypads,
				newPath,
				maxDepth,
				iterations,
				simResult.newTidePhase,
				simResult.newAcorns,
			);

			if (result.timedOut) {
				return result; // Propagate timeout
			}

			if (result.path !== null) {
				return result;
			}
		}

		// No valid path found from this state
		return { path: null, timedOut: false };
	}

	// Find a winning path and return the first few moves as hints
	function findWinningPath(): { path: Position[] | null; timedOut: boolean } {
		const currentTiles = tiles.value.map((row) => row.map((tile) => tile.type));
		const currentLilypads = cloneLilypadState();
		const currentPos = playerPosition.value;

		// Count tiles to set reasonable depth limit
		const remaining = countRemainingTiles(currentTiles);
		const iterations = { count: 0 };

		return findHamiltonianPath(
			currentPos,
			currentTiles,
			currentLilypads,
			[],
			remaining + 10,
			iterations,
		);
	}

	// Check if the current state has any unreachable tiles (player is stuck)
	function hasUnreachableTiles(): boolean {
		const currentTiles = tiles.value.map((row) => row.map((tile) => tile.type));
		const currentLilypads = cloneLilypadState();
		return !isGraphConnected(
			playerPosition.value,
			currentTiles,
			currentLilypads,
		);
	}

	// Get valid moves for pathfinding
	// simulatedTidePhase: current tide phase for determining LOW_SAND accessibility
	// simulatedAcorns: current simulated acorn count for determining SQUIRREL accessibility
	function getValidMovesForPathfinding(
		pos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
		simulatedTidePhase?: number,
		simulatedAcorns?: number,
	): { target: Position; direction: Direction }[] {
		const moves: { target: Position; direction: Direction }[] = [];
		const directions: Direction[] = ["up", "down", "left", "right"];

		// Check if LOW_SAND will be flooded after moving (tide advances when we leave)
		const currentPhase = simulatedTidePhase ?? tidePhase.value;
		const nextPhase = (currentPhase + 1) % TIDE_PERIOD;
		const lowSandWillBeFlooded = nextPhase === 0;

		// Check if standing on honey (can't jump from honey)
		const currentTileType = tileStates[pos.y]?.[pos.x];
		const isOnHoney = currentTileType === TileType.HONEY;

		// Current acorn count for squirrel checks
		const acorns = simulatedAcorns ?? collectedAcorns.value;

		// Helper to check if we can step onto a squirrel tile
		const canStepOnSquirrel = (squirrelPos: Position): boolean => {
			const requirement = getSquirrelRequirement(squirrelPos);
			return acorns >= requirement;
		};

		for (const direction of directions) {
			const delta = getDirectionDelta(direction);
			const adjacentPos = { x: pos.x + delta.x, y: pos.y + delta.y };

			if (
				adjacentPos.x >= 0 &&
				adjacentPos.x < level.width &&
				adjacentPos.y >= 0 &&
				adjacentPos.y < level.height
			) {
				const adjTileType = tileStates[adjacentPos.y]?.[adjacentPos.x];

				// Check if pond with submerged lilypad
				if (adjTileType === TileType.POND) {
					const key = `${adjacentPos.x},${adjacentPos.y}`;
					const state = lilypads.get(key);
					if (state && !state.submerged) {
						moves.push({ target: adjacentPos, direction });
						continue;
					}
				} else if (adjTileType === TileType.ACORN) {
					// Acorn tiles are always walkable (collect acorn on landing)
					moves.push({ target: adjacentPos, direction });
					continue;
				} else if (adjTileType === TileType.SQUIRREL) {
					// Squirrel tiles are walkable only if we have enough acorns
					if (canStepOnSquirrel(adjacentPos)) {
						moves.push({ target: adjacentPos, direction });
						continue;
					}
					// If we can't step on squirrel, fall through to obstacle check
				} else if (
					(adjTileType && isWalkableTile(adjTileType)) ||
					(adjTileType && isPortalTile(adjTileType)) ||
					(adjTileType === TileType.LOW_SAND && !lowSandWillBeFlooded)
				) {
					// Note: ACORN is in WalkableTileTypes but already handled above
					moves.push({ target: adjacentPos, direction });
					continue;
				}

				// Check jump over obstacle (including flooded LOW_SAND and SEA)
				// Can't jump from honey tiles
				if (isOnHoney) continue;

				// Note: Squirrels are NOT jumpable obstacles - you can never jump over them
				// They completely block the path until you have enough acorns to walk to them directly
				const isAdjacentObstacle =
					adjTileType === TileType.BRAMBLE ||
					adjTileType === TileType.MUSHROOM ||
					adjTileType === TileType.SAND_MUSHROOM ||
					adjTileType === TileType.HONEY_MUSHROOM ||
					adjTileType === TileType.POND_WATER ||
					adjTileType === TileType.SEA ||
					(adjTileType === TileType.POND &&
						lilypads.get(`${adjacentPos.x},${adjacentPos.y}`)?.submerged) ||
					(adjTileType === TileType.LOW_SAND && lowSandWillBeFlooded);

				if (isAdjacentObstacle) {
					const jumpPos = { x: pos.x + delta.x * 2, y: pos.y + delta.y * 2 };
					if (
						jumpPos.x >= 0 &&
						jumpPos.x < level.width &&
						jumpPos.y >= 0 &&
						jumpPos.y < level.height
					) {
						const jumpTileType = tileStates[jumpPos.y]?.[jumpPos.x];

						if (jumpTileType === TileType.POND) {
							const key = `${jumpPos.x},${jumpPos.y}`;
							const state = lilypads.get(key);
							if (state && !state.submerged) {
								moves.push({ target: jumpPos, direction });
							}
						} else if (
							(jumpTileType && isWalkableTile(jumpTileType)) ||
							(jumpTileType && isPortalTile(jumpTileType)) ||
							(jumpTileType === TileType.LOW_SAND && !lowSandWillBeFlooded)
						) {
							// Note: ACORN is in WalkableTileTypes
							moves.push({ target: jumpPos, direction });
						}
					}
				}
			}
		}

		// Prioritize moves to required tiles
		moves.sort((a, b) => {
			const aType = tileStates[a.target.y]?.[a.target.x];
			const bType = tileStates[b.target.y]?.[b.target.x];
			const aPriority = aType && isRequiredTile(aType) ? 0 : 1;
			const bPriority = bType && isRequiredTile(bType) ? 0 : 1;
			return aPriority - bPriority;
		});

		return moves;
	}

	// Simulate a move for pathfinding
	function simulateMoveForPathfinding(
		pos: Position,
		move: { target: Position; direction: Direction },
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
		simulatedTidePhase?: number,
		simulatedAcorns?: number,
	): {
		finalPos: Position;
		newTiles: TileType[][];
		newLilypads: Map<string, LilypadState>;
		newTidePhase: number;
		newAcorns: number;
	} {
		// Track acorn count
		let acornCount = simulatedAcorns ?? collectedAcorns.value;
		// Clone state
		const newTileStates = tileStates.map((row) => [...row]);
		const newLilypads = new Map<string, LilypadState>();
		for (const [key, state] of lilypads) {
			newLilypads.set(key, { ...state });
		}

		// Advance tide phase
		const currentPhase = simulatedTidePhase ?? tidePhase.value;
		const newTidePhase = (currentPhase + 1) % TIDE_PERIOD;

		// Simulate leaving current tile
		const currentTileType = newTileStates[pos.y]?.[pos.x];
		if (currentTileType === TileType.GRASS) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.MUSHROOM;
		} else if (currentTileType === TileType.DIRT) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.GRASS;
		} else if (currentTileType === TileType.LOW_SAND) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.SAND_MUSHROOM;
		} else if (currentTileType === TileType.HONEY) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.HONEY_MUSHROOM;
		} else if (currentTileType === TileType.POND) {
			const key = `${pos.x},${pos.y}`;
			const state = newLilypads.get(key);
			if (state && !state.submerged) {
				state.submerged = true;
				state.cooldown = 4;
			}
		}

		// Decrement lily-pad cooldowns
		for (const [, state] of newLilypads) {
			if (state.submerged && state.cooldown > 0) {
				state.cooldown--;
				if (state.cooldown === 0) {
					state.submerged = false;
				}
			}
		}

		// Handle special tiles
		let finalPos = move.target;
		const nextTileType = newTileStates[move.target.y]?.[move.target.x];

		if (nextTileType === TileType.WATER) {
			// Simulate water slide
			let current = move.target;
			while (true) {
				const flow = getWaterFlow(current);
				if (!flow) break;
				const delta = getDirectionDelta(flow);
				const next = { x: current.x + delta.x, y: current.y + delta.y };
				if (
					next.x < 0 ||
					next.x >= level.width ||
					next.y < 0 ||
					next.y >= level.height
				)
					break;
				const nextType = newTileStates[next.y]?.[next.x];
				if (nextType === TileType.WATER) {
					current = next;
				} else if (nextType === TileType.STONE) {
					current = next;
					break;
				} else {
					break;
				}
			}
			finalPos = current;
		} else if (nextTileType === TileType.ICE) {
			// Simulate ice slide (with bounce pad chaining)
			const delta = getDirectionDelta(move.direction);
			let current = move.target;
			while (true) {
				const next = { x: current.x + delta.x, y: current.y + delta.y };
				if (
					next.x < 0 ||
					next.x >= level.width ||
					next.y < 0 ||
					next.y >= level.height
				)
					break;
				const nextType = newTileStates[next.y]?.[next.x];
				if (
					nextType === TileType.BRAMBLE ||
					nextType === TileType.MUSHROOM ||
					nextType === TileType.SAND_MUSHROOM ||
					nextType === TileType.HONEY_MUSHROOM ||
					nextType === TileType.VOID ||
					nextType === TileType.POND_WATER
				) {
					break;
				}
				if (nextType === TileType.POND) {
					const key = `${next.x},${next.y}`;
					const state = newLilypads.get(key);
					if (state?.submerged) break;
				}
				if (nextType === TileType.ICE) {
					current = next;
				} else {
					current = next;
					break;
				}
			}
			finalPos = current;

			// Check if ice slide ends on bounce pad - chain into bounce
			const iceEndType = newTileStates[current.y]?.[current.x];
			if (iceEndType === TileType.BOUNCE_PAD) {
				// Helper to check if a tile can be landed on
				// Note: newTidePhase is the tide phase AFTER the move
				const canLandOnForBounce = (tileType: TileType | undefined): boolean => {
					if (!tileType) return false;
					if (tileType === TileType.VOID) return false;
					if (tileType === TileType.BRAMBLE) return false;
					if (tileType === TileType.MUSHROOM) return false;
					if (tileType === TileType.SAND_MUSHROOM) return false;
					if (tileType === TileType.HONEY_MUSHROOM) return false;
					if (tileType === TileType.POND_WATER) return false;
					if (tileType === TileType.SEA) return false;
					// Can't land on flooded LOW_SAND
					if (tileType === TileType.LOW_SAND && newTidePhase === 0) return false;
					return true;
				};

				// Recursive function to follow bounce chains
				const calculateBounceChain = (
					padPos: Position,
					dir: { x: number; y: number },
					visitedPads: Set<string> = new Set(),
				): Position | null => {
					const padKey = `${padPos.x},${padPos.y}`;
					if (visitedPads.has(padKey)) return null;
					visitedPads.add(padKey);

					for (let distance = 3; distance >= 1; distance--) {
						const landingPos = {
							x: padPos.x + dir.x * distance,
							y: padPos.y + dir.y * distance,
						};
						if (
							landingPos.x >= 0 &&
							landingPos.x < level.width &&
							landingPos.y >= 0 &&
							landingPos.y < level.height
						) {
							const landingType = newTileStates[landingPos.y]?.[landingPos.x];
							if (landingType === TileType.BOUNCE_PAD) {
								const chainResult = calculateBounceChain(landingPos, dir, visitedPads);
								// If chain succeeds, return final destination
								// If chain fails (blocked), we still land on this bounce pad
								return chainResult ?? landingPos;
							}
							if (canLandOnForBounce(landingType)) {
								return landingPos;
							}
						}
					}
					return null;
				};

				const bounceResult = calculateBounceChain(current, delta);
				if (bounceResult) {
					finalPos = bounceResult;
				}
			}
		} else if (nextTileType && isPortalTile(nextTileType)) {
			// Find matching portal
			for (let y = 0; y < newTileStates.length; y++) {
				const row = newTileStates[y];
				if (!row) continue;
				for (let x = 0; x < row.length; x++) {
					if (
						row[x] === nextTileType &&
						(x !== move.target.x || y !== move.target.y)
					) {
						finalPos = { x, y };
						break;
					}
				}
			}
		} else if (nextTileType === TileType.BOUNCE_PAD) {
			// Simulate bounce with chaining support
			const delta = getDirectionDelta(move.direction);

			// Helper to check if a tile can be landed on (excluding bounce pads for chain logic)
			// Note: newTidePhase is the tide phase AFTER the move to the bounce pad
			const canLandOnForPathfinding = (tileType: TileType | undefined): boolean => {
				if (!tileType) return false;
				if (tileType === TileType.VOID) return false;
				if (tileType === TileType.BRAMBLE) return false;
				if (tileType === TileType.MUSHROOM) return false;
				if (tileType === TileType.SAND_MUSHROOM) return false;
				if (tileType === TileType.HONEY_MUSHROOM) return false;
				if (tileType === TileType.POND_WATER) return false;
				if (tileType === TileType.SEA) return false;
				// Can't land on flooded LOW_SAND
				if (tileType === TileType.LOW_SAND && newTidePhase === 0) return false;
				return true;
			};

			// Recursive function to follow bounce chains
			// Returns the final position after all bounces, or null if bounce is completely blocked
			const calculateBounceChainDestination = (
				padPos: Position,
				dir: { x: number; y: number },
				visitedPads: Set<string> = new Set(),
			): Position | null => {
				const padKey = `${padPos.x},${padPos.y}`;
				if (visitedPads.has(padKey)) return null; // Infinite loop prevention
				visitedPads.add(padKey);

				for (let distance = 3; distance >= 1; distance--) {
					const landingPos = {
						x: padPos.x + dir.x * distance,
						y: padPos.y + dir.y * distance,
					};

					if (
						landingPos.x >= 0 &&
						landingPos.x < level.width &&
						landingPos.y >= 0 &&
						landingPos.y < level.height
					) {
						const landingType = newTileStates[landingPos.y]?.[landingPos.x];

						// If landing on another bounce pad, follow the chain
						if (landingType === TileType.BOUNCE_PAD) {
							const chainResult = calculateBounceChainDestination(
								landingPos,
								dir,
								visitedPads,
							);
							// If chain succeeds, return final destination
							// If chain fails (blocked), we still land on this bounce pad
							return chainResult ?? landingPos;
						}

						if (canLandOnForPathfinding(landingType)) {
							return landingPos;
						}
					}
				}
				return null;
			};

			const chainDest = calculateBounceChainDestination(move.target, delta);
			if (chainDest) {
				finalPos = chainDest;

				// Handle chaining - if we land on water or ice, simulate that too
				const landingType = newTileStates[chainDest.y]?.[chainDest.x];
				if (landingType === TileType.WATER) {
					let current = chainDest;
					while (true) {
						const flow = getWaterFlow(current);
						if (!flow) break;
						const waterDelta = getDirectionDelta(flow);
						const next = { x: current.x + waterDelta.x, y: current.y + waterDelta.y };
						if (next.x < 0 || next.x >= level.width || next.y < 0 || next.y >= level.height) break;
						const nextType = newTileStates[next.y]?.[next.x];
						if (nextType === TileType.WATER) {
							current = next;
						} else if (nextType === TileType.STONE) {
							current = next;
							break;
						} else {
							break;
						}
					}
					finalPos = current;
				} else if (landingType === TileType.ICE) {
					let current = chainDest;
					while (true) {
						const next = { x: current.x + delta.x, y: current.y + delta.y };
						if (next.x < 0 || next.x >= level.width || next.y < 0 || next.y >= level.height) break;
						const nextType = newTileStates[next.y]?.[next.x];
						if (nextType === TileType.BRAMBLE || nextType === TileType.MUSHROOM ||
							nextType === TileType.SAND_MUSHROOM || nextType === TileType.HONEY_MUSHROOM ||
							nextType === TileType.VOID || nextType === TileType.POND_WATER) {
							break;
						}
						if (nextType === TileType.ICE) {
							current = next;
						} else {
							current = next;
							break;
						}
					}
					finalPos = current;
				}
			}
		}

		// Handle landing on ACORN or SQUIRREL tiles
		const landingTileType = newTileStates[finalPos.y]?.[finalPos.x];
		if (landingTileType === TileType.ACORN) {
			// Collect the acorn and convert tile to grass
			acornCount++;
			const row = newTileStates[finalPos.y];
			if (row) row[finalPos.x] = TileType.GRASS;
		} else if (landingTileType === TileType.SQUIRREL) {
			// Feed the squirrel and convert tile to grass
			const requirement = getSquirrelRequirement(finalPos);
			acornCount -= requirement;
			const row = newTileStates[finalPos.y];
			if (row) row[finalPos.x] = TileType.GRASS;
		}

		return { finalPos, newTiles: newTileStates, newLilypads, newTidePhase, newAcorns: acornCount };
	}

	function computeSlideDestination(startPos: Position): {
		destination: Position;
		path: Position[];
	} {
		const path: Position[] = [startPos];
		let current = startPos;

		while (true) {
			const flow = getWaterFlow(current);
			if (!flow) {
				// Not a water tile or no flow defined, stop here
				break;
			}

			const delta = getDirectionDelta(flow);
			const next = { x: current.x + delta.x, y: current.y + delta.y };
			const nextTile = getTile(next);

			if (!nextTile) {
				// Out of bounds, stop at current
				break;
			}

			if (nextTile.type === TileType.WATER) {
				// Continue sliding through water
				path.push(next);
				current = next;
			} else if (nextTile.type === TileType.STONE) {
				// River ends at stone, land on the stone
				path.push(next);
				current = next;
				break;
			} else {
				// Hit something else, stop at current water tile
				break;
			}
		}

		return { destination: current, path };
	}

	function computeIceSlideDestination(
		startPos: Position,
		direction: Direction,
	): { destination: Position; path: Position[] } {
		const path: Position[] = [startPos];
		const delta = getDirectionDelta(direction);
		let current = startPos;

		while (true) {
			const next = { x: current.x + delta.x, y: current.y + delta.y };
			const nextTile = getTile(next);

			if (!nextTile) {
				// Out of bounds, stop at current
				break;
			}

			// Stop if we hit an obstacle (bramble, mushroom, deep pond water) or void
			if (
				nextTile.type === TileType.BRAMBLE ||
				nextTile.type === TileType.MUSHROOM ||
				nextTile.type === TileType.SAND_MUSHROOM ||
				nextTile.type === TileType.HONEY_MUSHROOM ||
				nextTile.type === TileType.VOID ||
				nextTile.type === TileType.POND_WATER
			) {
				break;
			}

			if (nextTile.type === TileType.ICE) {
				// Continue sliding through ice
				path.push(next);
				current = next;
			} else {
				// Landed on a non-ice tile (grass, stone, dirt, water)
				path.push(next);
				current = next;
				break;
			}
		}

		return { destination: current, path };
	}

	function computeBounceDestination(
		startPos: Position,
		direction: Direction,
	): { destination: Position; path: Position[]; didMove: boolean } {
		const MAX_BOUNCE_DISTANCE = 3;
		const delta = getDirectionDelta(direction);

		// Check if a tile can be landed on (only check landing spot, not tiles we jump over)
		function canLandOnTile(tile: Tile | null): boolean {
			if (!tile) return false;
			// Can't land on these tile types
			if (tile.type === TileType.VOID) return false;
			if (tile.type === TileType.BRAMBLE) return false;
			if (tile.type === TileType.MUSHROOM) return false;
			if (tile.type === TileType.SAND_MUSHROOM) return false;
			if (tile.type === TileType.HONEY_MUSHROOM) return false;
			if (tile.type === TileType.POND_WATER) return false;
			if (tile.type === TileType.SEA) return false;
			// Can't land on flooded LOW_SAND (tide already advanced when stepping on bounce pad)
			if (tile.type === TileType.LOW_SAND && tidePhase.value === 0) return false;
			return true;
		}

		// Try bouncing at progressively shorter distances (3, 2, 1) if landing spot is blocked
		for (
			let bounceDistance = MAX_BOUNCE_DISTANCE;
			bounceDistance >= 1;
			bounceDistance--
		) {
			// Calculate the landing position
			const landingPos = {
				x: startPos.x + delta.x * bounceDistance,
				y: startPos.y + delta.y * bounceDistance,
			};
			const landingTile = getTile(landingPos);

			// Check if we can land there (we can jump OVER obstacles, only landing matters)
			if (canLandOnTile(landingTile)) {
				// Build the path for animation (includes all positions we pass through)
				const path: Position[] = [startPos];
				for (let i = 1; i <= bounceDistance; i++) {
					path.push({
						x: startPos.x + delta.x * i,
						y: startPos.y + delta.y * i,
					});
				}
				return { destination: landingPos, path, didMove: true };
			}
		}

		// No valid bounce - stay in place
		return { destination: startPos, path: [startPos], didMove: false };
	}

	// Helper function for recursive bounce chaining
	function animateBounceChain(
		startPos: Position,
		direction: Direction,
		onComplete: () => void,
	): void {
		const { path, destination, didMove } =
			computeBounceDestination(startPos, direction);

		// If we can't move at all, just complete immediately
		if (!didMove) {
			isBouncing.value = false;
			onComplete();
			return;
		}

		slidePath.value = path;
		playBouncepad();
		isSliding.value = true;
		isBouncing.value = true;
		lastBouncePadPosition.value = { ...startPos };

		// Clear the bounce pad effect after animation completes
		setTimeout(() => {
			lastBouncePadPosition.value = null;
		}, 500);

		// Calculate interval timing to sync with animation duration (400ms)
		// For smooth movement, spread position updates evenly across the animation
		const animationDuration = 400;
		const steps = path.length - 1; // Number of position changes
		const intervalTime = steps > 0 ? Math.floor(animationDuration / steps) : 100;

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
				slidePath.value = [];

				// Check what we landed on
				const finalTile = getTile(destination);

				if (finalTile?.type === TileType.BOUNCE_PAD) {
					// Chain into another bounce recursively!
					animateBounceChain(destination, direction, onComplete);
				} else if (finalTile?.type === TileType.WATER) {
					// Chain into water slide
					isBouncing.value = false;
					const { path: waterPath } = computeSlideDestination(destination);
					slidePath.value = waterPath;
					playWater();
					isSliding.value = true;

					let waterPathIndex = 1;
					const waterSlideInterval = setInterval(() => {
						const waterNextPos = waterPath[waterPathIndex];
						if (waterPathIndex < waterPath.length && waterNextPos) {
							playerPosition.value = waterNextPos;
							waterPathIndex++;
						} else {
							clearInterval(waterSlideInterval);
							isSliding.value = false;
							slidePath.value = [];
							onComplete();
						}
					}, 150);
				} else if (finalTile?.type === TileType.ICE) {
					// Chain into ice slide
					isBouncing.value = false;
					const { path: icePath, destination: iceDestination } = computeIceSlideDestination(
						destination,
						direction,
					);
					slidePath.value = icePath;
					startIceSlide();
					isSliding.value = true;

					let icePathIndex = 1;
					const iceSlideInterval = setInterval(() => {
						const iceNextPos = icePath[icePathIndex];
						if (icePathIndex < icePath.length && iceNextPos) {
							playerPosition.value = iceNextPos;
							icePathIndex++;
						} else {
							clearInterval(iceSlideInterval);
							stopIceSlide();
							isSliding.value = false;
							slidePath.value = [];

							// Check for chaining after ice slide
							const iceEndTile = getTile(iceDestination);
							if (iceEndTile?.type === TileType.BOUNCE_PAD) {
								// Chain into bounce pad
								animateBounceChain(iceDestination, direction, onComplete);
							} else if (iceEndTile?.type === TileType.WATER) {
								// Chain into water slide
								const { path: waterPath } = computeSlideDestination(iceDestination);
								slidePath.value = waterPath;
								playWater();
								isSliding.value = true;

								let waterPathIndex = 1;
								const waterSlideInterval = setInterval(() => {
									const waterNextPos = waterPath[waterPathIndex];
									if (waterPathIndex < waterPath.length && waterNextPos) {
										playerPosition.value = waterNextPos;
										waterPathIndex++;
									} else {
										clearInterval(waterSlideInterval);
										isSliding.value = false;
										slidePath.value = [];
										onComplete();
									}
								}, 150);
							} else if (iceEndTile && isPortalTile(iceEndTile.type)) {
								// Chain into portal
								const portalType = iceEndTile.type as PortalType;
								const matchingPortal = findMatchingPortal(portalType, iceDestination);
								if (matchingPortal) {
									isTeleporting.value = true;
									teleportPhase.value = "shrinking";
									setTimeout(() => {
										poofPositions.value = [{ ...iceDestination }];
										playTeleportPoof();
										playerPosition.value = { ...matchingPortal };
										setTimeout(() => {
											poofPositions.value = [{ ...matchingPortal }];
											playTeleportPoof();
											teleportPhase.value = "growing";
											setTimeout(() => {
												isTeleporting.value = false;
												teleportPhase.value = null;
												poofPositions.value = [];
												onComplete();
											}, 200);
										}, 350);
									}, 200);
								} else {
									onComplete();
								}
							} else {
								onComplete();
							}
						}
					}, 150);
				} else if (finalTile && isPortalTile(finalTile.type)) {
					// Chain into portal
					isBouncing.value = false;
					const portalType = finalTile.type as PortalType;
					const matchingPortal = findMatchingPortal(portalType, destination);
					if (matchingPortal) {
						isTeleporting.value = true;
						teleportPhase.value = "shrinking";
						setTimeout(() => {
							poofPositions.value = [{ ...destination }];
							playTeleportPoof();
							playerPosition.value = { ...matchingPortal };
							setTimeout(() => {
								poofPositions.value = [{ ...matchingPortal }];
								playTeleportPoof();
								teleportPhase.value = "growing";
								setTimeout(() => {
									isTeleporting.value = false;
									teleportPhase.value = null;
									poofPositions.value = [];
									onComplete();
								}, 200);
							}, 350);
						}, 200);
					} else {
						onComplete();
					}
				} else {
					// Normal landing - play sound based on tile
					isBouncing.value = false;
					if (finalTile?.type === TileType.GRASS) {
						playLand();
					} else if (finalTile?.type === TileType.DIRT) {
						playRandomDirt();
					} else if (finalTile?.type === TileType.STONE) {
						playStone();
					} else if (finalTile?.type === TileType.POND) {
						playWater();
					} else if (finalTile?.type === TileType.HONEY) {
						playHoneyLand();
					}
					onComplete();
				}
			}
		}, intervalTime);
	}

	function tryMove(direction: Direction): Position | null {
		const delta = getDirectionDelta(direction);
		const adjacentPos = {
			x: playerPosition.value.x + delta.x,
			y: playerPosition.value.y + delta.y,
		};

		// Check if we can land on the adjacent tile
		if (canLandOn(adjacentPos)) {
			return adjacentPos;
		}

		// Check if player is on honey tile (can't jump from honey)
		const currentTile = getTile(playerPosition.value);
		const isOnHoney = currentTile?.type === TileType.HONEY;

		// If adjacent tile is an obstacle, check if we can jump over it (unless on honey)
		if (!isOnHoney && isObstacle(adjacentPos)) {
			const jumpPos = {
				x: playerPosition.value.x + delta.x * 2,
				y: playerPosition.value.y + delta.y * 2,
			};

			// Can only jump if the landing tile is valid
			if (canLandOn(jumpPos)) {
				return jumpPos;
			}
		}

		return null;
	}

	// Handle landing on special tiles (acorn collection, squirrel feeding)
	// Returns any additional tile changes for undo tracking
	function handleLandingTile(position: Position): ChangedTile[] {
		const tile = getTile(position);
		if (!tile) return [];

		const row = tiles.value[position.y];
		const cell = row?.[position.x];
		if (!cell) return [];

		const changes: ChangedTile[] = [];

		if (tile.type === TileType.ACORN) {
			// Collect acorn and convert tile to grass
			collectedAcorns.value += 1;
			changes.push({ position: { ...position }, originalType: TileType.ACORN });
			cell.type = TileType.GRASS;
			showAcornPopup(1); // Show +1
			playAcorn();
		} else if (tile.type === TileType.SQUIRREL) {
			// Feed squirrel and convert tile to grass
			const required = getSquirrelRequirement(position);
			collectedAcorns.value -= required;
			changes.push({ position: { ...position }, originalType: TileType.SQUIRREL });
			cell.type = TileType.GRASS;
			showAcornPopup(-required); // Show -X
			playSquirrel();
		}

		return changes;
	}

	function plantMushroom(position: Position) {
		const tile = getTile(position);
		if (!tile) return;

		const row = tiles.value[position.y];
		const cell = row?.[position.x];
		if (!cell) return;

		if (tile.type === TileType.GRASS) {
			// Grass becomes mushroom when left
			cell.type = TileType.MUSHROOM;
			playRandomPop();
			lastPlantedPosition.value = { ...position };
			// Clear after animation completes
			setTimeout(() => {
				lastPlantedPosition.value = null;
			}, 400);
		} else if (tile.type === TileType.LOW_SAND) {
			// Low sand becomes sand mushroom (retains sand visual, still floods)
			cell.type = TileType.SAND_MUSHROOM;
			playRandomPop();
			lastPlantedPosition.value = { ...position };
			// Clear after animation completes
			setTimeout(() => {
				lastPlantedPosition.value = null;
			}, 400);
		} else if (tile.type === TileType.DIRT) {
			// Dirt becomes grass (needs to be stepped on again)
			cell.type = TileType.GRASS;
			playShovelDirt();
			lastCleanedPosition.value = { ...position };
			// Clear after animation completes
			setTimeout(() => {
				lastCleanedPosition.value = null;
			}, 800);
		} else if (tile.type === TileType.HONEY) {
			// Honey becomes honey_mushroom when left (shows honey underneath)
			cell.type = TileType.HONEY_MUSHROOM;
			playRandomPop();
			lastPlantedPosition.value = { ...position };
			// Clear after animation completes
			setTimeout(() => {
				lastPlantedPosition.value = null;
			}, 400);
		} else if (tile.type === TileType.POND) {
			// Pond lily-pad sinks when left, resurfaces after 4 moves
			const key = `${position.x},${position.y}`;
			const state = lilypadState.value.get(key);
			if (state && !state.submerged) {
				state.submerged = true;
				state.cooldown = 4;
				playLilypadSink();
			}
		}
		// Portal tiles stay as portals - they can be used multiple times

		// Decrement lily-pad cooldowns after each move
		decrementLilypadCooldowns();

		// Advance tide phase after each move
		advanceTide();
	}

	// Check if the level has any LOW_SAND tiles (tidal areas)
	function hasLowSandTiles(): boolean {
		for (const row of tiles.value) {
			for (const tile of row) {
				if (tile.type === TileType.LOW_SAND) {
					return true;
				}
			}
		}
		return false;
	}

	// Advance the tide phase (called when leaving a tile)
	function advanceTide() {
		const oldPhase = tidePhase.value;
		tidePhase.value = (tidePhase.value + 1) % TIDE_PERIOD;

		// Play tide sounds only if level has LOW_SAND tiles
		if (hasLowSandTiles()) {
			if (oldPhase === TIDE_PERIOD - 1 && tidePhase.value === 0) {
				// Tide is flooding (phase went from 4 to 0)
				playWavesRise();
			} else if (oldPhase === 0 && tidePhase.value === 1) {
				// Tide is receding (phase went from 0 to 1)
				playWavesFall();
			}
		}
	}

	function checkWinCondition(): boolean {
		// Win when standing on the only remaining required tile (except dirt)
		let totalRequired = 0;
		let playerTileType: TileType | null = null;

		for (const row of tiles.value) {
			for (const tile of row) {
				if (isRequiredTile(tile.type)) {
					totalRequired++;
					if (
						tile.position.x === playerPosition.value.x &&
						tile.position.y === playerPosition.value.y
					) {
						playerTileType = tile.type;
					}
				}
			}
		}

		// Win if there's exactly one required tile remaining and player is on it,
		// BUT NOT if it's dirt (dirt needs to be left and stepped on again as grass)
		return (
			totalRequired === 1 &&
			playerTileType !== null &&
			playerTileType !== TileType.DIRT
		);
	}

	function movePlayer(direction: Direction) {
		if (hasWon.value || isSliding.value) return;
		// Block movement while hopping onto water (prevents overriding slide animation)
		const currentTile = getTile(playerPosition.value);
		if (isHopping.value && currentTile?.type === TileType.WATER) return;

		const newPosition = tryMove(direction);
		if (!newPosition) return;

		// Reset idle timer on successful move
		resetIdleTimer();

		// Update facing direction for left/right movement
		if (direction === "left") {
			facingDirection.value = "left";
		} else if (direction === "right") {
			facingDirection.value = "right";
		}

		// Check if this is a jump (moving 2 tiles)
		const dx = Math.abs(newPosition.x - playerPosition.value.x);
		const dy = Math.abs(newPosition.y - playerPosition.value.y);
		const isJump = dx === 2 || dy === 2;

		// Save history before moving (including acorn count for undo)
		const currentPos = { ...playerPosition.value };
		const historyEntry: MoveHistory = {
			playerPosition: currentPos,
			tileState: currentTile?.type ?? TileType.GRASS,
			lilypadSnapshot: cloneLilypadState(),
			tidePhase: tidePhase.value,
			collectedAcorns: collectedAcorns.value,
		};

		isHopping.value = true;
		plantMushroom(playerPosition.value);

		// Handle landing on acorn/squirrel tiles (changes tile type and updates acorn count)
		const landingChanges = handleLandingTile(newPosition);
		if (landingChanges.length > 0) {
			historyEntry.additionalChanges = [
				...(historyEntry.additionalChanges ?? []),
				...landingChanges,
			];
		}

		moveHistory.value.push(historyEntry);

		// Play jump sound if jumping
		if (isJump) {
			playJump();
		}

		// Check if landing on water - need to slide
		const landingTile = getTile(newPosition);
		if (landingTile?.type === TileType.WATER) {
			const { path } = computeSlideDestination(newPosition);
			slidePath.value = path;
			playerPosition.value = newPosition;

			// Start sliding animation after hop completes
			setTimeout(() => {
				isHopping.value = false;
				playWater();
				isSliding.value = true;

				// Animate through slide path
				let pathIndex = 1; // Start from second position (first is already where player is)
				const slideInterval = setInterval(() => {
					const nextPos = path[pathIndex];
					if (pathIndex < path.length && nextPos) {
						playerPosition.value = nextPos;
						pathIndex++;
					} else {
						clearInterval(slideInterval);
						isSliding.value = false;
						slidePath.value = [];

						if (checkWinCondition()) {
							hasWon.value = true;
						}
					}
				}, 150);
			}, 200);
		} else if (landingTile?.type === TileType.ICE) {
			// Ice sliding - slide in the direction of movement
			const { path, destination } = computeIceSlideDestination(
				newPosition,
				direction,
			);
			slidePath.value = path;
			playerPosition.value = newPosition;

			// Start sliding animation after hop completes
			setTimeout(() => {
				isHopping.value = false;
				startIceSlide();
				isSliding.value = true;

				// Animate through slide path
				let pathIndex = 1;
				const slideInterval = setInterval(() => {
					const nextPos = path[pathIndex];
					if (pathIndex < path.length && nextPos) {
						playerPosition.value = nextPos;
						pathIndex++;
					} else {
						clearInterval(slideInterval);
						stopIceSlide();
						isSliding.value = false;
						slidePath.value = [];

						// Check if we landed on water - chain into water slide
						const finalTile = getTile(destination);
						if (finalTile?.type === TileType.WATER) {
							const { path: waterPath } = computeSlideDestination(destination);
							slidePath.value = waterPath;
							playWater();
							isSliding.value = true;

							let waterPathIndex = 1;
							const waterSlideInterval = setInterval(() => {
								const waterNextPos = waterPath[waterPathIndex];
								if (waterPathIndex < waterPath.length && waterNextPos) {
									playerPosition.value = waterNextPos;
									waterPathIndex++;
								} else {
									clearInterval(waterSlideInterval);
									isSliding.value = false;
									slidePath.value = [];

									if (checkWinCondition()) {
										hasWon.value = true;
									}
								}
							}, 150);
						} else if (finalTile && isPortalTile(finalTile.type)) {
							// Chain into portal teleportation
							const portalType = finalTile.type as PortalType;
							const matchingPortal = findMatchingPortal(
								portalType,
								destination,
							);
							if (matchingPortal) {
								// Start shrinking
								isTeleporting.value = true;
								teleportPhase.value = "shrinking";

								// After shrink completes, show poof and teleport
								setTimeout(() => {
									// Show poof at source
									const vanishPos = { ...destination };
									poofPositions.value = [vanishPos];
									playTeleportPoof();

									// Move player to destination (while invisible)
									playerPosition.value = { ...matchingPortal };

									// After longer pause, show poof at destination and start growing
									setTimeout(() => {
										const appearPos = { ...matchingPortal };
										poofPositions.value = [appearPos];
										playTeleportPoof();
										teleportPhase.value = "growing";

										// After grow completes, end teleport
										setTimeout(() => {
											isTeleporting.value = false;
											teleportPhase.value = null;
											poofPositions.value = [];

											if (checkWinCondition()) {
												hasWon.value = true;
											}
										}, 200);
									}, 350);
								}, 200);
							} else {
								if (checkWinCondition()) {
									hasWon.value = true;
								}
							}
						} else if (finalTile?.type === TileType.BOUNCE_PAD) {
							// Chain into bounce pad
							animateBounceChain(destination, direction, () => {
								if (checkWinCondition()) {
									hasWon.value = true;
								}
							});
						} else {
							// Play landing sound based on final tile type
							if (finalTile?.type === TileType.GRASS) {
								playLand();
							} else if (finalTile?.type === TileType.DIRT) {
								playRandomDirt();
							} else if (finalTile?.type === TileType.STONE) {
								playStone();
							} else if (finalTile?.type === TileType.POND) {
								playWater();
							} else if (finalTile?.type === TileType.HONEY) {
								playHoneyLand();
							}

							if (checkWinCondition()) {
								hasWon.value = true;
							}
						}
					}
				}, 150); // Ice slide speed
			}, 200);
		} else if (landingTile?.type === TileType.BOUNCE_PAD) {
			// Bounce pad - bounce player 3 tiles in movement direction
			playerPosition.value = newPosition;

			// Start bouncing animation after hop completes
			setTimeout(() => {
				isHopping.value = false;
				// Use recursive helper for chain bouncing
				animateBounceChain(newPosition, direction, () => {
					if (checkWinCondition()) {
						hasWon.value = true;
					}
				});
			}, 200);
		} else if (landingTile && isPortalTile(landingTile.type)) {
			// Portal teleportation - portals stay active for bidirectional travel
			const portalType = landingTile.type as PortalType;
			playerPosition.value = newPosition;

			setTimeout(() => {
				isHopping.value = false;

				// Find matching portal
				const matchingPortal = findMatchingPortal(portalType, newPosition);
				if (matchingPortal) {
					// Start shrinking
					isTeleporting.value = true;
					teleportPhase.value = "shrinking";

					// After shrink completes, show poof and teleport
					setTimeout(() => {
						// Show poof at source
						const vanishPos = { ...newPosition };
						poofPositions.value = [vanishPos];
						playTeleportPoof();

						// Move player to destination (while invisible)
						playerPosition.value = { ...matchingPortal };

						// After longer pause, show poof at destination and start growing
						setTimeout(() => {
							const appearPos = { ...matchingPortal };
							poofPositions.value = [appearPos];
							playTeleportPoof();
							teleportPhase.value = "growing";

							// After grow completes, end teleport
							setTimeout(() => {
								isTeleporting.value = false;
								teleportPhase.value = null;
								poofPositions.value = [];

								if (checkWinCondition()) {
									hasWon.value = true;
								}
							}, 200);
						}, 350);
					}, 200);
				} else {
					// No matching portal, just stay here
					if (checkWinCondition()) {
						hasWon.value = true;
					}
				}
			}, 200);
		} else {
			playerPosition.value = newPosition;

			// Reset hop animation and play landing sound based on tile type
			setTimeout(() => {
				isHopping.value = false;
				if (landingTile?.type === TileType.GRASS) {
					playLand();
				} else if (landingTile?.type === TileType.DIRT) {
					playRandomDirt();
				} else if (landingTile?.type === TileType.STONE) {
					playStone();
				} else if (landingTile?.type === TileType.POND) {
					playWater();
				} else if (landingTile?.type === TileType.LOW_SAND) {
					playSandLand();
				} else if (landingTile?.type === TileType.HONEY) {
					playHoneyLand();
				}
			}, 200);

			if (checkWinCondition()) {
				hasWon.value = true;
			}
		}
	}

	function canReachByClick(target: Position): boolean {
		// Check if adjacent and landable
		if (isAdjacent(playerPosition.value, target) && canLandOn(target)) {
			return true;
		}

		// Check if player is on honey tile (can't jump from honey)
		const currentTile = getTile(playerPosition.value);
		const isOnHoney = currentTile?.type === TileType.HONEY;
		if (isOnHoney) {
			return false; // Can only walk to adjacent tiles from honey
		}

		// Check if it's a valid jump (2 tiles away in straight line)
		const dx = target.x - playerPosition.value.x;
		const dy = target.y - playerPosition.value.y;

		// Must be exactly 2 tiles away in a straight line
		const isTwoAway =
			(Math.abs(dx) === 2 && dy === 0) || (dx === 0 && Math.abs(dy) === 2);

		if (isTwoAway && canLandOn(target)) {
			// Check that the middle tile is an obstacle
			const middlePos = {
				x: playerPosition.value.x + dx / 2,
				y: playerPosition.value.y + dy / 2,
			};
			return isObstacle(middlePos);
		}

		return false;
	}

	function moveToPosition(target: Position) {
		if (hasWon.value || isSliding.value) return;
		// Block movement while hopping onto water (prevents overriding slide animation)
		const currentTile = getTile(playerPosition.value);
		if (isHopping.value && currentTile?.type === TileType.WATER) return;
		if (!canReachByClick(target)) return;

		// Reset idle timer on successful move
		resetIdleTimer();

		// Check if this is a jump (moving 2 tiles)
		const dx = Math.abs(target.x - playerPosition.value.x);
		const dy = Math.abs(target.y - playerPosition.value.y);
		const isJump = dx === 2 || dy === 2;

		// Save history before moving
		const currentPos = { ...playerPosition.value };
		moveHistory.value.push({
			playerPosition: currentPos,
			tileState: currentTile?.type ?? TileType.GRASS,
			lilypadSnapshot: cloneLilypadState(),
			tidePhase: tidePhase.value,
		});

		isHopping.value = true;
		plantMushroom(playerPosition.value);

		// Play jump sound if jumping
		if (isJump) {
			playJump();
		}

		// Determine movement direction from click
		const moveDx = target.x - playerPosition.value.x;
		const moveDy = target.y - playerPosition.value.y;
		let direction: Direction;
		if (moveDx > 0) direction = "right";
		else if (moveDx < 0) direction = "left";
		else if (moveDy > 0) direction = "down";
		else direction = "up";

		// Update facing direction for horizontal movement
		if (moveDx > 0) {
			facingDirection.value = "right";
		} else if (moveDx < 0) {
			facingDirection.value = "left";
		}

		// Check if landing on water - need to slide
		const landingTile = getTile(target);
		if (landingTile?.type === TileType.WATER) {
			const { path } = computeSlideDestination(target);
			slidePath.value = path;
			playerPosition.value = target;

			// Start sliding animation after hop completes
			setTimeout(() => {
				isHopping.value = false;
				playWater();
				isSliding.value = true;

				// Animate through slide path
				let pathIndex = 1;
				const slideInterval = setInterval(() => {
					const nextPos = path[pathIndex];
					if (pathIndex < path.length && nextPos) {
						playerPosition.value = nextPos;
						pathIndex++;
					} else {
						clearInterval(slideInterval);
						isSliding.value = false;
						slidePath.value = [];

						if (checkWinCondition()) {
							hasWon.value = true;
						}
					}
				}, 150);
			}, 200);
		} else if (landingTile?.type === TileType.ICE) {
			// Ice sliding - slide in the direction of movement
			const { path, destination } = computeIceSlideDestination(
				target,
				direction,
			);
			slidePath.value = path;
			playerPosition.value = target;

			// Start sliding animation after hop completes
			setTimeout(() => {
				isHopping.value = false;
				startIceSlide();
				isSliding.value = true;

				// Animate through slide path
				let pathIndex = 1;
				const slideInterval = setInterval(() => {
					const nextPos = path[pathIndex];
					if (pathIndex < path.length && nextPos) {
						playerPosition.value = nextPos;
						pathIndex++;
					} else {
						clearInterval(slideInterval);
						stopIceSlide();
						isSliding.value = false;
						slidePath.value = [];

						// Check if we landed on water - chain into water slide
						const finalTile = getTile(destination);
						if (finalTile?.type === TileType.WATER) {
							const { path: waterPath } = computeSlideDestination(destination);
							slidePath.value = waterPath;
							playWater();
							isSliding.value = true;

							let waterPathIndex = 1;
							const waterSlideInterval = setInterval(() => {
								const waterNextPos = waterPath[waterPathIndex];
								if (waterPathIndex < waterPath.length && waterNextPos) {
									playerPosition.value = waterNextPos;
									waterPathIndex++;
								} else {
									clearInterval(waterSlideInterval);
									isSliding.value = false;
									slidePath.value = [];

									if (checkWinCondition()) {
										hasWon.value = true;
									}
								}
							}, 150);
						} else if (finalTile && isPortalTile(finalTile.type)) {
							// Chain into portal teleportation
							const portalType = finalTile.type as PortalType;
							const matchingPortal = findMatchingPortal(
								portalType,
								destination,
							);
							if (matchingPortal) {
								// Start shrinking
								isTeleporting.value = true;
								teleportPhase.value = "shrinking";

								// After shrink completes, show poof and teleport
								setTimeout(() => {
									// Show poof at source
									const vanishPos = { ...destination };
									poofPositions.value = [vanishPos];
									playTeleportPoof();

									// Move player to destination (while invisible)
									playerPosition.value = { ...matchingPortal };

									// After longer pause, show poof at destination and start growing
									setTimeout(() => {
										const appearPos = { ...matchingPortal };
										poofPositions.value = [appearPos];
										playTeleportPoof();
										teleportPhase.value = "growing";

										// After grow completes, end teleport
										setTimeout(() => {
											isTeleporting.value = false;
											teleportPhase.value = null;
											poofPositions.value = [];

											if (checkWinCondition()) {
												hasWon.value = true;
											}
										}, 200);
									}, 350);
								}, 200);
							} else {
								if (checkWinCondition()) {
									hasWon.value = true;
								}
							}
						} else if (finalTile?.type === TileType.BOUNCE_PAD) {
							// Chain into bounce pad
							animateBounceChain(destination, direction, () => {
								if (checkWinCondition()) {
									hasWon.value = true;
								}
							});
						} else {
							// Play landing sound based on final tile type
							if (finalTile?.type === TileType.GRASS) {
								playLand();
							} else if (finalTile?.type === TileType.DIRT) {
								playRandomDirt();
							} else if (finalTile?.type === TileType.STONE) {
								playStone();
							} else if (finalTile?.type === TileType.POND) {
								playWater();
							} else if (finalTile?.type === TileType.HONEY) {
								playHoneyLand();
							}

							if (checkWinCondition()) {
								hasWon.value = true;
							}
						}
					}
				}, 150); // Ice slide speed
			}, 200);
		} else if (landingTile?.type === TileType.BOUNCE_PAD) {
			// Bounce pad - use recursive helper for chaining
			playerPosition.value = target;

			setTimeout(() => {
				isHopping.value = false;
				animateBounceChain(target, direction, () => {
					if (checkWinCondition()) {
						hasWon.value = true;
					}
				});
			}, 200);
		} else if (landingTile && isPortalTile(landingTile.type)) {
			// Portal teleportation - portals stay active for bidirectional travel
			const portalType = landingTile.type as PortalType;
			playerPosition.value = target;

			setTimeout(() => {
				isHopping.value = false;

				// Find matching portal
				const matchingPortal = findMatchingPortal(portalType, target);
				if (matchingPortal) {
					// Start shrinking
					isTeleporting.value = true;
					teleportPhase.value = "shrinking";

					// After shrink completes, show poof and teleport
					setTimeout(() => {
						// Show poof at source
						const vanishPos = { ...target };
						poofPositions.value = [vanishPos];
						playTeleportPoof();

						// Move player to destination (while invisible)
						playerPosition.value = { ...matchingPortal };

						// After longer pause, show poof at destination and start growing
						setTimeout(() => {
							const appearPos = { ...matchingPortal };
							poofPositions.value = [appearPos];
							playTeleportPoof();
							teleportPhase.value = "growing";

							// After grow completes, end teleport
							setTimeout(() => {
								isTeleporting.value = false;
								teleportPhase.value = null;
								poofPositions.value = [];

								if (checkWinCondition()) {
									hasWon.value = true;
								}
							}, 200);
						}, 350);
					}, 200);
				} else {
					// No matching portal, just stay here
					if (checkWinCondition()) {
						hasWon.value = true;
					}
				}
			}, 200);
		} else {
			playerPosition.value = target;

			// Reset hop animation and play landing sound based on tile type
			setTimeout(() => {
				isHopping.value = false;
				if (landingTile?.type === TileType.GRASS) {
					playLand();
				} else if (landingTile?.type === TileType.DIRT) {
					playRandomDirt();
				} else if (landingTile?.type === TileType.STONE) {
					playStone();
				} else if (landingTile?.type === TileType.POND) {
					playWater();
				} else if (landingTile?.type === TileType.LOW_SAND) {
					playSandLand();
				} else if (landingTile?.type === TileType.HONEY) {
					playHoneyLand();
				}
			}, 200);

			if (checkWinCondition()) {
				hasWon.value = true;
			}
		}
	}

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
				if (
					tile.type === TileType.MUSHROOM ||
					tile.type === TileType.SAND_MUSHROOM ||
					tile.type === TileType.HONEY_MUSHROOM
				) {
					count++;
				}
			}
		}
		return count;
	});

	// Show hints when player is idle for 4+ seconds and remaining tiles < 8
	const IDLE_HINT_THRESHOLD = 4000; // 4 seconds
	const TILES_HINT_THRESHOLD = 8;

	const showHints = computed(() => {
		if (hasWon.value) return false;
		// Manual hint toggle overrides other conditions
		if (forceShowHints.value) return true;
		if (grassTilesRemaining.value >= TILES_HINT_THRESHOLD) return false;
		const idleTime = currentTime.value - lastMoveTime.value;
		return idleTime >= IDLE_HINT_THRESHOLD;
	});

	// Toggle manual hint display
	function toggleHints() {
		forceShowHints.value = !forceShowHints.value;
	}

	const canUndo = computed(() => moveHistory.value.length > 0);

	// Hint system - uses graph connectivity to find valid moves
	interface HintResult {
		hintTiles?: Position[];
		needsUndo?: boolean;
		stuckTiles?: Position[];
		unsure?: boolean; // Pathfinding took too long, not sure if current state is solvable
	}

	function getHint(): HintResult {
		// Check if player has already stranded some tiles (disconnected graph)
		if (hasUnreachableTiles()) {
			// Player is stuck - some tiles are unreachable, need to undo
			const pos = playerPosition.value;
			const adjacentTiles: Position[] = [];
			const dirs = [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: -1, y: 0 },
				{ x: 1, y: 0 },
			];
			for (const d of dirs) {
				const adjPos = { x: pos.x + d.x, y: pos.y + d.y };
				if (
					adjPos.x >= 0 &&
					adjPos.x < level.width &&
					adjPos.y >= 0 &&
					adjPos.y < level.height
				) {
					const tile = getTile(adjPos);
					if (tile && tile.type !== TileType.VOID) {
						adjacentTiles.push(adjPos);
					}
				}
			}
			return { needsUndo: true, stuckTiles: adjacentTiles };
		}

		// Find a complete winning path using DFS
		const { path: winningPath, timedOut } = findWinningPath();

		if (timedOut) {
			// Pathfinding took too long - we're not sure if the current state is solvable
			return { unsure: true };
		}

		if (winningPath && winningPath.length > 0) {
			// Return first 3 moves of the winning path as hints
			return { hintTiles: winningPath.slice(0, 3) };
		}

		// No valid path found - player is stuck and needs to undo
		const pos = playerPosition.value;
		const adjacentTiles: Position[] = [];
		const dirs = [
			{ x: 0, y: -1 },
			{ x: 0, y: 1 },
			{ x: -1, y: 0 },
			{ x: 1, y: 0 },
		];
		for (const d of dirs) {
			const adjPos = { x: pos.x + d.x, y: pos.y + d.y };
			if (
				adjPos.x >= 0 &&
				adjPos.x < level.width &&
				adjPos.y >= 0 &&
				adjPos.y < level.height
			) {
				const tile = getTile(adjPos);
				if (tile && tile.type !== TileType.VOID) {
					adjacentTiles.push(adjPos);
				}
			}
		}
		return { needsUndo: true, stuckTiles: adjacentTiles };
	}

	// Check if player is stuck (can't move in any direction)
	const isStuck = computed(() => {
		if (hasWon.value) return false;
		if (isTeleporting.value) return false; // Don't show stuck during teleport

		const currentPos = playerPosition.value;
		const currentTile = getTile(currentPos);

		// If landing on a portal (still hopping), not stuck - about to teleport
		// But after teleporting here, we should check if stuck normally
		if (currentTile && isPortalTile(currentTile.type) && isHopping.value) {
			const matchingPortal = findMatchingPortal(currentTile.type, currentPos);
			if (matchingPortal) return false;
		}

		// Try all four directions
		const directions: Direction[] = ["up", "down", "left", "right"];
		for (const direction of directions) {
			const targetPos = tryMove(direction);
			if (targetPos === null) continue;

			// Check if landing on water that loops back to current position
			const targetTile = getTile(targetPos);
			if (targetTile?.type === TileType.WATER) {
				const { destination } = computeSlideDestination(targetPos);
				// If water takes us back to where we started, this isn't a valid escape
				if (destination.x === currentPos.x && destination.y === currentPos.y) {
					continue;
				}
			}

			// Found a valid move that doesn't loop back
			return false;
		}
		return true; // Can't move anywhere useful
	});

	function undo() {
		if (moveHistory.value.length === 0) return;
		if (hasWon.value) return;

		const lastMove = moveHistory.value.pop();
		if (!lastMove) return;

		// Restore any additional changed tiles (e.g., portal conversions)
		if (lastMove.additionalChanges) {
			for (const change of lastMove.additionalChanges) {
				const row = tiles.value[change.position.y];
				const cell = row?.[change.position.x];
				if (cell) {
					cell.type = change.originalType;
				}
			}
		}

		// Restore lily-pad state from snapshot
		if (lastMove.lilypadSnapshot) {
			lilypadState.value = lastMove.lilypadSnapshot;
		}

		// Restore tide phase from snapshot
		if (lastMove.tidePhase !== undefined) {
			tidePhase.value = lastMove.tidePhase;
		}

		// Restore acorn count from snapshot
		if (lastMove.collectedAcorns !== undefined) {
			collectedAcorns.value = lastMove.collectedAcorns;
		}

		// Restore the tile at current position (remove mushroom if it was planted)
		// Stone tiles never have mushrooms planted, so only restore MUSHROOM -> GRASS,
		// SAND_MUSHROOM -> LOW_SAND, and HONEY_MUSHROOM -> HONEY
		const currentPos = playerPosition.value;
		const currentRow = tiles.value[currentPos.y];
		const currentCell = currentRow?.[currentPos.x];
		if (currentCell && currentCell.type === TileType.MUSHROOM) {
			currentCell.type = TileType.GRASS;
		} else if (currentCell && currentCell.type === TileType.SAND_MUSHROOM) {
			currentCell.type = TileType.LOW_SAND;
		} else if (currentCell && currentCell.type === TileType.HONEY_MUSHROOM) {
			currentCell.type = TileType.HONEY;
		}

		// Restore the previous position's tile state
		const prevRow = tiles.value[lastMove.playerPosition.y];
		const prevCell = prevRow?.[lastMove.playerPosition.x];
		if (prevCell) {
			prevCell.type = lastMove.tileState;
		}

		// Move player back
		playerPosition.value = lastMove.playerPosition;
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
		TIDE_PERIOD,
		// Acorn/squirrel state
		collectedAcorns,
		getSquirrelRequirement,
		acornPopupValue,
	};
}
