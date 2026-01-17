<script setup lang="ts">
import { computed } from "vue";
import type { FlowDirection, Tile } from "../types/game";
import { TileType } from "../types/game";

const props = defineProps<{
	tile: Tile;
	isPlayerHere: boolean;
	isReachable: boolean;
	isJustPlanted: boolean;
	flowDirection?: FlowDirection | null;
}>();

const emit = defineEmits<{
	click: [];
}>();

const tileClass = computed(() => {
	return {
		tile: true,
		"tile--grass": props.tile.type === TileType.GRASS,
		"tile--bramble": props.tile.type === TileType.BRAMBLE,
		"tile--mushroom": props.tile.type === TileType.MUSHROOM,
		"tile--void": props.tile.type === TileType.VOID,
		"tile--stone": props.tile.type === TileType.STONE,
		"tile--water": props.tile.type === TileType.WATER,
		"tile--dirt": props.tile.type === TileType.DIRT,
		"tile--ice": props.tile.type === TileType.ICE,
		"tile--reachable": props.isReachable && !props.isPlayerHere,
		"tile--has-player": props.isPlayerHere,
	};
});

const arrowRotation = computed(() => {
	// Chevrons point down at 0deg, so rotate to match flow direction
	switch (props.flowDirection) {
		case "down": return "0deg";
		case "left": return "90deg";
		case "up": return "180deg";
		case "right": return "270deg";
		default: return "0deg";
	}
});

// Deterministic mushroom variant based on position (0-4)
const mushroomVariant = computed(() => {
	const hash = props.tile.position.x * 7 + props.tile.position.y * 13;
	return hash % 5;
});

// Deterministic bramble variant based on position (0-2)
const brambleVariant = computed(() => {
	const hash = props.tile.position.x * 11 + props.tile.position.y * 17;
	return hash % 3;
});

function handleClick() {
	if (props.isReachable && !props.isPlayerHere) {
		emit("click");
	}
}
</script>

<template>
  <div :class="tileClass" @click="handleClick">
    <!-- Grass details -->
    <div v-if="tile.type === TileType.GRASS" class="grass-detail">
      <div class="grass-blade"></div>
      <div class="grass-blade"></div>
      <div class="grass-blade"></div>
    </div>

    <!-- Mushroom sprites - different variants -->
    <div v-if="tile.type === TileType.MUSHROOM" :class="['mushroom-container', { 'mushroom--pop': isJustPlanted }]">
      <!-- Variant 0: Single tan mushroom -->
      <div v-if="mushroomVariant === 0" class="mushroom mushroom--tan">
        <div class="mushroom__cap"></div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 1: Single red mushroom -->
      <div v-else-if="mushroomVariant === 1" class="mushroom mushroom--red">
        <div class="mushroom__cap">
          <div class="mushroom__spots"></div>
        </div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 2: Double tan mushrooms -->
      <div v-else-if="mushroomVariant === 2" class="mushroom-cluster">
        <div class="mushroom mushroom--tan mushroom--small mushroom--left">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tan mushroom--small mushroom--right">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
      </div>

      <!-- Variant 3: Single purple mushroom -->
      <div v-else-if="mushroomVariant === 3" class="mushroom mushroom--purple">
        <div class="mushroom__cap"></div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 4: Triple small mushrooms -->
      <div v-else class="mushroom-cluster mushroom-cluster--triple">
        <div class="mushroom mushroom--tiny mushroom--tan">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tiny mushroom--red">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tiny mushroom--tan">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
      </div>
    </div>

    <!-- Bramble sprite - variants -->
    <div v-if="tile.type === TileType.BRAMBLE" :class="['bramble', `bramble--variant-${brambleVariant}`]">
      <div class="thorns">
        <div class="thorn"></div>
        <div class="thorn"></div>
        <div class="thorn"></div>
        <div class="thorn"></div>
        <div class="thorn"></div>
      </div>
      <div class="vines">
        <div class="vine"></div>
        <div class="vine"></div>
        <div class="vine"></div>
      </div>
      <div class="berries">
        <div class="berry"></div>
        <div class="berry"></div>
        <div class="berry"></div>
      </div>
    </div>

    <!-- Stone tile details -->
    <div v-if="tile.type === TileType.STONE" class="stone-detail">
      <div class="stone-crack stone-crack--1"></div>
      <div class="stone-crack stone-crack--2"></div>
      <div class="pebble pebble--1"></div>
      <div class="pebble pebble--2"></div>
      <div class="pebble pebble--3"></div>
    </div>

    <!-- Dirt tile details -->
    <div v-if="tile.type === TileType.DIRT" class="dirt-detail">
      <div class="dirt-clump dirt-clump--1"></div>
      <div class="dirt-clump dirt-clump--2"></div>
      <div class="dirt-clump dirt-clump--3"></div>
      <div class="dirt-rock dirt-rock--1"></div>
      <div class="dirt-rock dirt-rock--2"></div>
    </div>

    <!-- Water tile with ripples, flow lines, and chevrons -->
    <div v-if="tile.type === TileType.WATER" class="water-detail">
      <!-- Background ripples for water aesthetic -->
      <div class="water-ripples">
        <div class="ripple ripple--1"></div>
        <div class="ripple ripple--2"></div>
        <div class="ripple ripple--3"></div>
      </div>
      <!-- Directional elements rotated to match flow -->
      <div class="water-flow" :style="{ '--flow-angle': arrowRotation }">
        <!-- Animated flowing waves -->
        <div class="water-waves">
          <div class="wave wave--1"></div>
          <div class="wave wave--2"></div>
          <div class="wave wave--3"></div>
        </div>
        <!-- Flow direction chevrons -->
        <div class="flow-chevrons">
          <div class="chevron chevron--1"></div>
          <div class="chevron chevron--2"></div>
          <div class="chevron chevron--3"></div>
        </div>
      </div>
    </div>

    <!-- Ice tile with frost and shimmer -->
    <div v-if="tile.type === TileType.ICE" class="ice-detail">
      <div class="ice-shine"></div>
      <div class="ice-cracks">
        <div class="ice-crack ice-crack--1"></div>
        <div class="ice-crack ice-crack--2"></div>
        <div class="ice-crack ice-crack--3"></div>
      </div>
      <div class="ice-sparkles">
        <div class="sparkle sparkle--1"></div>
        <div class="sparkle sparkle--2"></div>
        <div class="sparkle sparkle--3"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Grass tile */
