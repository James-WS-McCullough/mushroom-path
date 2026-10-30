<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import {
	playAcorn,
	playLand,
	playRandomDirt,
	playRandomPop,
	playWater,
} from "../composables/useSound";
import type { Position } from "../types/game";
import { parseKey } from "../utils/positionUtils";
import FarmTile from "./FarmTile.vue";
import {
	createFarm,
	deserializeFarm,
	type FarmState,
	serializeFarm,
	type TapResult,
	tapTile,
	tick,
} from "./simulation";

const emit = defineEmits<{
	exit: [];
}>();

const SAVE_KEY = "mushroom-farm-save";
const AUTOSAVE_MS = 5000;
const TILE = 64;
const GAP = 3;
const CELL = TILE + GAP;

function loadFarm(): FarmState {
	try {
		const saved = localStorage.getItem(SAVE_KEY);
		const loaded = saved ? deserializeFarm(saved, Date.now()) : null;
		if (loaded) return loaded.state;
	} catch {
		// Storage unavailable - start fresh
	}
	return createFarm();
}

const farm = reactive<FarmState>(loadFarm());

function saveFarm() {
	try {
		localStorage.setItem(SAVE_KEY, serializeFarm(farm, Date.now()));
	} catch {
		// Storage unavailable - nothing to do
	}
}

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------

let frameId = 0;
let lastFrame = 0;
let lastSave = 0;

function frame(now: number) {
	// A long gap (tab in the background) catches up in one go
	if (lastFrame) tick(farm, now - lastFrame);
	lastFrame = now;
	if (now - lastSave > AUTOSAVE_MS) {
		saveFarm();
		lastSave = now;
	}
	frameId = requestAnimationFrame(frame);
}

function handleVisibility() {
	if (document.visibilityState === "hidden") saveFarm();
}

onMounted(() => {
	frameId = requestAnimationFrame(frame);
	if (fieldRef.value) {
		resizeObserver = new ResizeObserver(([entry]) => {
			if (entry) {
				fieldSize.value = {
					width: entry.contentRect.width,
					height: entry.contentRect.height,
				};
			}
		});
		resizeObserver.observe(fieldRef.value);
	}
	document.addEventListener("visibilitychange", handleVisibility);
	window.addEventListener("pagehide", saveFarm);
});

