<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import {
	playAcorn,
	playLand,
	playRandomDirt,
	playRandomPop,
	playStone,
	playUndo,
	playWater,
} from "../composables/useSound";
import type { Position } from "../types/game";
import { parseKey, posKey } from "../utils/positionUtils";
import FarmHelper from "./FarmHelper.vue";
import FarmTile from "./FarmTile.vue";
import {
	type BuildingKind,
	buyPlot,
	createFarm,
	cycleStationSetting,
	deserializeFarm,
	FARM,
	type FarmEvent,
	type FarmState,
	getBuildingCost,
	getExpansionSpots,
	getHelperCost,
	getHelperRoute,
	getPlotCost,
	getRouteStations,
	getSprinkledKeys,
	getStationSetting,
	getTile,
	type Helper,
	type HelperType,
	hireHelper,
	type LoadedFarm,
	moveBuilding,
	moveHelper,
	placeBuilding,
	removeBuilding,
	removeHelper,
	type StationSetting,
	serializeFarm,
	type TapResult,
	tapTile,
	tick,
	turnHelper,
} from "./simulation";

const emit = defineEmits<{
	exit: [];
}>();

const SAVE_KEY = "mushroom-farm-save";
const AUTOSAVE_MS = 5000;
const TILE = 64;
const GAP = 3;
const CELL = TILE + GAP;
/** Only mention time away that's long enough to notice */
const AWAY_SUMMARY_MIN_MS = 60_000;

function loadFarm(): LoadedFarm | null {
	try {
		const saved = localStorage.getItem(SAVE_KEY);
		return saved ? deserializeFarm(saved, Date.now()) : null;
	} catch {
		// Storage unavailable - start fresh
		return null;
	}
}

const loaded = loadFarm();
const farm = reactive<FarmState>(loaded?.state ?? createFarm());

/** "While you were away" summary, shown once on arrival */
const awaySummary = ref(
	loaded && loaded.soldWhileAway > 0 && loaded.awayMs >= AWAY_SUMMARY_MIN_MS
		? loaded
		: null,
);

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
	if (lastFrame) {
		const events = tick(farm, now - lastFrame);
		// Skip the fanfare for a big catch-up
		if (events.length < 30) events.forEach(showHelperEvent);
	}
	lastFrame = now;
	if (now - lastSave > AUTOSAVE_MS) {
		saveFarm();
		lastSave = now;
	}
	frameId = requestAnimationFrame(frame);
}

