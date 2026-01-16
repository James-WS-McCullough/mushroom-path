import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGame } from "./useGame";
import { TileType } from "../types/game";
import type { FlowDirection, Level } from "../types/game";

// Helper to create a simple test level
function createTestLevel(
	grid: string[],
	startX: number,
	startY: number,
	waterFlow?: Record<string, FlowDirection>,
): Level {
	const tileMap: Record<string, TileType> = {
		G: TileType.GRASS,
		B: TileType.BRAMBLE,
		M: TileType.MUSHROOM,
		V: TileType.VOID,
		S: TileType.STONE,
		W: TileType.WATER,
		D: TileType.DIRT,
	};

	const parsedGrid = grid.map((row) =>
		row.split("").map((char) => tileMap[char] ?? TileType.VOID),
	);

	return {
		name: "Test Level",
		width: parsedGrid[0]?.length ?? 0,
		height: parsedGrid.length,
		grid: parsedGrid,
		startPosition: { x: startX, y: startY },
		waterFlow,
	};
}

describe("useGame", () => {
	describe("initialization", () => {
		it("should initialize game with correct player position", () => {
			const level = createTestLevel(["GGG", "GGG", "GGG"], 1, 1);
			const game = useGame(level);

			expect(game.playerPosition.value).toEqual({ x: 1, y: 1 });
		});

		it("should initialize all tiles correctly", () => {
			const level = createTestLevel(["GBG", "GMG", "GGG"], 0, 0);
			const game = useGame(level);

			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
			expect(game.tiles.value[0][1].type).toBe(TileType.BRAMBLE);
			expect(game.tiles.value[1][1].type).toBe(TileType.MUSHROOM);
		});

		it("should start with hasWon as false", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			expect(game.hasWon.value).toBe(false);
		});

		it("should start with empty move history (canUndo false)", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			expect(game.canUndo.value).toBe(false);
		});
	});

	describe("basic movement", () => {
		it("should move right onto grass", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should move left onto grass", () => {
			const level = createTestLevel(["GGG"], 2, 0);
			const game = useGame(level);

			game.movePlayer("left");

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should move down onto grass", () => {
			const level = createTestLevel(["G", "G", "G"], 0, 0);
			const game = useGame(level);

			game.movePlayer("down");

			expect(game.playerPosition.value).toEqual({ x: 0, y: 1 });
		});

		it("should move up onto grass", () => {
			const level = createTestLevel(["G", "G", "G"], 0, 2);
			const game = useGame(level);

			game.movePlayer("up");

			expect(game.playerPosition.value).toEqual({ x: 0, y: 1 });
		});

		it("should not move out of bounds", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("left");

			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should not move onto brambles (no jump available)", () => {
			const level = createTestLevel(["GB"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			// Should stay in place - can't land on bramble, no tile beyond to jump to
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should not move onto existing mushrooms (no jump available)", () => {
			const level = createTestLevel(["GM"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			// Should stay in place - can't land on mushroom, no tile beyond to jump to
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});
	});

	describe("jumping over obstacles", () => {
		it("should jump over bramble to grass", () => {
			const level = createTestLevel(["GGGBG"], 2, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 4, y: 0 });
		});

		it("should jump over mushroom to grass", () => {
			const level = createTestLevel(["GGGMG"], 2, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 4, y: 0 });
		});

		it("should not jump if landing tile is not grass", () => {
			const level = createTestLevel(["GBB"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			// Can't jump - landing tile is bramble
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should not jump if landing tile is out of bounds", () => {
			const level = createTestLevel(["GB"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should jump vertically over obstacles", () => {
			const level = createTestLevel(["G", "B", "G"], 0, 0);
			const game = useGame(level);

			game.movePlayer("down");

			expect(game.playerPosition.value).toEqual({ x: 0, y: 2 });
		});
	});

	describe("mushroom planting", () => {
		it("should plant mushroom on tile player left", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);
		});

		it("should plant mushroom when jumping", () => {
			const level = createTestLevel(["GBG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);
			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });
		});

		it("should track last planted position", () => {
			vi.useFakeTimers();
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.lastPlantedPosition.value).toEqual({ x: 0, y: 0 });

			// After timeout, should clear
			vi.advanceTimersByTime(400);
			expect(game.lastPlantedPosition.value).toBe(null);

			vi.useRealTimers();
		});
	});

	describe("win condition", () => {
		it("should win when standing on the only grass tile", () => {
			// Start on one grass, move to the only other grass
			const level = createTestLevel(["GG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			// After moving, original tile becomes mushroom
			// Now standing on the only grass tile
			expect(game.hasWon.value).toBe(true);
		});

		it("should not win if multiple grass tiles remain", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.hasWon.value).toBe(false);
		});

		it("should not allow movement after winning", () => {
			const level = createTestLevel(["GG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.hasWon.value).toBe(true);

			// Try to move (shouldn't work)
			game.movePlayer("left");
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});
	});

	describe("isStuck detection", () => {
		it("should detect when player is stuck", () => {
			// Player surrounded by mushrooms/brambles with no valid moves
			const level = createTestLevel(["BMB", "MGM", "BMB"], 1, 1);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(true);
		});

		it("should not be stuck when moves are available", () => {
			const level = createTestLevel(["GGG", "GGG", "GGG"], 1, 1);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(false);
		});

		it("should not be stuck if can jump over obstacle", () => {
			const level = createTestLevel(["G", "B", "G"], 0, 0);
			const game = useGame(level);

			// Can jump down over the bramble
			expect(game.isStuck.value).toBe(false);
		});

		it("should not report stuck after winning", () => {
			const level = createTestLevel(["GG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.hasWon.value).toBe(true);
			expect(game.isStuck.value).toBe(false);
		});

		it("should become stuck when surrounded by obstacles after moving", () => {
			// Level with unreachable grass so player gets stuck without winning:
			// G G B
			// B B G  <- grass at (2,1) is unreachable
			//
			// After moving from (0,0) to (1,0):
			// - (0,0) = mushroom, (1,0) = player, (2,0) = bramble
			// - grassRemaining = 2 (player's tile + unreachable (2,1))
			// - hasWon = false (more than 1 grass)
			// - isStuck = true (can't reach any direction)
			const level = createTestLevel(["GGB", "BBG"], 0, 0);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(false);
			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
			expect(game.grassTilesRemaining.value).toBe(2); // Player's tile + unreachable
			expect(game.hasWon.value).toBe(false);
			expect(game.isStuck.value).toBe(true);
		});
	});

	describe("canReachByClick", () => {
		it("should return true for adjacent grass tile", () => {
			const level = createTestLevel(["GGG"], 1, 0);
			const game = useGame(level);

			expect(game.canReachByClick({ x: 0, y: 0 })).toBe(true);
			expect(game.canReachByClick({ x: 2, y: 0 })).toBe(true);
		});

		it("should return false for non-adjacent grass tile", () => {
			const level = createTestLevel(["GGGGG"], 0, 0);
			const game = useGame(level);

			expect(game.canReachByClick({ x: 3, y: 0 })).toBe(false);
		});

		it("should return true for jumpable tile (2 away with obstacle)", () => {
			const level = createTestLevel(["GBG"], 0, 0);
			const game = useGame(level);

			expect(game.canReachByClick({ x: 2, y: 0 })).toBe(true);
		});

		it("should return false for 2-away tile without obstacle in middle", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			// Grass in middle - should walk, not jump
			expect(game.canReachByClick({ x: 2, y: 0 })).toBe(false);
		});

		it("should return false for diagonal tiles", () => {
			const level = createTestLevel(["GGG", "GGG", "GGG"], 1, 1);
			const game = useGame(level);

			expect(game.canReachByClick({ x: 0, y: 0 })).toBe(false);
			expect(game.canReachByClick({ x: 2, y: 2 })).toBe(false);
		});

		it("should return false for bramble tiles", () => {
			const level = createTestLevel(["GBG"], 0, 0);
			const game = useGame(level);

			expect(game.canReachByClick({ x: 1, y: 0 })).toBe(false);
		});
	});

	describe("moveToPosition", () => {
		it("should move to adjacent grass tile", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.moveToPosition({ x: 1, y: 0 });

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should jump to tile 2 away when obstacle in between", () => {
			const level = createTestLevel(["GBG"], 0, 0);
			const game = useGame(level);

			game.moveToPosition({ x: 2, y: 0 });

			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });
		});

		it("should not move to unreachable tile", () => {
			const level = createTestLevel(["GGGGG"], 0, 0);
			const game = useGame(level);

			game.moveToPosition({ x: 3, y: 0 });

			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should plant mushroom when moving", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.moveToPosition({ x: 1, y: 0 });

			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);
		});
	});

	describe("undo functionality", () => {
		it("should undo a move", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });

			game.undo();
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should restore the tile state after undo", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);

			game.undo();
			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
		});

		it("should allow multiple undos", () => {
			const level = createTestLevel(["GGGGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			game.movePlayer("right");
			game.movePlayer("right");
			expect(game.playerPosition.value).toEqual({ x: 3, y: 0 });

			game.undo();
			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });

			game.undo();
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });

			game.undo();
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should do nothing if no moves to undo", () => {
			const level = createTestLevel(["GGG"], 1, 0);
			const game = useGame(level);

			game.undo();

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should not allow undo after winning", () => {
			const level = createTestLevel(["GG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.hasWon.value).toBe(true);

			game.undo();
			// Should still be at winning position
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should update canUndo after moves", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			expect(game.canUndo.value).toBe(false);

			game.movePlayer("right");
			expect(game.canUndo.value).toBe(true);

			game.undo();
			expect(game.canUndo.value).toBe(false);
		});
	});

	describe("grassTilesRemaining", () => {
		it("should count grass tiles correctly", () => {
			const level = createTestLevel(["GGG", "GBG", "GGG"], 1, 1);
			const game = useGame(level);

			expect(game.grassTilesRemaining.value).toBe(8);
		});

		it("should decrease when player moves", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			expect(game.grassTilesRemaining.value).toBe(3);

			game.movePlayer("right");
			expect(game.grassTilesRemaining.value).toBe(2);
		});

		it("should increase when undo restores grass", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.grassTilesRemaining.value).toBe(2);

			game.undo();
			expect(game.grassTilesRemaining.value).toBe(3);
		});
	});

	describe("initializeGame reset", () => {
		it("should reset game state when called", () => {
			const level = createTestLevel(["GGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			game.movePlayer("right");

			game.initializeGame();

			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
			expect(game.tiles.value[0][1].type).toBe(TileType.GRASS);
			expect(game.canUndo.value).toBe(false);
			expect(game.hasWon.value).toBe(false);
		});
	});

	describe("stone tiles", () => {
		it("should allow movement onto stone tiles", () => {
			const level = createTestLevel(["GSG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should not plant mushroom when leaving stone tile", () => {
			const level = createTestLevel(["GSG"], 1, 0);
			const game = useGame(level);

			// Standing on stone, move to grass
			game.movePlayer("right");

			// Stone should remain stone (no mushroom planted)
			expect(game.tiles.value[0][1].type).toBe(TileType.STONE);
			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });
		});

		it("should plant mushroom when leaving grass but not stone", () => {
			const level = createTestLevel(["GSG"], 0, 0);
			const game = useGame(level);

			// Move from grass to stone
			game.movePlayer("right");
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);

			// Move from stone to grass
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.STONE);
		});

		it("should allow walking on same stone tile multiple times", () => {
			// G S G G layout - can walk back and forth on stone
			const level = createTestLevel(["GSGG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right"); // G(0)->S(1)
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });

			game.movePlayer("right"); // S(1)->G(2)
			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });

			game.movePlayer("left"); // G(2)->S(1) (back to same stone)
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
			expect(game.tiles.value[0][1].type).toBe(TileType.STONE);

			game.movePlayer("right"); // S(1)->G(3) (skip mushroom at G(2))
			expect(game.playerPosition.value).toEqual({ x: 3, y: 0 });
		});

		it("should not count stone tiles in grassTilesRemaining", () => {
			const level = createTestLevel(["GSG"], 0, 0);
			const game = useGame(level);

			// 2 grass tiles, 1 stone tile
			expect(game.grassTilesRemaining.value).toBe(2);
		});

		it("should not count stone tiles toward win condition", () => {
			// Level with 2 grass and 1 stone
			const level = createTestLevel(["GSG"], 0, 0);
			const game = useGame(level);

			// Move G->S->G - should win when on last grass
			game.movePlayer("right"); // to stone
			game.movePlayer("right"); // to last grass
			expect(game.hasWon.value).toBe(true);
		});

		it("should not allow jumping over stone (stone is not an obstacle)", () => {
			// G S G - can walk to stone, cannot jump over it
			const level = createTestLevel(["GSGG"], 0, 0);
			const game = useGame(level);

			// Direct jump from 0 to 2 should not work (stone is not an obstacle)
			expect(game.canReachByClick({ x: 2, y: 0 })).toBe(false);

			// But can walk to stone at 1
			expect(game.canReachByClick({ x: 1, y: 0 })).toBe(true);
		});

		it("should handle undo correctly with stone tiles", () => {
			const level = createTestLevel(["GSG"], 0, 0);
			const game = useGame(level);

			// Move from grass to stone
			game.movePlayer("right");
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });

			// Undo
			game.undo();
			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should handle undo when standing on stone", () => {
			const level = createTestLevel(["GSG"], 1, 0);
			const game = useGame(level);

			// Move from stone to grass
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.STONE);

			// Undo - should restore to stone (not change it)
			game.undo();
			expect(game.tiles.value[0][1].type).toBe(TileType.STONE);
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should detect stuck state correctly with stone tiles", () => {
			// Player on stone surrounded by mushrooms
			const level = createTestLevel(["MSM"], 1, 0);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(true);
		});

		it("should not be stuck if can move to stone", () => {
			// Player on grass next to stone
			const level = createTestLevel(["GS"], 0, 0);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(false);
		});
	});

	describe("water tiles", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should allow stepping onto water", () => {
			// G W S - water flows right to stone
			const level = createTestLevel(["GWS"], 0, 0, { "1,0": "right" });
			const game = useGame(level);

			game.movePlayer("right");

			// Wait for hop animation (200ms), then slide animation (150ms per tile)
			vi.advanceTimersByTime(200); // hop
			vi.advanceTimersByTime(150); // slide to stone

			// Should slide to stone
			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });
		});

		it("should slide through multiple water tiles to stone", () => {
			// G W W S - water flows right to stone
			const level = createTestLevel(["GWWS"], 0, 0, {
				"1,0": "right",
				"2,0": "right",
			});
			const game = useGame(level);

			game.movePlayer("right");

			// Wait for hop + slides
			vi.advanceTimersByTime(200); // hop
			vi.advanceTimersByTime(150); // slide to W at x=2
			vi.advanceTimersByTime(150); // slide to S at x=3

			// Should slide through both water tiles to stone
			expect(game.playerPosition.value).toEqual({ x: 3, y: 0 });
		});

		it("should plant mushroom only on starting grass tile", () => {
			const level = createTestLevel(["GWWS"], 0, 0, {
				"1,0": "right",
				"2,0": "right",
			});
			const game = useGame(level);

			game.movePlayer("right");
			vi.advanceTimersByTime(500); // wait for all animations

			// Mushroom planted on starting grass
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);
			// Water tiles remain water
			expect(game.tiles.value[0][1].type).toBe(TileType.WATER);
			expect(game.tiles.value[0][2].type).toBe(TileType.WATER);
		});

		it("should not plant mushroom on water tiles", () => {
			// Starting on water, move to next water then stone
			const level = createTestLevel(["GWS"], 0, 0, { "1,0": "right" });
			const game = useGame(level);

			game.movePlayer("right");
			vi.advanceTimersByTime(500); // wait for all animations

			// Water tile should still be water
			expect(game.tiles.value[0][1].type).toBe(TileType.WATER);
		});

		it("should not count water tiles toward win condition", () => {
			// Water tiles should not be counted as grass tiles remaining
			const level = createTestLevel(["GWWSG"], 0, 0, {
				"1,0": "right",
				"2,0": "right",
			});
			const game = useGame(level);

			// Initial: 2 grass tiles (at 0 and 4), 2 water tiles (at 1 and 2), 1 stone (at 3)
			expect(game.grassTilesRemaining.value).toBe(2);

			// Move to water -> slides to stone
			game.movePlayer("right");
			vi.advanceTimersByTime(500);

			// Now at stone (x=3), original grass became mushroom
			expect(game.playerPosition.value).toEqual({ x: 3, y: 0 });
			expect(game.grassTilesRemaining.value).toBe(1); // Only grass at x=4 remains

			// Water tiles don't count toward win - still have grass at x=4
			expect(game.hasWon.value).toBe(false);
		});

		it("should undo water slide correctly", () => {
			const level = createTestLevel(["GWWSG"], 0, 0, {
				"1,0": "right",
				"2,0": "right",
			});
			const game = useGame(level);

			game.movePlayer("right"); // Slides to stone at x=3
			vi.advanceTimersByTime(500); // wait for all animations
			expect(game.playerPosition.value).toEqual({ x: 3, y: 0 });

			game.undo();

			// Should be back at starting grass
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
			// Grass should be restored
			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
		});

		it("should handle water flowing down", () => {
			const level = createTestLevel(["G", "W", "S"], 0, 0, { "0,1": "down" });
			const game = useGame(level);

			game.movePlayer("down");
			vi.advanceTimersByTime(500); // wait for all animations

			expect(game.playerPosition.value).toEqual({ x: 0, y: 2 });
		});

		it("should handle water with bends (L-shaped)", () => {
			// G W .
			// . W S
			// Water flows: right at (1,0), down at (1,1), right to stone
			const level = createTestLevel(["GWV", "VWS"], 0, 0, {
				"1,0": "down",
				"1,1": "right",
			});
			const game = useGame(level);

			game.movePlayer("right");
			vi.advanceTimersByTime(500); // wait for all animations

			// Should follow the bend to stone
			expect(game.playerPosition.value).toEqual({ x: 2, y: 1 });
		});

		it("should not allow jumping over water (water is not an obstacle)", () => {
			const level = createTestLevel(["GWGG"], 0, 0, { "1,0": "right" });
			const game = useGame(level);

			// Can't jump over water
			expect(game.canReachByClick({ x: 2, y: 0 })).toBe(false);
			// Can step onto water
			expect(game.canReachByClick({ x: 1, y: 0 })).toBe(true);
		});

		it("should set isSliding during slide animation", () => {
			const level = createTestLevel(["GWS"], 0, 0, { "1,0": "right" });
			const game = useGame(level);

			game.movePlayer("right");

			// After hop animation, sliding should start
			vi.advanceTimersByTime(200);
			expect(game.isSliding.value).toBe(true);

			// After slide completes (path has 2 entries, needs 2 interval ticks: one to move to last tile, one to clear)
			vi.advanceTimersByTime(300); // 2 ticks at 150ms each
			expect(game.isSliding.value).toBe(false);
		});

		it("should return correct water flow direction", () => {
			const level = createTestLevel(["GWS"], 0, 0, { "1,0": "right" });
			const game = useGame(level);

			expect(game.getWaterFlow({ x: 1, y: 0 })).toBe("right");
			expect(game.getWaterFlow({ x: 0, y: 0 })).toBeNull();
		});
	});

	describe("dirt tiles", () => {
		it("should allow movement onto dirt tiles", () => {
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should convert dirt to grass when leaving (not mushroom)", () => {
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			// Move to dirt
			game.movePlayer("right");
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);

			// Move from dirt to grass - dirt should become grass
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.GRASS);
		});

		it("should plant mushroom when leaving converted grass (formerly dirt)", () => {
			// Layout: G D S G - use stone to allow returning to converted dirt
			const level = createTestLevel(["GDSG"], 0, 0);
			const game = useGame(level);

			// Move to dirt
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.DIRT);

			// Move from dirt to stone - dirt becomes grass
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.GRASS);

			// Move back to the converted grass tile (from stone)
			game.movePlayer("left");
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });

			// Move to stone again - now the converted grass should become mushroom
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.MUSHROOM);
		});

		it("should count dirt tiles as 2 in grassTilesRemaining", () => {
			// 2 grass + 1 dirt = 2 + 2 = 4
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			expect(game.grassTilesRemaining.value).toBe(4);
		});

		it("should not win if dirt tiles remain", () => {
			// 1 grass + 1 dirt, need to visit dirt twice
			const level = createTestLevel(["GD"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			// Dirt became grass, so we're on grass but there's another grass (converted)
			// Actually we're on the dirt tile (which is still dirt type)
			// The original grass became mushroom
			expect(game.hasWon.value).toBe(false);
		});

		it("should update grassTilesRemaining when dirt becomes grass", () => {
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			// Initial: 2 grass + 1 dirt (counts as 2) = 4
			expect(game.grassTilesRemaining.value).toBe(4);

			// Move to dirt - grass becomes mushroom, dirt becomes grass
			game.movePlayer("right");
			// Now: 2 grass (original + converted) + 0 dirt = 2 (minus mushroom) = 2
			// Actually: original grass is mushroom, we're on dirt (turns to grass when we leave)
			// Remaining: 1 grass + 1 dirt = 1 + 2 = 3
			expect(game.grassTilesRemaining.value).toBe(3);

			// Move to next grass - dirt becomes grass
			game.movePlayer("right");
			// Now: 2 grass tiles remain (converted dirt + current)
			expect(game.grassTilesRemaining.value).toBe(2);
		});

		it("should handle undo with dirt tiles", () => {
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			expect(game.tiles.value[0][0].type).toBe(TileType.MUSHROOM);

			game.undo();
			expect(game.tiles.value[0][0].type).toBe(TileType.GRASS);
			expect(game.tiles.value[0][1].type).toBe(TileType.DIRT);
		});

		it("should handle undo from dirt that became grass", () => {
			const level = createTestLevel(["GDG"], 0, 0);
			const game = useGame(level);

			// Move to dirt
			game.movePlayer("right");
			// Move from dirt to grass (dirt becomes grass)
			game.movePlayer("right");
			expect(game.tiles.value[0][1].type).toBe(TileType.GRASS);

			// Undo - should restore to dirt
			game.undo();
			expect(game.tiles.value[0][1].type).toBe(TileType.DIRT);
			expect(game.playerPosition.value).toEqual({ x: 1, y: 0 });
		});

		it("should allow jumping over bramble to dirt", () => {
			const level = createTestLevel(["GBD"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");

			expect(game.playerPosition.value).toEqual({ x: 2, y: 0 });
		});

		it("should detect stuck when surrounded after visiting dirt", () => {
			// After moving to dirt, player gets stuck
			const level = createTestLevel(["GDB", "BBB"], 0, 0);
			const game = useGame(level);

			game.movePlayer("right");
			// Now on dirt, surrounded by brambles on other sides
			expect(game.isStuck.value).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle void tiles correctly", () => {
			const level = createTestLevel(["GVG"], 0, 0);
			const game = useGame(level);

			// Can't move onto void
			game.movePlayer("right");
			expect(game.playerPosition.value).toEqual({ x: 0, y: 0 });
		});

		it("should handle single tile level", () => {
			const level = createTestLevel(["G"], 0, 0);
			const game = useGame(level);

			expect(game.isStuck.value).toBe(true);
			expect(game.grassTilesRemaining.value).toBe(1);
		});

		it("should handle level dimensions correctly", () => {
			const level = createTestLevel(["GGGGG", "GGGGG", "GGGGG"], 0, 0);
			const game = useGame(level);

			expect(game.levelWidth).toBe(5);
			expect(game.levelHeight).toBe(3);
		});
	});
});
