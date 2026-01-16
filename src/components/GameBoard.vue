<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { useGame } from "../composables/useGame";
import type { Direction, Level, Position } from "../types/game";
import GameCharacter from "./GameCharacter.vue";
import GameTile from "./GameTile.vue";

const TILE_SIZE = 64;
const GAP_SIZE = 3;
const ROOM_PADDING = 10;

const props = defineProps<{
	level: Level;
}>();

const emit = defineEmits<{
	win: [];
}>();

const game = useGame(props.level);

// Watch for win condition and emit to parent
watch(
	() => game.hasWon.value,
	(hasWon) => {
		if (hasWon) {
			emit("win");
		}
	},
);

const boardStyle = computed(() => ({
	gridTemplateColumns: `repeat(${game.levelWidth}, ${TILE_SIZE}px)`,
	gridTemplateRows: `repeat(${game.levelHeight}, ${TILE_SIZE}px)`,
}));

const hasRooms = computed(
	() => props.level.rooms && props.level.rooms.length > 0,
);

// Helper to safely access grid
function getGridCell(
	grid: boolean[][],
	y: number,
	x: number,
	maxY: number,
	maxX: number,
): boolean {
	if (y < 0 || y >= maxY || x < 0 || x >= maxX) return false;
	return grid[y]?.[x] ?? false;
}

