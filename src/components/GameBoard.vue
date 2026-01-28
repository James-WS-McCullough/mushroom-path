<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useGame } from "../composables/useGame";
import { playUndo } from "../composables/useSound";
import type { Direction, Level, Position } from "../types/game";
import DewCharacter from "./DewCharacter.vue";
import GameCharacter from "./GameCharacter.vue";
import GameTile from "./GameTile.vue";

const TILE_SIZE = 64;
const GAP_SIZE = 3;
const ROOM_PADDING = 10;
const CELL_SIZE = TILE_SIZE + GAP_SIZE;

const props = defineProps<{
	level: Level;
	hasIceElement?: boolean;
	hasDirtElement?: boolean;
	hasPondElement?: boolean;
	hasTidesElement?: boolean;
	hasAcornElement?: boolean;
	useDewCharacter?: boolean;
	disabled?: boolean;
	hintTiles?: Position[];
	stuckTiles?: Position[];
}>();

const emit = defineEmits<{
	win: [];
	mushroomsChanged: [count: number];
	moveCompleted: [];
	requestUndo: [];
	requestRestart: [];
	requestHint: [];
}>();

const game = useGame(props.level);

// Emit mushroom count changes to parent (counts actual mushroom tiles on board)
watch(
	() => game.mushroomTileCount.value,
	(count) => {
		emit("mushroomsChanged", count);
	},
	{ immediate: true },
);

// Track when moves complete (all animations finished)
const isMoveInProgress = computed(
	() =>
		game.isHopping.value || game.isSliding.value || game.isTeleporting.value,
);

watch(isMoveInProgress, (inProgress, wasInProgress) => {
	// Emit when transitioning from moving to not moving (and not won)
	if (wasInProgress && !inProgress && !game.hasWon.value) {
		emit("moveCompleted");
	}
});

// Camera system for maps that don't fit in viewport
const viewportRef = ref<HTMLElement | null>(null);
const viewportHeight = ref(0);
const viewportWidth = ref(0);
let resizeObserver: ResizeObserver | null = null;

// Calculate board dimensions (including wrapper padding and extra breathing room)
const WRAPPER_PADDING = 12;
const CAMERA_PADDING = 48; // Padding around the board when panning

const boardHeight = computed(() => {
	const innerPadding = hasRooms.value ? 0 : 6; // 3px padding on each side
	return (
		game.levelHeight * CELL_SIZE -
		GAP_SIZE +
		innerPadding +
		WRAPPER_PADDING * 2 +
		CAMERA_PADDING * 2
	);
});

const boardWidth = computed(() => {
	const innerPadding = hasRooms.value ? 0 : 6; // 3px padding on each side
	return (
		game.levelWidth * CELL_SIZE -
		GAP_SIZE +
		innerPadding +
		WRAPPER_PADDING * 2 +
		CAMERA_PADDING * 2
	);
});

// Check if camera panning is needed for each axis
const needsVerticalPanning = computed(() => {
	return boardHeight.value > viewportHeight.value && viewportHeight.value > 0;
});

const needsHorizontalPanning = computed(() => {
	return boardWidth.value > viewportWidth.value && viewportWidth.value > 0;
});

const needsPanning = computed(() => {
	return needsVerticalPanning.value || needsHorizontalPanning.value;
});

// Calculate camera offset to follow player
const cameraOffset = computed(() => {
	let offsetX = 0;
	let offsetY = 0;

	// Vertical panning
	if (needsVerticalPanning.value) {
		const playerY = game.playerPosition.value.y;
		const playerPixelY =
			playerY * CELL_SIZE + TILE_SIZE / 2 + WRAPPER_PADDING + CAMERA_PADDING;

		// Keep player centered vertically in viewport
		const targetOffsetY = playerPixelY - viewportHeight.value / 2;

		// Clamp to valid range
		const maxOffsetY = boardHeight.value - viewportHeight.value;
		offsetY = -Math.max(0, Math.min(targetOffsetY, maxOffsetY));
	}

	// Horizontal panning
	if (needsHorizontalPanning.value) {
		const playerX = game.playerPosition.value.x;
		const playerPixelX =
			playerX * CELL_SIZE + TILE_SIZE / 2 + WRAPPER_PADDING + CAMERA_PADDING;

		// Keep player centered horizontally in viewport
		const targetOffsetX = playerPixelX - viewportWidth.value / 2;

		// Clamp to valid range
		const maxOffsetX = boardWidth.value - viewportWidth.value;
		offsetX = -Math.max(0, Math.min(targetOffsetX, maxOffsetX));
	}

	return { x: offsetX, y: offsetY };
});

