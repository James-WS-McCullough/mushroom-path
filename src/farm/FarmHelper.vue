<script setup lang="ts">
import { computed } from "vue";
import {
	countItems,
	type Helper,
	type HelperType,
	ITEMS,
	type ItemKind,
} from "./simulation";

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

const SPROUT_ART = {
	idle: "/art/MushroomGirl.webp",
	hop: "/art/MushroomGirl-Jump.webp",
	wait: "/art/MushroomGirl-Stuck.webp",
};

const DEW_ART = {
	idle: "/art/DialogueSprites/BlueGirl-Normal.webp",
	hop: "/art/DialogueSprites/BlueGirl-Laughing.webp",
	wait: "/art/DialogueSprites/BlueGirl-Thinking.webp",
};

/**
 * Each helper's art: standing, hopping, and waiting for something to
 * ripen. Hopper, Skater and Fairy borrow Sprout's and Dew's art (with a
 * badge to tell them apart) until they have their own.
 */
const SPRITES: Record<HelperType, typeof SPROUT_ART> = {
	sprout: SPROUT_ART,
	dew: DEW_ART,
	hopper: SPROUT_ART,
	skater: DEW_ART,
	fairy: SPROUT_ART,
};

/** Badges for the helpers that share art */
const BADGES: Partial<Record<HelperType, string>> = {
	hopper: "🐇",
	skater: "⛸️",
	fairy: "🧚",
};

const sprite = computed(() => {
	const art = SPRITES[props.helper.type];
	const move = props.helper.lastMove;
	if (move === "walk" || move === "jump") return art.hop;
	if (move === "wait") return art.wait;
	return art.idle;
});

const carried = computed(() => countItems(props.helper.basket));

/** What she's carrying, e.g. "🍄2🍢1" */
const basketLabel = computed(() =>
	(Object.entries(props.helper.basket) as [ItemKind, number][])
		.filter(([, count]) => count > 0)
		.map(([kind, count]) => `${ITEMS[kind].icon}${count}`)
		.join(""),
);

// The sprite faces left; flip it when she's heading right
const facingRight = computed(() =>
	props.helper.type === "skater"
		? props.helper.heading === "right"
		: props.helper.dir === 1,
);
</script>

<template>
  <button
    :class="[
      'helper',
      `helper--${helper.type}`,
      `helper--${helper.lastMove}`,
      { 'helper--dew-art': SPRITES[helper.type] === DEW_ART },
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
    <span v-if="BADGES[helper.type]" class="helper__badge">{{ BADGES[helper.type] }}</span>
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

/* Dew's art is a taller portrait, so she gets a narrower box */
.helper--dew-art .helper__body {
  width: 52px;
  height: 78px;
}

.helper__sprite {
  object-position: bottom;
}

/* The Fairy pops between her rings instead of walking */
.helper--fairy {
  transition: none;
}

.helper--fairy .helper__body {
  filter: drop-shadow(0 0 6px rgba(255, 240, 170, 0.9));
}

.helper--teleport .helper__body {
  animation: helper-poof 0.5s ease-out;
}

@keyframes helper-poof {
  0% {
    transform: translateX(-50%) scale(0.2);
    opacity: 0;
  }
  70% {
    transform: translateX(-50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) scale(1);
  }
}

.helper__badge {
  position: absolute;
  right: -2px;
  bottom: 2px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 252, 240, 0.95);
  font-size: 13px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
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
  .helper--jump .helper__body,
  .helper--teleport .helper__body {
    animation: none;
  }
}
</style>
