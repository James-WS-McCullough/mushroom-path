<script setup lang="ts">
import { computed } from "vue";
import GameTile from "../components/GameTile.vue";
import type { Position } from "../types/game";
import { TileType } from "../types/game";
import {
	canCook,
	countItems,
	FARM,
	type FarmTile,
	type Inventory,
	ITEMS,
	type ItemKind,
	isMachine,
	RECIPES,
} from "./simulation";

const props = defineProps<{
	tile: FarmTile;
	position: Position;
	/** The log glows when there's something to sell */
	canSell?: boolean;
	/** A sprinkler is keeping this tile watered */
	sprinkled?: boolean;
	/** Highlighted by the build tools (e.g. picked up to move) */
	selected?: boolean;
}>();

const isWet = computed(
	() => props.tile.kind === "plot" && (props.tile.watered || props.sprinkled),
);

/** Growth below this shows as a little sprout, then the mushroom grows in */
const SPROUT_UNTIL = 0.3;

const stage = computed(() => {
	if (props.tile.kind !== "plot" || props.tile.growth === null) return "empty";
	if (props.tile.growth >= 1) return "ripe";
	return props.tile.growth < SPROUT_UNTIL ? "sprout" : "growing";
});

const growth = computed(() =>
	props.tile.kind === "plot" ? (props.tile.growth ?? 0) : 0,
);

/** The mushroom swells from 40% to full size as it ripens */
const cropScale = computed(() => {
	if (stage.value === "ripe") return 1;
	const t = (growth.value - SPROUT_UNTIL) / (1 - SPROUT_UNTIL);
	return 0.4 + 0.5 * Math.max(0, t);
});

/** Item icons with counts, e.g. "🍄4 🍢1" */
function describe(inventory: Inventory): string {
	return (Object.entries(inventory) as [ItemKind, number][])
		.filter(([, count]) => count > 0)
		.map(([kind, count]) => `${ITEMS[kind].icon}${count}`)
		.join(" ");
}

const machine = computed(() => (isMachine(props.tile) ? props.tile : null));
const isCooking = computed(() =>
	machine.value ? canCook(machine.value) : false,
);
const cookProgress = computed(() =>
	machine.value
		? machine.value.progress / RECIPES[machine.value.kind].timeMs
		: 0,
);

// Progress ring around growing plots
const RING_RADIUS = 7;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const mushroomTile = computed(() => ({
	type: TileType.MUSHROOM,
	position: props.position,
}));
</script>

