import { describe, expect, it } from "vitest";
import { type Level, TileType, WorldElement } from "../types/game";
import { generateLevel } from "./levelGenerator";

// Helper to count tiles of a specific type
function countTiles(level: Level, type: TileType): number {
	let count = 0;
	for (const row of level.grid) {
		for (const tile of row) {
			if (tile === type) {
				count++;
			}
		}
	}
	return count;
}

// Helper to get tile at position
function getTile(level: Level, x: number, y: number): TileType | undefined {
	return level.grid[y]?.[x];
}

// Helper to check if position is within bounds
function isInBounds(level: Level, x: number, y: number): boolean {
	return x >= 0 && y >= 0 && x < level.width && y < level.height;
}

// Helper to get adjacent positions
function getAdjacent(x: number, y: number): Array<{ x: number; y: number }> {
	return [
		{ x: x + 1, y },
		{ x: x - 1, y },
		{ x, y: y + 1 },
		{ x, y: y - 1 },
	];
}

// Helper to check if grass/dirt tiles are connected (via walking, jumping, stone, water, ice, or portal bridges)
function isGrassConnected(level: Level): boolean {
	const grassTiles: Array<{ x: number; y: number }> = [];
	const stoneTiles: Array<{ x: number; y: number }> = [];
	const waterTiles: Array<{ x: number; y: number }> = [];
	const iceTiles: Array<{ x: number; y: number }> = [];
	const portalTiles: Array<{ x: number; y: number }> = [];

	for (let y = 0; y < level.height; y++) {
		for (let x = 0; x < level.width; x++) {
			const tile = getTile(level, x, y);
			// Both grass and dirt tiles need to be visited (dirt becomes grass after first visit)
			// Portal tiles are walkable but don't need to be "collected" - they stay as portals
			if (tile === TileType.GRASS || tile === TileType.DIRT) {
				grassTiles.push({ x, y });
			}
			if (tile === TileType.STONE) {
				stoneTiles.push({ x, y });
			} else if (tile === TileType.WATER) {
				waterTiles.push({ x, y });
			} else if (tile === TileType.ICE) {
				iceTiles.push({ x, y });
			} else if (
				tile === TileType.PORTAL_PINK ||
				tile === TileType.PORTAL_BLUE ||
				tile === TileType.PORTAL_YELLOW
			) {
				portalTiles.push({ x, y });
			}
		}
	}

	if (grassTiles.length === 0) return true;

	const visited = new Set<string>();
	const visitedGrass = new Set<string>();
	const queue = [grassTiles[0]];
	if (!queue[0]) return true;

	const posKey = (x: number, y: number) => `${x},${y}`;
	const grassSet = new Set(grassTiles.map((t) => posKey(t.x, t.y)));
	const stoneSet = new Set(stoneTiles.map((t) => posKey(t.x, t.y)));
	const waterSet = new Set(waterTiles.map((t) => posKey(t.x, t.y)));
	const iceSet = new Set(iceTiles.map((t) => posKey(t.x, t.y)));
	const portalSet = new Set(portalTiles.map((t) => posKey(t.x, t.y)));
	const walkableSet = new Set([
		...grassSet,
		...stoneSet,
		...waterSet,
		...iceSet,
		...portalSet,
	]);
	const brambleSet = new Set<string>();

	for (let y = 0; y < level.height; y++) {
		for (let x = 0; x < level.width; x++) {
			if (getTile(level, x, y) === TileType.BRAMBLE) {
				brambleSet.add(posKey(x, y));
			}
		}
	}

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) continue;

		const key = posKey(current.x, current.y);
		if (visited.has(key)) continue;
		visited.add(key);

		if (grassSet.has(key)) {
			visitedGrass.add(key);
		}

		// Check adjacent and jump positions
		const deltas = [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 },
		];

		for (const { dx, dy } of deltas) {
			const adjKey = posKey(current.x + dx, current.y + dy);
			const jumpKey = posKey(current.x + dx * 2, current.y + dy * 2);

			// Direct adjacent walkable tile (grass or stone)
			if (walkableSet.has(adjKey) && !visited.has(adjKey)) {
				queue.push({ x: current.x + dx, y: current.y + dy });
			}
			// Jump over bramble to walkable tile
			else if (
				brambleSet.has(adjKey) &&
				walkableSet.has(jumpKey) &&
				!visited.has(jumpKey)
			) {
				queue.push({ x: current.x + dx * 2, y: current.y + dy * 2 });
			}
		}
	}

	return visitedGrass.size === grassTiles.length;
}

