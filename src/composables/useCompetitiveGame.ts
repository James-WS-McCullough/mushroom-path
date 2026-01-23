import { computed, ref, watch } from "vue";
import type { Direction, Level, Player, Position, Tile } from "../types/game";
import { TileType } from "../types/game";
import { ANIMATION } from "../constants/game";
import { getDirectionDelta } from "../utils/positionUtils";
import { playAcorn, playJump, playLand, playRandomPop } from "./useSound";

export type FacingDirection = "left" | "right";

/** Tiles that are always blocked (obstacles that can be jumped over) */
const BLOCKED_TILE_TYPES: readonly TileType[] = [
	TileType.VOID,
	TileType.BRAMBLE,
	TileType.MUSHROOM,
	TileType.MUSHROOM_RED,
	TileType.MUSHROOM_BLUE,
	TileType.SAND_MUSHROOM,
	TileType.HONEY_MUSHROOM,
	TileType.POND_WATER,
	TileType.SEA,
];

/** Check if a tile type is always blocked */
function isBlockedTileType(tileType: TileType): boolean {
	return (BLOCKED_TILE_TYPES as readonly TileType[]).includes(tileType);
}

/** Check if a tile is walkable */
function canWalkOn(tileType: TileType | undefined): boolean {
	if (!tileType) return false;
	if (isBlockedTileType(tileType)) return false;
	return true;
}