const boardTransform = computed(() => {
	if (!needsPanning.value) return {};

	const translateX = needsHorizontalPanning.value
		? cameraOffset.value.x + CAMERA_PADDING
		: 0;
	const translateY = needsVerticalPanning.value
		? cameraOffset.value.y + CAMERA_PADDING
		: 0;

	return {
		transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
	};
});

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
	// Don't show reachable tiles when board is disabled
	if (props.disabled) return false;
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

function isJustCleaned(tilePos: Position): boolean {
	const cleaned = game.lastCleanedPosition.value;
	if (!cleaned) return false;
	return cleaned.x === tilePos.x && cleaned.y === tilePos.y;
}

function isBounceActivated(tilePos: Position): boolean {
	const bouncePos = game.lastBouncePadPosition.value;
	if (!bouncePos) return false;
	return bouncePos.x === tilePos.x && bouncePos.y === tilePos.y;
}

function shouldShimmer(): boolean {
	return game.showHints.value;
}

function isHintTile(tilePos: Position): boolean {
	if (!props.hintTiles || props.hintTiles.length === 0) return false;
	return props.hintTiles.some(
		(hint) => hint.x === tilePos.x && hint.y === tilePos.y,
	);
}

function isStuckTile(tilePos: Position): boolean {
	if (!props.stuckTiles || props.stuckTiles.length === 0) return false;
	return props.stuckTiles.some(
		(stuck) => stuck.x === tilePos.x && stuck.y === tilePos.y,
	);
}

function getMovesUntilFloodForTile(tilePos: Position): number | undefined {
	if (!props.hasTidesElement) return undefined;
	const tile = game.tiles.value[tilePos.y]?.[tilePos.x];
	if (!tile || (tile.type !== "low_sand" && tile.type !== "sand_mushroom"))
		return undefined;
	return game.getMovesUntilFlood();
}

function getPoofStyle(position: Position) {
	const boardPadding = hasRooms.value ? 0 : 3;
	// Match character positioning: boardPadding + position * 67, then add half tile for center
	// Character sprite is 115px tall, anchored at bottom of 64px tile
	// Body center is roughly 50px up from tile bottom
	// Offset left by 3px to better align with character sprite
	return {
		left: `${boardPadding + position.x * 67 + TILE_SIZE / 2 - 3}px`,
		top: `${boardPadding + position.y * 67 + TILE_SIZE - 50}px`,
	};
}

function getAcornPopupStyle() {
	const boardPadding = hasRooms.value ? 0 : 3;
	const pos = game.playerPosition.value;
	// Position below the character's tile
	return {
		left: `${boardPadding + pos.x * 67 + TILE_SIZE / 2}px`,
		top: `${boardPadding + pos.y * 67 + TILE_SIZE + 8}px`,
	};
}

function handleTileClick(position: Position) {
	if (props.disabled) return;
	game.moveToPosition(position);
}

function handleKeydown(event: KeyboardEvent) {
	// Undo with Z - always allowed (even when disabled for help mode)
	if (event.key === "z" || event.key === "Z") {
		event.preventDefault();
		emit("requestUndo");
		return;
	}

	// Reset with R - always allowed (shows confirmation modal)
	if (event.key === "r" || event.key === "R") {
		event.preventDefault();
		emit("requestRestart");
		return;
	}

	// Hint with H - always allowed
	if (event.key === "h" || event.key === "H") {
		event.preventDefault();
		emit("requestHint");
		return;
	}

	// Movement keys are blocked when disabled
	if (props.disabled) return;

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
	}
}

