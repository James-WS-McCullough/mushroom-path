<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { FacingDirection, TeleportPhase } from "../composables/useGame";
import { playVoiceStuck, playVoiceWave } from "../composables/useSound";
import type { Position } from "../types/game";

const props = defineProps<{
	position: Position;
	isHopping: boolean;
	isSliding: boolean;
	isBouncing: boolean;
	isStuck: boolean;
	isTeleporting: boolean;
	teleportPhase: TeleportPhase;
	facingDirection: FacingDirection;
	boardPadding?: number;
	disabled?: boolean;
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
			if (
				!props.isStuck &&
				!props.isHopping &&
				!props.isSliding &&
				!isWaving.value
			) {
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

	// Start new idle timer (30-60 seconds)
	const idleDelay = 30000 + Math.random() * 30000;
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
	const speakChance = Math.random();
	if (speakChance < 0.3) {
		playVoiceWave(0.6);
	}

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
watch(
	() => props.position,
	() => {
		resetIdleTimer();
	},
	{ deep: true },
);

// Watch for movement states
watch([() => props.isHopping, () => props.isSliding], () => {
	if (props.isHopping || props.isSliding) {
		isBlinking.value = false;
		isWaving.value = false;
	}
});

// Watch for stuck state and play voice line
watch(
	() => props.isStuck,
	(stuck) => {
		if (stuck) {
			playVoiceStuck();
		}
	},
);

// Watch for disabled state to pause/resume idle behavior
watch(
	() => props.disabled,
	(disabled) => {
		if (disabled) {
			// Pause idle behavior
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
		} else {
			// Resume idle behavior
			resetIdleTimer();
		}
	},
);

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
    :class="[
      'character',
      {
        'character--shrinking': teleportPhase === 'shrinking',
        'character--hidden': isTeleporting && !teleportPhase,
        'character--growing': teleportPhase === 'growing',
      }
    ]"
    :style="{
      transform: `translate3d(${(boardPadding ?? 0) + position.x * 67}px, ${(boardPadding ?? 0) + position.y * 67}px, 0)`,
    }"
  >
    <!-- Ground shadow -->
    <div :class="['character__shadow', { 'character__shadow--hopping': isHopping && !isBouncing, 'character__shadow--bouncing': isBouncing, 'character__shadow--waving': isWaving }]"></div>

    <div :class="['character__sprite', { 'character__sprite--hopping': isHopping && !isBouncing, 'character__sprite--bouncing': isBouncing, 'character__sprite--stuck': isStuck, 'character__sprite--waving': isWaving, 'character__sprite--facing-right': facingDirection === 'right' }]">
      <img :src="spriteUrl" alt="Mushroom Girl" class="sprite-img" />
    </div>
  </div>
</template>

<style scoped>
.character {
  position: absolute;
  left: 0;
  top: 0;
  width: 64px;
  height: 64px;
  transition: transform 0.15s ease-out;
  will-change: transform;
  z-index: 10;
  pointer-events: none;
}

/* Ground shadow */
.character__shadow {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 10px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 50%;
  z-index: -1;
}

/* Shadow shrinks when character hops */
.character__shadow--hopping {
  animation: shadow-hop 0.2s ease-out forwards;
}

@keyframes shadow-hop {
  0% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  30% {
    transform: translateX(-50%) scale(0.6);
    opacity: 0.5;
  }
  50% {
    transform: translateX(-50%) scale(0.5);
    opacity: 0.4;
  }
  80% {
    transform: translateX(-50%) scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}

/* Shadow pulses slightly when waving */
.character__shadow--waving {
  animation: shadow-wave 0.4s ease-in-out infinite;
}

@keyframes shadow-wave {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) scale(0.75);
    opacity: 0.6;
  }
}

/* Shrinking phase - player shrinks down before teleporting */
.character--shrinking {
  transition: transform 0s;
}

.character--shrinking .character__sprite,
.character--shrinking .character__shadow {
  animation: shrink-down 0.2s ease-in forwards;
}

@keyframes shrink-down {
  0% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) scale(0);
    opacity: 0;
  }
}

/* Hidden phase - player is invisible while teleporting */
.character--hidden {
  transition: transform 0s;
}

.character--hidden .character__sprite,
.character--hidden .character__shadow {
  opacity: 0;
  transform: translateX(-50%) scale(0);
}

/* Growing phase - player grows back after appearing */
.character--growing .character__sprite,
.character--growing .character__shadow {
  animation: grow-up 0.2s ease-out forwards;
}

@keyframes grow-up {
  0% {
    transform: translateX(-50%) scale(0);
    opacity: 0;
  }
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
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
  transition: transform 0.1s ease-out;
}

.character__sprite--facing-right .sprite-img {
  transform: scaleX(-1);
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

/* Dramatic bounce from bounce pad - much higher with symmetric arc */
.character__sprite--bouncing {
  animation: dramatic-bounce 0.4s linear forwards;
}

@keyframes dramatic-bounce {
  0% {
    transform: translateX(-50%) translateY(0) scale(1, 1);
  }
  15% {
    transform: translateX(-50%) translateY(-35px) scale(0.92, 1.12);
  }
  35% {
    transform: translateX(-50%) translateY(-52px) scale(0.9, 1.1);
  }
  50% {
    transform: translateX(-50%) translateY(-55px) scale(0.9, 1.08);
  }
  65% {
    transform: translateX(-50%) translateY(-52px) scale(0.92, 1.06);
  }
  85% {
    transform: translateX(-50%) translateY(-35px) scale(1.05, 0.95);
  }
  95% {
    transform: translateX(-50%) translateY(-8px) scale(1.1, 0.9);
  }
  100% {
    transform: translateX(-50%) translateY(0) scale(1, 1);
  }
}

/* Shadow shrinks more during bounce - symmetric */
.character__shadow--bouncing {
  animation: shadow-bounce 0.4s linear forwards;
}

@keyframes shadow-bounce {
  0% {
    transform: translateX(-50%) scale(1, 1);
    opacity: 0.3;
  }
  50% {
    transform: translateX(-50%) scale(0.4, 0.4);
    opacity: 0.15;
  }
  100% {
    transform: translateX(-50%) scale(1, 1);
    opacity: 0.3;
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