function showHelperEvent(event: FarmEvent) {
	if (event.kind === "helperSold") {
		playAcorn(0.15);
		showPopup(event.position, `+${formatNumber(event.earned)} 🍄`, "good");
	} else {
		playRandomPop(0.08);
	}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const selectedHelperId = ref<number | null>(null);

const selectedHelper = computed(
	() => farm.helpers.find((h) => h.id === selectedHelperId.value) ?? null,
);

/** Dots along the selected helper's route */
const routeKeys = computed(() => {
	const helper = selectedHelper.value;
	if (!helper) return new Set<string>();
	return new Set(getHelperRoute(farm, helper).map((p) => posKey(p.x, p.y)));
});

/** Stations beside the selected helper's route, with her setting for each */
const routeStations = computed(() => {
	const helper = selectedHelper.value;
	if (!helper) return [];
	return getRouteStations(farm, helper).flatMap((key) => {
		const tile = farm.tiles[key];
		return tile
			? [
					{
						key,
						position: parseKey(key),
						setting: getStationSetting(helper, key, tile),
					},
				]
			: [];
	});
});

const SETTING_ICONS: Record<StationSetting, string> = {
	dropOff: "⬇️",
	pickUp: "⬆️",
	ignore: "⏸️",
};

const SETTING_LABELS: Record<StationSetting, string> = {
	dropOff: "Drop off",
	pickUp: "Pick up",
	ignore: "Ignore",
};

function cycleSetting(position: Position) {
	if (selectedHelperId.value === null) return;
	const setting = cycleStationSetting(farm, selectedHelperId.value, position);
	if (setting) {
		playStone();
		saveFarm();
	}
}

function helperName(helper: Helper): string {
	return helper.type === "sprout" ? "Sprout" : "Dew";
}

function helperStats(helper: Helper) {
	const minutes = helper.stats.activeMs / 60_000;
	return {
		perMinute:
			minutes > 0.1 ? Math.round(helper.stats.harvested / minutes) : null,
		waiting:
			helper.stats.activeMs > 0
				? Math.round((helper.stats.waitingMs / helper.stats.activeMs) * 100)
				: 0,
	};
}

function handleHelperClick(helper: Helper) {
	if (mode.value === "build") {
		handleBuildTap({ x: helper.x, y: helper.y });
		return;
	}
	selectedHelperId.value =
		selectedHelperId.value === helper.id ? null : helper.id;
}

function turnSelected() {
	if (selectedHelperId.value === null) return;
	turnHelper(farm, selectedHelperId.value);
	saveFarm();
}

function helperOffset(helper: Helper) {
	return {
		left: (helper.x - bounds.value.minX) * CELL,
		top: (helper.y - bounds.value.minY) * CELL,
	};
}

// ---------------------------------------------------------------------------
// Build mode
// ---------------------------------------------------------------------------

type Mode = "farm" | "build";
type Tool = BuildingKind | HelperType | "move" | "remove" | null;

const mode = ref<Mode>("farm");
const tool = ref<Tool>(null);
/** A building picked up with the move tool, waiting to be put down */
const movingFrom = ref<Position | null>(null);
/** A helper picked up with the move tool */
const movingHelperId = ref<number | null>(null);

const plotCost = computed(() => getPlotCost(farm));
const helperCost = computed(() => getHelperCost(farm));
const sprinkledKeys = computed(() => getSprinkledKeys(farm));

const BUILD_TOOLS: {
	tool: BuildingKind | HelperType;
	icon: string;
	label: string;
}[] = [
	{ tool: "sprout", icon: "🌱", label: "Sprout" },
	{ tool: "dew", icon: "💧", label: "Dew" },
	{ tool: "barrel", icon: "🫙", label: "Barrel" },
	{ tool: "path", icon: "🪨", label: "Path" },
	{ tool: "sprinkler", icon: "💦", label: "Sprinkler" },
];

function toolCost(t: BuildingKind | HelperType): number {
	return t === "sprout" || t === "dew"
		? helperCost.value
		: getBuildingCost(farm, t);
}

/** Faded plots for sale around the farm, shown while building */
const ghostSpots = computed(() =>
	mode.value === "build" ? getExpansionSpots(farm) : [],
);

/** Nudge towards build mode when there's something to buy */
const canAffordUpgrade = computed(
	() =>
		farm.money >= plotCost.value ||
		BUILD_TOOLS.some(({ tool: t }) => farm.money >= toolCost(t)),
);

function setMode(next: Mode) {
	mode.value = next;
	tool.value = null;
	movingFrom.value = null;
	movingHelperId.value = null;
	selectedHelperId.value = null;
}

function selectTool(next: Tool) {
	tool.value = tool.value === next ? null : next;
	movingFrom.value = null;
	movingHelperId.value = null;
}

function isMovingFrom(position: Position): boolean {
	return (
		movingFrom.value?.x === position.x && movingFrom.value?.y === position.y
	);
}

function handleGhostTap(position: Position) {
	const cost = plotCost.value;
	if (buyPlot(farm, position)) {
		playRandomDirt();
		showPopup(position, `-${formatNumber(cost)} 🍄`, "info");
		saveFarm();
	} else {
		playLand();
		showPopup(position, `Need ${formatNumber(cost)} 🍄`, "warn");
	}
}

function spent(position: Position, cost: number) {
	showPopup(position, `-${formatNumber(cost)} 🍄`, "info");
	saveFarm();
}

function handleBuildTap(position: Position) {
	const tile = getTile(farm, position);
	const helperHere = farm.helpers.find(
		(h) => h.x === position.x && h.y === position.y,
	);
	const current = tool.value;

	if (current === "sprout" || current === "dew") {
		const cost = helperCost.value;
		if (hireHelper(farm, current, position)) {
			playRandomPop();
			spent(position, cost);
		} else if (farm.money < cost && tile) {
			playLand();
			showPopup(position, `Need ${formatNumber(cost)} 🍄`, "warn");
		}
		return;
	}

	if (current === "sprinkler" || current === "barrel" || current === "path") {
		const cost = getBuildingCost(farm, current);
		if (placeBuilding(farm, current, position)) {
			if (current === "sprinkler") playWater();
			else playStone();
			spent(position, cost);
		} else if (tile?.kind === "plot" && farm.money < cost) {
			playLand();
			showPopup(position, `Need ${formatNumber(cost)} 🍄`, "warn");
		}
		return;
	}

	if (current === "move") {
		if (movingHelperId.value !== null) {
			if (moveHelper(farm, movingHelperId.value, position)) {
				playStone();
				movingHelperId.value = null;
				saveFarm();
			}
			return;
		}
		if (helperHere) {
			movingHelperId.value = helperHere.id;
			movingFrom.value = null;
			return;
		}
		const from = movingFrom.value;
		if (from && moveBuilding(farm, from, position)) {
			playStone();
			movingFrom.value = null;
			saveFarm();
		} else if (tile && tile.kind !== "plot") {
			// Pick up (or swap to) a building; tapping it again puts it back
			movingFrom.value = isMovingFrom(position) ? null : position;
		}
		return;
	}

	if (current === "remove") {
		if (helperHere && removeHelper(farm, helperHere.id)) {
			playUndo();
			showPopup(position, `Bye ${helperName(helperHere)}!`, "info");
			saveFarm();
		} else if (removeBuilding(farm, position)) {
			playUndo();
			showPopup(position, "Removed", "info");
			saveFarm();
		}
	}
}

const bounds = computed(() => {
	const xs = [
		...tiles.value.map((t) => t.position.x),
		...ghostSpots.value.map((p) => p.x),
	];
	const ys = [
		...tiles.value.map((t) => t.position.y),
		...ghostSpots.value.map((p) => p.y),
	];
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
	if (mode.value === "build") {
		handleBuildTap(position);
		return;
	}
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

/** A gentle nudge for brand new farms, and what each build tool does */
const hint = computed(() => {
	if (mode.value === "build") {
		const current = tool.value;
		if (current === "sprout")
			return "Tap a plot or path - Sprout walks left and right along her row";
		if (current === "dew")
			return "Tap a plot or path - Dew walks up and down her column";
		if (current === "barrel")
			return "Tap a plot to build a barrel - helpers can drop off and pick up there";
		if (current === "path")
			return "Tap a plot to lay stepping stones - helpers walk them, nothing grows";
		if (current === "sprinkler")
			return "Tap a plot to build a sprinkler - it waters the 8 plots around it";
		if (current === "move") {
			return movingFrom.value || movingHelperId.value !== null
				? "Now tap where it should go"
				: "Tap a helper or building to pick it up";
		}
		if (current === "remove") return "Tap a helper or building to remove it";
		return "Tap a faded plot to buy it, or pick something to build";
	}
	if (selectedHelper.value) return null;
	if (farm.totalSold > 0) {
		if (farm.helpers.length === 0 && farm.money >= helperCost.value) {
			return "You can afford a helper! Tap 🔨 Build";
		}
		const isFirstPlot = farm.plotsBought === 0 && farm.money >= plotCost.value;
		return isFirstPlot ? "You can afford a new plot! Tap 🔨 Build" : null;
	}
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

function formatDuration(ms: number): string {
	const minutes = Math.floor(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
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
            :sprinkled="sprinkledKeys.has(t.key)"
            :selected="isMovingFrom(t.position)"
            :data-pos="t.key"
            @click="handleTap(t.position)"
          />

          <!-- The selected helper's route -->
          <div
            v-for="key in routeKeys"
            :key="`route-${key}`"
            class="route-dot"
            :style="tileStyle(parseKey(key))"
          ></div>

          <FarmHelper
            v-for="helper in farm.helpers"
            :key="`helper-${helper.id}`"
            :helper="helper"
            :left="helperOffset(helper).left"
            :top="helperOffset(helper).top"
            :selected="helper.id === selectedHelperId || helper.id === movingHelperId"
            :basket-capacity="FARM.HELPER_BASKET"
            @select="handleHelperClick(helper)"
          />

          <!-- What the selected helper does at each station she passes -->
          <button
            v-for="station in routeStations"
            :key="`station-${station.key}`"
            :class="['station-badge', `station-badge--${station.setting}`]"
            :style="tileStyle(station.position)"
            :aria-label="`${SETTING_LABELS[station.setting]} - tap to change`"
            @click.stop="cycleSetting(station.position)"
          >
            <span class="station-badge__icon">{{ SETTING_ICONS[station.setting] }}</span>
            <span class="station-badge__label">{{ SETTING_LABELS[station.setting] }}</span>
          </button>

          <button
            v-for="spot in ghostSpots"
            :key="`ghost-${posKey(spot.x, spot.y)}`"
            :class="['ghost', { 'ghost--affordable': farm.money >= plotCost }]"
            :style="tileStyle(spot)"
            :aria-label="`Buy a plot for ${plotCost} mushrooms`"
            @click="handleGhostTap(spot)"
          >
            <span class="ghost__plus">+</span>
            <span class="ghost__price">{{ formatNumber(plotCost) }} 🍄</span>
          </button>

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

    <!-- The selected helper -->
    <section v-if="selectedHelper && mode === 'farm'" class="helper-panel">
      <div class="helper-panel__info">
        <strong class="helper-panel__name">
          {{ selectedHelper.type === "sprout" ? "🌱" : "💧" }} {{ helperName(selectedHelper) }}
        </strong>
        <span>🧺 {{ selectedHelper.basket }}/{{ FARM.HELPER_BASKET }}</span>
        <span v-if="helperStats(selectedHelper).perMinute !== null">
          {{ helperStats(selectedHelper).perMinute }} picked/min
        </span>
        <span :class="{ 'helper-panel__warn': helperStats(selectedHelper).waiting >= 30 }">
          ⏳ {{ helperStats(selectedHelper).waiting }}% waiting
        </span>
      </div>
      <p class="helper-panel__tip">
        Tap the badges on her stations to choose: drop off, pick up or ignore.
      </p>
      <div class="helper-panel__actions">
        <button class="helper-panel__button" @click="turnSelected">↔ Turn around</button>
        <button class="helper-panel__button" @click="selectedHelperId = null">Done</button>
      </div>
    </section>

    <!-- While you were away -->
    <Transition name="hint">
      <div v-if="awaySummary" class="away" @click="awaySummary = null">
        <div class="away__card" @click.stop>
          <h2 class="away__title">Welcome back! 🍄</h2>
          <p class="away__text">
            While you were away for {{ formatDuration(awaySummary.awayMs) }}, your helpers
            sold <strong>{{ formatNumber(awaySummary.soldWhileAway) }}</strong> mushrooms for
            <strong>+{{ formatNumber(awaySummary.earnedWhileAway) }} 🍄</strong>
          </p>
          <button class="away__button" @click="awaySummary = null">Lovely!</button>
        </div>
      </div>
    </Transition>

    <footer class="farm-tools">
      <div v-if="mode === 'build'" class="tool-row">
        <button
          v-for="item in BUILD_TOOLS"
          :key="item.tool"
          :class="['tool', { 'tool--active': tool === item.tool }]"
          @click="selectTool(item.tool)"
        >
          <span class="tool__icon">{{ item.icon }}</span>
          <span class="tool__label">{{ item.label }}</span>
          <span :class="['tool__price', { 'tool__price--short': farm.money < toolCost(item.tool) }]">
            {{ formatNumber(toolCost(item.tool)) }} 🍄
          </span>
        </button>
        <button :class="['tool', { 'tool--active': tool === 'move' }]" @click="selectTool('move')">
          <span class="tool__icon">✋</span>
          <span class="tool__label">Move</span>
        </button>
        <button :class="['tool', { 'tool--active': tool === 'remove' }]" @click="selectTool('remove')">
          <span class="tool__icon">🧹</span>
          <span class="tool__label">Remove</span>
        </button>
      </div>
      <div class="mode-row">
        <button :class="['mode', { 'mode--active': mode === 'farm' }]" @click="setMode('farm')">
          🌱 Farm
        </button>
        <button
          :class="[
            'mode',
            { 'mode--active': mode === 'build', 'mode--glow': mode === 'farm' && canAffordUpgrade },
          ]"
          @click="setMode('build')"
        >
          🔨 Build
        </button>
      </div>
    </footer>
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

.ghost {
  position: absolute;
  width: 64px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border: 2px dashed rgba(255, 248, 230, 0.45);
  border-radius: 8px;
  background: rgba(255, 248, 230, 0.08);
  color: rgba(255, 248, 230, 0.6);
  font: inherit;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.2s ease;
}

.ghost:active {
  transform: scale(0.94);
}

.ghost--affordable {
  border-color: rgba(255, 236, 160, 0.9);
  background: rgba(255, 236, 160, 0.18);
  color: #fff6d6;
}

.ghost__plus {
  font-size: 22px;
  line-height: 1;
}

.ghost__price {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.farm-tools {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 16px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #76583f 0%, #634a35 100%);
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.2);
}

.tool-row,
.mode-row {
  display: flex;
  gap: 8px;
  justify-content: center;
}

/* Lots of tools: let them scroll sideways on narrow screens */
.tool-row {
  justify-content: flex-start;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 0 16px;
}

.tool-row::-webkit-scrollbar {
  display: none;
}

.tool,
.mode {
  border: none;
  border-radius: 14px;
  color: #fff8ee;
  font: inherit;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.12s ease;
}

.tool:active,
.mode:active {
  transform: scale(0.95);
}

.tool {
  flex: 0 0 auto;
  min-width: 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.1);
}

.tool--active {
  background: rgba(255, 236, 160, 0.3);
  box-shadow: inset 0 0 0 2px rgba(255, 236, 160, 0.8);
}

.tool__icon {
  font-size: 22px;
}

.tool__label {
  font-size: 13px;
}

.tool__price {
  font-size: 12px;
  font-weight: 700;
  color: #fff3c4;
}

.tool__price--short {
  color: rgba(255, 220, 200, 0.6);
}

.mode {
  flex: 1;
  max-width: 180px;
  padding: 10px 12px;
  font-size: 16px;
  background: rgba(40, 24, 14, 0.3);
}

.mode--active {
  background: rgba(255, 255, 255, 0.24);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}

.mode--glow {
  animation: mode-glow 1.6s ease-in-out infinite;
}

@keyframes mode-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 226, 140, 0);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(255, 226, 140, 0.85);
  }
}

.route-dot {
  position: absolute;
  width: 64px;
  height: 64px;
  border: 2px dashed rgba(255, 248, 220, 0.9);
  border-radius: 8px;
  background: rgba(255, 248, 220, 0.16);
  pointer-events: none;
  z-index: 1;
}

.station-badge {
  position: absolute;
  width: 64px;
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 1px;
  padding: 2px 0 0;
  border: 3px solid rgba(255, 236, 160, 0.9);
  border-radius: 10px;
  background: rgba(40, 24, 14, 0.25);
  font: inherit;
  cursor: pointer;
  z-index: 6;
}

.station-badge--ignore {
  border-color: rgba(255, 255, 255, 0.5);
}

.station-badge--pickUp {
  border-color: rgba(150, 210, 255, 0.95);
}

.station-badge__icon {
  font-size: 18px;
  line-height: 1;
}

.station-badge__label {
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(40, 24, 14, 0.75);
  color: #fff6d6;
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.helper-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(255, 252, 240, 0.95);
  color: #5a4632;
  box-shadow: 0 -3px 10px rgba(0, 0, 0, 0.15);
}

.helper-panel__info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  font-size: 14px;
}

.helper-panel__name {
  font-size: 17px;
}

.helper-panel__warn {
  color: #b5502f;
  font-weight: 700;
}

.helper-panel__tip {
  margin: 0;
  font-size: 13px;
  opacity: 0.8;
}

.helper-panel__actions {
  display: flex;
  gap: 8px;
}

.helper-panel__button {
  flex: 1;
  padding: 8px 10px;
  border: none;
  border-radius: 12px;
  background: #8b6a4e;
  color: #fff8ee;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.away {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(30, 20, 12, 0.45);
  z-index: 20;
}

.away__card {
  max-width: 340px;
  padding: 22px;
  border-radius: 18px;
  background: #fffaf0;
  color: #5a4632;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.away__title {
  margin: 0 0 8px;
  font-size: 22px;
}

.away__text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.5;
}

.away__button {
  padding: 10px 26px;
  border: none;
  border-radius: 999px;
  background: #d98a5f;
  color: #fff;
  font: inherit;
  font-size: 16px;
  cursor: pointer;
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
