<script setup lang="ts">
import { computed } from "vue";
import type { Tile } from "../types/game";
import { TileType } from "../types/game";

const props = defineProps<{
	tile: Tile;
	isPlayer1Here: boolean;
	isPlayer2Here: boolean;
	isValidMove: boolean;
	isJustPlanted: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();

const tileClass = computed(() => {
	return {
		tile: true,
		"tile--grass": props.tile.type === TileType.GRASS,
		"tile--bramble": props.tile.type === TileType.BRAMBLE,
		"tile--void": props.tile.type === TileType.VOID,
		"tile--mushroom-red": props.tile.type === TileType.MUSHROOM_RED,
		"tile--mushroom-blue": props.tile.type === TileType.MUSHROOM_BLUE,
		"tile--mushroom-bag": props.tile.type === TileType.MUSHROOM_BAG,
		"tile--valid-move": props.isValidMove && !props.isPlayer1Here && !props.isPlayer2Here,
		"tile--has-player": props.isPlayer1Here || props.isPlayer2Here,
		"tile--just-planted": props.isJustPlanted,
	};
});

// Deterministic mushroom variant based on position
const mushroomVariant = computed(() => {
	const hash = props.tile.position.x * 7 + props.tile.position.y * 13;
	return hash % 5;
});

// Deterministic bramble variant based on position
const brambleVariant = computed(() => {
	const hash = props.tile.position.x * 11 + props.tile.position.y * 17;
	return hash % 6;
});
</script>

<template>
  <div
    :class="tileClass"
    @click="emit('click')"
  >
    <!-- Grass tile -->
    <template v-if="tile.type === TileType.GRASS">
      <div class="grass-base"></div>
      <div class="grass-detail grass-detail--1"></div>
      <div class="grass-detail grass-detail--2"></div>
    </template>

    <!-- Bramble tile -->
    <template v-else-if="tile.type === TileType.BRAMBLE">
      <div :class="['bramble', `bramble--v${brambleVariant}`]">
        <div class="bramble-base"></div>
        <div class="bramble-thorns"></div>
      </div>
    </template>

    <!-- Red Mushroom (Player 1) -->
    <template v-else-if="tile.type === TileType.MUSHROOM_RED">
      <div class="grass-base grass-base--red"></div>
      <div :class="['mushroom', 'mushroom--red', `mushroom--v${mushroomVariant}`]">
        <div class="mushroom-cap">
          <div class="mushroom-spots"></div>
        </div>
        <div class="mushroom-stem"></div>
      </div>
    </template>

    <!-- Blue Mushroom (Player 2 / Dew) -->
    <template v-else-if="tile.type === TileType.MUSHROOM_BLUE">
      <div class="grass-base grass-base--blue"></div>
      <div :class="['mushroom', 'mushroom--blue', `mushroom--v${mushroomVariant}`]">
        <div class="mushroom-cap">
          <div class="mushroom-spots"></div>
        </div>
        <div class="mushroom-stem"></div>
      </div>
    </template>

    <!-- Mushroom Bag pickup -->
    <template v-else-if="tile.type === TileType.MUSHROOM_BAG">
      <div class="grass-base"></div>
      <div class="mushroom-bag">
        <div class="bag-body"></div>
        <div class="bag-tie"></div>
        <div class="bag-mushroom bag-mushroom--1"></div>
        <div class="bag-mushroom bag-mushroom--2"></div>
      </div>
    </template>

    <!-- Valid move indicator -->
    <div v-if="isValidMove && !isPlayer1Here && !isPlayer2Here" class="valid-move-indicator"></div>
  </div>
</template>

<style scoped>
.tile {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  transition: transform 0.1s ease;
  box-sizing: border-box;
}

.tile:hover:not(.tile--void):not(.tile--has-player) {
  transform: scale(1.02);
}

.tile--void {
  background: transparent;
  cursor: default;
}

/* Grass base */
.grass-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #7cb668 0%, #5a9a4a 50%, #4a8a3a 100%);
  border-radius: 8px;
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.2),
    inset 0 -2px 4px rgba(0, 0, 0, 0.15);
}