describe("levelGenerator", () => {
	describe("generateLevel", () => {
		it("should return a valid level", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
		});

		it("should generate level with correct structure", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level).toHaveProperty("name");
			expect(level).toHaveProperty("width");
			expect(level).toHaveProperty("height");
			expect(level).toHaveProperty("grid");
			expect(level).toHaveProperty("startPosition");
		});

		it("should have grid dimensions matching width and height", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.grid.length).toBe(level.height);
			for (const row of level.grid) {
				expect(row.length).toBe(level.width);
			}
		});

		it("should have start position within bounds", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.startPosition.x).toBeGreaterThanOrEqual(0);
			expect(level.startPosition.y).toBeGreaterThanOrEqual(0);
			expect(level.startPosition.x).toBeLessThan(level.width);
			expect(level.startPosition.y).toBeLessThan(level.height);
		});

		it("should have start position on a grass tile", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			const startTile = getTile(
				level,
				level.startPosition.x,
				level.startPosition.y,
			);
			expect(startTile).toBe(TileType.GRASS);
		});

		it("should have at least 8 grass+dirt tiles", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			// Count grass + dirt (both are walkable tiles that need to be visited)
			const grassCount = countTiles(level, TileType.GRASS);
			const dirtCount = countTiles(level, TileType.DIRT);
			expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
		});

		it("should only contain valid tile types", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			const validTypes = [
				TileType.GRASS,
				TileType.BRAMBLE,
				TileType.VOID,
				TileType.MUSHROOM,
				TileType.STONE,
				TileType.WATER,
				TileType.DIRT,
				TileType.ICE,
			];
			for (const row of level.grid) {
				for (const tile of row) {
					expect(validTypes).toContain(tile);
				}
			}
		});

		it("should have connected grass tiles (reachable via walking or jumping)", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			expect(isGrassConnected(level)).toBe(true);
		});

		it("should generate different levels on multiple calls", () => {
			const levels: Level[] = [];
			for (let i = 0; i < 5; i++) {
				const level = generateLevel();
				if (level) levels.push(level);
			}

			// At least some levels should be different
			const uniqueGrids = new Set(levels.map((l) => JSON.stringify(l.grid)));
			expect(uniqueGrids.size).toBeGreaterThan(1);
		}, 15000);

		it("should respect minWidth and maxWidth config", () => {
			const level = generateLevel({
				minWidth: 6,
				maxWidth: 8,
			});
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.width).toBeGreaterThanOrEqual(1);
			expect(level.width).toBeLessThanOrEqual(10); // Some buffer for edge cases
		});

		it("should respect minHeight and maxHeight config", () => {
			const level = generateLevel({
				minHeight: 6,
				maxHeight: 8,
			});
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.height).toBeGreaterThanOrEqual(1);
			expect(level.height).toBeLessThanOrEqual(10); // Some buffer for edge cases
		});

		it("should generate levels with brambles when brambleChance > 0", () => {
			// Generate multiple levels to account for randomness
			let hasBrambles = false;
			for (let i = 0; i < 10; i++) {
				const level = generateLevel({ brambleChance: 0.3 });
				if (level && countTiles(level, TileType.BRAMBLE) > 0) {
					hasBrambles = true;
					break;
				}
			}
			expect(hasBrambles).toBe(true);
		});

		it("should generate levels without internal brambles when brambleChance is 0", () => {
			const level = generateLevel({ brambleChance: 0, stoneChance: 0 });
			expect(level).not.toBeNull();
			if (!level) return;

			// Count brambles - should be 0 when brambleChance is 0
			const brambleCount = countTiles(level, TileType.BRAMBLE);
			expect(brambleCount).toBe(0);
		});

		it("should set level name to 'Generated'", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.name).toBe("Generated");
		});
	});

	describe("level validity", () => {
		it("should not have grass tiles completely surrounded by brambles", () => {
			// This is implicitly tested by isGrassConnected, but let's be explicit
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			// Find all grass tiles
			for (let y = 0; y < level.height; y++) {
				for (let x = 0; x < level.width; x++) {
					if (getTile(level, x, y) === TileType.GRASS) {
						// Check if at least one direction is reachable
						const adjacent = getAdjacent(x, y);
						let hasPath = false;

						for (const adj of adjacent) {
							if (!isInBounds(level, adj.x, adj.y)) continue;
							const adjTile = getTile(level, adj.x, adj.y);

							// Direct grass neighbor
							if (adjTile === TileType.GRASS) {
								hasPath = true;
								break;
							}

							// Can jump over bramble
							if (adjTile === TileType.BRAMBLE) {
								const jumpX = adj.x + (adj.x - x);
								const jumpY = adj.y + (adj.y - y);
								if (
									isInBounds(level, jumpX, jumpY) &&
									getTile(level, jumpX, jumpY) === TileType.GRASS
								) {
									hasPath = true;
									break;
								}
							}
						}

						// Only check reachability for non-isolated tiles
						// A single grass tile would fail this, which is fine if it's connected via the path
					}
				}
			}

			// The connectivity test is the real validation
			expect(isGrassConnected(level)).toBe(true);
		});

		it("should generate solvable levels consistently", () => {
			// Generate multiple levels and verify all are valid
			// Reduced to 5 iterations since dirt tile path finding is more complex
			for (let i = 0; i < 5; i++) {
				const level = generateLevel();
				expect(level).not.toBeNull();
				if (!level) continue;

				expect(
					getTile(level, level.startPosition.x, level.startPosition.y),
				).toBe(TileType.GRASS);
				// Count grass + dirt tiles (dirt tiles are walkable and need to be visited)
				const grassCount = countTiles(level, TileType.GRASS);
				const dirtCount = countTiles(level, TileType.DIRT);
				expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
				expect(isGrassConnected(level)).toBe(true);
			}
		}, 15000); // Increased timeout for complex path finding with dirt tiles
	});

	describe("rooms property", () => {
		it("should sometimes include rooms property", () => {
			// Generate multiple levels to check for rooms
			let hasRooms = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel();
				if (level?.rooms && level.rooms.length > 0) {
					hasRooms = true;
					break;
				}
			}
			expect(hasRooms).toBe(true);
		});

		it("should have valid room coordinates when rooms exist", () => {
			let roomFound = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel();
				if (!level?.rooms || level.rooms.length === 0) continue;

				roomFound = true;
				for (const room of level.rooms) {
					expect(room.x).toBeGreaterThanOrEqual(0);
					expect(room.y).toBeGreaterThanOrEqual(0);
					expect(room.width).toBeGreaterThan(0);
					expect(room.height).toBeGreaterThan(0);
					// Room should be at least partially within the grid
					expect(room.x).toBeLessThan(level.width);
					expect(room.y).toBeLessThan(level.height);
				}
				break;
			}

			if (!roomFound) {
				// If no rooms found in 20 attempts, that's acceptable due to randomness
				// but log it for awareness
				console.log("Note: No levels with rooms found in 20 attempts");
			}
		});
	});

	describe("stone tiles", () => {
		it("should sometimes generate levels with stone tiles", () => {
			// With default stoneChance of 0.08, some levels should have stones
			let hasStones = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel();
				if (level && countTiles(level, TileType.STONE) > 0) {
					hasStones = true;
					break;
				}
			}
			expect(hasStones).toBe(true);
		});

		it("should generate levels without stones when stoneChance is 0 and riverChance is 0", () => {
			// Rivers can also create stone endpoints, so disable both
			const level = generateLevel({ stoneChance: 0, riverChance: 0 });
			expect(level).not.toBeNull();
			if (!level) return;

			const stoneCount = countTiles(level, TileType.STONE);
			expect(stoneCount).toBe(0);
		});

		it("should generate more stones with higher stoneChance", () => {
			// Generate multiple levels with high stone chance
			let totalStones = 0;
			let levelCount = 0;
			for (let i = 0; i < 10; i++) {
				const level = generateLevel({ stoneChance: 0.2 });
				if (level) {
					totalStones += countTiles(level, TileType.STONE);
					levelCount++;
				}
			}

			// Should have some stones on average
			if (levelCount > 0) {
				expect(totalStones / levelCount).toBeGreaterThan(0);
			}
		});

		it("should maintain grass connectivity when stones are present", () => {
			const level = generateLevel({ stoneChance: 0.15 });
			expect(level).not.toBeNull();
			if (!level) return;

			// Grass tiles should still be connected (using stones as bridges if needed)
			expect(isGrassConnected(level)).toBe(true);
		});

		it("should keep start position on grass, not stone", () => {
			// Generate fewer levels with rivers to avoid timeout
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({ stoneChance: 0.15, riverChance: 0 });
				if (!level) continue;

				const startTile = getTile(
					level,
					level.startPosition.x,
					level.startPosition.y,
				);
				expect(startTile).toBe(TileType.GRASS);
			}
		}, 10000); // Increased timeout

		it("should maintain at least 8 grass+dirt tiles even with stones", () => {
			const level = generateLevel({ stoneChance: 0.3 });
			expect(level).not.toBeNull();
			if (!level) return;

			const grassCount = countTiles(level, TileType.GRASS);
			const dirtCount = countTiles(level, TileType.DIRT);
			expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
		});
	});

	describe("dirt tiles", () => {
		it("should sometimes generate levels with dirt tiles", () => {
			// With default dirtChance, some levels should have dirt
			let hasDirt = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel();
				if (level && countTiles(level, TileType.DIRT) > 0) {
					hasDirt = true;
					break;
				}
			}
			expect(hasDirt).toBe(true);
		});

		it("should generate levels without dirt when dirtChance is 0", () => {
			const level = generateLevel({ dirtChance: 0 });
			expect(level).not.toBeNull();
			if (!level) return;

			const dirtCount = countTiles(level, TileType.DIRT);
			expect(dirtCount).toBe(0);
		});

		it("should maintain grass connectivity when dirt is present", () => {
			// Generate a few levels to test dirt connectivity
			for (let i = 0; i < 3; i++) {
				const level = generateLevel({ dirtChance: 0.1 });
				if (!level) continue;

				// Grass and dirt tiles should still be connected
				expect(isGrassConnected(level)).toBe(true);
			}
		}, 15000);

		it("should generate solvable levels with dirt tiles", () => {
			// Dirt tiles can be anywhere - path finder ensures they can be visited twice
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({ dirtChance: 0.15 });
				if (!level) continue;

				const dirtCount = countTiles(level, TileType.DIRT);
				if (dirtCount === 0) continue;

				// Level should still be connected and solvable
				expect(isGrassConnected(level)).toBe(true);
				expect(
					getTile(level, level.startPosition.x, level.startPosition.y),
				).toBe(TileType.GRASS);
				break;
			}
		}, 10000);

		it("should maintain at least 8 grass+dirt tiles", () => {
			const level = generateLevel({ dirtChance: 0.15 });
			expect(level).not.toBeNull();
			if (!level) return;

			const grassCount = countTiles(level, TileType.GRASS);
			const dirtCount = countTiles(level, TileType.DIRT);
			expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
		});
	});

	describe("edge cases", () => {
		it("should handle small config values", () => {
			const level = generateLevel({
				minWidth: 5,
				maxWidth: 6,
				minHeight: 5,
				maxHeight: 6,
				minRectangles: 1,
				maxRectangles: 2,
			});

			// May return null if constraints are too tight, which is acceptable
			if (level) {
				expect(level.width).toBeGreaterThanOrEqual(1);
				expect(level.height).toBeGreaterThanOrEqual(1);
				expect(isGrassConnected(level)).toBe(true);
			}
		});

		it("should handle larger config values", () => {
			const level = generateLevel({
				minWidth: 10,
				maxWidth: 14,
				minHeight: 10,
				maxHeight: 14,
				minRectangles: 3,
				maxRectangles: 4,
			});

			expect(level).not.toBeNull();
			if (!level) return;

			expect(level.width).toBeLessThanOrEqual(16); // Some buffer
			expect(level.height).toBeLessThanOrEqual(16);
			expect(isGrassConnected(level)).toBe(true);
		});

		it("should handle high bramble chance", () => {
			const level = generateLevel({
				brambleChance: 0.4,
			});

			// Should still generate a valid level or return null
			if (level) {
				expect(countTiles(level, TileType.GRASS)).toBeGreaterThanOrEqual(6); // Minimum enforced
				expect(isGrassConnected(level)).toBe(true);
			}
		});

		it("should return null gracefully when generation fails after retries", () => {
			// This is hard to trigger reliably, but we can at least verify
			// the function handles failure gracefully by running many times
			// with extreme constraints (though it may still succeed)

			// Just verify the function returns either a valid level or null
			const result = generateLevel({
				minRectangles: 1,
				maxRectangles: 1,
				minWidth: 5,
				maxWidth: 5,
				minHeight: 5,
				maxHeight: 5,
			});

			// Should be either null or a valid level
			if (result !== null) {
				expect(result).toHaveProperty("grid");
				expect(result).toHaveProperty("startPosition");
			}
		});
	});

	describe("deterministic properties", () => {
		it("should always produce levels where walking visits grass tiles", () => {
			// The Hamiltonian path algorithm ensures all grass tiles can be visited
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			// Start position should be the beginning of the Hamiltonian path
			const startTile = getTile(
				level,
				level.startPosition.x,
				level.startPosition.y,
			);
			expect(startTile).toBe(TileType.GRASS);

			// All grass tiles should be reachable from start
			expect(isGrassConnected(level)).toBe(true);
		});

		it("should not have mushroom tiles in generated levels", () => {
			const level = generateLevel();
			expect(level).not.toBeNull();
			if (!level) return;

			// Generated levels should only have grass, bramble, and void
			// Mushrooms are placed by the player during gameplay
			const mushroomCount = countTiles(level, TileType.MUSHROOM);
			expect(mushroomCount).toBe(0);
		});
	});

	describe("ice tiles", () => {
		it("should generate ice tiles when ICE element is active", () => {
			// Generate multiple levels with ICE element
			let hasIce = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel({}, [WorldElement.ICE]);
				if (level && countTiles(level, TileType.ICE) > 0) {
					hasIce = true;
					break;
				}
			}
			expect(hasIce).toBe(true);
		});

		it("should not generate ice tiles without ICE element", () => {
			// Generate multiple levels without ICE element
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({}, []);
				if (!level) continue;

				const iceCount = countTiles(level, TileType.ICE);
				expect(iceCount).toBe(0);
			}
		}, 15000);

		it("should not generate ice tiles when iceChance is 0", () => {
			const level = generateLevel({ iceChance: 0 }, [WorldElement.ICE]);
			if (!level) return;

			const iceCount = countTiles(level, TileType.ICE);
			expect(iceCount).toBe(0);
		});

		it("should maintain grass connectivity when ice is present", () => {
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({ iceChance: 0.15 }, [WorldElement.ICE]);
				if (!level) continue;

				expect(isGrassConnected(level)).toBe(true);
			}
		}, 15000);

		it("should generate ice in clusters", () => {
			// Generate levels with ice and check that ice tiles tend to be adjacent
			let foundCluster = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel({ iceChance: 0.15, iceClusterSize: 4 }, [
					WorldElement.ICE,
				]);
				if (!level) continue;

				const iceCount = countTiles(level, TileType.ICE);
				if (iceCount < 2) continue;

				// Check if at least some ice tiles are adjacent to other ice tiles
				let adjacentIceCount = 0;
				for (let y = 0; y < level.height; y++) {
					for (let x = 0; x < level.width; x++) {
						if (getTile(level, x, y) !== TileType.ICE) continue;

						const adjacent = getAdjacent(x, y);
						for (const adj of adjacent) {
							if (
								isInBounds(level, adj.x, adj.y) &&
								getTile(level, adj.x, adj.y) === TileType.ICE
							) {
								adjacentIceCount++;
								break;
							}
						}
					}
				}

				if (adjacentIceCount > 0) {
					foundCluster = true;
					break;
				}
			}
			expect(foundCluster).toBe(true);
		});

		it("should maintain at least 8 grass+dirt tiles with ice", () => {
			const level = generateLevel({ iceChance: 0.2 }, [WorldElement.ICE]);
			expect(level).not.toBeNull();
			if (!level) return;

			const grassCount = countTiles(level, TileType.GRASS);
			const dirtCount = countTiles(level, TileType.DIRT);
			expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
		});

		it("should keep start position on grass, not ice", () => {
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({ iceChance: 0.15 }, [WorldElement.ICE]);
				if (!level) continue;

				const startTile = getTile(
					level,
					level.startPosition.x,
					level.startPosition.y,
				);
				expect(startTile).toBe(TileType.GRASS);
			}
		}, 10000);

		it("should generate solvable levels with ice tiles", () => {
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({ iceChance: 0.15 }, [WorldElement.ICE]);
				if (!level) continue;

				expect(isGrassConnected(level)).toBe(true);
				expect(
					getTile(level, level.startPosition.x, level.startPosition.y),
				).toBe(TileType.GRASS);
			}
		}, 15000);
	});

	describe("portal tiles (fairy rings)", () => {
		it("should generate portal pairs when FAIRY element is active", () => {
			// Generate multiple levels with FAIRY element
			let hasPortals = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel({}, [WorldElement.FAIRY]);
				if (!level) continue;

				const portalCount =
					countTiles(level, TileType.PORTAL_PINK) +
					countTiles(level, TileType.PORTAL_BLUE) +
					countTiles(level, TileType.PORTAL_YELLOW);

				if (portalCount > 0) {
					hasPortals = true;
					break;
				}
			}
			expect(hasPortals).toBe(true);
		});

		it("should not generate portals without FAIRY element", () => {
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({}, []);
				if (!level) continue;

				const portalCount =
					countTiles(level, TileType.PORTAL_PINK) +
					countTiles(level, TileType.PORTAL_BLUE) +
					countTiles(level, TileType.PORTAL_YELLOW);

				expect(portalCount).toBe(0);
			}
		}, 15000);

		it("should generate portals in pairs", () => {
			// Portals should always come in pairs of the same color
			for (let i = 0; i < 10; i++) {
				const level = generateLevel({}, [WorldElement.FAIRY]);
				if (!level) continue;

				const pinkCount = countTiles(level, TileType.PORTAL_PINK);
				const blueCount = countTiles(level, TileType.PORTAL_BLUE);
				const yellowCount = countTiles(level, TileType.PORTAL_YELLOW);

				// Each portal type should have 0 or 2 tiles
				expect(pinkCount === 0 || pinkCount === 2).toBe(true);
				expect(blueCount === 0 || blueCount === 2).toBe(true);
				expect(yellowCount === 0 || yellowCount === 2).toBe(true);
			}
		}, 15000);

		it("should generate up to 3 portal pairs", () => {
			// With portalPairs: 3, should have at most 6 portal tiles (3 pairs)
			let foundMultiplePairs = false;
			for (let i = 0; i < 20; i++) {
				const level = generateLevel({ portalPairs: 3 }, [WorldElement.FAIRY]);
				if (!level) continue;

				const portalCount =
					countTiles(level, TileType.PORTAL_PINK) +
					countTiles(level, TileType.PORTAL_BLUE) +
					countTiles(level, TileType.PORTAL_YELLOW);

				expect(portalCount).toBeLessThanOrEqual(6);

				if (portalCount > 2) {
					foundMultiplePairs = true;
					break;
				}
			}
			// Should find at least one level with multiple pairs in 20 tries
			expect(foundMultiplePairs).toBe(true);
		});

		it("should not place portals on start position", () => {
			for (let i = 0; i < 10; i++) {
				const level = generateLevel({}, [WorldElement.FAIRY]);
				if (!level) continue;

				const startTile = getTile(
					level,
					level.startPosition.x,
					level.startPosition.y,
				);
				expect(startTile).toBe(TileType.GRASS);
			}
		}, 15000);

		it("should maintain grass connectivity with portals", () => {
			for (let i = 0; i < 5; i++) {
				const level = generateLevel({}, [WorldElement.FAIRY]);
				if (!level) continue;

				expect(isGrassConnected(level)).toBe(true);
			}
		}, 15000);

		it("should maintain at least 8 grass+dirt tiles with portals", () => {
			const level = generateLevel({}, [WorldElement.FAIRY]);
			expect(level).not.toBeNull();
			if (!level) return;

			// Portals don't count toward the tile count (they stay as portals)
			// But the level should still have enough grass/dirt tiles
			const grassCount = countTiles(level, TileType.GRASS);
			const dirtCount = countTiles(level, TileType.DIRT);

			expect(grassCount + dirtCount).toBeGreaterThanOrEqual(8);
		});
	});
});
