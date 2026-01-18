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

interface MoveHistory {
	playerPosition: Position;
	tileState: TileType; // The tile type at the position player left (before mushroom planted)
	additionalChanges?: ChangedTile[]; // For tracking portal conversions, etc.
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
		return tile.type === TileType.BRAMBLE || tile.type === TileType.MUSHROOM;
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

			// Stop if we hit an obstacle (bramble, mushroom) or void
			if (
				nextTile.type === TileType.BRAMBLE ||
				nextTile.type === TileType.MUSHROOM ||
				nextTile.type === TileType.VOID
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
		}
		// Portal tiles stay as portals - they can be used multiple times
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
		getWaterFlow,
		showHints,
		cleanupIdleTimer,
		levelWidth: level.width,
		levelHeight: level.height,
	};
}