.grass-base--red {
  background: linear-gradient(145deg, #c88080 0%, #a85050 50%, #8a3a3a 100%);
}

.grass-base--blue {
  background: linear-gradient(145deg, #8080c8 0%, #5050a8 50%, #3a3a8a 100%);
}

.grass-detail {
  position: absolute;
  width: 8px;
  height: 12px;
  background: linear-gradient(to top, #4a8a3a, #7cb668);
  border-radius: 3px 3px 0 0;
}

.grass-detail--1 {
  left: 12px;
  bottom: 8px;
  transform: rotate(-5deg);
}

.grass-detail--2 {
  right: 14px;
  bottom: 6px;
  transform: rotate(8deg);
  height: 10px;
}

/* Bramble */
.tile--bramble {
  background: linear-gradient(145deg, #4a3a2a 0%, #3a2a1a 100%);
}

.bramble {
  position: absolute;
  inset: 4px;
}

.bramble-base {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #6a5040 0%, #4a3020 100%);
  border-radius: 6px;
}

.bramble-thorns {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, #8a7060 2px, transparent 2px),
    radial-gradient(circle at 70% 40%, #8a7060 2px, transparent 2px),
    radial-gradient(circle at 40% 70%, #8a7060 2px, transparent 2px),
    radial-gradient(circle at 80% 80%, #8a7060 2px, transparent 2px);
}

/* Mushroom */
.mushroom {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 44px;
}

.mushroom--v0 { transform: translateX(-50%) scale(0.9); }
.mushroom--v1 { transform: translateX(-50%) scale(1.0); }
.mushroom--v2 { transform: translateX(-50%) scale(0.85); }
.mushroom--v3 { transform: translateX(-50%) scale(0.95); }
.mushroom--v4 { transform: translateX(-50%) scale(1.05); }

.mushroom-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 22px;
  border-radius: 18px 18px 6px 6px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
}

.mushroom--red .mushroom-cap {
  background: linear-gradient(135deg, #e85a5a 0%, #d43d3d 50%, #c42a2a 100%);
}

.mushroom--blue .mushroom-cap {
  background: linear-gradient(135deg, #5a5ae8 0%, #3d3dd4 50%, #2a2ac4 100%);
}

.mushroom-spots {
  position: absolute;
  inset: 0;
}

.mushroom-spots::before,
.mushroom-spots::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
}

.mushroom-spots::before {
  width: 6px;
  height: 5px;
  top: 5px;
  left: 6px;
}

.mushroom-spots::after {
  width: 5px;
  height: 4px;
  top: 10px;
  right: 8px;
}

.mushroom-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 22px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 3px 3px 5px 5px;
}

/* Mushroom Bag pickup */
.mushroom-bag {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
}

.bag-body {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 24px;
  background: linear-gradient(145deg, #d4a574 0%, #b8956a 50%, #a08050 100%);
  border-radius: 4px 4px 8px 8px;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.2);
}

.bag-tie {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 6px;
  background: #8a6a4a;
  border-radius: 2px;
}

.bag-mushroom {
  position: absolute;
  width: 10px;
  height: 12px;
}

.bag-mushroom::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 6px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 100%);
  border-radius: 5px 5px 2px 2px;
}

.bag-mushroom::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 6px;
  background: #f5e6d3;
  border-radius: 1px;
}

.bag-mushroom--1 {
  top: -2px;
  left: 4px;
  transform: rotate(-15deg);
}

.bag-mushroom--2 {
  top: -4px;
  right: 4px;
  transform: rotate(10deg);
}

/* Valid move indicator */
.tile--valid-move {
  cursor: pointer;
}

.valid-move-indicator {
  position: absolute;
  inset: 4px;
  border: 3px dashed rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  animation: pulse-border 1s ease-in-out infinite;
}

@keyframes pulse-border {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.98);
  }
  50% {
    opacity: 0.8;
    transform: scale(1);
  }
}

/* Just planted animation */
.tile--just-planted .mushroom {
  animation: pop-in 0.3s ease-out;
}

@keyframes pop-in {
  0% {
    transform: translateX(-50%) scale(0);
    opacity: 0;
  }
  60% {
    transform: translateX(-50%) scale(1.2);
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}
</style>
