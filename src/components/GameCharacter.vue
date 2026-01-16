<script setup lang="ts">
import type { Position } from "../types/game";

defineProps<{
	position: Position;
	isHopping: boolean;
	isSliding: boolean;
	isStuck: boolean;
	boardPadding?: number;
}>();
</script>

<template>
  <div
    class="character"
    :style="{
      left: `${(boardPadding ?? 0) + position.x * 67}px`,
      top: `${(boardPadding ?? 0) + position.y * 67}px`,
    }"
  >
    <div :class="['character__sprite', { 'character__sprite--hopping': isHopping, 'character__sprite--sliding': isSliding, 'character__sprite--stuck': isStuck }]">
      <!-- Mushroom cap (hat) -->
      <div class="mushroom-cap"></div>
      <!-- Face -->
      <div class="face">
        <div :class="['eyes', { 'eyes--crying': isStuck }]">
          <div class="eye left"></div>
          <div class="eye right"></div>
        </div>
        <!-- Tears when stuck -->
        <div v-if="isStuck" class="tears">
          <div class="tear left"></div>
          <div class="tear right"></div>
        </div>
        <div class="cheeks">
          <div class="cheek left"></div>
          <div class="cheek right"></div>
        </div>
        <div :class="['mouth', { 'mouth--sad': isStuck }]"></div>
      </div>
      <!-- Body -->
      <div class="body"></div>
    </div>
  </div>
</template>

<style scoped>
.character {
  position: absolute;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: left 0.15s ease-out, top 0.15s ease-out;
  z-index: 10;
  pointer-events: none;
}

.character__sprite {
  position: relative;
  width: 48px;
  height: 56px;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.25));
  animation: idleBounce 0.8s ease-in-out infinite;
}

.character__sprite--hopping {
  animation: hop 0.2s ease-out forwards;
}

@keyframes hop {
  0% {
    transform: translateY(0) scale(1, 1);
  }
  30% {
    transform: translateY(-18px) scale(0.95, 1.05);
  }
  50% {
    transform: translateY(-20px) scale(0.95, 1.05);
  }
  80% {
    transform: translateY(-5px) scale(1.05, 0.95);
  }
  100% {
    transform: translateY(0) scale(1, 1);
  }
}

/* Sliding animation - smooth surfing motion */
.character__sprite--sliding {
  animation: slide 0.15s linear infinite;
}

@keyframes slide {
  0% {
    transform: translateY(-2px) rotate(-3deg);
  }
  50% {
    transform: translateY(0px) rotate(3deg);
  }
  100% {
    transform: translateY(-2px) rotate(-3deg);
  }
}

/* Mushroom cap - red with white spots */
.mushroom-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 44px;
  height: 24px;
  background: linear-gradient(135deg, #e85d5d 0%, #c94444 50%, #b33a3a 100%);
  border-radius: 22px 22px 8px 8px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.15);
}

.mushroom-cap::before,
.mushroom-cap::after {
  content: "";
  position: absolute;
  background: #fff8e7;
  border-radius: 50%;
}

.mushroom-cap::before {
  width: 8px;
  height: 6px;
  top: 6px;
  left: 8px;
}

.mushroom-cap::after {
  width: 6px;
  height: 5px;
  top: 10px;
  right: 10px;
}

/* Face */
.face {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 22px;
  background: linear-gradient(180deg, #ffe8d6 0%, #fdd9c4 100%);
  border-radius: 14px 14px 12px 12px;
}

.eyes {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.eye {
  width: 5px;
  height: 6px;
  background: #4a3728;
  border-radius: 50%;
}

.cheeks {
  position: absolute;
  top: 11px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 14px;
}

.cheek {
  width: 5px;
  height: 3px;
  background: #ffb5a0;
  border-radius: 50%;
  opacity: 0.7;
}

.mouth {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 2px;
  background: #c9877a;
  border-radius: 0 0 4px 4px;
}

/* Body - simple dress */
.body {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 16px;
  background: linear-gradient(180deg, #a8d5a2 0%, #8bc485 100%);
  border-radius: 4px 4px 10px 10px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

@keyframes idleBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

/* Stuck/crying state */
.character__sprite--stuck {
  animation: sadBounce 1.2s ease-in-out infinite;
}

@keyframes sadBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.eyes--crying .eye {
  height: 4px;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  transform: scaleY(0.8);
}

.tears {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
}

.tear {
  width: 3px;
  height: 6px;
  background: linear-gradient(180deg, rgba(135, 206, 250, 0.8) 0%, rgba(100, 180, 255, 0.9) 100%);
  border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
  animation: tearDrop 1s ease-in infinite;
}

.tear.right {
  animation-delay: 0.5s;
}

@keyframes tearDrop {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(8px) scale(0.8);
  }
}

.mouth--sad {
  width: 6px;
  height: 3px;
  background: #c9877a;
  border-radius: 0 0 6px 6px;
  transform: translateX(-50%) rotate(180deg);
  bottom: 3px;
}
</style>