onMounted(() => {
	window.addEventListener("keydown", handleKeydown);

	// Set up ResizeObserver to track viewport height
	if (viewportRef.value) {
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				viewportHeight.value = entry.contentRect.height;
				viewportWidth.value = entry.contentRect.width;
			}
		});
		resizeObserver.observe(viewportRef.value);
	}
});

onUnmounted(() => {
	window.removeEventListener("keydown", handleKeydown);
	if (resizeObserver) {
		resizeObserver.disconnect();
		resizeObserver = null;
	}
	game.cleanupIdleTimer();
});

// Expose undo functionality, stuck state, and hint for parent component
defineExpose({
	canUndo: game.canUndo,
	isStuck: game.isStuck,
	undo: () => {
		if (game.canUndo.value) {
			playUndo();
			game.undo();
		}
	},
	getHint: game.getHint,
	hasUnreachableTiles: game.hasUnreachableTiles,
});
</script>

<template>
  <div class="game-container">
    <div
      ref="viewportRef"
      :class="[
        'camera-viewport',
        {
          'camera-viewport--pan-vertical': needsVerticalPanning,
          'camera-viewport--pan-horizontal': needsHorizontalPanning,
        }
      ]"
    >
      <div
        :class="['board-wrapper', { 'board-wrapper--no-bg': hasRooms }]"
        :style="boardTransform"
      >
        <div class="board" :style="boardStyle">
        <template v-for="(row, y) in game.tiles.value" :key="y">
          <GameTile
            v-for="(tile, x) in row"
            :key="`${x}-${y}`"
            :tile="tile"
            :is-player-here="isPlayerHere(tile.position)"
            :is-reachable="isReachable(tile.position)"
            :is-just-planted="isJustPlanted(tile.position)"
            :is-just-cleaned="isJustCleaned(tile.position)"
            :is-hinted="isHintTile(tile.position)"
            :is-stuck-highlight="isStuckTile(tile.position)"
            :is-bounce-activated="isBounceActivated(tile.position)"
            :flow-direction="game.getWaterFlow(tile.position)"
            :has-ice-element="hasIceElement"
            :has-dirt-element="hasDirtElement"
            :has-pond-element="hasPondElement"
            :has-tides-element="hasTidesElement"
            :has-acorn-element="hasAcornElement"
            :tide-phase="game.tidePhase.value"
            :moves-until-flood="getMovesUntilFloodForTile(tile.position)"
            :lilypad-state="game.getLilypadState(tile.position)"
            :squirrel-requirement="game.getSquirrelRequirement(tile.position)"
            :collected-acorns="game.collectedAcorns.value"
            :should-shimmer="shouldShimmer()"
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

        <DewCharacter
          v-if="props.useDewCharacter"
          :position="game.playerPosition.value"
          :is-hopping="game.isHopping.value"
          :is-sliding="game.isSliding.value"
          :is-bouncing="game.isBouncing.value"
          :is-stuck="game.isStuck.value"
          :is-teleporting="game.isTeleporting.value"
          :teleport-phase="game.teleportPhase.value"
          :facing-direction="game.facingDirection.value"
          :board-padding="hasRooms ? 0 : 3"
          :disabled="props.disabled"
        />
        <GameCharacter
          v-else
          :position="game.playerPosition.value"
          :is-hopping="game.isHopping.value"
          :is-sliding="game.isSliding.value"
          :is-bouncing="game.isBouncing.value"
          :is-stuck="game.isStuck.value"
          :is-teleporting="game.isTeleporting.value"
          :teleport-phase="game.teleportPhase.value"
          :facing-direction="game.facingDirection.value"
          :board-padding="hasRooms ? 0 : 3"
          :disabled="props.disabled"
        />

        <!-- Acorn popup below player -->
        <div
          v-if="game.acornPopupValue.value !== null"
          class="acorn-popup"
          :style="getAcornPopupStyle()"
        >
          <div class="acorn-popup__bubble">
            <svg class="acorn-popup__icon" viewBox="0 0 16 20" width="14" height="17">
              <ellipse cx="8" cy="5" rx="6" ry="4" fill="#8B4513"/>
              <ellipse cx="8" cy="13" rx="5" ry="7" fill="#D2691E"/>
            </svg>
            <span class="acorn-popup__count">{{ game.collectedAcorns.value }}</span>
          </div>
          <div
            class="acorn-popup__change"
            :class="{ 'acorn-popup__change--positive': game.acornPopupValue.value > 0 }"
          >
            {{ game.acornPopupValue.value > 0 ? '+' : '' }}{{ game.acornPopupValue.value }}
          </div>
        </div>

        <!-- Teleport poof smoke effect -->
        <div
          v-for="(poofPos, index) in game.poofPositions.value"
          :key="`poof-${poofPos.x}-${poofPos.y}-${index}`"
          class="poof-effect"
          :style="getPoofStyle(poofPos)"
        >
          <div class="poof-smoke"></div>
        </div>
      </div>
      </div>
    </div>

    <!-- Floating remaining tiles counter -->
    <div class="tiles-remaining">
      {{ Math.max(0, game.grassTilesRemaining.value - 1) }}
    </div>
  </div>
