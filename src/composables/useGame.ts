import { computed, ref } from "vue";
import type {
	Direction,
	FlowDirection,
	Level,
	PortalType,
	Position,
	Tile,
} from "../types/game";
import { PortalTypes, TileType } from "../types/game";
import {
	playJump,
	playLand,
	playLilypadSink,
	playLilypadSurface,
	playRandomDirt,
	playRandomPop,
	playShovelDirt,
	playStone,
	playTeleportPoof,
	playWater,
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
}

export type FacingDirection = "left" | "right";
export type TeleportPhase = "shrinking" | "growing" | null;

export function useGame(level: Level) {
	const tiles = ref<Tile[][]>([]);
	const playerPosition = ref<Position>({ ...level.startPosition });
	const hasWon = ref(false);
	const isHopping = ref(false);
	const isSliding = ref(false);
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

	function canLandOn(position: Position): boolean {
		const tile = getTile(position);
		if (!tile) return false;

		// Pond tiles are landable only if lily-pad is surfaced
		if (tile.type === TileType.POND) {
			const key = `${position.x},${position.y}`;
			const state = lilypadState.value.get(key);
			return state ? !state.submerged : false;
		}

		// Can land on grass, stone, water, dirt, ice, or portal tiles
		return (
			tile.type === TileType.GRASS ||
			tile.type === TileType.STONE ||
			tile.type === TileType.WATER ||
			tile.type === TileType.DIRT ||
			tile.type === TileType.ICE ||
			isPortalTile(tile.type)
		);
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
		return (
			tile.type === TileType.BRAMBLE ||
			tile.type === TileType.MUSHROOM ||
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
	function getReachableTiles(
		fromPos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
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
				const isWalkable =
					adjType === TileType.GRASS ||
					adjType === TileType.DIRT ||
					adjType === TileType.STONE ||
					adjType === TileType.ICE ||
					adjType === TileType.WATER ||
					isPortalTile(adjType) ||
					(adjType === TileType.POND && !lilypads.get(adjKey)?.submerged);

				if (isWalkable && !reachable.has(adjKey)) {
					reachable.add(adjKey);
					queue.push(adjacent);
				}

				// Check if we can jump over an obstacle
				const isObstacle =
					adjType === TileType.BRAMBLE ||
					adjType === TileType.MUSHROOM ||
					adjType === TileType.POND_WATER ||
					(adjType === TileType.POND && lilypads.get(adjKey)?.submerged);

				if (isObstacle) {
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

					const isJumpLandable =
						jumpType === TileType.GRASS ||
						jumpType === TileType.DIRT ||
						jumpType === TileType.STONE ||
						jumpType === TileType.ICE ||
						jumpType === TileType.WATER ||
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

	// Check if all unvisited grass/dirt tiles are reachable from player position
	function isGraphConnected(
		playerPos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
	): boolean {
		const reachable = getReachableTiles(playerPos, tileStates, lilypads);

		// Check every grass/dirt tile is reachable
		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const t = row[x];
				if (t === TileType.GRASS || t === TileType.DIRT) {
					if (!reachable.has(`${x},${y}`)) {
						return false; // Found unreachable tile - graph is disconnected
					}
				}
			}
		}
		return true;
	}

	// Check if the given state is a win (all grass/dirt converted, player on last grass)
	function isWinState(tileStates: TileType[][], playerPos: Position): boolean {
		let grassCount = 0;
		let dirtCount = 0;
		let lastGrassPos: Position | null = null;

		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const t = row[x];
				if (t === TileType.GRASS) {
					grassCount++;
					lastGrassPos = { x, y };
				} else if (t === TileType.DIRT) {
					dirtCount++;
				}
			}
		}

		// Win when exactly 1 grass remains (player standing on it) and no dirt
		return (
			grassCount === 1 &&
			dirtCount === 0 &&
			lastGrassPos !== null &&
			lastGrassPos.x === playerPos.x &&
			lastGrassPos.y === playerPos.y
		);
	}

	// Count remaining grass and dirt tiles
	function countRemainingTiles(tileStates: TileType[][]): number {
		let count = 0;
		for (let y = 0; y < tileStates.length; y++) {
			const row = tileStates[y];
			if (!row) continue;
			for (let x = 0; x < row.length; x++) {
				const t = row[x];
				if (t === TileType.GRASS || t === TileType.DIRT) {
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

		// Get valid moves
		const moves = getValidMovesForPathfinding(pos, tileStates, lilypads);

		// Filter to moves that preserve connectivity
		const validMoves: {
			move: { target: Position; direction: Direction };
			simResult: {
				finalPos: Position;
				newTiles: TileType[][];
				newLilypads: Map<string, LilypadState>;
			};
		}[] = [];

		for (const move of moves) {
			const simResult = simulateMoveForPathfinding(
				pos,
				move,
				tileStates,
				lilypads,
			);

			// Check if graph remains connected
			if (
				isGraphConnected(
					simResult.finalPos,
					simResult.newTiles,
					simResult.newLilypads,
				)
			) {
				validMoves.push({ move, simResult });
			}
		}

		// Prioritize moves that go to required tiles (grass/dirt) and moves to tiles with fewer neighbors (forced moves)
		validMoves.sort((a, b) => {
			const aType = tileStates[a.move.target.y]?.[a.move.target.x];
			const bType = tileStates[b.move.target.y]?.[b.move.target.x];
			const aRequired = aType === TileType.GRASS || aType === TileType.DIRT;
			const bRequired = bType === TileType.GRASS || bType === TileType.DIRT;

			// Prioritize required tiles
			if (aRequired && !bRequired) return -1;
			if (!aRequired && bRequired) return 1;

			// Among required tiles, prioritize those with fewer escape routes (forced moves)
			if (aRequired && bRequired) {
				const aNeighbors = getValidMovesForPathfinding(
					a.move.target,
					a.simResult.newTiles,
					a.simResult.newLilypads,
				).length;
				const bNeighbors = getValidMovesForPathfinding(
					b.move.target,
					b.simResult.newTiles,
					b.simResult.newLilypads,
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
	function getValidMovesForPathfinding(
		pos: Position,
		tileStates: TileType[][],
		lilypads: Map<string, LilypadState>,
	): { target: Position; direction: Direction }[] {
		const moves: { target: Position; direction: Direction }[] = [];
		const directions: Direction[] = ["up", "down", "left", "right"];

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
				} else if (
					adjTileType === TileType.GRASS ||
					adjTileType === TileType.STONE ||
					adjTileType === TileType.WATER ||
					adjTileType === TileType.DIRT ||
					adjTileType === TileType.ICE ||
					(adjTileType && isPortalTile(adjTileType))
				) {
					moves.push({ target: adjacentPos, direction });
					continue;
				}

				// Check jump over obstacle
				const isAdjacentObstacle =
					adjTileType === TileType.BRAMBLE ||
					adjTileType === TileType.MUSHROOM ||
					adjTileType === TileType.POND_WATER ||
					(adjTileType === TileType.POND &&
						lilypads.get(`${adjacentPos.x},${adjacentPos.y}`)?.submerged);

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
							jumpTileType === TileType.GRASS ||
							jumpTileType === TileType.STONE ||
							jumpTileType === TileType.WATER ||
							jumpTileType === TileType.DIRT ||
							jumpTileType === TileType.ICE ||
							(jumpTileType && isPortalTile(jumpTileType))
						) {
							moves.push({ target: jumpPos, direction });
						}
					}
				}
			}
		}

		// Prioritize moves to grass/dirt tiles
		moves.sort((a, b) => {
			const aType = tileStates[a.target.y]?.[a.target.x];
			const bType = tileStates[b.target.y]?.[b.target.x];
			const aPriority =
				aType === TileType.GRASS || aType === TileType.DIRT ? 0 : 1;
			const bPriority =
				bType === TileType.GRASS || bType === TileType.DIRT ? 0 : 1;
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
	): {
		finalPos: Position;
		newTiles: TileType[][];
		newLilypads: Map<string, LilypadState>;
	} {
		// Clone state
		const newTileStates = tileStates.map((row) => [...row]);
		const newLilypads = new Map<string, LilypadState>();
		for (const [key, state] of lilypads) {
			newLilypads.set(key, { ...state });
		}

		// Simulate leaving current tile
		const currentTileType = newTileStates[pos.y]?.[pos.x];
		if (currentTileType === TileType.GRASS) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.MUSHROOM;
		} else if (currentTileType === TileType.DIRT) {
			const row = newTileStates[pos.y];
			if (row) row[pos.x] = TileType.GRASS;
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
			// Simulate ice slide
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
		}

		return { finalPos, newTiles: newTileStates, newLilypads };
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

		// If adjacent tile is an obstacle, check if we can jump over it
		if (isObstacle(adjacentPos)) {
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
		} else if (tile.type === TileType.DIRT) {
			// Dirt becomes grass (needs to be stepped on again)
			cell.type = TileType.GRASS;
			playShovelDirt();
			lastCleanedPosition.value = { ...position };
			// Clear after animation completes
			setTimeout(() => {
				lastCleanedPosition.value = null;
			}, 500);
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
	}

	function checkWinCondition(): boolean {
		// Win when standing on the only remaining grass tile and no dirt tiles remain
		let grassCount = 0;
		let dirtCount = 0;
		let lastGrassPos: Position | null = null;

		for (const row of tiles.value) {
			for (const tile of row) {
				if (tile.type === TileType.GRASS) {
					grassCount++;
					lastGrassPos = tile.position;
				} else if (tile.type === TileType.DIRT) {
					dirtCount++;
				}
			}
		}

		// Win if there's exactly one grass tile, no dirt tiles, and player is on the grass
		if (grassCount === 1 && dirtCount === 0 && lastGrassPos) {
			return (
				lastGrassPos.x === playerPosition.value.x &&
				lastGrassPos.y === playerPosition.value.y
			);
		}

		return false;
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

		// Save history before moving
		const currentPos = { ...playerPosition.value };
		moveHistory.value.push({
			playerPosition: currentPos,
			tileState: currentTile?.type ?? TileType.GRASS,
			lilypadSnapshot: cloneLilypadState(),
		});

		isHopping.value = true;
		plantMushroom(playerPosition.value);

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
							}

							if (checkWinCondition()) {
								hasWon.value = true;
							}
						}
					}
				}, 150); // Ice slide speed
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
							}

							if (checkWinCondition()) {
								hasWon.value = true;
							}
						}
					}
				}, 150); // Ice slide speed
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
				// Count grass and dirt tiles (dirt counts as 2 since it needs two visits)
				// Portal tiles don't count - they stay as portals and can be reused
				if (tile.type === TileType.GRASS) {
					count++;
				} else if (tile.type === TileType.DIRT) {
					count += 2; // Dirt needs two steps: dirt->grass->mushroom
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
				if (tile.type === TileType.MUSHROOM) {
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
		if (grassTilesRemaining.value >= TILES_HINT_THRESHOLD) return false;
		const idleTime = currentTime.value - lastMoveTime.value;
		return idleTime >= IDLE_HINT_THRESHOLD;
	});

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

		// Restore the tile at current position (remove mushroom if it was planted)
		// Stone tiles never have mushrooms planted, so only restore MUSHROOM -> GRASS
		const currentPos = playerPosition.value;
		const currentRow = tiles.value[currentPos.y];
		const currentCell = currentRow?.[currentPos.x];
		if (currentCell && currentCell.type === TileType.MUSHROOM) {
			currentCell.type = TileType.GRASS;
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
		cleanupIdleTimer,
		mushroomTileCount,
		hasUnreachableTiles,
		levelWidth: level.width,
		levelHeight: level.height,
	};
}
