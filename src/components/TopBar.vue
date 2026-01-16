<script setup lang="ts">
import type { WorldElement } from "../types/game";
import { WorldElement as WE } from "../types/game";

defineProps<{
	levelName: string;
	elements: WorldElement[];
}>();

const emit = defineEmits<{
	showTutorial: [];
}>();
</script>

<template>
  <div class="top-bar">
    <div class="wood-texture"></div>
    <div class="bar-content">
      <button class="info-btn" @click="emit('showTutorial')" title="How to Play">
        <span class="info-icon">i</span>
      </button>
      <h2 class="level-name">{{ levelName }}</h2>
      <div class="elements-display">
        <div
          v-for="element in elements"
          :key="element"
          class="element-icon"
          :class="{ 'element-icon--dirt': element === WE.DIRT }"
          :title="element === WE.RIVERS ? 'Rivers' : element === WE.DIRT ? 'Dirt Patches' : element"
        >
          <!-- Water droplet icon for rivers -->
          <svg v-if="element === WE.RIVERS" viewBox="0 0 24 24" class="element-svg element-svg--water">
            <path d="M12 2c-5.33 8-8 12-8 15a8 8 0 1 0 16 0c0-3-2.67-7-8-15z" fill="currentColor"/>
          </svg>
          <!-- Dirt/soil mound icon -->
          <svg v-else-if="element === WE.DIRT" viewBox="0 0 24 24" class="element-svg element-svg--dirt">
            <ellipse cx="12" cy="18" rx="10" ry="4" fill="currentColor"/>
            <ellipse cx="12" cy="15" rx="7" ry="3" fill="currentColor" opacity="0.8"/>
            <circle cx="8" cy="16" r="1.5" fill="#4a3a2a"/>
            <circle cx="15" cy="17" r="1" fill="#4a3a2a"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.top-bar {
  position: relative;
  width: 100%;
  height: 64px;
  border-radius: 0;
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.wood-texture {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 20px,
      rgba(0, 0, 0, 0.03) 20px,
      rgba(0, 0, 0, 0.03) 21px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 60px,
      rgba(0, 0, 0, 0.05) 60px,
      rgba(0, 0, 0, 0.05) 62px
    ),
    linear-gradient(
      180deg,
      #a08060 0%,
      #8b6b4a 20%,
      #7a5c3d 50%,
      #8b6b4a 80%,
      #6d4c35 100%
    );
}

.wood-texture::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 30px 8px at 30% 30%, rgba(139, 107, 74, 0.4) 0%, transparent 100%),
    radial-gradient(ellipse 25px 6px at 70% 60%, rgba(139, 107, 74, 0.3) 0%, transparent 100%);
}

.wood-texture::after {
  content: "";
  position: absolute;
  inset: 0;
  border-top: 3px solid rgba(93, 65, 40, 0.6);
  border-bottom: 3px solid rgba(93, 65, 40, 0.6);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.bar-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  gap: 16px;
}

.info-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.95) 0%, rgba(240, 230, 210, 0.95) 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.15s ease;
}

.info-btn:hover {
  transform: scale(1.05);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.info-btn:active {
  transform: scale(0.95);
}

.info-icon {
  font-family: 'Georgia', serif;
  font-size: 22px;
  font-style: italic;
  font-weight: bold;
  color: #5a4a3a;
  line-height: 1;
}

.level-name {
  flex: 1;
  font-family: 'Georgia', serif;
  font-size: 28px;
  color: #fff8e7;
  margin: 0;
  text-align: center;
  text-shadow:
    0 2px 0 #4a3a2a,
    0 3px 6px rgba(0, 0, 0, 0.4);
  letter-spacing: 2px;
}

.elements-display {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 40px;
  justify-content: flex-end;
}

.element-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.9) 0%, rgba(240, 230, 210, 0.9) 100%);
  border-radius: 50%;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.element-svg {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
}

.element-svg--water {
  color: #4a90d9;
}

.element-svg--dirt {
  color: #8b6b4a;
}
</style>
