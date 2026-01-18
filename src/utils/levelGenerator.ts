import {
	type FlowDirection,
	type Level,
	type PortalType,
	PortalTypes,
	type Position,
	type Room,
	TileType,
	WorldElement as WE,
	type WorldElement,
} from "../types/game";

export interface GeneratorConfig {
	minWidth: number;
	maxWidth: number;
	minHeight: number;
	maxHeight: number;
	minRectangles: number;
	maxRectangles: number;
	brambleChance: number;
	stoneChance: number;
	riverChance: number;
	riverMinLength: number;
	riverMaxLength: number;
	dirtChance: number;
	iceChance: number;
	iceClusterSize: number;
	portalPairs: number; // 0-3 pairs of portals
}

const DEFAULT_CONFIG: GeneratorConfig = {
	minWidth: 8,
	maxWidth: 12,
	minHeight: 8,
	maxHeight: 12,
	minRectangles: 2,
	maxRectangles: 3,
	brambleChance: 0.18,
	stoneChance: 0.08,
	riverChance: 0.15,
	riverMinLength: 2,
	riverMaxLength: 4,
	dirtChance: 0.08,
	iceChance: 0.12,
	iceClusterSize: 4,
	portalPairs: 2, // 1-3 pairs when FAIRY element is active
};

interface Rectangle {
	x: number;
	y: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

interface ShapeResult {
	shape: Set<string>;
	rooms: Rectangle[];
}

// Utility functions
function posKey(x: number, y: number): string {
	return `${x},${y}`;
}

function parseKey(key: string): Position {
	const parts = key.split(",").map(Number);
	return { x: parts[0] ?? 0, y: parts[1] ?? 0 };
}

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = result[i];
		result[i] = result[j] as T;
		result[j] = temp as T;
	}
	return result;
}

// Check if two rectangles overlap (including touching)
function rectanglesOverlap(r1: Rectangle, r2: Rectangle, margin = 1): boolean {
	return !(
		r1.x + r1.width + margin <= r2.x ||
		r2.x + r2.width + margin <= r1.x ||
		r1.y + r1.height + margin <= r2.y ||
		r2.y + r2.height + margin <= r1.y
	);
}

// Generate shape using overlapping rectangles (L-shapes, T-shapes, etc.)
function generateOverlappingShape(config: GeneratorConfig): ShapeResult {
	const shape = new Set<string>();
	const rooms: Rectangle[] = [];

	const numRectangles = randomInt(config.minRectangles, config.maxRectangles);

	// First rectangle - base shape
	const baseWidth = randomInt(3, config.maxWidth - 2);
	const baseHeight = randomInt(3, config.maxHeight - 2);
	const baseX = randomInt(0, config.maxWidth - baseWidth);
	const baseY = randomInt(0, config.maxHeight - baseHeight);

	for (let y = baseY; y < baseY + baseHeight; y++) {
		for (let x = baseX; x < baseX + baseWidth; x++) {
			shape.add(posKey(x, y));
		}
	}

	rooms.push({
		x: baseX,
		y: baseY,
		width: baseWidth,
		height: baseHeight,
		centerX: Math.floor(baseX + baseWidth / 2),
		centerY: Math.floor(baseY + baseHeight / 2),
	});

	// Additional rectangles - must overlap with existing shape
	for (let r = 1; r < numRectangles; r++) {
		const existingTiles = Array.from(shape).map(parseKey);
		if (existingTiles.length === 0) break;

		const overlapTile =
			existingTiles[Math.floor(Math.random() * existingTiles.length)];
		if (!overlapTile) break;

		const rectWidth = randomInt(2, Math.max(2, config.maxWidth - 3));
		const rectHeight = randomInt(2, Math.max(2, config.maxHeight - 3));

		const rectX = overlapTile.x - randomInt(0, rectWidth - 1);
		const rectY = overlapTile.y - randomInt(0, rectHeight - 1);

		// Clamp to valid bounds
		const clampedX = Math.max(0, rectX);
		const clampedY = Math.max(0, rectY);
		const clampedWidth = Math.min(rectWidth, config.maxWidth - clampedX);
		const clampedHeight = Math.min(rectHeight, config.maxHeight - clampedY);

		for (let y = clampedY; y < clampedY + clampedHeight; y++) {
			for (let x = clampedX; x < clampedX + clampedWidth; x++) {
				shape.add(posKey(x, y));
			}
		}

		rooms.push({
			x: clampedX,
			y: clampedY,
			width: clampedWidth,
			height: clampedHeight,
			centerX: Math.floor(clampedX + clampedWidth / 2),
			centerY: Math.floor(clampedY + clampedHeight / 2),
		});
	}

	return { shape, rooms };
}