export function useCompetitiveGame(level: Level, aiEnabled = true) {
	const tiles = ref<Tile[][]>([]);

	// Player positions
	const player1Position = ref<Position>({ ...level.startPosition });
	// Player 2 starts on the opposite side of the board
	const player2StartPosition: Position = {
		x: level.width - 1 - level.startPosition.x,
		y: level.height - 1 - level.startPosition.y,
	};
	const player2Position = ref<Position>({ ...player2StartPosition });

	// Turn management
	const currentTurn = ref<Player>("player1");
	const coinFlipResult = ref<Player | null>(null);
	const showCoinFlip = ref(true);

	// Scores (mushroom counts)
	const player1Score = ref(0);
	const player2Score = ref(0);

	// Extra turns from mushroom bags
	const player1ExtraTurns = ref(0);
	const player2ExtraTurns = ref(0);

	// AI control
	const isAiEnabled = ref(aiEnabled);
	const isAiThinking = ref(false);

	// Stuck state
	const player1Stuck = ref(false);
	const player2Stuck = ref(false);

	// Game over
	const gameOver = ref(false);
	const winner = ref<Player | "tie" | null>(null);

	// Animation states for player 1
	const player1Hopping = ref(false);
	const player1Facing = ref<FacingDirection>("left");

	// Animation states for player 2
	const player2Hopping = ref(false);
	const player2Facing = ref<FacingDirection>("right");

	// Track last planted mushroom for animation
	const lastPlantedPosition = ref<Position | null>(null);

	// Level dimensions
	const levelWidth = level.width;
	const levelHeight = level.height;

	function initializeGame() {
		// Initialize tiles from level grid
		tiles.value = level.grid.map((row, y) =>
			row.map((type, x) => ({
				type,
				position: { x, y },
			})),
		);

		// Reset player positions
		player1Position.value = { ...level.startPosition };
		player2Position.value = { ...player2StartPosition };

		// Flip coin to determine who goes first
		coinFlipResult.value = Math.random() < 0.5 ? "player1" : "player2";
		currentTurn.value = coinFlipResult.value;
		showCoinFlip.value = true;

		// Reset scores and extra turns
		player1Score.value = 0;
		player2Score.value = 0;
		player1ExtraTurns.value = 0;
		player2ExtraTurns.value = 0;

		// Reset stuck states
		player1Stuck.value = false;
		player2Stuck.value = false;

		// Reset game over
		gameOver.value = false;
		winner.value = null;

		// Check initial stuck states
		checkStuckStates();
	}

	function dismissCoinFlip() {
		showCoinFlip.value = false;
	}

	function getTile(pos: Position): Tile | undefined {
		if (pos.x < 0 || pos.x >= levelWidth || pos.y < 0 || pos.y >= levelHeight) {
			return undefined;
		}
		return tiles.value[pos.y]?.[pos.x];
	}

	function setTileType(pos: Position, type: TileType): void {
		const tile = getTile(pos);
		if (tile) {
			tile.type = type;
		}
	}

	function getValidMoves(playerPos: Position, otherPlayerPos: Position): Position[] {
		const validMoves: Position[] = [];
		const directions: Direction[] = ["up", "down", "left", "right"];

		for (const dir of directions) {
			const delta = getDirectionDelta(dir);

			// Check adjacent tile (walk)
			const adjacent: Position = {
				x: playerPos.x + delta.x,
				y: playerPos.y + delta.y,
			};

			const adjacentTile = getTile(adjacent);
			if (adjacentTile && canWalkOn(adjacentTile.type)) {
				// Can't walk onto the other player's position
				if (adjacent.x !== otherPlayerPos.x || adjacent.y !== otherPlayerPos.y) {
					validMoves.push(adjacent);
				}
			}

			// Check jump tile (2 tiles away over obstacle)
			const jumpOver: Position = adjacent;
			const jumpTarget: Position = {
				x: playerPos.x + delta.x * 2,
				y: playerPos.y + delta.y * 2,
			};

			const jumpOverTile = getTile(jumpOver);
			const jumpTargetTile = getTile(jumpTarget);

			// Can jump if: middle tile is blocked AND target tile is walkable
			if (
				jumpOverTile &&
				isBlockedTileType(jumpOverTile.type) &&
				jumpTargetTile &&
				canWalkOn(jumpTargetTile.type)
			) {
				// Can't jump onto the other player's position
				if (jumpTarget.x !== otherPlayerPos.x || jumpTarget.y !== otherPlayerPos.y) {
					validMoves.push(jumpTarget);
				}
			}
		}

		return validMoves;
	}

	function checkStuckStates(): void {
		const p1Moves = getValidMoves(player1Position.value, player2Position.value);
		const p2Moves = getValidMoves(player2Position.value, player1Position.value);

		player1Stuck.value = p1Moves.length === 0;
		player2Stuck.value = p2Moves.length === 0;

		// Check for game over
		if (player1Stuck.value && player2Stuck.value) {
			gameOver.value = true;
			if (player1Score.value > player2Score.value) {
				winner.value = "player1";
			} else if (player2Score.value > player1Score.value) {
				winner.value = "player2";
			} else {
				winner.value = "tie";
			}
		}
	}

	function plantMushroom(pos: Position, player: Player): void {
		const tile = getTile(pos);
		if (!tile) return;

		// Only plant on grass tiles
		if (tile.type === TileType.GRASS) {
			const mushroomType = player === "player1" ? TileType.MUSHROOM_RED : TileType.MUSHROOM_BLUE;
			setTileType(pos, mushroomType);
			playRandomPop();

			// Set last planted position for animation
			lastPlantedPosition.value = { ...pos };
			// Clear after animation completes
			setTimeout(() => {
				if (lastPlantedPosition.value?.x === pos.x && lastPlantedPosition.value?.y === pos.y) {
					lastPlantedPosition.value = null;
				}
			}, 400);

			// Update score
			if (player === "player1") {
				player1Score.value++;
			} else {
				player2Score.value++;
			}
		}
	}

	function tryMove(targetPos: Position): boolean {
		if (gameOver.value || showCoinFlip.value) return false;

		const isPlayer1Turn = currentTurn.value === "player1";
		const currentPos = isPlayer1Turn ? player1Position.value : player2Position.value;
		const otherPos = isPlayer1Turn ? player2Position.value : player1Position.value;
		const isStuck = isPlayer1Turn ? player1Stuck.value : player2Stuck.value;

		if (isStuck) return false;

		// Check if target is a valid move
		const validMoves = getValidMoves(currentPos, otherPos);
		const isValidMove = validMoves.some(
			(m) => m.x === targetPos.x && m.y === targetPos.y,
		);

		if (!isValidMove) return false;

		// Execute the move
		executeMove(targetPos, isPlayer1Turn);
		return true;
	}

	function executeMove(targetPos: Position, isPlayer1: boolean): void {
		const currentPos = isPlayer1 ? player1Position.value : player2Position.value;
		const player: Player = isPlayer1 ? "player1" : "player2";

		// Check if this is a jump (2 tiles) or walk (1 tile)
		const dx = Math.abs(targetPos.x - currentPos.x);
		const dy = Math.abs(targetPos.y - currentPos.y);
		const isJump = dx === 2 || dy === 2;

		// Update facing direction
		if (targetPos.x > currentPos.x) {
			if (isPlayer1) {
				player1Facing.value = "right";
			} else {
				player2Facing.value = "right";
			}
		} else if (targetPos.x < currentPos.x) {
			if (isPlayer1) {
				player1Facing.value = "left";
			} else {
				player2Facing.value = "left";
			}
		}

		// Start hop animation
		if (isPlayer1) {
			player1Hopping.value = true;
		} else {
			player2Hopping.value = true;
		}

		// Only play jump sound when actually jumping over a tile
		if (isJump) {
			playJump();
		}

		// Plant mushroom on the tile we're leaving
		plantMushroom(currentPos, player);

		// Move player
		if (isPlayer1) {
			player1Position.value = { ...targetPos };
		} else {
			player2Position.value = { ...targetPos };
		}

		// Check if landed on mushroom bag
		const targetTile = getTile(targetPos);
		if (targetTile?.type === TileType.MUSHROOM_BAG) {
			// Collect bag - gives +2 extra turns
			if (isPlayer1) {
				player1ExtraTurns.value += 2;
			} else {
				player2ExtraTurns.value += 2;
			}
			// Remove bag and replace with grass
			setTileType(targetPos, TileType.GRASS);
			playAcorn(); // Use acorn sound for pickup
		}

		// End hop animation after delay
		setTimeout(() => {
			if (isPlayer1) {
				player1Hopping.value = false;
			} else {
				player2Hopping.value = false;
			}
			playLand();

			// Handle turn switching with extra turns
			handleTurnSwitch(isPlayer1);

			// Check stuck states
			checkStuckStates();

			// If the new current player is stuck but the other isn't, skip their turn
			skipStuckTurns();

			// Trigger AI move if it's AI's turn
			if (isAiEnabled.value && currentTurn.value === "player2" && !player2Stuck.value && !gameOver.value) {
				scheduleAiMove();
			}
		}, ANIMATION.HOP_DURATION);
	}

	function handleTurnSwitch(wasPlayer1: boolean): void {
		if (wasPlayer1) {
			// Player 1 just moved
			if (player1ExtraTurns.value > 0) {
				// Player 1 has extra turns, use one
				player1ExtraTurns.value--;
				// Stay on player 1's turn
			} else {
				// Switch to player 2
				currentTurn.value = "player2";
			}
		} else {
			// Player 2 just moved
			if (player2ExtraTurns.value > 0) {
				// Player 2 has extra turns, use one
				player2ExtraTurns.value--;
				// Stay on player 2's turn
			} else {
				// Switch to player 1
				currentTurn.value = "player1";
			}
		}
	}

	function skipStuckTurns(): void {
		// If current player is stuck but other isn't, switch turns
		const isPlayer1Turn = currentTurn.value === "player1";
		const currentStuck = isPlayer1Turn ? player1Stuck.value : player2Stuck.value;
		const otherStuck = isPlayer1Turn ? player2Stuck.value : player1Stuck.value;

		if (currentStuck && !otherStuck) {
			currentTurn.value = isPlayer1Turn ? "player2" : "player1";
		}
	}

	function handleClick(pos: Position): void {
		// Block input if AI is controlling player 2
		if (isAiEnabled.value && currentTurn.value === "player2") return;
		tryMove(pos);
	}

	function handleKeyDown(e: KeyboardEvent): void {
		if (gameOver.value || showCoinFlip.value) return;

		// Block input if AI is controlling player 2
		if (isAiEnabled.value && currentTurn.value === "player2") return;

		const isPlayer1Turn = currentTurn.value === "player1";
		const currentPos = isPlayer1Turn ? player1Position.value : player2Position.value;

		let direction: Direction | null = null;

		switch (e.key) {
			case "ArrowUp":
			case "w":
			case "W":
				direction = "up";
				break;
			case "ArrowDown":
			case "s":
			case "S":
				direction = "down";
				break;
			case "ArrowLeft":
			case "a":
			case "A":
				direction = "left";
				break;
			case "ArrowRight":
			case "d":
			case "D":
				direction = "right";
				break;
		}

		if (direction) {
			e.preventDefault();
			const delta = getDirectionDelta(direction);

			// Try adjacent first
			const adjacent: Position = {
				x: currentPos.x + delta.x,
				y: currentPos.y + delta.y,
			};

			if (!tryMove(adjacent)) {
				// Try jump
				const jump: Position = {
					x: currentPos.x + delta.x * 2,
					y: currentPos.y + delta.y * 2,
				};
				tryMove(jump);
			}
		}
	}

	// Computed values for template
	const isPlayer1Turn = computed(() => currentTurn.value === "player1");
	const isPlayer2Turn = computed(() => currentTurn.value === "player2");

	// Get valid moves for highlighting
	const currentValidMoves = computed(() => {
		if (gameOver.value || showCoinFlip.value) return [];

		const isP1 = currentTurn.value === "player1";
		const currentPos = isP1 ? player1Position.value : player2Position.value;
		const otherPos = isP1 ? player2Position.value : player1Position.value;

		return getValidMoves(currentPos, otherPos);
	});

	// =============================================================================
	// AI LOGIC
	// =============================================================================

	function scheduleAiMove(): void {
		if (isAiThinking.value) return;
		isAiThinking.value = true;

		// Add a small delay to make AI feel more natural
		setTimeout(() => {
			makeAiMove();
			isAiThinking.value = false;
		}, 400 + Math.random() * 300);
	}

	function makeAiMove(): void {
		if (gameOver.value || currentTurn.value !== "player2" || player2Stuck.value) return;

		const validMoves = getValidMoves(player2Position.value, player1Position.value);
		if (validMoves.length === 0) return;

		// AI Strategy:
		// 1. Prioritize mushroom bags
		// 2. Then prefer moves that give access to more grass tiles
		// 3. Avoid getting cornered

		const scoredMoves = validMoves.map((move) => {
			let score = 0;
			const tile = getTile(move);

			// High priority: Mushroom bags
			if (tile?.type === TileType.MUSHROOM_BAG) {
				score += 100;
			}

			// Count how many grass tiles are adjacent to this position
			const futureMoves = getValidMoves(move, player1Position.value);
			score += futureMoves.length * 10;

			// Slight preference for tiles that give more grass coverage
			const grassCount = countAdjacentGrass(move);
			score += grassCount * 5;

			// Small random factor to add variety
			score += Math.random() * 3;

			return { move, score };
		});

		// Sort by score (highest first) and pick the best
		scoredMoves.sort((a, b) => b.score - a.score);
		const bestMove = scoredMoves[0]?.move;

		if (bestMove) {
			tryMove(bestMove);
		}
	}

	function countAdjacentGrass(pos: Position): number {
		const directions: Direction[] = ["up", "down", "left", "right"];
		let count = 0;

		for (const dir of directions) {
			const delta = getDirectionDelta(dir);
			const adjacent: Position = {
				x: pos.x + delta.x,
				y: pos.y + delta.y,
			};
			const tile = getTile(adjacent);
			if (tile?.type === TileType.GRASS || tile?.type === TileType.MUSHROOM_BAG) {
				count++;
			}
		}

		return count;
	}

	// Watch for coin flip dismissal to trigger AI if it goes first
	watch(showCoinFlip, (showing) => {
		if (!showing && isAiEnabled.value && currentTurn.value === "player2" && !player2Stuck.value) {
			scheduleAiMove();
		}
	});

	// Initialize
	initializeGame();

	return {
		tiles,
		levelWidth,
		levelHeight,

		player1Position,
		player2Position,

		currentTurn,
		isPlayer1Turn,
		isPlayer2Turn,

		coinFlipResult,
		showCoinFlip,
		dismissCoinFlip,

		player1Score,
		player2Score,

		player1ExtraTurns,
		player2ExtraTurns,

		player1Stuck,
		player2Stuck,

		player1Hopping,
		player1Facing,
		player2Hopping,
		player2Facing,

		lastPlantedPosition,

		gameOver,
		winner,

		currentValidMoves,

		isAiEnabled,
		isAiThinking,

		handleClick,
		handleKeyDown,
		initializeGame,
	};
}
