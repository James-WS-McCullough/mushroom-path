<script setup lang="ts">
import {
	isMusicMuted,
	isSfxMuted,
	toggleMusicMute,
	toggleSfxMute,
} from "../composables/useSound";
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
          :title="element === WE.RIVERS ? 'Rivers' : element === WE.DIRT ? 'Dirt Patches' : element === WE.ICE ? 'Ice' : element === WE.FAIRY ? 'Fairy Rings' : element === WE.POND ? 'Lily Pads' : element"
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
          <!-- Snowflake icon for ice -->
          <svg v-else-if="element === WE.ICE" viewBox="0 0 24 24" class="element-svg element-svg--ice">
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4M5.64 5.64l2.83 2.83m7.07 7.07l2.83 2.83M18.36 5.64l-2.83 2.83m-7.07 7.07l-2.83 2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
          <!-- Flower icon for fairy rings -->
          <svg v-else-if="element === WE.FAIRY" viewBox="0 0 24 24" class="element-svg element-svg--fairy">
            <circle cx="12" cy="12" r="3" fill="#ffeb3b"/>
            <ellipse cx="12" cy="5" rx="2.5" ry="4" fill="currentColor"/>
            <ellipse cx="18.5" cy="9.5" rx="2.5" ry="4" fill="currentColor" transform="rotate(72 18.5 9.5)"/>
            <ellipse cx="16" cy="17.5" rx="2.5" ry="4" fill="currentColor" transform="rotate(144 16 17.5)"/>
            <ellipse cx="8" cy="17.5" rx="2.5" ry="4" fill="currentColor" transform="rotate(-144 8 17.5)"/>
            <ellipse cx="5.5" cy="9.5" rx="2.5" ry="4" fill="currentColor" transform="rotate(-72 5.5 9.5)"/>
          </svg>
          <!-- Lily-pad icon for pond -->
          <svg v-else-if="element === WE.POND" viewBox="0 0 24 24" class="element-svg element-svg--pond">
            <!-- Lily pad with notch -->
            <path d="M12 3C6.5 3 2 7.5 2 12s4.5 9 10 9 10-4.5 10-9S17.5 3 12 3zm0 16c-4.4 0-8-3.1-8-7s3.6-7 8-7l-3 4 3 3z" fill="currentColor"/>
            <!-- Small flower -->
            <circle cx="14" cy="8" r="2.5" fill="#ff9eb5"/>
            <circle cx="14" cy="8" r="1" fill="#ffeb3b"/>
          </svg>
        </div>
      </div>

      <!-- Sound controls -->
      <div class="sound-controls">
        <button
          class="sound-btn"
          :class="{ 'sound-btn--muted': isMusicMuted }"
          title="Toggle Music"
          @click="toggleMusicMute"
        >
          <svg viewBox="0 0 24 24" class="sound-svg">
            <path v-if="!isMusicMuted" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/>
            <path v-else d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zM4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73l5.73 5.73L21 19.73 4.27 3z" fill="currentColor"/>
          </svg>
        </button>
        <button
          class="sound-btn"
          :class="{ 'sound-btn--muted': isSfxMuted }"
          title="Toggle Sound Effects"
          @click="toggleSfxMute"
        >
          <svg viewBox="0 0 24 24" class="sound-svg">
            <path v-if="!isSfxMuted" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
            <path v-else d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" fill="currentColor"/>
          </svg>
        </button>
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 480px) {
  .bar-content {
    padding: 0 8px;
    gap: 8px;
  }

  .level-name {
    font-size: 16px;
    letter-spacing: 1px;
  }

  .info-btn {
    width: 32px;
    height: 32px;
  }

  .info-icon {
    font-size: 18px;
  }

  .element-icon {
    width: 28px;
    height: 28px;
  }

  .element-svg {
    width: 16px;
    height: 16px;
  }

  .sound-btn {
    width: 28px;
    height: 28px;
  }

  .sound-svg {
    width: 16px;
    height: 16px;
  }

  .sound-controls {
    gap: 4px;
    margin-left: 4px;
  }

  .elements-display {
    gap: 4px;
  }
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

.element-svg--ice {
  color: #7ec8e3;
}

.element-svg--fairy {
  color: #e091c9;
}

.element-svg--pond {
  color: #4a9a6a;
}

.sound-controls {
  display: flex;
  gap: 8px;
  margin-left: 8px;
}

.sound-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.9) 0%, rgba(240, 230, 210, 0.9) 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.15s ease;
}

.sound-btn:hover {
  transform: scale(1.05);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.sound-btn:active {
  transform: scale(0.95);
}

.sound-btn--muted {
  background: linear-gradient(180deg, rgba(200, 190, 175, 0.9) 0%, rgba(180, 170, 155, 0.9) 100%);
}

.sound-btn--muted .sound-svg {
  opacity: 0.5;
}

.sound-svg {
  width: 20px;
  height: 20px;
  color: #5a4a3a;
}
</style>