// Generate shape with separate rooms connected by corridors
function generateCorridorShape(config: GeneratorConfig): ShapeResult {
	const shape = new Set<string>();
	const rooms: Rectangle[] = [];
	const numRectangles = randomInt(2, 3);

	// Generate separate, non-overlapping rectangles
	for (let i = 0; i < numRectangles; i++) {
		const rectWidth = randomInt(3, 5);
		const rectHeight = randomInt(3, 5);

		let rectX: number;
		let rectY: number;
		let attempts = 0;
		let validPlacement = false;

		// Try to place rectangle with clear separation from others
		do {
			rectX = randomInt(0, config.maxWidth - rectWidth);
			rectY = randomInt(0, config.maxHeight - rectHeight);
			attempts++;

			const newRect: Rectangle = {
				x: rectX,
				y: rectY,
				width: rectWidth,
				height: rectHeight,
				centerX: Math.floor(rectX + rectWidth / 2),
				centerY: Math.floor(rectY + rectHeight / 2),
			};

			// Ensure no overlap with existing rooms (with margin)
			validPlacement = !rooms.some((r) => rectanglesOverlap(r, newRect, 2));
		} while (!validPlacement && attempts < 50);

		if (!validPlacement && i > 0) continue;

		const room: Rectangle = {
			x: rectX,
			y: rectY,
			width: rectWidth,
			height: rectHeight,
			centerX: Math.floor(rectX + rectWidth / 2),
			centerY: Math.floor(rectY + rectHeight / 2),
		};

		// Add rectangle tiles to shape
		for (let y = rectY; y < rectY + rectHeight; y++) {
			for (let x = rectX; x < rectX + rectWidth; x++) {
				if (x >= 0 && y >= 0 && x < config.maxWidth && y < config.maxHeight) {
					shape.add(posKey(x, y));
				}
			}
		}

		rooms.push(room);
	}

	// Connect rooms with single-tile-width corridors
	for (let i = 1; i < rooms.length; i++) {
		const from = rooms[i - 1];
		const to = rooms[i];
		if (!from || !to) continue;

		// Find edge points to connect from
		const fromEdgeX =
			from.centerX < to.centerX ? from.x + from.width - 1 : from.x;
		const toEdgeX = from.centerX < to.centerX ? to.x : to.x + to.width - 1;

		const fromEdgeY =
			from.centerY < to.centerY ? from.y + from.height - 1 : from.y;
		const toEdgeY = from.centerY < to.centerY ? to.y : to.y + to.height - 1;

		// Decide corridor style: horizontal-then-vertical or vertical-then-horizontal
		const horizontalFirst = Math.random() > 0.5;

		if (horizontalFirst) {
			// Horizontal segment from 'from' room
			const startY = from.centerY;
			const minX = Math.min(fromEdgeX, toEdgeX);
			const maxX = Math.max(fromEdgeX, toEdgeX);
			for (let x = minX; x <= maxX; x++) {
				shape.add(posKey(x, startY));
			}
			// Vertical segment to 'to' room
			const endX = toEdgeX;
			const minY = Math.min(startY, to.centerY);
			const maxY = Math.max(startY, to.centerY);
			for (let y = minY; y <= maxY; y++) {
				shape.add(posKey(endX, y));
			}
		} else {
			// Vertical segment from 'from' room
			const startX = from.centerX;
			const minY = Math.min(fromEdgeY, toEdgeY);
			const maxY = Math.max(fromEdgeY, toEdgeY);
			for (let y = minY; y <= maxY; y++) {
				shape.add(posKey(startX, y));
			}
			// Horizontal segment to 'to' room
			const endY = toEdgeY;
			const minX = Math.min(startX, to.centerX);
			const maxX = Math.max(startX, to.centerX);
			for (let x = minX; x <= maxX; x++) {
				shape.add(posKey(x, endY));
			}
		}
	}

	return { shape, rooms };
}

// Get reachable neighbors (adjacent or jump over obstacle)
// walkableTiles includes both grass and stone tiles
function getReachableNeighbors(
	pos: Position,
	walkableTiles: Set<string>,
	obstacleTiles: Set<string>,
): Position[] {
	const neighbors: Position[] = [];
	const deltas = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
	];

	for (const d of deltas) {
		const adjacentKey = posKey(pos.x + d.x, pos.y + d.y);
		const jumpKey = posKey(pos.x + d.x * 2, pos.y + d.y * 2);

		if (walkableTiles.has(adjacentKey)) {
			neighbors.push({ x: pos.x + d.x, y: pos.y + d.y });
		} else if (obstacleTiles.has(adjacentKey) && walkableTiles.has(jumpKey)) {
			neighbors.push({ x: pos.x + d.x * 2, y: pos.y + d.y * 2 });
		}
	}

	return neighbors;
}

// Check if grass tiles are connected (including jumps and stone bridges)
// stoneTiles are walkable but don't need to be visited - they serve as bridges
function isConnectedWithJumps(
	grassTiles: Set<string>,
	obstacleTiles: Set<string>,
	stoneTiles: Set<string> = new Set(),
): boolean {
	if (grassTiles.size === 0) return true;

	const tileArray = Array.from(grassTiles);
	const firstTile = tileArray[0];
	if (!firstTile) return true;
	const start = parseKey(firstTile);
	const visited = new Set<string>();
	const visitedGrass = new Set<string>();
	const queue = [start];

	// Walkable tiles include both grass and stone
	const walkableTiles = new Set([...grassTiles, ...stoneTiles]);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) continue;

		const currentKey = posKey(current.x, current.y);
		if (visited.has(currentKey)) continue;

		visited.add(currentKey);
		if (grassTiles.has(currentKey)) {
			visitedGrass.add(currentKey);
		}

		const neighbors = getReachableNeighbors(
			current,
			walkableTiles,
			obstacleTiles,
		);
		for (const neighbor of neighbors) {
			const neighborKey = posKey(neighbor.x, neighbor.y);
			if (!visited.has(neighborKey)) {
				queue.push(neighbor);
			}
		}
	}

	// All grass tiles must be reachable (stone tiles don't need to be visited)
	return visitedGrass.size === grassTiles.size;
}

// Add brambles while keeping grass connected
function addBrambles(
	shape: Set<string>,
	chance: number,
): { grass: Set<string>; brambles: Set<string> } {
	const grass = new Set(shape);
	const brambles = new Set<string>();

	const candidates = shuffleArray(Array.from(shape));
	const targetBrambles = Math.floor(shape.size * chance);
	let brambleCount = 0;

	for (const tile of candidates) {
		if (brambleCount >= targetBrambles) break;

		grass.delete(tile);
		brambles.add(tile);

		if (grass.size >= 6 && isConnectedWithJumps(grass, brambles)) {
			brambleCount++;
		} else {
			grass.add(tile);
			brambles.delete(tile);
		}
	}

	return { grass, brambles };
}