// Compute unified room border as SVG path
const unifiedRoomPath = computed(() => {
	if (!props.level.rooms || props.level.rooms.length === 0) return null;

	const cellSize = TILE_SIZE + GAP_SIZE;

	// Create a grid marking which cells are in any room
	const maxX = Math.max(...props.level.rooms.map((r) => r.x + r.width)) + 1;
	const maxY = Math.max(...props.level.rooms.map((r) => r.y + r.height)) + 1;
	const grid: boolean[][] = Array.from({ length: maxY }, () =>
		Array.from({ length: maxX }, () => false),
	);

	// Mark cells that are in any room
	for (const room of props.level.rooms) {
		for (let y = room.y; y < room.y + room.height; y++) {
			for (let x = room.x; x < room.x + room.width; x++) {
				const row = grid[y];
				if (y < maxY && x < maxX && row) {
					row[x] = true;
				}
			}
		}
	}

	// Calculate bounds for SVG viewBox
	const bounds = props.level.rooms.reduce(
		(acc, room) => ({
			minX: Math.min(acc.minX, room.x),
			minY: Math.min(acc.minY, room.y),
			maxX: Math.max(acc.maxX, room.x + room.width),
			maxY: Math.max(acc.maxY, room.y + room.height),
		}),
		{ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
	);

	const svgX = bounds.minX * cellSize - ROOM_PADDING - 4;
	const svgY = bounds.minY * cellSize - ROOM_PADDING - 4;
	const svgWidth =
		(bounds.maxX - bounds.minX) * cellSize + ROOM_PADDING * 2 - GAP_SIZE + 8;
	const svgHeight =
		(bounds.maxY - bounds.minY) * cellSize + ROOM_PADDING * 2 - GAP_SIZE + 8;

	// Build paths around the unified shape
	let pathData = "";
	let insetPathData = "";
	const cornerRadius = 12;
	const insetAmount = 6;
	const insetCornerRadius = 8;

	for (let y = 0; y < maxY; y++) {
		for (let x = 0; x < maxX; x++) {
			if (!getGridCell(grid, y, x, maxY, maxX)) continue;

			const px = x * cellSize - ROOM_PADDING;
			const py = y * cellSize - ROOM_PADDING;
			const pw = cellSize + ROOM_PADDING * 2 - GAP_SIZE;
			const ph = cellSize + ROOM_PADDING * 2 - GAP_SIZE;

			// Determine which neighbors exist
			const hasTop = getGridCell(grid, y - 1, x, maxY, maxX);
			const hasBottom = getGridCell(grid, y + 1, x, maxY, maxX);
			const hasLeft = getGridCell(grid, y, x - 1, maxY, maxX);
			const hasRight = getGridCell(grid, y, x + 1, maxY, maxX);

			// Round corners only where there's no adjacent cell
			const tlr = !hasTop && !hasLeft ? cornerRadius : 0;
			const trr = !hasTop && !hasRight ? cornerRadius : 0;
			const brr = !hasBottom && !hasRight ? cornerRadius : 0;
			const blr = !hasBottom && !hasLeft ? cornerRadius : 0;

			// Main path
			pathData += `M ${px + tlr} ${py} `;
			pathData += `L ${px + pw - trr} ${py} `;
			if (trr) pathData += `Q ${px + pw} ${py} ${px + pw} ${py + trr} `;
			pathData += `L ${px + pw} ${py + ph - brr} `;
			if (brr)
				pathData += `Q ${px + pw} ${py + ph} ${px + pw - brr} ${py + ph} `;
			pathData += `L ${px + blr} ${py + ph} `;
			if (blr) pathData += `Q ${px} ${py + ph} ${px} ${py + ph - blr} `;
			pathData += `L ${px} ${py + tlr} `;
			if (tlr) pathData += `Q ${px} ${py} ${px + tlr} ${py} `;
			pathData += "Z ";

			// Inset path (for inner shadow effect)
			const ipx = px + insetAmount;
			const ipy = py + insetAmount;
			const ipw = pw - insetAmount * 2;
			const iph = ph - insetAmount * 2;
			const itlr = !hasTop && !hasLeft ? insetCornerRadius : 0;
			const itrr = !hasTop && !hasRight ? insetCornerRadius : 0;
			const ibrr = !hasBottom && !hasRight ? insetCornerRadius : 0;
			const iblr = !hasBottom && !hasLeft ? insetCornerRadius : 0;

			insetPathData += `M ${ipx + itlr} ${ipy} `;
			insetPathData += `L ${ipx + ipw - itrr} ${ipy} `;
			if (itrr)
				insetPathData += `Q ${ipx + ipw} ${ipy} ${ipx + ipw} ${ipy + itrr} `;
			insetPathData += `L ${ipx + ipw} ${ipy + iph - ibrr} `;
			if (ibrr)
				insetPathData += `Q ${ipx + ipw} ${ipy + iph} ${ipx + ipw - ibrr} ${ipy + iph} `;
			insetPathData += `L ${ipx + iblr} ${ipy + iph} `;
			if (iblr)
				insetPathData += `Q ${ipx} ${ipy + iph} ${ipx} ${ipy + iph - iblr} `;
			insetPathData += `L ${ipx} ${ipy + itlr} `;
			if (itlr) insetPathData += `Q ${ipx} ${ipy} ${ipx + itlr} ${ipy} `;
			insetPathData += "Z ";
		}
	}

	return {
		viewBox: `${svgX} ${svgY} ${svgWidth} ${svgHeight}`,
		path: pathData,
		insetPath: insetPathData,
		style: {
			left: `${svgX}px`,
			top: `${svgY}px`,
			width: `${svgWidth}px`,
			height: `${svgHeight}px`,
		},
	};
});

function isReachable(tilePos: Position): boolean {
	return game.canReachByClick(tilePos);
}

function isPlayerHere(tilePos: Position): boolean {
	return (
		tilePos.x === game.playerPosition.value.x &&
		tilePos.y === game.playerPosition.value.y
	);
}

function isJustPlanted(tilePos: Position): boolean {
	const planted = game.lastPlantedPosition.value;
	if (!planted) return false;
	return planted.x === tilePos.x && planted.y === tilePos.y;
}

function handleTileClick(position: Position) {
	game.moveToPosition(position);
}

function handleKeydown(event: KeyboardEvent) {
	const keyMap: Record<string, Direction> = {
		ArrowUp: "up",
		ArrowDown: "down",
		ArrowLeft: "left",
		ArrowRight: "right",
		w: "up",
		W: "up",
		s: "down",
		S: "down",
		a: "left",
		A: "left",
		d: "right",
		D: "right",
	};

	const direction = keyMap[event.key];
	if (direction) {
		event.preventDefault();
		game.movePlayer(direction);
		return;
	}

	// Undo with Z
	if (event.key === "z" || event.key === "Z") {
		event.preventDefault();
		game.undo();
		return;
	}

	// Reset with R
	if (event.key === "r" || event.key === "R") {
		event.preventDefault();
		handleRestart();
	}
}

function handleRestart() {
	game.initializeGame();
}

onMounted(() => {
	window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
	window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div class="game-container">
    <div :class="['board-wrapper', { 'board-wrapper--no-bg': hasRooms }]">
      <div class="board" :style="boardStyle">
        <template v-for="(row, y) in game.tiles.value" :key="y">
          <GameTile
            v-for="(tile, x) in row"
            :key="`${x}-${y}`"
            :tile="tile"
            :is-player-here="isPlayerHere(tile.position)"
            :is-reachable="isReachable(tile.position)"
            :is-just-planted="isJustPlanted(tile.position)"
            :flow-direction="game.getWaterFlow(tile.position)"
            @click="handleTileClick(tile.position)"
          />
        </template>

        <!-- Unified room border -->
        <svg
          v-if="unifiedRoomPath"
          class="room-border-svg"
          :viewBox="unifiedRoomPath.viewBox"
          :style="unifiedRoomPath.style"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="roomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#8b7355" />
              <stop offset="100%" style="stop-color:#6d5a45" />
            </linearGradient>
            <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)" />
              <stop offset="10%" style="stop-color:rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="roomShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.4)" />
            </filter>
          </defs>
          <!-- Main shape with gradient and shadow -->
          <path
            :d="unifiedRoomPath.path"
            fill="url(#roomGradient)"
            fill-rule="nonzero"
            filter="url(#roomShadow)"
          />
          <!-- Outer border glow -->
          <path
            :d="unifiedRoomPath.path"
            fill="none"
            fill-rule="nonzero"
            stroke="rgba(139, 115, 85, 0.5)"
            stroke-width="4"
          />
          <!-- Inner darker area -->
          <path
            :d="unifiedRoomPath.insetPath"
            fill="rgba(0,0,0,0.15)"
            fill-rule="nonzero"
          />
          <!-- Top highlight -->
          <path
            :d="unifiedRoomPath.path"
            fill="url(#highlightGradient)"
            fill-rule="nonzero"
          />
        </svg>

        <GameCharacter
          :position="game.playerPosition.value"
          :is-hopping="game.isHopping.value"
          :is-sliding="game.isSliding.value"
          :is-stuck="game.isStuck.value"
          :board-padding="hasRooms ? 0 : 3"
        />
      </div>
    </div>

    <div class="controls-hint">
      <p>Use <kbd>WASD</kbd> or <kbd>Arrow Keys</kbd> to move</p>
      <p><kbd>Z</kbd> Undo · <kbd>R</kbd> Reset</p>
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.board-wrapper {
  background: linear-gradient(135deg, #8b7355 0%, #6d5a45 100%);
  padding: 12px;
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 4px rgba(139, 115, 85, 0.5),
    inset 0 2px 0 rgba(255, 255, 255, 0.1);
}

.board-wrapper--no-bg {
  background: transparent;
  box-shadow: none;
  padding: 12px;
}

.board {
  display: grid;
  gap: 3px;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  padding: 3px;
  border-radius: 8px;
}

.board-wrapper--no-bg .board {
  background: transparent;
  padding: 0;
}

.room-border-svg {
  position: absolute;
  pointer-events: none;
  z-index: -1;
  overflow: visible;
}

.controls-hint {
  text-align: center;
  color: #c8d4b8;
  font-size: 13px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.controls-hint p {
  margin: 3px 0;
}

.controls-hint kbd {
  background: rgba(255, 248, 230, 0.9);
  color: #5a4a3a;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: inherit;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
  font-size: 12px;
}
</style>
