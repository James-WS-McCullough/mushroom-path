<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { playVoiceStuck, playVoiceWave } from "../composables/useSound";
import type { Position } from "../types/game";

const props = defineProps<{
	position: Position;
	isHopping: boolean;
	isSliding: boolean;
	isStuck: boolean;
	boardPadding?: number;
}>();

// Blinking state
const isBlinking = ref(false);
let blinkInterval: ReturnType<typeof setInterval> | null = null;

// Idle attention state
const isWaving = ref(false);
const waveJumpCount = ref(0);
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let waveInterval: ReturnType<typeof setInterval> | null = null;

function startBlinking() {
	// Blink every 2-4 seconds
	const scheduleBlink = () => {
		const delay = 2000 + Math.random() * 2000;
		blinkInterval = setTimeout(() => {
			if (!props.isStuck && !props.isHopping && !props.isSliding && !isWaving.value) {
				isBlinking.value = true;
				setTimeout(() => {
					isBlinking.value = false;
				}, 150);
			}
			scheduleBlink();
		}, delay);
	};
	scheduleBlink();
}

function stopBlinking() {
	if (blinkInterval) {
		clearTimeout(blinkInterval);
		blinkInterval = null;
	}
}

function resetIdleTimer() {
	// Clear existing timers
	if (idleTimer) {
		clearTimeout(idleTimer);
		idleTimer = null;
	}
	if (waveInterval) {
		clearInterval(waveInterval);
		waveInterval = null;
	}
	isWaving.value = false;
	waveJumpCount.value = 0;

	// Start new idle timer (10-20 seconds)
	const idleDelay = 10000 + Math.random() * 10000;
	idleTimer = setTimeout(() => {
		if (!props.isStuck && !props.isHopping && !props.isSliding) {
			startWaveAnimation();
		}
	}, idleDelay);
}

function startWaveAnimation() {
	const jumpCount = 2 + Math.floor(Math.random() * 2); // 2 or 3 jumps
	waveJumpCount.value = 0;
	isWaving.value = true;
	playVoiceWave(0.6);

	waveInterval = setInterval(() => {
		waveJumpCount.value++;
		if (waveJumpCount.value >= jumpCount) {
			if (waveInterval) {
				clearInterval(waveInterval);
				waveInterval = null;
			}
			isWaving.value = false;
			// Reset idle timer for next attention grab
			resetIdleTimer();
		}
	}, 400);
}

// Watch for position changes to reset idle timer
watch(() => props.position, () => {
	resetIdleTimer();
}, { deep: true });

// Watch for movement states
watch([() => props.isHopping, () => props.isSliding], () => {
	if (props.isHopping || props.isSliding) {
		isBlinking.value = false;
		isWaving.value = false;
	}
});

// Watch for stuck state and play voice line
watch(() => props.isStuck, (stuck) => {
	if (stuck) {
		playVoiceStuck();
	}
});

onMounted(() => {
	startBlinking();
	resetIdleTimer();
});

onUnmounted(() => {
	stopBlinking();
	if (idleTimer) clearTimeout(idleTimer);
	if (waveInterval) clearInterval(waveInterval);
});

const spriteUrl = computed(() => {
	if (props.isStuck) {
		return "/art/MushroomGirl-Stuck.webp";
	}
	if (props.isHopping || props.isSliding) {
		return "/art/MushroomGirl-Jump.webp";
	}
	if (isWaving.value) {
		return "/art/MushroomGirl-Wave.webp";
	}
	if (isBlinking.value) {
		return "/art/MushroomGirl-blink.webp";
	}
	return "/art/MushroomGirl.webp";
});
</script>

<template>
  <div
    class="character"
    :style="{
      left: `${(boardPadding ?? 0) + position.x * 67}px`,
      top: `${(boardPadding ?? 0) + position.y * 67}px`,
    }"
  >
    <div :class="['character__sprite', { 'character__sprite--hopping': isHopping, 'character__sprite--stuck': isStuck, 'character__sprite--waving': isWaving }]">
      <img :src="spriteUrl" alt="Mushroom Girl" class="sprite-img" />
    </div>
  </div>
</template>

<style scoped>
.character {
  position: absolute;
  width: 64px;
  height: 64px;
  transition: left 0.15s ease-out, top 0.15s ease-out;
  z-index: 10;
  pointer-events: none;
}

.character__sprite {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 99px;
  height: 115px;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
}

.sprite-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.character__sprite--hopping {
  animation: hop 0.2s ease-out forwards;
}

@keyframes hop {
  0% {
    transform: translateX(-50%) translateY(0) scale(1, 1);
  }
  30% {
    transform: translateX(-50%) translateY(-18px) scale(0.95, 1.05);
  }
  50% {
    transform: translateX(-50%) translateY(-20px) scale(0.95, 1.05);
  }
  80% {
    transform: translateX(-50%) translateY(-5px) scale(1.05, 0.95);
  }
  100% {
    transform: translateX(-50%) translateY(0) scale(1, 1);
  }
}

/* Waving/attention animation - bouncy jumps */
.character__sprite--waving {
  animation: wave-bounce 0.4s ease-in-out infinite;
}

@keyframes wave-bounce {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-12px);
  }
}

/* Stuck/crying state - nervous side-to-side shaking */
.character__sprite--stuck {
  animation: nervousShake 0.8s ease-in-out infinite;
}

@keyframes nervousShake {
  0%, 100% {
    transform: translateX(-50%);
  }
  25% {
    transform: translateX(calc(-50% - 3px));
  }
  75% {
    transform: translateX(calc(-50% + 3px));
  }
}
</style>