// Add stone tiles - convert some grass to stone while keeping connectivity
// Stone tiles are walkable but don't need to be visited in the solution
function addStones(
	grass: Set<string>,
	brambles: Set<string>,
	chance: number,
): { grass: Set<string>; stones: Set<string> } {
	const remainingGrass = new Set(grass);
	const stones = new Set<string>();

	const candidates = shuffleArray(Array.from(grass));
	const targetStones = Math.floor(grass.size * chance);
	let stoneCount = 0;

	for (const tile of candidates) {
		if (stoneCount >= targetStones) break;

		// Keep at least 8 grass tiles for a meaningful puzzle
		if (remainingGrass.size <= 8) break;

		remainingGrass.delete(tile);
		stones.add(tile);

		// Check that grass tiles are still connected (using stones as bridges)
		if (isConnectedWithJumps(remainingGrass, brambles, stones)) {
			stoneCount++;
		} else {
			// Revert if connectivity is broken
			remainingGrass.add(tile);
			stones.delete(tile);
		}
	}

	return { grass: remainingGrass, stones };
}

// Get delta for a direction
function getDirectionDelta(dir: FlowDirection): Position {
	switch (dir) {
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

// Generate rivers that flow into stone tiles
// Rivers convert grass tiles to water tiles and create stone endpoints
interface RiverResult {
	grass: Set<string>;
	stones: Set<string>;
	water: Set<string>;
	waterFlow: Record<string, FlowDirection>;
}

function generateRivers(
	grass: Set<string>,
	stones: Set<string>,
	brambles: Set<string>,
	config: GeneratorConfig,
): RiverResult {
	const remainingGrass = new Set(grass);
	const newStones = new Set(stones);
	const water = new Set<string>();
	const waterFlow: Record<string, FlowDirection> = {};

	// Don't generate rivers if chance is 0
	if (config.riverChance <= 0) {
		return { grass: remainingGrass, stones: newStones, water, waterFlow };
	}

	// Helper to get direction from one position to an adjacent position
	function getDirectionBetween(from: Position, to: Position): FlowDirection {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		if (dx === 1) return "right";
		if (dx === -1) return "left";
		if (dy === 1) return "down";
		return "up";
	}

	// Try to create rivers from random grass tiles
	const grassCandidates = shuffleArray(Array.from(remainingGrass));
	// Usually just 1 river, occasionally 2
	const maxRivers = Math.random() > 0.7 ? 2 : 1;
	let riversCreated = 0;

	for (const startKey of grassCandidates) {
		if (riversCreated >= maxRivers) break;

		// Skip if this tile was already converted
		if (!remainingGrass.has(startKey)) continue;

		const startPos = parseKey(startKey);
		const directions: FlowDirection[] = shuffleArray([
			"up",
			"down",
			"left",
			"right",
		]);

		// Try each direction to create a river
		for (const initialDir of directions) {
			const riverLength = randomInt(
				config.riverMinLength,
				config.riverMaxLength,
			);
			const riverPath: Position[] = []; // Just collect positions first

			let current = startPos;
			let canBend = true;
			let currentDir = initialDir;

			// Start with the first tile
			riverPath.push(current);

			// Extend the river - just build the path
			for (let i = 1; i < riverLength; i++) {
				const currentDelta = getDirectionDelta(currentDir);
				const next = {
					x: current.x + currentDelta.x,
					y: current.y + currentDelta.y,
				};
				const nextKey = posKey(next.x, next.y);

				// Check if the next tile is valid grass (or we can bend)
				if (remainingGrass.has(nextKey) && !water.has(nextKey)) {
					riverPath.push(next);
					current = next;
				} else if (canBend && i > 0) {
					// Try bending perpendicular
					const bendDirections: FlowDirection[] = shuffleArray(
						currentDir === "up" || currentDir === "down"
							? ["left", "right"]
							: ["up", "down"],
					);

					let bent = false;
					for (const bendDir of bendDirections) {
						const bendDelta = getDirectionDelta(bendDir);
						const bendNext = {
							x: current.x + bendDelta.x,
							y: current.y + bendDelta.y,
						};
						const bendKey = posKey(bendNext.x, bendNext.y);

						if (remainingGrass.has(bendKey) && !water.has(bendKey)) {
							riverPath.push(bendNext);
							current = bendNext;
							currentDir = bendDir;
							canBend = false;
							bent = true;
							break;
						}
					}

					if (!bent) break;
				} else {
					break;
				}
			}

			// River must be at least min length (not counting the endpoint stone)
			if (riverPath.length < config.riverMinLength) {
				continue;
			}

			// Find position for the stone endpoint (next tile after last water tile)
			// Use the direction from second-to-last to last tile to determine stone placement
			const lastWaterTile = riverPath[riverPath.length - 1];
			const secondLastTile = riverPath[riverPath.length - 2];

			if (!lastWaterTile) continue;

			// Determine the final direction for stone placement
			const lastDir = secondLastTile
				? getDirectionBetween(secondLastTile, lastWaterTile)
				: initialDir;
			const stoneDelta = getDirectionDelta(lastDir);
			const stonePos = {
				x: lastWaterTile.x + stoneDelta.x,
				y: lastWaterTile.y + stoneDelta.y,
			};

			const stoneKey = posKey(stonePos.x, stonePos.y);

			// Stone position must be valid grass (will be converted to stone) or already a stone
			const stoneIsGrass = remainingGrass.has(stoneKey);
			const stoneIsExisting = newStones.has(stoneKey);
			if (!stoneIsGrass && !stoneIsExisting) continue;

			// Check that removing these grass tiles keeps enough grass
			const testGrass = new Set(remainingGrass);
			for (const tile of riverPath) {
				testGrass.delete(posKey(tile.x, tile.y));
			}
			if (stoneIsGrass) {
				testGrass.delete(stoneKey);
			}

			// Need at least 8 grass tiles remaining
			if (testGrass.size < 8) {
				continue;
			}

			// Create test sets for connectivity check
			const testWater = new Set(water);
			for (const tile of riverPath) {
				testWater.add(posKey(tile.x, tile.y));
			}

			const testStones = new Set(newStones);
			testStones.add(stoneKey);

			// Check connectivity using water + stones as walkable bridges
			const walkableBridges = new Set([...testStones, ...testWater]);
			if (!isConnectedWithJumps(testGrass, brambles, walkableBridges)) {
				continue;
			}

			// Valid river! Apply it - add water tiles
			for (const tile of riverPath) {
				const key = posKey(tile.x, tile.y);
				remainingGrass.delete(key);
				water.add(key);
			}

			// Compute flow directions from consecutive pairs in the path
			// Each tile's flow direction points to the NEXT tile (or stone for last tile)
			for (let i = 0; i < riverPath.length; i++) {
				const currentTile = riverPath[i];
				const nextTile = riverPath[i + 1];
				if (!currentTile) continue;

				let flowDir: FlowDirection;
				if (nextTile) {
					// Direction from current to next water tile
					flowDir = getDirectionBetween(currentTile, nextTile);
				} else {
					// Last water tile - direction to stone
					flowDir = getDirectionBetween(currentTile, stonePos);
				}
				waterFlow[posKey(currentTile.x, currentTile.y)] = flowDir;
			}

			// Add the stone endpoint
			if (stoneIsGrass) {
				remainingGrass.delete(stoneKey);
				newStones.add(stoneKey);
			}

			riversCreated++;
			break; // Successfully created a river, move to next candidate
		}
	}

	return { grass: remainingGrass, stones: newStones, water, waterFlow };
}

// Compute where a player would slide to if they step on a water tile
function computeSlideDestination(
	startPos: Position,
	waterTiles: Set<string>,
	waterFlow: Record<string, FlowDirection>,
): Position {
	let current = startPos;

	while (true) {
		const key = posKey(current.x, current.y);
		const flow = waterFlow[key];
		if (!flow) {
			// Not a water tile or no flow, stop here
			break;
		}

		const delta = getDirectionDelta(flow);
		const next = { x: current.x + delta.x, y: current.y + delta.y };
		const nextKey = posKey(next.x, next.y);

		if (waterTiles.has(nextKey)) {
			// Continue sliding through water
			current = next;
		} else {
			// Reached the end (should be stone), return the stone position
			return next;
		}
	}

	return current;
}

// Find Hamiltonian path using DFS with backtracking
// Includes iteration limit to prevent freezing on complex configurations
// Stone tiles are walkable bridges that don't need to be in the path
// Water tiles force sliding to their endpoint (stone)
// Dirt tiles need to be visited TWICE (first visit: dirt->grass, second visit: grass->mushroom)
// Ice tiles are slippery - entering from a direction causes sliding until leaving ice
function findHamiltonianPath(
	grassTiles: Position[],
	obstacleTiles: Set<string>,
	stoneTiles: Set<string> = new Set(),
	waterTiles: Set<string> = new Set(),
	waterFlow: Record<string, FlowDirection> = {},
	dirtTiles: Set<string> = new Set(),
	iceTiles: Set<string> = new Set(),
	allShapeTiles: Set<string> = new Set(),
): Position[] | null {
	const grassSet = new Set(grassTiles.map((t) => posKey(t.x, t.y)));

	// Total visits needed: each grass tile once, each dirt tile twice
	// But grassTiles already includes dirt tiles, so we need:
	// grassTiles.length (first visit to all) + dirtTiles.size (second visit to dirt)
	const totalVisitsNeeded = grassTiles.length + dirtTiles.size;

	// Limit iterations to prevent freezing - scales with grid size
	const maxIterations = Math.min(50000, totalVisitsNeeded * 5000);
	let iterations = 0;

	// State tracking:
	// - visitedOnce: tiles visited at least once (grass becomes mushroom, dirt becomes grass)
	// - visitedTwice: dirt tiles visited twice (now mushroom)
	// A tile is "complete" when: grass visited once, OR dirt visited twice

	function dfs(
		current: Position,
		visitedOnce: Set<string>,
		visitedTwice: Set<string>,
	): Position[] | null {
		iterations++;
		if (iterations > maxIterations) {
			return null;
		}

		const key = posKey(current.x, current.y);
		const isDirt = dirtTiles.has(key);
		const wasVisitedOnce = visitedOnce.has(key);

		// Update visit tracking
		if (isDirt && wasVisitedOnce) {
			// Second visit to dirt tile
			visitedTwice.add(key);
		} else {
			// First visit (grass or dirt)
			visitedOnce.add(key);
		}

		// Count completed tiles
		// Grass tiles: completed after 1 visit
		// Dirt tiles: completed after 2 visits
		const completedGrass = [...visitedOnce].filter(
			(k) => !dirtTiles.has(k),
		).length;
		const completedDirt = visitedTwice.size;

		// Check if path is complete
		const grassOnlyCount = grassTiles.length - dirtTiles.size;
		if (completedGrass === grassOnlyCount && completedDirt === dirtTiles.size) {
			return [current];
		}

		// Determine walkable tiles
		// - Unvisited grass/dirt tiles
		// - Dirt tiles visited once (now grass, can be visited again)
		// - Stone tiles (always walkable)
		const walkableTiles = new Set<string>();

		for (const k of grassSet) {
			const isCurrentTile = k === key;
			const isVisitedOnce = visitedOnce.has(k);
			const isVisitedTwice = visitedTwice.has(k);
			const isTileDirt = dirtTiles.has(k);

			if (isCurrentTile) {
				walkableTiles.add(k);
			} else if (!isVisitedOnce) {
				// Never visited - walkable
				walkableTiles.add(k);
			} else if (isTileDirt && !isVisitedTwice) {
				// Dirt visited once (now grass), can visit again
				walkableTiles.add(k);
			}
			// Otherwise: grass visited once = mushroom (obstacle), or dirt visited twice = mushroom (obstacle)
		}

		for (const k of stoneTiles) {
			walkableTiles.add(k);
		}

		// Obstacles: brambles + completed tiles (mushrooms)
		const currentObstacles = new Set<string>([...obstacleTiles]);
		for (const k of visitedOnce) {
			if (k === key) continue;
			const isTileDirt = dirtTiles.has(k);
			const isVisitedTwice = visitedTwice.has(k);

			// Grass visited once = mushroom (obstacle)
			// Dirt visited twice = mushroom (obstacle)
			// Dirt visited once = grass (NOT obstacle, still walkable)
			if (!isTileDirt || isVisitedTwice) {
				currentObstacles.add(k);
			}
		}

		// Get neighbors
		const standardNeighbors = getReachableNeighbors(
			current,
			walkableTiles,
			currentObstacles,
		).filter((n) => {
			const nKey = posKey(n.x, n.y);
			if (stoneTiles.has(nKey)) return true;

			const nVisitedOnce = visitedOnce.has(nKey);
			const nVisitedTwice = visitedTwice.has(nKey);
			const nIsDirt = dirtTiles.has(nKey);

			// Can visit if:
			// - Not visited at all
			// - Dirt visited once (needs second visit)
			if (!nVisitedOnce) return true;
			if (nIsDirt && !nVisitedTwice) return true;
			return false;
		});

		// Water slide destinations
		const waterSlideDestinations: {
			waterEntry: Position;
			destination: Position;
		}[] = [];
		const deltas = [
			{ x: 1, y: 0 },
			{ x: -1, y: 0 },
			{ x: 0, y: 1 },
			{ x: 0, y: -1 },
		];
		const directionNames: FlowDirection[] = ["right", "left", "down", "up"];
		for (let i = 0; i < deltas.length; i++) {
			const d = deltas[i];
			if (!d) continue;
			const adjacentPos = { x: current.x + d.x, y: current.y + d.y };
			const adjacentKey = posKey(adjacentPos.x, adjacentPos.y);
			if (waterTiles.has(adjacentKey)) {
				const slideEnd = computeSlideDestination(
					adjacentPos,
					waterTiles,
					waterFlow,
				);
				const slideEndKey = posKey(slideEnd.x, slideEnd.y);
				if (stoneTiles.has(slideEndKey)) {
					waterSlideDestinations.push({
						waterEntry: adjacentPos,
						destination: slideEnd,
					});
				}
			}
		}

		// Ice slide destinations
		const iceSlideDestinations: {
			iceEntry: Position;
			destination: Position;
			direction: FlowDirection;
		}[] = [];
		for (let i = 0; i < deltas.length; i++) {
			const d = deltas[i];
			const dir = directionNames[i];
			if (!d || !dir) continue;
			const adjacentPos = { x: current.x + d.x, y: current.y + d.y };
			const adjacentKey = posKey(adjacentPos.x, adjacentPos.y);
			if (iceTiles.has(adjacentKey)) {
				// Compute where we'd slide to from this entry direction
				const slideEnd = computeIceSlideDestination(
					adjacentPos,
					dir,
					iceTiles,
					currentObstacles,
					allShapeTiles,
				);
				const slideEndKey = posKey(slideEnd.x, slideEnd.y);
				// Check if the landing tile is valid (grass, dirt, or stone - not ice)
				if (!iceTiles.has(slideEndKey)) {
					const isValidLanding =
						grassSet.has(slideEndKey) || stoneTiles.has(slideEndKey);
					if (isValidLanding) {
						// Check if it's a grass/dirt tile we can visit
						const landVisitedOnce = visitedOnce.has(slideEndKey);
						const landVisitedTwice = visitedTwice.has(slideEndKey);
						const landIsDirt = dirtTiles.has(slideEndKey);
						const landIsStone = stoneTiles.has(slideEndKey);

						// Can land if: stone, unvisited grass/dirt, or dirt visited once
						if (
							landIsStone ||
							!landVisitedOnce ||
							(landIsDirt && !landVisitedTwice)
						) {
							iceSlideDestinations.push({
								iceEntry: adjacentPos,
								destination: slideEnd,
								direction: dir,
							});
						}
					}
				}
			}
		}

		// Shuffle options
		const allNeighbors = shuffleArray([...standardNeighbors]);
		const shuffledWaterSlides = shuffleArray(waterSlideDestinations);
		const shuffledIceSlides = shuffleArray(iceSlideDestinations);

		// Try standard neighbors
		for (const neighbor of allNeighbors) {
			const neighborKey = posKey(neighbor.x, neighbor.y);

			if (stoneTiles.has(neighborKey)) {
				// Stepping onto stone - explore from there
				const stoneNeighbors = getReachableNeighbors(
					neighbor,
					walkableTiles,
					currentObstacles,
				).filter((n) => {
					const snKey = posKey(n.x, n.y);
					if (!grassSet.has(snKey)) return false;

					const snVisitedOnce = visitedOnce.has(snKey);
					const snVisitedTwice = visitedTwice.has(snKey);
					const snIsDirt = dirtTiles.has(snKey);

					if (!snVisitedOnce) return true;
					if (snIsDirt && !snVisitedTwice) return true;
					return false;
				});

				for (const stoneNeighbor of shuffleArray(stoneNeighbors)) {
					const result = dfs(stoneNeighbor, visitedOnce, visitedTwice);
					if (result) {
						return [current, neighbor, ...result];
					}
				}
			} else {
				// Regular tile (grass or dirt needing revisit)
				const result = dfs(neighbor, visitedOnce, visitedTwice);
				if (result) {
					return [current, ...result];
				}
			}
		}

		// Try water slides
		for (const { destination } of shuffledWaterSlides) {
			const stoneNeighbors = getReachableNeighbors(
				destination,
				walkableTiles,
				currentObstacles,
			).filter((n) => {
				const snKey = posKey(n.x, n.y);
				if (!grassSet.has(snKey)) return false;

				const snVisitedOnce = visitedOnce.has(snKey);
				const snVisitedTwice = visitedTwice.has(snKey);
				const snIsDirt = dirtTiles.has(snKey);

				if (!snVisitedOnce) return true;
				if (snIsDirt && !snVisitedTwice) return true;
				return false;
			});

			for (const stoneNeighbor of shuffleArray(stoneNeighbors)) {
				const result = dfs(stoneNeighbor, visitedOnce, visitedTwice);
				if (result) {
					return [current, destination, ...result];
				}
			}
		}

		// Try ice slides
		for (const { destination } of shuffledIceSlides) {
			const destKey = posKey(destination.x, destination.y);

			if (stoneTiles.has(destKey)) {
				// Landed on stone - need to step off to grass/dirt
				const stoneNeighbors = getReachableNeighbors(
					destination,
					walkableTiles,
					currentObstacles,
				).filter((n) => {
					const snKey = posKey(n.x, n.y);
					if (!grassSet.has(snKey)) return false;

					const snVisitedOnce = visitedOnce.has(snKey);
					const snVisitedTwice = visitedTwice.has(snKey);
					const snIsDirt = dirtTiles.has(snKey);

					if (!snVisitedOnce) return true;
					if (snIsDirt && !snVisitedTwice) return true;
					return false;
				});

				for (const stoneNeighbor of shuffleArray(stoneNeighbors)) {
					const result = dfs(stoneNeighbor, visitedOnce, visitedTwice);
					if (result) {
						return [current, destination, ...result];
					}
				}
			} else {
				// Landed on grass/dirt - continue path from there
				const result = dfs(destination, visitedOnce, visitedTwice);
				if (result) {
					return [current, ...result];
				}
			}
		}

		// Backtrack
		if (isDirt && wasVisitedOnce) {
			visitedTwice.delete(key);
		} else {
			visitedOnce.delete(key);
		}
		return null;
	}

	const startTiles = shuffleArray([...grassTiles]);

	for (const startTile of startTiles) {
		if (iterations > maxIterations) {
			break;
		}
		const path = dfs(startTile, new Set(), new Set());
		if (path) {
			return path;
		}
	}

	return null;
}

// Select dirt candidates BEFORE path finding
// Dirt tiles can be anywhere - the path finder will ensure they can be visited twice
function selectDirtCandidates(
	grass: Set<string>,
	_stones: Set<string>,
	chance: number,
): Set<string> {
	const dirt = new Set<string>();
	if (chance <= 0) return dirt;

	// Any grass tile can potentially be dirt
	const candidates = Array.from(grass);

	// Select some candidates as dirt
	const shuffled = shuffleArray(candidates);
	const targetDirt = Math.max(1, Math.floor(grass.size * chance));

	for (let i = 0; i < Math.min(targetDirt, shuffled.length); i++) {
		const key = shuffled[i];
		if (key) {
			dirt.add(key);
		}
	}

	return dirt;
}

// Add ice tiles in clusters - ice acts as walkable bridge that causes sliding
function addIceClusters(
	grass: Set<string>,
	brambles: Set<string>,
	stones: Set<string>,
	water: Set<string>,
	chance: number,
	clusterSize: number,
): { grass: Set<string>; ice: Set<string> } {
	const remainingGrass = new Set(grass);
	const ice = new Set<string>();

	if (chance <= 0) {
		return { grass: remainingGrass, ice };
	}

	// Target number of ice tiles based on grass count
	const targetIce = Math.floor(grass.size * chance);
	if (targetIce === 0) {
		return { grass: remainingGrass, ice };
	}

	// Determine number of clusters (each roughly clusterSize tiles)
	const numClusters = Math.max(1, Math.ceil(targetIce / clusterSize));

	// Start positions for clusters - spread across the grass tiles
	const clusterStarts = shuffleArray(Array.from(remainingGrass)).slice(
		0,
		numClusters,
	);

	for (const startKey of clusterStarts) {
		if (!remainingGrass.has(startKey)) continue;

		// Grow a cluster from this starting point
		const cluster = new Set<string>();
		const queue = [startKey];
		const visited = new Set<string>();

		while (queue.length > 0 && cluster.size < clusterSize) {
			const current = queue.shift();
			if (!current || visited.has(current)) continue;
			visited.add(current);

			// Check if this tile can become ice
			if (!remainingGrass.has(current)) continue;

			// Add to cluster
			cluster.add(current);

			// Add neighbors to queue for potential cluster growth
			const pos = parseKey(current);
			const neighbors = [
				posKey(pos.x + 1, pos.y),
				posKey(pos.x - 1, pos.y),
				posKey(pos.x, pos.y + 1),
				posKey(pos.x, pos.y - 1),
			];

			for (const neighbor of shuffleArray(neighbors)) {
				if (!visited.has(neighbor) && remainingGrass.has(neighbor)) {
					queue.push(neighbor);
				}
			}
		}

		// Validate the cluster - check connectivity after removing these tiles
		if (cluster.size > 0) {
			const testGrass = new Set(remainingGrass);
			for (const tile of cluster) {
				testGrass.delete(tile);
			}

			// Need at least 8 grass tiles remaining
			if (testGrass.size < 8) continue;

			// Ice tiles act as walkable bridges (like stones)
			const walkableBridges = new Set([
				...stones,
				...water,
				...ice,
				...cluster,
			]);
			if (isConnectedWithJumps(testGrass, brambles, walkableBridges)) {
				// Valid cluster - add to ice
				for (const tile of cluster) {
					remainingGrass.delete(tile);
					ice.add(tile);
				}
			}
		}
	}

	return { grass: remainingGrass, ice };
}

// Compute where a player slides to when entering ice from a given direction
// Returns the final position after sliding stops (hitting non-ice or obstacle)
function computeIceSlideDestination(
	startPos: Position,
	direction: FlowDirection,
	iceTiles: Set<string>,
	obstacles: Set<string>, // brambles, mushrooms, etc.
	allTiles: Set<string>, // all valid tiles in the level
): Position {
	const delta = getDirectionDelta(direction);
	let current = startPos;

	while (true) {
		const next = { x: current.x + delta.x, y: current.y + delta.y };
		const nextKey = posKey(next.x, next.y);

		// Stop if we hit an obstacle or go out of bounds
		if (obstacles.has(nextKey) || !allTiles.has(nextKey)) {
			return current;
		}

		// Stop if we leave the ice
		if (!iceTiles.has(nextKey)) {
			return next; // Land on the non-ice tile
		}

		// Continue sliding on ice
		current = next;
	}
}

// Place portal pairs on grass tiles
// Portals come in pairs - each pair teleports between each other
// Returns a map of position key -> portal type
function placePortalPairs(
	grass: Set<string>,
	startPosition: Position,
	numPairs: number,
): Map<string, PortalType> {
	const portals = new Map<string, PortalType>();

	if (numPairs <= 0) return portals;

	// Get available grass tiles (excluding start position)
	const startKey = posKey(startPosition.x, startPosition.y);
	const availableTiles = shuffleArray(
		Array.from(grass).filter((k) => k !== startKey),
	);

	// Need at least 2 tiles per pair
	const maxPairs = Math.min(
		numPairs,
		Math.floor(availableTiles.length / 2),
		PortalTypes.length,
	);

	for (let i = 0; i < maxPairs; i++) {
		const portalType = PortalTypes[i];
		if (!portalType) continue;

		// Find two tiles that are reasonably spaced apart
		const tile1 = availableTiles.shift();
		if (!tile1) break;

		// Try to find a tile that's at least 3 steps away
		let tile2: string | undefined;
		const pos1 = parseKey(tile1);

		for (let j = 0; j < availableTiles.length; j++) {
			const candidate = availableTiles[j];
			if (!candidate) continue;

			const pos2 = parseKey(candidate);
			const distance = Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y);

			if (distance >= 3) {
				tile2 = candidate;
				availableTiles.splice(j, 1);
				break;
			}
		}

		// If no distant tile found, just use the next available
		if (!tile2) {
			tile2 = availableTiles.shift();
		}

		if (!tile2) break;

		// Place the portal pair
		portals.set(tile1, portalType);
		portals.set(tile2, portalType);
	}

	return portals;
}

// Build level from path
function buildLevelFromPath(
	path: Position[],
	allShapeTiles: Set<string>,
	brambles: Set<string>,
	stones: Set<string>,
	water: Set<string>,
	dirt: Set<string>,
	ice: Set<string>,
	portals: Map<string, PortalType>,
	waterFlowInput: Record<string, FlowDirection>,
	rooms: Rectangle[],
): Level {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const key of allShapeTiles) {
		const { x, y } = parseKey(key);
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}

	const width = maxX - minX + 1;
	const height = maxY - minY + 1;

	const grid: TileType[][] = [];
	for (let y = 0; y < height; y++) {
		const row: TileType[] = [];
		for (let x = 0; x < width; x++) {
			const key = posKey(x + minX, y + minY);
			if (brambles.has(key)) {
				row.push(TileType.BRAMBLE);
			} else if (stones.has(key)) {
				row.push(TileType.STONE);
			} else if (water.has(key)) {
				row.push(TileType.WATER);
			} else if (ice.has(key)) {
				row.push(TileType.ICE);
			} else if (portals.has(key)) {
				// Portal tiles replace grass tiles
				row.push(portals.get(key)!);
			} else if (dirt.has(key)) {
				row.push(TileType.DIRT);
			} else if (allShapeTiles.has(key)) {
				row.push(TileType.GRASS);
			} else {
				// Tiles outside the play area are void (invisible)
				row.push(TileType.VOID);
			}
		}
		grid.push(row);
	}

	const firstPathTile = path[0];
	const startPosition = {
		x: (firstPathTile?.x ?? 0) - minX,
		y: (firstPathTile?.y ?? 0) - minY,
	};

	// Adjust room coordinates relative to grid
	const adjustedRooms: Room[] = rooms.map((r) => ({
		x: r.x - minX,
		y: r.y - minY,
		width: r.width,
		height: r.height,
	}));

	// Adjust water flow coordinates relative to grid
	const adjustedWaterFlow: Record<string, FlowDirection> = {};
	for (const [key, dir] of Object.entries(waterFlowInput)) {
		const pos = parseKey(key);
		const adjustedKey = posKey(pos.x - minX, pos.y - minY);
		adjustedWaterFlow[adjustedKey] = dir;
	}

	return {
		name: "Generated",
		width,
		height,
		grid,
		startPosition,
		rooms: adjustedRooms.length > 0 ? adjustedRooms : undefined,
		waterFlow:
			Object.keys(adjustedWaterFlow).length > 0 ? adjustedWaterFlow : undefined,
	};
}

