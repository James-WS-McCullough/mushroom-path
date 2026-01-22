/**
 * Position and direction utilities - shared across game logic and level generation
 */

import type { Position, Direction, FlowDirection } from "../types/game";

// =============================================================================
// DIRECTION UTILITIES
// =============================================================================

/** Direction deltas for movement calculations */
export const DIRECTION_DELTAS: Record<Direction, Position> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};

/** Get the position delta for a direction */
export function getDirectionDelta(dir: Direction | FlowDirection): Position {
	return DIRECTION_DELTAS[dir];
}

/** Get the opposite direction */
export function getOppositeDirection(dir: Direction): Direction {
	switch (dir) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "left":
			return "right";
		case "right":
			return "left";
	}
}

/** All four cardinal directions */
export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];

// =============================================================================
// POSITION KEY UTILITIES
// =============================================================================

/** Convert x,y coordinates to a string key for Map/Set usage */
export function posKey(x: number, y: number): string {
	return `${x},${y}`;
}

/** Convert a Position to a string key */
export function positionToKey(pos: Position): string {
	return `${pos.x},${pos.y}`;
}

/** Parse a string key back to a Position */
export function parseKey(key: string): Position {
	const parts = key.split(",").map(Number);
	return { x: parts[0] ?? 0, y: parts[1] ?? 0 };
}

// =============================================================================
// POSITION CALCULATIONS
// =============================================================================

/** Check if two positions are equal */
export function positionsEqual(a: Position, b: Position): boolean {
	return a.x === b.x && a.y === b.y;
}

/** Check if two positions are adjacent (not diagonal) */
export function areAdjacent(a: Position, b: Position): boolean {
	const dx = Math.abs(a.x - b.x);
	const dy = Math.abs(a.y - b.y);
	return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/** Get Manhattan distance between two positions */
export function manhattanDistance(a: Position, b: Position): number {
	return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Check if a position is within grid bounds */
export function isInBounds(
	pos: Position,
	width: number,
	height: number
): boolean {
	return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
}

/** Get adjacent positions (up, down, left, right) */
export function getAdjacentPositions(pos: Position): Position[] {
	return [
		{ x: pos.x, y: pos.y - 1 }, // up
		{ x: pos.x, y: pos.y + 1 }, // down
		{ x: pos.x - 1, y: pos.y }, // left
		{ x: pos.x + 1, y: pos.y }, // right
	];
}