</template>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.camera-viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  min-height: 0;
  width: 100%;
}

/* Vertical panning - align to top, keep horizontal centering */
.camera-viewport--pan-vertical {
  overflow: hidden;
  align-items: flex-start;
}

/* Horizontal panning - align to left */
.camera-viewport--pan-horizontal {
  overflow: hidden;
  justify-content: flex-start;
}

/* Apply smooth transform transition when any panning is active */
.camera-viewport--pan-vertical .board-wrapper,
.camera-viewport--pan-horizontal .board-wrapper {
  transition: transform 0.25s ease-out;
  will-change: transform;
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
  contain: layout style;
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

/* Teleport poof smoke effect */
.poof-effect {
  position: absolute;
  pointer-events: none;
  z-index: 100;
  transform: translate(-50%, -50%);
}

.poof-smoke {
  position: absolute;
  width: 60px;
  height: 60px;
  left: -30px;
  top: -30px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(245, 245, 255, 0.8) 30%, rgba(220, 220, 240, 0.4) 60%, transparent 80%);
  border-radius: 50%;
  animation: poof-expand 0.25s ease-out forwards;
}

@keyframes poof-expand {
  0% {
    opacity: 1;
    transform: scale(0.3);
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

/* Acorn popup that appears below player */
.acorn-popup {
  position: absolute;
  pointer-events: none;
  z-index: 150;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  animation: acorn-popup-appear 1.6s ease-out forwards;
}

.acorn-popup__bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(60, 45, 30, 0.9);
  padding: 4px 10px;
  border-radius: 14px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.acorn-popup__icon {
  flex-shrink: 0;
}

.acorn-popup__count {
  font-family: 'Georgia', serif;
  font-size: 16px;
  font-weight: bold;
  color: #f5e6c8;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.acorn-popup__change {
  font-family: 'Georgia', serif;
  font-size: 14px;
  font-weight: bold;
  color: #e85a3a;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 0 6px rgba(232, 90, 58, 0.4);
}

.acorn-popup__change--positive {
  color: #7cb668;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.5),
    0 0 6px rgba(124, 182, 104, 0.4);
}

@keyframes acorn-popup-appear {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.7);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1.05);
  }
  25% {
    transform: translateX(-50%) translateY(0) scale(1);
  }
  75% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(5px) scale(0.95);
  }
}

/* Floating remaining tiles counter */
.tiles-remaining {
  position: fixed;
  bottom: 70px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Georgia', serif;
  font-size: 32px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.6);
  text-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 10;
}

@media (max-width: 480px) {
  .tiles-remaining {
    bottom: 86px;
  }
}
</style>