// Verify a level is valid and solvable
function verifyLevel(level: Level): boolean {
	// Check start position is grass
	if (
		level.startPosition.x < 0 ||
		level.startPosition.y < 0 ||
		level.startPosition.x >= level.width ||
		level.startPosition.y >= level.height
	) {
		return false;
	}
	const row = level.grid[level.startPosition.y];
	const tile = row?.[level.startPosition.x];
	if (tile !== TileType.GRASS) {
		return false;
	}

	// Count grass, dirt, and portal tiles - should be at least 8
	// Dirt counts as 1 tile (even though it needs 2 visits)
	// Portal tiles count as grass tiles (walkable, need to be visited)
	let grassCount = 0;
	for (const row of level.grid) {
		for (const tile of row) {
			if (
				tile === TileType.GRASS ||
				tile === TileType.DIRT ||
				tile === TileType.PORTAL_PINK ||
				tile === TileType.PORTAL_BLUE ||
				tile === TileType.PORTAL_YELLOW
			) {
				grassCount++;
			}
		}
	}
	return grassCount >= 8;
}

// Main function with retry logic
export function generateLevel(
	config: Partial<GeneratorConfig> = {},
	elements: WorldElement[] = [],
): Level | null {
	// Apply element-based config overrides
	const elementConfig = { ...config };

	// Rivers only generate if the RIVERS element is active
	if (!elements.includes(WE.RIVERS)) {
		elementConfig.riverChance = 0;
	}

	// Dirt element increases dirt chance by 4x
	if (elements.includes(WE.DIRT)) {
		const baseDirtChance = config.dirtChance ?? DEFAULT_CONFIG.dirtChance;
		elementConfig.dirtChance = baseDirtChance * 4;
	}

	// Ice only generates if the ICE element is active
	if (!elements.includes(WE.ICE)) {
		elementConfig.iceChance = 0;
	}

	// Portals only generate if the FAIRY element is active
	if (!elements.includes(WE.FAIRY)) {
		elementConfig.portalPairs = 0;
	} else {
		// Weighted random portal pairs: 50% for 1, 35% for 2, 15% for 3
		const roll = Math.random();
		if (roll < 0.5) {
			elementConfig.portalPairs = 1;
		} else if (roll < 0.85) {
			elementConfig.portalPairs = 2;
		} else {
			elementConfig.portalPairs = 3;
		}
	}

	const fullConfig = { ...DEFAULT_CONFIG, ...elementConfig };
	const maxRetries = 100;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		// 60% chance for corridor-based levels with rooms
		const useCorridors = Math.random() > 0.4;

		const { shape: baseShape, rooms } = useCorridors
			? generateCorridorShape(fullConfig)
			: generateOverlappingShape(fullConfig);

		const { grass: grassAfterBrambles, brambles } = addBrambles(
			baseShape,
			fullConfig.brambleChance,
		);

		// Add stone tiles (walkable bridges)
		const { grass: grassAfterStones, stones } = addStones(
			grassAfterBrambles,
			brambles,
			fullConfig.stoneChance,
		);

		// Generate rivers (water tiles flowing into stones)
		// Rivers can create new stone endpoints, so use the returned stones set
		const {
			grass: grassAfterRivers,
			stones: finalStones,
			water,
			waterFlow,
		} = generateRivers(grassAfterStones, stones, brambles, fullConfig);

		// Add ice clusters (slippery tiles that cause sliding)
		const { grass, ice } = addIceClusters(
			grassAfterRivers,
			brambles,
			finalStones,
			water,
			fullConfig.iceChance,
			fullConfig.iceClusterSize,
		);

		const shape = new Set(baseShape);

		const grassTiles = Array.from(grass).map(parseKey);

		if (grassTiles.length < 8) continue;

		// Select dirt candidates BEFORE path finding
		// Dirt tiles need to be adjacent to stones so the path can revisit them
		const dirt = selectDirtCandidates(
			grass,
			finalStones,
			fullConfig.dirtChance,
		);

		// Find path - path finder will visit dirt tiles twice, handle ice sliding
		const path = findHamiltonianPath(
			grassTiles,
			brambles,
			finalStones,
			water,
			waterFlow,
			dirt,
			ice,
			shape,
		);

		if (path) {
			// Place portal pairs AFTER pathfinding (portals don't affect the path - they're teleports)
			const startPos = path[0] ?? { x: 0, y: 0 };
			const portals = placePortalPairs(grass, startPos, fullConfig.portalPairs);

			const level = buildLevelFromPath(
				path,
				shape,
				brambles,
				finalStones,
				water,
				dirt,
				ice,
				portals,
				waterFlow,
				rooms,
			);
			if (verifyLevel(level)) {
				return level;
			}
		}
	}

	return null;
}
