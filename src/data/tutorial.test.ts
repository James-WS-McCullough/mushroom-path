import { describe, expect, it } from "vitest";
import { TileType } from "../types/game";
import { tutorialLevels } from "./tutorialLevels";
import {
	tutorialIntroDialogues,
	tutorialStuckDialogues,
	tutorialGoodbye,
	tutorialIntro1,
	tutorialIntro2,
	tutorialIntro3,
	tutorialIntro4,
	tutorialIntro5,
	tutorialStuck1,
	tutorialStuck2,
	tutorialStuck3,
	tutorialStuck4,
	tutorialStuck5,
} from "./tutorialDialogues";

describe("tutorialLevels", () => {
	it("should have exactly 5 tutorial levels", () => {
		expect(tutorialLevels).toHaveLength(5);
	});

	describe("level structure", () => {
		tutorialLevels.forEach((level, index) => {
			describe(`Level ${index + 1}: ${level.name}`, () => {
				it("should have a name starting with 'Grandpa's Garden'", () => {
					expect(level.name).toMatch(/^Grandpa's Garden:/);
				});

				it("should have valid dimensions", () => {
					expect(level.width).toBeGreaterThan(0);
					expect(level.height).toBeGreaterThan(0);
				});

				it("should have grid matching dimensions", () => {
					expect(level.grid).toHaveLength(level.height);
					level.grid.forEach((row) => {
						expect(row).toHaveLength(level.width);
					});
				});

				it("should have start position within bounds", () => {
					expect(level.startPosition.x).toBeGreaterThanOrEqual(0);
					expect(level.startPosition.x).toBeLessThan(level.width);
					expect(level.startPosition.y).toBeGreaterThanOrEqual(0);
					expect(level.startPosition.y).toBeLessThan(level.height);
				});

				it("should have start position on grass tile", () => {
					const startTile =
						level.grid[level.startPosition.y]?.[level.startPosition.x];
					expect(startTile).toBe(TileType.GRASS);
				});

				it("should only contain valid tile types", () => {
					const validTypes = Object.values(TileType);
					level.grid.forEach((row) => {
						row.forEach((tile) => {
							expect(validTypes).toContain(tile);
						});
					});
				});
			});
		});
	});

	describe("puzzle-specific mechanics", () => {
		it("Level 1 (First Steps) should be grass-only", () => {
			const level = tutorialLevels[0]!;
			const allTiles = level.grid.flat();
			const nonGrassTiles = allTiles.filter((t) => t !== TileType.GRASS);
			expect(nonGrassTiles).toHaveLength(0);
		});

		it("Level 2 (Hop Over) should contain brambles", () => {
			const level = tutorialLevels[1]!;
			const allTiles = level.grid.flat();
			const brambles = allTiles.filter((t) => t === TileType.BRAMBLE);
			expect(brambles.length).toBeGreaterThan(0);
		});

		it("Level 3 (Think Ahead) should contain void tiles", () => {
			const level = tutorialLevels[2]!;
			const allTiles = level.grid.flat();
			const voids = allTiles.filter((t) => t === TileType.VOID);
			expect(voids.length).toBeGreaterThan(0);
		});

		it("Level 4 (Stone Bridge) should contain stone tiles", () => {
			const level = tutorialLevels[3]!;
			const allTiles = level.grid.flat();
			const stones = allTiles.filter((t) => t === TileType.STONE);
			expect(stones.length).toBeGreaterThan(0);
		});

		it("Level 5 (Muddy Path) should contain dirt tiles", () => {
			const level = tutorialLevels[4]!;
			const allTiles = level.grid.flat();
			const dirt = allTiles.filter((t) => t === TileType.DIRT);
			expect(dirt.length).toBeGreaterThan(0);
		});
	});
});

describe("tutorialDialogues", () => {
	describe("intro dialogues array", () => {
		it("should have exactly 5 intro dialogues", () => {
			expect(tutorialIntroDialogues).toHaveLength(5);
		});

		it("should contain all individual intro dialogues", () => {
			expect(tutorialIntroDialogues).toContain(tutorialIntro1);
			expect(tutorialIntroDialogues).toContain(tutorialIntro2);
			expect(tutorialIntroDialogues).toContain(tutorialIntro3);
			expect(tutorialIntroDialogues).toContain(tutorialIntro4);
			expect(tutorialIntroDialogues).toContain(tutorialIntro5);
		});
	});

	describe("stuck dialogues array", () => {
		it("should have exactly 5 stuck dialogues", () => {
			expect(tutorialStuckDialogues).toHaveLength(5);
		});

		it("should contain all individual stuck dialogues", () => {
			expect(tutorialStuckDialogues).toContain(tutorialStuck1);
			expect(tutorialStuckDialogues).toContain(tutorialStuck2);
			expect(tutorialStuckDialogues).toContain(tutorialStuck3);
			expect(tutorialStuckDialogues).toContain(tutorialStuck4);
			expect(tutorialStuckDialogues).toContain(tutorialStuck5);
		});
	});

	describe("dialogue structure", () => {
		const allDialogues = [
			...tutorialIntroDialogues,
			...tutorialStuckDialogues,
			tutorialGoodbye,
		];

		allDialogues.forEach((dialogue) => {
			describe(`Dialogue: ${dialogue.id}`, () => {
				it("should have a unique id", () => {
					expect(dialogue.id).toBeTruthy();
					expect(typeof dialogue.id).toBe("string");
				});

				it("should have left and right characters defined", () => {
					expect(dialogue.leftCharacter).toBeTruthy();
					expect(dialogue.rightCharacter).toBeTruthy();
				});

				it("should have at least one line", () => {
					expect(dialogue.lines.length).toBeGreaterThan(0);
				});

				it("should have valid lines with required properties", () => {
					dialogue.lines.forEach((line, lineIndex) => {
						expect(line.speaker, `Line ${lineIndex} missing speaker`).toBeTruthy();
						expect(line.name, `Line ${lineIndex} missing name`).toBeTruthy();
						expect(line.text, `Line ${lineIndex} missing text`).toBeTruthy();
						expect(
							line.leftSprite,
							`Line ${lineIndex} missing leftSprite`,
						).toBeTruthy();
						expect(
							line.rightSprite,
							`Line ${lineIndex} missing rightSprite`,
						).toBeTruthy();
					});
				});

				it("should have exactly one highlighted character per line", () => {
					dialogue.lines.forEach((line, lineIndex) => {
						const hasLeft = line.leftHighlight === true;
						const hasRight = line.rightHighlight === true;
						expect(
							hasLeft || hasRight,
							`Line ${lineIndex} has no highlight`,
						).toBe(true);
						expect(
							hasLeft && hasRight,
							`Line ${lineIndex} has both highlights`,
						).toBe(false);
					});
				});
			});
		});
	});

	describe("intro dialogues content", () => {
		it("intro dialogues should be overlay mode (no background)", () => {
			tutorialIntroDialogues.forEach((dialogue) => {
				expect(dialogue.overlay).toBe(true);
				expect(dialogue.background).toBe("");
			});
		});

		it("intro 1 should mention controls (arrow keys/WASD)", () => {
			const allText = tutorialIntro1.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/arrow keys|WASD|tap/i);
		});

		it("intro 2 should mention jumping/brambles", () => {
			const allText = tutorialIntro2.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/jump|bramble/i);
		});

		it("intro 3 should mention thinking ahead", () => {
			const allText = tutorialIntro3.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/think ahead/i);
		});

		it("intro 4 should mention stone", () => {
			const allText = tutorialIntro4.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/stone/i);
		});

		it("intro 5 should mention dirt/mud and shovel", () => {
			const allText = tutorialIntro5.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/mud|dirt/i);
			expect(allText).toMatch(/shovel/i);
		});
	});

	describe("stuck dialogues content", () => {
		it("stuck dialogues should be overlay mode", () => {
			tutorialStuckDialogues.forEach((dialogue) => {
				expect(dialogue.overlay).toBe(true);
			});
		});

		it("all stuck dialogues should mention undo (Z or tap)", () => {
			tutorialStuckDialogues.forEach((dialogue, index) => {
				const allText = dialogue.lines.map((l) => l.text).join(" ");
				expect(
					allText,
					`Stuck dialogue ${index + 1} should mention undo`,
				).toMatch(/undo|press Z|press z/i);
			});
		});
	});

	describe("goodbye dialogue", () => {
		it("should exist", () => {
			expect(tutorialGoodbye).toBeTruthy();
		});

		it("should have a background (not overlay)", () => {
			expect(tutorialGoodbye.overlay).toBe(false);
			expect(tutorialGoodbye.background).toBeTruthy();
		});

		it("should mention rest/break", () => {
			const allText = tutorialGoodbye.lines.map((l) => l.text).join(" ");
			expect(allText).toMatch(/rest|break/i);
		});

		it("should have id 'tutorial-goodbye'", () => {
			expect(tutorialGoodbye.id).toBe("tutorial-goodbye");
		});
	});
});