onUnmounted(() => {
	cancelAnimationFrame(frameId);
	resizeObserver?.disconnect();
	document.removeEventListener("visibilitychange", handleVisibility);
	window.removeEventListener("pagehide", saveFarm);
	saveFarm();
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const tiles = computed(() =>
	Object.entries(farm.tiles).map(([key, tile]) => ({
		key,
		tile,
		position: parseKey(key),
	})),
);

const bounds = computed(() => {
	const xs = tiles.value.map((t) => t.position.x);
	const ys = tiles.value.map((t) => t.position.y);
	const minX = Math.min(...xs);
	const minY = Math.min(...ys);
	return {
		minX,
		minY,
		width: (Math.max(...xs) - minX + 1) * CELL - GAP,
		height: (Math.max(...ys) - minY + 1) * CELL - GAP,
	};
});

// Scale the board to fill the field (bigger on roomy screens, smaller as the farm grows)
const FRAME_PADDING = 12;
const MAX_SCALE = 1.6;
const fieldRef = ref<HTMLElement | null>(null);
const fieldSize = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

const boardScale = computed(() => {
	const { width, height } = fieldSize.value;
	if (!width || !height) return 1;
	const frameWidth = bounds.value.width + FRAME_PADDING * 2;
	const frameHeight = bounds.value.height + FRAME_PADDING * 2;
	// Leave room for the hint below the board
	return Math.min(
		MAX_SCALE,
		(width - 32) / frameWidth,
		(height - 120) / frameHeight,
	);
});

function tileStyle(position: Position) {
	return {
		left: `${(position.x - bounds.value.minX) * CELL}px`,
		top: `${(position.y - bounds.value.minY) * CELL}px`,
	};
}

// ---------------------------------------------------------------------------
// Tapping
// ---------------------------------------------------------------------------

interface Popup {
	id: number;
	text: string;
	position: Position;
	tone: "good" | "info" | "warn";
}

const popups = ref<Popup[]>([]);
let nextPopupId = 0;
const basketShake = ref(false);

function showPopup(position: Position, text: string, tone: Popup["tone"]) {
	const popup: Popup = { id: nextPopupId++, text, position, tone };
	popups.value.push(popup);
	setTimeout(() => {
		popups.value = popups.value.filter((p) => p.id !== popup.id);
	}, 900);
}

function handleTap(position: Position) {
	const result: TapResult = tapTile(farm, position);
	switch (result.kind) {
		case "planted":
			playRandomDirt();
			break;
		case "watered":
			playWater();
			showPopup(position, "💧", "info");
			break;
		case "harvested":
			playRandomPop();
			showPopup(position, "+1 🧺", "good");
			break;
		case "basketFull":
			playLand();
			showPopup(position, "Basket full!", "warn");
			basketShake.value = true;
			setTimeout(() => {
				basketShake.value = false;
			}, 500);
			break;
		case "sold":
			playAcorn();
			showPopup(position, `+${result.earned} 🍄`, "good");
			saveFarm();
			break;
	}
}

const isBasketFull = computed(() => farm.basket >= farm.basketCapacity);

/** A gentle nudge for brand new farms */
const hint = computed(() => {
	if (farm.totalSold > 0) return null;
	const hasPlanted = Object.values(farm.tiles).some(
		(tile) => tile.kind === "plot" && tile.growth !== null,
	);
	if (farm.basket > 0) return "Tap the hollow log to sell your mushrooms!";
	if (hasPlanted)
		return "Tap a growing mushroom to water it - it grows twice as fast!";
	return "Tap a plot to plant a mushroom!";
});

function formatNumber(n: number): string {
	const value = Math.floor(n);
	if (value < 1000) return `${value}`;
	const units = ["K", "M", "B", "T"];
	let scaled = value;
	let unit = -1;
	while (scaled >= 1000 && unit < units.length - 1) {
		scaled /= 1000;
		unit++;
	}
	return `${scaled.toFixed(scaled < 10 ? 1 : 0)}${units[unit]}`;
}
</script>

<template>
  <div class="farm-screen">
    <header class="farm-bar">
      <button class="farm-bar__back" @click="emit('exit')">← Menu</button>
      <div class="farm-bar__stats">
        <div class="stat stat--money" title="Mushrooms to spend">
          <span class="stat__icon">🍄</span>
          <span class="stat__value">{{ formatNumber(farm.money) }}</span>
        </div>
        <div
          :class="['stat', 'stat--basket', { 'stat--full': isBasketFull, 'stat--shake': basketShake }]"
          title="Your basket"
        >
          <span class="stat__icon">🧺</span>
          <span class="stat__value">{{ farm.basket }}/{{ farm.basketCapacity }}</span>
        </div>
      </div>
    </header>

    <main ref="fieldRef" class="farm-field">
      <div
        class="farm-frame-slot"
        :style="{
          width: `${(bounds.width + FRAME_PADDING * 2) * boardScale}px`,
          height: `${(bounds.height + FRAME_PADDING * 2) * boardScale}px`,
        }"
      >
      <div class="farm-frame" :style="{ transform: `scale(${boardScale})` }">
        <div
          class="farm-board"
          :style="{ width: `${bounds.width}px`, height: `${bounds.height}px` }"
        >
          <FarmTile
            v-for="t in tiles"
            :key="t.key"
            class="farm-board__tile"
            :style="tileStyle(t.position)"
            :tile="t.tile"
            :position="t.position"
            :can-sell="farm.basket > 0"
            @click="handleTap(t.position)"
          />

          <TransitionGroup name="popup">
            <div
              v-for="popup in popups"
              :key="popup.id"
              :class="['popup', `popup--${popup.tone}`]"
              :style="tileStyle(popup.position)"
            >
              {{ popup.text }}
            </div>
          </TransitionGroup>
        </div>
      </div>
      </div>

      <Transition name="hint">
        <p v-if="hint" :key="hint" class="farm-hint">{{ hint }}</p>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.farm-screen {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  font-family: inherit;
}

.farm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  background: linear-gradient(180deg, #8b6a4e 0%, #76583f 100%);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
  color: #fff8ee;
}

.farm-bar__back {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.16);
  color: inherit;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.farm-bar__back:hover {
  background: rgba(255, 255, 255, 0.26);
}

.farm-bar__stats {
  display: flex;
  gap: 10px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(40, 24, 14, 0.35);
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat--full {
  background: rgba(190, 80, 50, 0.6);
}

.stat--shake {
  animation: shake 0.45s ease;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.farm-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 16px;
  overflow: auto;
}

.farm-frame-slot {
  flex-shrink: 0;
}

.farm-frame {
  width: fit-content;
  padding: 12px;
  transform-origin: top left;
  border-radius: 16px;
  background: linear-gradient(135deg, #8b7355 0%, #6d5a45 100%);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.35),
    inset 0 2px 0 rgba(255, 255, 255, 0.15);
}

.farm-board {
  position: relative;
}

.farm-board__tile {
  position: absolute;
}

.popup {
  position: absolute;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  text-shadow:
    0 1px 0 rgba(0, 0, 0, 0.5),
    0 0 6px rgba(0, 0, 0, 0.35);
  animation: popup-rise 0.9s ease-out forwards;
}

.popup--good {
  color: #fff6c8;
}

.popup--info {
  color: #d8f0ff;
}

.popup--warn {
  color: #ffd2c4;
}

@keyframes popup-rise {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-36px);
    opacity: 0;
  }
}

.farm-hint {
  margin: 0;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(255, 252, 240, 0.9);
  color: #5a4632;
  font-size: 15px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.hint-enter-active,
.hint-leave-active {
  transition: opacity 0.3s ease;
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
}
</style>