<template>
  <div
    :class="[
      'farm-tile',
      `farm-tile--${tile.kind}`,
      {
        'farm-tile--wet': isWet,
        'farm-tile--selected': selected,
        'farm-tile--ripe': stage === 'ripe',
        'farm-tile--can-sell': tile.kind === 'log' && canSell,
      },
    ]"
  >
    <template v-if="tile.kind === 'plot'">
      <div class="soil">
        <div class="furrow"></div>
        <div class="furrow"></div>
        <div class="furrow"></div>
      </div>

      <div v-if="stage === 'sprout'" class="sprout">
        <div class="sprout__stem"></div>
        <div class="sprout__leaf sprout__leaf--left"></div>
        <div class="sprout__leaf sprout__leaf--right"></div>
      </div>

      <div
        v-else-if="stage === 'growing' || stage === 'ripe'"
        class="crop"
        :style="{ transform: `scale(${cropScale})` }"
      >
        <GameTile
          :tile="mushroomTile"
          :is-player-here="false"
          :is-reachable="false"
          :is-just-planted="false"
        />
      </div>

      <svg v-if="stage === 'sprout' || stage === 'growing'" class="progress" viewBox="0 0 20 20">
        <circle class="progress__track" cx="10" cy="10" :r="RING_RADIUS" />
        <circle
          class="progress__fill"
          cx="10"
          cy="10"
          :r="RING_RADIUS"
          :stroke-dasharray="RING_LENGTH"
          :stroke-dashoffset="RING_LENGTH * (1 - growth)"
        />
      </svg>

      <div v-if="isWet && stage !== 'empty'" class="droplets">
        <div class="droplet"></div>
        <div class="droplet"></div>
      </div>
    </template>

    <!-- Barrel: holds mushrooms for helpers to hand along -->
    <template v-else-if="tile.kind === 'barrel'">
      <svg class="barrel" viewBox="0 0 64 64" aria-hidden="true">
        <ellipse class="barrel__shadow" cx="32" cy="55" rx="18" ry="4" />
        <path class="barrel__body" d="M18 16 Q14 34 18 52 L46 52 Q50 34 46 16 Z" />
        <path class="barrel__stave" d="M26 17 Q24 34 26 51 M38 17 Q40 34 38 51" />
        <path class="barrel__hoop" d="M16.6 24 Q32 27 47.4 24 M16.6 44 Q32 47 47.4 44" />
        <ellipse class="barrel__top" cx="32" cy="16" rx="14" ry="5" />
        <ellipse class="barrel__inside" cx="32" cy="16.5" rx="11" ry="3.4" />
        <g v-if="countItems(tile.items) > 0" class="barrel__mushrooms">
          <path d="M25 16 Q28 10 31 16 Z" fill="#d9534f" />
          <path d="M31 16.5 Q34.5 9.5 38 16.5 Z" fill="#e0956a" />
          <path d="M35 17 Q37.5 12 40 17 Z" fill="#9b6bb0" />
        </g>
      </svg>
      <span
        :class="['barrel__count', { 'barrel__count--full': countItems(tile.items) >= FARM.BARREL_CAPACITY }]"
        :title="describe(tile.items)"
      >
        {{ countItems(tile.items) }}/{{ FARM.BARREL_CAPACITY }}
      </span>
    </template>

    <!-- Cooking stations and the well -->
    <template v-else-if="machine">
      <svg
        :class="['machine', `machine--${machine.kind}`, { 'machine--busy': isCooking }]"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <template v-if="machine.kind === 'campfire'">
          <ellipse cx="32" cy="48" rx="20" ry="7" class="stones" />
          <rect x="16" y="40" width="32" height="6" rx="3" class="wood" transform="rotate(-14 32 43)" />
          <rect x="16" y="40" width="32" height="6" rx="3" class="wood" transform="rotate(14 32 43)" />
          <path class="flame flame--outer" d="M32 14 C40 24 44 30 42 38 C40 44 24 44 22 38 C20 30 26 26 32 14 Z" />
          <path class="flame flame--inner" d="M32 24 C36 30 38 33 37 38 C36 41 28 41 27 38 C26 33 29 30 32 24 Z" />
        </template>
        <template v-else-if="machine.kind === 'stewpot'">
          <path class="flame flame--outer" d="M22 54 Q26 44 30 54 Q34 42 38 54 Q42 46 44 54 Z" />
          <path class="pot" d="M14 26 L50 26 Q52 50 32 52 Q12 50 14 26 Z" />
          <rect x="12" y="23" width="40" height="6" rx="3" class="pot-rim" />
          <ellipse cx="32" cy="26" rx="17" ry="3.2" class="stew" />
          <g class="steam">
            <path d="M25 18 Q22 13 26 9" />
            <path d="M33 17 Q30 11 34 6" />
            <path d="M41 18 Q38 13 42 9" />
          </g>
        </template>
        <template v-else>
          <path class="roof" d="M10 22 L32 8 L54 22 Z" />
          <rect x="16" y="21" width="3" height="16" class="post" />
          <rect x="45" y="21" width="3" height="16" class="post" />
          <rect x="12" y="34" width="40" height="18" rx="4" class="well-stone" />
          <ellipse cx="32" cy="35" rx="18" ry="4.5" class="well-water" />
          <path class="bucket" d="M28 24 L36 24 L35 31 L29 31 Z" />
        </template>
      </svg>

      <svg v-if="isCooking" class="progress" viewBox="0 0 20 20">
        <circle class="progress__track" cx="10" cy="10" :r="RING_RADIUS" />
        <circle
          class="progress__fill progress__fill--cooking"
          cx="10"
          cy="10"
          :r="RING_RADIUS"
          :stroke-dasharray="RING_LENGTH"
          :stroke-dashoffset="RING_LENGTH * (1 - cookProgress)"
        />
      </svg>

      <span v-if="describe(machine.input) || describe(machine.output)" class="machine__contents">
        <span v-if="describe(machine.input)">{{ describe(machine.input) }}</span>
        <span v-if="describe(machine.input) && describe(machine.output)">→</span>
        <strong v-if="describe(machine.output)">{{ describe(machine.output) }}</strong>
      </span>
    </template>

    <!-- Path: stepping stones helpers can walk -->
    <svg v-else-if="tile.kind === 'path'" class="path" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="18" cy="20" rx="11" ry="8" />
      <ellipse cx="44" cy="24" rx="10" ry="7.5" />
      <ellipse cx="22" cy="45" rx="10" ry="7.5" />
      <ellipse cx="46" cy="47" rx="11" ry="8" />
    </svg>

    <!-- Sprinkler: keeps the 8 tiles around it watered -->
    <svg v-else-if="tile.kind === 'sprinkler'" class="sprinkler" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse class="sprinkler__puddle" cx="32" cy="46" rx="20" ry="7" />
      <g class="sprinkler__spray">
        <circle cx="32" cy="10" r="2.2" />
        <circle cx="52" cy="22" r="1.8" />
        <circle cx="50" cy="42" r="2" />
        <circle cx="14" cy="42" r="1.8" />
        <circle cx="12" cy="22" r="2.2" />
        <circle cx="22" cy="12" r="1.5" />
        <circle cx="43" cy="12" r="1.5" />
      </g>
      <rect class="sprinkler__base" x="22" y="40" width="20" height="8" rx="4" />
      <rect class="sprinkler__pipe" x="29.5" y="24" width="5" height="18" rx="2" />
      <ellipse class="sprinkler__head" cx="32" cy="24" rx="8" ry="4.5" />
      <ellipse class="sprinkler__shine" cx="29.5" cy="22.8" rx="3" ry="1.3" />
    </svg>

    <!-- Hollow log: where mushrooms are sold -->
    <svg v-else-if="tile.kind === 'log'" class="log" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse class="log__shadow" cx="33" cy="52" rx="26" ry="5" />
      <rect class="log__bark" x="12" y="20" width="46" height="30" rx="9" />
      <path class="log__grain" d="M24 26 Q34 24 46 27 M22 35 Q36 33 52 36 M26 44 Q38 42 50 45" />
      <ellipse class="log__end" cx="14" cy="35" rx="10" ry="15" />
      <ellipse class="log__ring" cx="14" cy="35" rx="7" ry="11" />
      <ellipse class="log__hole" cx="14" cy="35" rx="4.5" ry="8" />
      <path class="log__moss" d="M20 21 Q26 14 33 19 Q39 13 46 19 Q52 15 57 22 L57 25 Q40 21 20 25 Z" />
      <g class="log__mushroom">
        <rect x="44" y="12" width="3" height="7" rx="1.5" fill="#f3e6d4" />
        <path d="M40 13 Q45.5 5 51 13 Z" fill="#d9534f" />
        <circle cx="44" cy="10.5" r="0.9" fill="#fff" />
        <circle cx="47.5" cy="11.5" r="0.7" fill="#fff" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.farm-tile {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.12s ease;
}

