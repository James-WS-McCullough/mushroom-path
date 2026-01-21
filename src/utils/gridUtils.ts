/**
 * Grid utilities - common operations for 2D grids
 */

import type { Position, Tile, TileType } from "@/types/game";

// =============================================================================
// GRID ITERATION
// =============================================================================

/** Iterate over every cell in a grid */
export function forEachCell<T>(
	grid: T[][],
	callback: (value: T, x: number, y: number) => void
): void {
	for (let y = 0; y < grid.length; y++) {
		const row = grid[y];
		if (!row) continue;
		for (let x = 0; x < row.length; x++) {
			const cell = row[x];
			if (cell !== undefined) {
				callback(cell, x, y);
			}
		}
	}
}

/** Find first cell matching a predicate */
export function findInGrid<T>(
	grid: T[][],
	predicate: (value: T, x: number, y: number) => boolean
): { value: T; x: number; y: number } | null {
	for (let y = 0; y < grid.length; y++) {
		const row = grid[y];
		if (!row) continue;
		for (let x = 0; x < row.length; x++) {
			const cell = row[x];
			if (cell !== undefined && predicate(cell, x, y)) {
				return { value: cell, x, y };
			}
		}
	}
	return null;
}

/** Find all cells matching a predicate */
export function filterGrid<T>(
	grid: T[][],
	predicate: (value: T, x: number, y: number) => boolean
): Array<{ value: T; x: number; y: number }> {
	const results: Array<{ value: T; x: number; y: number }> = [];
	forEachCell(grid, (value, x, y) => {
		if (predicate(value, x, y)) {
			results.push({ value, x, y });
		}
	});
	return results;
}

/** Count cells matching a predicate */
export function countInGrid<T>(
	grid: T[][],
	predicate: (value: T, x: number, y: number) => boolean
): number {
	let count = 0;
	forEachCell(grid, (value, x, y) => {
		if (predicate(value, x, y)) count++;
	});
	return count;
}

// =============================================================================
// TILE-SPECIFIC UTILITIES
// =============================================================================

/** Get a tile at a position, or undefined if out of bounds */
export function getTileAt(tiles: Tile[][], pos: Position): Tile | undefined {
	return tiles[pos.y]?.[pos.x];
}

/** Get a tile type at a position, or undefined if out of bounds */
export function getTileTypeAt(
	grid: TileType[][],
	pos: Position
): TileType | undefined {
	return grid[pos.y]?.[pos.x];
}

/** Set a tile type at a position (mutates grid) */
export function setTileTypeAt(
	grid: TileType[][],
	pos: Position,
	type: TileType
): void {
	const row = grid[pos.y];
	if (row && pos.x >= 0 && pos.x < row.length) {
		row[pos.x] = type;
	}
}

/** Clone a 2D grid */
export function cloneGrid<T>(grid: T[][]): T[][] {
	return grid.map((row) => [...row]);
}