.tile--grass {
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(140, 200, 120, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.grass-detail {
  position: absolute;
  bottom: 8px;
  display: flex;
  gap: 6px;
}

.grass-blade {
  width: 3px;
  height: 12px;
  background: linear-gradient(to top, #5a9a4a, #8bc475);
  border-radius: 3px 3px 0 0;
  transform-origin: bottom;
}

.grass-blade:nth-child(1) {
  transform: rotate(-15deg);
  height: 10px;
}

.grass-blade:nth-child(2) {
  height: 14px;
}

.grass-blade:nth-child(3) {
  transform: rotate(15deg);
  height: 11px;
}

/* Void tile (invisible, empty space) */
.tile--void {
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

/* Bramble tile - purple thorny bushes */
.tile--bramble {
  background:
    radial-gradient(circle at 30% 40%, rgba(90, 60, 100, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(70, 45, 85, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #5a4868 0%, #463858 50%, #3a2d48 100%);
  cursor: not-allowed;
}

.bramble {
  position: relative;
  width: 100%;
  height: 100%;
}

.thorns {
  position: absolute;
  inset: 0;
}

.thorn {
  position: absolute;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 10px solid #2d2038;
}

.thorn:nth-child(1) {
  top: 8px;
  left: 12px;
  transform: rotate(-30deg);
}

.thorn:nth-child(2) {
  top: 12px;
  right: 14px;
  transform: rotate(25deg);
}

.thorn:nth-child(3) {
  bottom: 14px;
  left: 18px;
  transform: rotate(-15deg);
}

.thorn:nth-child(4) {
  bottom: 10px;
  right: 16px;
  transform: rotate(40deg);
}

.thorn:nth-child(5) {
  top: 28px;
  left: 32px;
  transform: rotate(10deg);
}

.vines {
  position: absolute;
  inset: 0;
}

.vine {
  position: absolute;
  width: 36px;
  height: 36px;
  border: 3px solid #6a5878;
  border-radius: 50%;
  border-color: #6a5878 transparent transparent transparent;
}

.vine:nth-child(1) {
  top: -8px;
  left: 6px;
  transform: rotate(50deg);
}

.vine:nth-child(2) {
  bottom: -12px;
  right: 2px;
  transform: rotate(-130deg);
}

.vine:nth-child(3) {
  top: 10px;
  right: -8px;
  width: 28px;
  height: 28px;
  transform: rotate(-40deg);
}

/* Berries add visual interest */
.berries {
  position: absolute;
  inset: 0;
}

.berry {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle at 30% 30%, #9a6aaa 0%, #7a4a8a 100%);
  border-radius: 50%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.berry:nth-child(1) {
  top: 16px;
  left: 24px;
}

.berry:nth-child(2) {
  bottom: 20px;
  right: 22px;
  width: 5px;
  height: 5px;
}

.berry:nth-child(3) {
  top: 32px;
  right: 28px;
  width: 4px;
  height: 4px;
}

/* Bramble variants */
.bramble--variant-1 .thorn:nth-child(1) {
  top: 10px;
  left: 8px;
}

.bramble--variant-1 .thorn:nth-child(3) {
  bottom: 10px;
  left: 26px;
}

.bramble--variant-1 .berry:nth-child(1) {
  top: 20px;
  left: 18px;
}

.bramble--variant-1 .berry:nth-child(2) {
  bottom: 16px;
  right: 18px;
}

.bramble--variant-2 .thorn:nth-child(2) {
  top: 18px;
  right: 10px;
}

.bramble--variant-2 .thorn:nth-child(4) {
  bottom: 16px;
  right: 24px;
}

.bramble--variant-2 .vine:nth-child(1) {
  top: -6px;
  left: 12px;
  transform: rotate(35deg);
}

.bramble--variant-2 .berry:nth-child(1) {
  top: 14px;
  left: 30px;
}

.bramble--variant-2 .berry:nth-child(3) {
  top: 26px;
  right: 20px;
}

/* Stone tile */
.tile--stone {
  background:
    radial-gradient(circle at 30% 30%, rgba(160, 160, 160, 0.3) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(100, 100, 100, 0.2) 0%, transparent 30%),
    linear-gradient(135deg, #9a9590 0%, #7a756f 50%, #6a655f 100%);
}

.stone-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stone-crack {
  position: absolute;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 1px;
}

.stone-crack--1 {
  width: 18px;
  height: 2px;
  top: 20px;
  left: 12px;
  transform: rotate(-8deg);
}

.stone-crack--2 {
  width: 12px;
  height: 1px;
  bottom: 18px;
  right: 14px;
  transform: rotate(15deg);
}

.pebble {
  position: absolute;
  background: linear-gradient(135deg, #b0aaa4 0%, #8a847e 100%);
  border-radius: 50%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.pebble--1 {
  width: 8px;
  height: 6px;
  bottom: 10px;
  left: 10px;
}

.pebble--2 {
  width: 6px;
  height: 5px;
  bottom: 14px;
  right: 16px;
}

.pebble--3 {
  width: 5px;
  height: 4px;
  top: 12px;
  right: 12px;
}

/* Dirt tile */
.tile--dirt {
  background:
    radial-gradient(circle at 25% 35%, rgba(120, 90, 60, 0.4) 0%, transparent 35%),
    radial-gradient(circle at 75% 65%, rgba(90, 65, 40, 0.3) 0%, transparent 30%),
    linear-gradient(135deg, #8b6b4a 0%, #6d5238 50%, #5a4530 100%);
}

.dirt-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dirt-clump {
  position: absolute;
  background: linear-gradient(135deg, #7a5c40 0%, #5a4230 100%);
  border-radius: 50% 50% 40% 40%;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15);
}

.dirt-clump--1 {
  width: 14px;
  height: 10px;
  top: 12px;
  left: 10px;
  transform: rotate(-10deg);
}

.dirt-clump--2 {
  width: 12px;
  height: 8px;
  bottom: 14px;
  right: 12px;
  transform: rotate(15deg);
}

.dirt-clump--3 {
  width: 10px;
  height: 7px;
  bottom: 18px;
  left: 22px;
  transform: rotate(-5deg);
}

.dirt-rock {
  position: absolute;
  background: linear-gradient(135deg, #9a8878 0%, #7a6858 100%);
  border-radius: 40% 50% 45% 55%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.dirt-rock--1 {
  width: 8px;
  height: 6px;
  top: 18px;
  right: 16px;
}

.dirt-rock--2 {
  width: 6px;
  height: 5px;
  bottom: 12px;
  left: 14px;
}

/* Water tile */
.tile--water {
  background:
    radial-gradient(circle at 30% 30%, rgba(100, 180, 220, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(60, 140, 200, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #4a9fd9 0%, #3580b8 50%, #2a6a9a 100%);
  overflow: hidden;
}

.water-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Background ripples - not rotated, gives water texture */
.water-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  animation: rippleExpand 3s ease-out infinite;
}

.ripple--1 {
  top: 20%;
  left: 25%;
  animation-delay: 0s;
}

.ripple--2 {
  top: 50%;
  left: 60%;
  animation-delay: 1s;
}

.ripple--3 {
  top: 70%;
  left: 30%;
  animation-delay: 2s;
}

@keyframes rippleExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 0.4;
    transform: translate(-50%, -50%);
  }
  100% {
    width: 50px;
    height: 50px;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}

/* Directional flow elements - rotated based on flow direction */
.water-flow {
  position: absolute;
  inset: 0;
  transform: rotate(var(--flow-angle, 0deg));
}

/* Animated flowing waves - more transparent */
.water-waves {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.wave {
  position: absolute;
  left: 10%;
  width: 80%;
  height: 4px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 30%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.12) 70%,
    transparent 100%
  );
  border-radius: 2px;
  animation: waveFlow 1.5s linear infinite;
}

.wave--1 {
  animation-delay: 0s;
}

.wave--2 {
  animation-delay: 0.5s;
}

.wave--3 {
  animation-delay: 1s;
}

@keyframes waveFlow {
  0% {
    top: 5px;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    top: 55px;
    opacity: 0;
  }
}

/* Flow direction chevrons - pointing in flow direction (down after rotation) */
.flow-chevrons {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.chevron {
  width: 10px;
  height: 10px;
  border-right: 2px solid rgba(30, 80, 140, 0.7);
  border-bottom: 2px solid rgba(30, 80, 140, 0.7);
  transform: rotate(45deg);
}

/* Ice tile */
.tile--ice {
  background:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.6) 0%, transparent 40%),
    radial-gradient(circle at 75% 75%, rgba(200, 230, 255, 0.4) 0%, transparent 35%),
    linear-gradient(135deg, #b8e4f0 0%, #8fcde0 50%, #6ab8d0 100%);
}

.ice-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ice-shine {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, transparent 60%);
  border-radius: 50%;
}

.ice-cracks {
  position: absolute;
  inset: 0;
}

.ice-crack {
  position: absolute;
  background: rgba(150, 200, 220, 0.5);
  border-radius: 1px;
}

.ice-crack--1 {
  width: 20px;
  height: 1px;
  top: 22px;
  left: 8px;
  transform: rotate(-15deg);
}

.ice-crack--2 {
  width: 15px;
  height: 1px;
  bottom: 20px;
  right: 10px;
  transform: rotate(25deg);
}

.ice-crack--3 {
  width: 12px;
  height: 1px;
  top: 38px;
  left: 28px;
  transform: rotate(-5deg);
}

.ice-sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: sparkle 2s ease-in-out infinite;
}

.sparkle--1 {
  top: 12px;
  right: 14px;
  animation-delay: 0s;
}

.sparkle--2 {
  bottom: 16px;
  left: 18px;
  width: 3px;
  height: 3px;
  animation-delay: 0.7s;
}

.sparkle--3 {
  top: 32px;
  left: 12px;
  width: 2px;
  height: 2px;
  animation-delay: 1.4s;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

/* Mushroom tile (planted) - darker grass to show it's been visited */
.tile--mushroom {
  background:
    radial-gradient(circle at 20% 80%, rgba(90, 140, 70, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #5a9a4a 0%, #4a8040 100%);
}

.mushroom-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 40px;
}

.mushroom-container.mushroom--pop {
  animation: mushroomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes mushroomPop {
  0% {
    transform: scale(0) translateY(20px);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.mushroom {
  position: relative;
  width: 32px;
  height: 36px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.mushroom__cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 18px;
  border-radius: 15px 15px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.mushroom__stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 18px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 3px 3px 5px 5px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

/* Tan mushroom (default) */
.mushroom--tan .mushroom__cap {
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
}

.mushroom--tan .mushroom__cap::before,
.mushroom--tan .mushroom__cap::after {
  content: "";
  position: absolute;
  background: #fff5eb;
  border-radius: 50%;
}

.mushroom--tan .mushroom__cap::before {
  width: 6px;
  height: 4px;
  top: 5px;
  left: 6px;
}

.mushroom--tan .mushroom__cap::after {
  width: 5px;
  height: 4px;
  top: 8px;
  right: 7px;
}

/* Red mushroom (amanita style) */
.mushroom--red .mushroom__cap {
  background: linear-gradient(135deg, #e85a5a 0%, #d43d3d 50%, #c42a2a 100%);
}

.mushroom__spots {
  position: absolute;
  inset: 0;
}

.mushroom__spots::before,
.mushroom__spots::after {
  content: "";
  position: absolute;
  background: #fff;
  border-radius: 50%;
}

.mushroom__spots::before {
  width: 5px;
  height: 4px;
  top: 4px;
  left: 5px;
}

.mushroom__spots::after {
  width: 4px;
  height: 3px;
  top: 7px;
  right: 8px;
}

/* Purple mushroom */
.mushroom--purple .mushroom__cap {
  background: linear-gradient(135deg, #a67cb8 0%, #8e5ca0 50%, #7a4a8c 100%);
}

.mushroom--purple .mushroom__cap::before,
.mushroom--purple .mushroom__cap::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.mushroom--purple .mushroom__cap::before {
  width: 5px;
  height: 3px;
  top: 5px;
  left: 7px;
}

.mushroom--purple .mushroom__cap::after {
  width: 4px;
  height: 3px;
  top: 9px;
  right: 8px;
}

/* Mushroom clusters */
.mushroom-cluster {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.mushroom--small {
  width: 22px;
  height: 26px;
}

.mushroom--small .mushroom__cap {
  width: 20px;
  height: 12px;
  border-radius: 10px 10px 4px 4px;
}

.mushroom--small .mushroom__stem {
  width: 8px;
  height: 14px;
}

.mushroom--small .mushroom__cap::before {
  width: 4px;
  height: 3px;
  top: 3px;
  left: 4px;
}

.mushroom--small .mushroom__cap::after {
  width: 3px;
  height: 2px;
  top: 5px;
  right: 5px;
}

.mushroom--left {
  transform: rotate(-8deg);
}

.mushroom--right {
  transform: rotate(8deg);
}

/* Triple cluster */
.mushroom-cluster--triple {
  gap: 1px;
}

.mushroom--tiny {
  width: 16px;
  height: 20px;
}

.mushroom--tiny .mushroom__cap {
  width: 14px;
  height: 9px;
  border-radius: 7px 7px 3px 3px;
}

.mushroom--tiny .mushroom__stem {
  width: 6px;
  height: 11px;
}

.mushroom--tiny .mushroom__cap::before,
.mushroom--tiny .mushroom__cap::after {
  display: none;
}

.mushroom--tiny .mushroom__spots::before {
  width: 3px;
  height: 2px;
  top: 2px;
  left: 3px;
}

.mushroom--tiny .mushroom__spots::after {
  width: 2px;
  height: 2px;
  top: 4px;
  right: 4px;
}

.mushroom-cluster--triple .mushroom:nth-child(1) {
  transform: rotate(-12deg);
  margin-bottom: 2px;
}

.mushroom-cluster--triple .mushroom:nth-child(2) {
  margin-bottom: 4px;
}

.mushroom-cluster--triple .mushroom:nth-child(3) {
  transform: rotate(10deg);
}

/* Adjacent tile highlight */
.tile--reachable {
  cursor: pointer;
  box-shadow:
    0 0 0 3px rgba(255, 223, 186, 0.7),
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    inset 0 0 20px rgba(255, 240, 200, 0.3);
}

.tile--reachable:hover {
  transform: scale(1.05);
  box-shadow:
    0 0 0 4px rgba(255, 223, 186, 0.95),
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    inset 0 0 25px rgba(255, 240, 200, 0.5);
}
</style>