.farm-tile:active {
  transform: scale(0.94);
}

/* Tilled soil */
.soil {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background:
    radial-gradient(circle at 30% 25%, rgba(150, 105, 70, 0.35) 0%, transparent 45%),
    linear-gradient(160deg, #8c6142 0%, #74503a 60%, #644432 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.15);
  transition: filter 0.6s ease;
  overflow: hidden;
}

.furrow {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 5px;
  border-radius: 3px;
  background: rgba(60, 38, 26, 0.45);
  box-shadow: 0 2px 0 rgba(170, 125, 90, 0.25);
}

.furrow:nth-child(1) {
  top: 14px;
}

.furrow:nth-child(2) {
  top: 29px;
}

.furrow:nth-child(3) {
  top: 44px;
}

/* Watered soil is darker */
.farm-tile--wet .soil {
  filter: brightness(0.72) saturate(1.15);
}

.droplets {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.droplet {
  position: absolute;
  width: 6px;
  height: 8px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  background: radial-gradient(circle at 35% 35%, #e2f4ff 0%, #7cc4f0 60%, #4a9ad0 100%);
  opacity: 0.85;
  animation: droplet-shine 2.4s ease-in-out infinite;
}

.droplet:nth-child(1) {
  top: 8px;
  left: 9px;
}

.droplet:nth-child(2) {
  bottom: 9px;
  right: 10px;
  animation-delay: 1.2s;
}

@keyframes droplet-shine {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.95;
  }
}

/* Little sprout before the mushroom appears */
.sprout {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -40%);
}

.sprout__stem {
  position: absolute;
  left: 9px;
  bottom: 0;
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: #5c9a42;
}

.sprout__leaf {
  position: absolute;
  top: 2px;
  width: 9px;
  height: 6px;
  background: #7cc25a;
  border-radius: 100% 0;
}

.sprout__leaf--left {
  left: 1px;
  transform: rotate(-20deg);
}

.sprout__leaf--right {
  right: 0;
  transform: scaleX(-1) rotate(-20deg);
}

/* Growing mushroom, reusing the puzzle game's mushroom art */
.crop {
  position: absolute;
  inset: 0;
  transform-origin: 50% 85%;
  transition: transform 0.3s ease;
  pointer-events: none;
}

.crop :deep(.tile) {
  background: transparent;
  box-shadow: none;
}

.farm-tile--ripe .crop {
  animation: ripe-bob 1.8s ease-in-out infinite;
}

@keyframes ripe-bob {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.04) translateY(-2px);
  }
}

