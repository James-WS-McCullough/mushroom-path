<script setup lang="ts">
import { computed } from "vue";
import { countItems, type Helper, ITEMS, type ItemKind } from "./simulation";

const props = defineProps<{
	helper: Helper;
	/** Pixel position of her tile on the board */
	left: number;
	top: number;
	selected?: boolean;
	basketCapacity: number;
}>();

const emit = defineEmits<{
	select: [];
}>();

const sprite = computed(() =>
	props.helper.lastMove === "walk" || props.helper.lastMove === "jump"
		? "/art/MushroomGirl-Jump.webp"
		: "/art/MushroomGirl.webp",
);

const carried = computed(() => countItems(props.helper.basket));

/** What she's carrying, e.g. "🍄2🍢1" */
const basketLabel = computed(() =>
	(Object.entries(props.helper.basket) as [ItemKind, number][])
		.filter(([, count]) => count > 0)
		.map(([kind, count]) => `${ITEMS[kind].icon}${count}`)
		.join(""),
);

// The sprite faces left; Sprout faces the way she walks, Dew looks along her column
const facingRight = computed(() => props.helper.dir === 1);
</script>

<template>
  <button
    :class="[
      'helper',
      `helper--${helper.type}`,
      `helper--${helper.lastMove}`,
      { 'helper--selected': selected, 'helper--full': carried >= basketCapacity },
    ]"
    :style="{ transform: `translate(${left}px, ${top}px)` }"
    :aria-label="helper.type === 'sprout' ? 'Sprout' : 'Dew'"
    @click.stop="emit('select')"
  >
    <span class="helper__shadow"></span>
    <!-- Re-keyed on every move so the hop animation plays each step -->
    <span :key="`${helper.x},${helper.y}`" class="helper__body">
      <img
        :src="sprite"
        alt=""
        :class="['helper__sprite', { 'helper__sprite--right': facingRight }]"
      />
    </span>
    <span v-if="carried > 0" class="helper__basket">{{ basketLabel }}</span>
  </button>
</template>

<style scoped>
.helper {
  position: absolute;
  left: 0;
  top: 0;
  width: 64px;
  height: 64px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  z-index: 5;
  transition: transform 0.45s ease-in-out;
  -webkit-tap-highlight-color: transparent;
}

.helper__shadow {
  position: absolute;
  left: 50%;
  bottom: 6px;
  width: 30px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  transform: translateX(-50%);
}

.helper__body {
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 70px;
  height: 82px;
  transform: translateX(-50%);
  pointer-events: none;
}

.helper--walk .helper__body {
  animation: helper-hop 0.45s ease-out;
}

.helper--jump .helper__body {
  animation: helper-leap 0.45s ease-out;
}

@keyframes helper-hop {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  45% {
    transform: translateX(-50%) translateY(-10px);
  }
}

@keyframes helper-leap {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  45% {
    transform: translateX(-50%) translateY(-26px);
  }
}

.helper__sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.25));
}

.helper__sprite--right {
  transform: scaleX(-1);
}

/* Dew is Sprout's blue-capped friend */
.helper--dew .helper__sprite {
  filter: hue-rotate(185deg) saturate(0.9) drop-shadow(0 3px 3px rgba(0, 0, 0, 0.25));
}

.helper--selected .helper__shadow {
  width: 46px;
  height: 14px;
  background: rgba(255, 236, 160, 0.75);
  box-shadow: 0 0 10px rgba(255, 236, 160, 0.9);
}

.helper__basket {
  position: absolute;
  left: 50%;
  top: -26px;
  transform: translateX(-50%);
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 252, 240, 0.92);
  color: #5a4632;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  pointer-events: none;
}

.helper--full .helper__basket {
  background: #ffd9c4;
}

@media (prefers-reduced-motion: reduce) {
  .helper {
    transition: none;
  }
  .helper--walk .helper__body,
  .helper--jump .helper__body {
    animation: none;
  }
}
</style>