.farm-tile--ripe .soil {
  box-shadow:
    inset 0 -4px 0 rgba(0, 0, 0, 0.15),
    inset 0 0 0 2px rgba(255, 236, 170, 0.55);
}

.progress {
  position: absolute;
  right: 3px;
  bottom: 3px;
  width: 18px;
  height: 18px;
  transform: rotate(-90deg);
  pointer-events: none;
}

.progress__track {
  fill: rgba(40, 26, 18, 0.55);
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 3;
}

.progress__fill {
  fill: none;
  stroke: #a8e07c;
  stroke-width: 3;
  stroke-linecap: round;
}

.farm-tile--wet .progress__fill {
  stroke: #7cc4f0;
}

.farm-tile--selected {
  box-shadow:
    0 0 0 3px #fff2b8,
    0 0 14px rgba(255, 236, 160, 0.9);
  z-index: 2;
}

/* Barrel */
.farm-tile--barrel,
.farm-tile--path {
  background:
    radial-gradient(circle at 25% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
}

.barrel,
.path {
  width: 100%;
  height: 100%;
}

.barrel__shadow {
  fill: rgba(30, 50, 20, 0.3);
}

.barrel__body {
  fill: #a9744a;
  stroke: #6b4429;
  stroke-width: 1.5;
}

.barrel__stave {
  fill: none;
  stroke: rgba(80, 48, 28, 0.45);
  stroke-width: 1.2;
}

.barrel__hoop {
  fill: none;
  stroke: #6e6e70;
  stroke-width: 3;
}

.barrel__top {
  fill: #c99a68;
  stroke: #6b4429;
  stroke-width: 1.5;
}

.barrel__inside {
  fill: #3a2616;
}

.barrel__count {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(40, 24, 14, 0.7);
  color: #fff6d6;
  font-size: 10px;
  font-weight: 800;
  line-height: 15px;
  white-space: nowrap;
  pointer-events: none;
}

.barrel__count--full {
  background: rgba(190, 80, 50, 0.85);
}

/* Cooking stations and the well */
.farm-tile--campfire,
.farm-tile--stewpot,
.farm-tile--well {
  background:
    radial-gradient(circle at 25% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
}

.machine {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.stones {
  fill: #8f887b;
  stroke: #6e675b;
  stroke-width: 1.5;
}

.wood {
  fill: #7a5236;
  stroke: #5a3a24;
  stroke-width: 1;
}

.flame {
  transform-origin: 32px 44px;
  opacity: 0.35;
  transition: opacity 0.4s ease;
}

.flame--outer {
  fill: #f08a3c;
}

.flame--inner {
  fill: #ffd25c;
}

.machine--busy .flame {
  opacity: 1;
  animation: flicker 0.6s ease-in-out infinite alternate;
}

@keyframes flicker {
  from {
    transform: scale(1, 1);
  }
  to {
    transform: scale(0.94, 1.07);
  }
}

.pot {
  fill: #4b4b52;
  stroke: #2f2f34;
  stroke-width: 1.5;
}

.pot-rim {
  fill: #5d5d66;
}

.stew {
  fill: #b8763f;
}

.steam path {
  fill: none;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
}

.machine--busy .steam path {
  animation: steam-rise 1.6s ease-in-out infinite;
}

.machine--busy .steam path:nth-child(2) {
  animation-delay: 0.5s;
}

.machine--busy .steam path:nth-child(3) {
  animation-delay: 1s;
}

@keyframes steam-rise {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.roof {
  fill: #a0573a;
  stroke: #6e3a26;
  stroke-width: 1.5;
}

.post {
  fill: #7a5236;
}

.well-stone {
  fill: #9a948a;
  stroke: #6e675b;
  stroke-width: 1.5;
}

.well-water {
  fill: #4a9ad0;
  stroke: #6e675b;
  stroke-width: 1.2;
}

.bucket {
  fill: #b8893c;
  stroke: #6b4429;
  stroke-width: 1;
}

.progress__fill--cooking {
  stroke: #ffb35c;
}

.farm-tile--well .progress__fill--cooking {
  stroke: #7cc4f0;
}

.machine__contents {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  display: flex;
  gap: 2px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(40, 24, 14, 0.72);
  color: #fff6d6;
  font-size: 10px;
  line-height: 15px;
  white-space: nowrap;
  pointer-events: none;
}

/* Path */
.path ellipse {
  fill: #b9b2a4;
  stroke: #8f887b;
  stroke-width: 1.5;
}

/* Sprinkler */
.farm-tile--sprinkler {
  background:
    radial-gradient(circle at 50% 70%, rgba(120, 190, 220, 0.35) 0%, transparent 55%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
}

.sprinkler {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.sprinkler__puddle {
  fill: rgba(110, 180, 220, 0.45);
}

.sprinkler__base {
  fill: #8a8a86;
  stroke: #6a6a66;
  stroke-width: 1;
}

.sprinkler__pipe {
  fill: #b8893c;
  stroke: #8a6526;
  stroke-width: 1;
}

.sprinkler__head {
  fill: #d4a54a;
  stroke: #8a6526;
  stroke-width: 1.2;
}

.sprinkler__shine {
  fill: rgba(255, 245, 210, 0.7);
}

.sprinkler__spray {
  fill: #9fd6f5;
  transform-origin: 32px 26px;
  animation: spray-spin 2.8s linear infinite;
}

@keyframes spray-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sprinkler__spray,
  .machine--busy .flame,
  .machine--busy .steam path,
  .farm-tile--ripe .crop,
  .farm-tile--can-sell .log,
  .droplet {
    animation: none;
  }
}

/* Hollow log */
.farm-tile--log {
  background:
    radial-gradient(circle at 25% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
}

.log {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.log__shadow {
  fill: rgba(30, 50, 20, 0.3);
}

.log__bark {
  fill: #7a5236;
  stroke: #5a3a24;
  stroke-width: 1.5;
}

.log__grain {
  fill: none;
  stroke: #5e3d27;
  stroke-width: 1.4;
  stroke-linecap: round;
}

.log__end {
  fill: #c99a68;
  stroke: #6b4429;
  stroke-width: 1.5;
}

.log__ring {
  fill: none;
  stroke: #a77a4e;
  stroke-width: 1.2;
}

.log__hole {
  fill: #2e1d12;
}

.log__moss {
  fill: #6fae4f;
}

.farm-tile--can-sell .log {
  animation: log-wiggle 1.6s ease-in-out infinite;
}

.farm-tile--can-sell {
  box-shadow:
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    0 0 0 3px rgba(255, 226, 140, 0.8);
}

@keyframes log-wiggle {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-2deg);
  }
  75% {
    transform: rotate(2deg);
  }
}
</style>
