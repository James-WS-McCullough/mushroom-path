<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import {
	isMusicMuted,
	isSfxMuted,
	musicVolume,
	setMusicVolume,
	toggleMusicMute,
	toggleSfxMute,
} from "../composables/useSound";
import type { WorldElement } from "../types/game";
import { WorldElement as WE } from "../types/game";

defineProps<{
	levelName: string;
	elements: WorldElement[];
	helpModeEnabled?: boolean;
	isDewUnlocked?: boolean;
	useDewCharacter?: boolean;
}>();

const emit = defineEmits<{
	showTutorial: [];
	showHelpSettings: [];
	toggleCharacter: [];
}>();

const showVolumePopup = ref(false);
const volumePopupRef = ref<HTMLElement | null>(null);
const musicBtnRef = ref<HTMLElement | null>(null);

function toggleVolumePopup() {
	showVolumePopup.value = !showVolumePopup.value;
}

function handleVolumeChange(event: Event) {
	const target = event.target as HTMLInputElement;
	setMusicVolume(parseFloat(target.value));
}

function handleClickOutside(event: MouseEvent) {
	if (
		showVolumePopup.value &&
		volumePopupRef.value &&
		musicBtnRef.value &&
		!volumePopupRef.value.contains(event.target as Node) &&
		!musicBtnRef.value.contains(event.target as Node)
	) {
		showVolumePopup.value = false;
	}
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="top-bar">
    <div class="wood-texture"></div>
    <div class="bar-content">
      <button class="info-btn" @click="emit('showTutorial')" title="How to Play">
        <span class="info-icon">i</span>
      </button>
      <button
        class="help-btn"
        :class="{ 'help-btn--active': helpModeEnabled }"
        title="Assist Mode"
        @click="emit('showHelpSettings')"
      >
        <svg viewBox="0 0 24 24" class="help-icon-svg">
          <!-- Life preserver ring -->
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/>
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <!-- Cross straps -->
          <line x1="12" y1="3" x2="12" y2="8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="3" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="16" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </button>
      <!-- Character swap button (only visible when unlocked) -->
      <button
        v-if="isDewUnlocked"
        class="swap-btn"
        :class="{ 'swap-btn--active': useDewCharacter }"
        title="Switch Character"
        @click="emit('toggleCharacter')"
      >
        <svg viewBox="0 0 24 24" class="swap-icon-svg">
          <!-- Two-arrow swap icon -->
          <path d="M7 16l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M3 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M17 8l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M21 12H7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <h2 class="level-name">{{ levelName }}</h2>
      <div class="elements-display">
        <div
          v-for="element in elements"
          :key="element"
          class="element-icon"
          :class="{ 'element-icon--dirt': element === WE.DIRT }"
          :title="element === WE.RIVERS ? 'Rivers' : element === WE.DIRT ? 'Dirt Patches' : element === WE.ICE ? 'Ice' : element === WE.FAIRY ? 'Fairy Rings' : element === WE.POND ? 'Lily Pads' : element === WE.TIDES ? 'Tides' : element === WE.BOUNCE ? 'Bounce Pads' : element === WE.HONEY ? 'Honey' : element"
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
          <!-- Wave icon for tides -->
          <svg v-else-if="element === WE.TIDES" viewBox="0 0 24 24" class="element-svg element-svg--tides">
            <path d="M2 12c2-2 4-3 6-3s4 1 6 3 4 3 6 3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M2 17c2-2 4-3 6-3s4 1 6 3 4 3 6 3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
            <path d="M2 7c2-2 4-3 6-3s4 1 6 3 4 3 6 3" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.6"/>
          </svg>
          <!-- Bounce pad icon (red mushroom with dots) -->
          <svg v-else-if="element === WE.BOUNCE" viewBox="0 0 24 24" class="element-svg element-svg--bounce">
            <!-- Red mushroom cap -->
            <ellipse cx="12" cy="14" rx="9" ry="6" fill="currentColor"/>
            <!-- White dots -->
            <circle cx="8" cy="12" r="1.5" fill="white"/>
            <circle cx="14" cy="11" r="1.8" fill="white"/>
            <circle cx="11" cy="15" r="1.2" fill="white"/>
            <!-- Bounce arrow -->
            <path d="M12 2l3 4h-2v3h-2V6H9l3-4z" fill="#ffeb3b"/>
          </svg>
          <!-- Honey pot icon -->
          <svg v-else-if="element === WE.HONEY" viewBox="0 0 24 24" class="element-svg element-svg--honey">
            <!-- Honey pot body -->
            <path d="M6 10c0-1.5 1-3 3-3h6c2 0 3 1.5 3 3v8c0 2-1.5 3-3 3H9c-1.5 0-3-1-3-3v-8z" fill="currentColor"/>
            <!-- Pot rim -->
            <rect x="5" y="8" width="14" height="3" rx="1" fill="#d4a030"/>
            <!-- Honey drip -->
            <path d="M12 3c-1.5 0-2.5 1.5-2.5 3s1 2.5 2.5 2.5 2.5-1 2.5-2.5S13.5 3 12 3z" fill="#ffa000"/>
            <!-- Highlight -->
            <ellipse cx="9" cy="14" rx="1.5" ry="2" fill="#ffe082" opacity="0.6"/>
          </svg>
          <!-- Acorn icon -->
          <svg v-else-if="element === WE.ACORN" viewBox="0 0 24 24" class="element-svg element-svg--acorn" title="Acorn">
            <!-- Acorn cap -->
            <ellipse cx="12" cy="8" rx="7" ry="5" fill="#8B4513"/>
            <!-- Cap stem -->
            <rect x="11" y="2" width="2" height="4" rx="1" fill="#654321"/>
            <!-- Acorn body -->
            <ellipse cx="12" cy="16" rx="6" ry="7" fill="currentColor"/>
            <!-- Highlight -->
            <ellipse cx="9" cy="14" rx="2" ry="3" fill="#E89040" opacity="0.5"/>
          </svg>
        </div>
      </div>

      <!-- Sound controls -->
      <div class="sound-controls">
        <div class="music-control-wrapper">
          <button
            ref="musicBtnRef"
            class="sound-btn"
            :class="{ 'sound-btn--muted': isMusicMuted, 'sound-btn--active': showVolumePopup }"
            title="Music Volume"
            @click="toggleVolumePopup"
          >
            <svg viewBox="0 0 24 24" class="sound-svg">
              <path v-if="!isMusicMuted" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="currentColor"/>
              <path v-else d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zM4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4v-1.73l5.73 5.73L21 19.73 4.27 3z" fill="currentColor"/>
            </svg>
          </button>

          <!-- Volume popup -->
          <div v-if="showVolumePopup" ref="volumePopupRef" class="volume-popup">
            <div class="volume-popup-content">
              <label class="volume-label">Music Volume</label>
              <div class="volume-slider-row">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="musicVolume"
                  class="volume-slider"
                  @input="handleVolumeChange"
                />
                <span class="volume-percent">{{ Math.round(musicVolume * 100) }}%</span>
              </div>
              <button
                class="mute-toggle"
                :class="{ 'mute-toggle--muted': isMusicMuted }"
                @click="toggleMusicMute"
              >
                {{ isMusicMuted ? 'Unmute' : 'Mute' }}
              </button>
            </div>
          </div>
        </div>

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

.help-btn {
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

.help-btn:hover {
  transform: scale(1.05);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.help-btn:active {
  transform: scale(0.95);
}

.help-btn--active {
  background: linear-gradient(180deg, rgba(180, 220, 170, 0.95) 0%, rgba(140, 190, 130, 0.95) 100%);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 8px rgba(100, 180, 100, 0.4);
}

.help-icon-svg {
  width: 22px;
  height: 22px;
  color: #5a4a3a;
}

.swap-btn {
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

.swap-btn:hover {
  transform: scale(1.05);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.swap-btn:active {
  transform: scale(0.95);
}

.swap-btn--active {
  background: linear-gradient(180deg, rgba(180, 210, 230, 0.95) 0%, rgba(140, 180, 210, 0.95) 100%);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 8px rgba(100, 160, 200, 0.4);
}

.swap-icon-svg {
  width: 22px;
  height: 22px;
  color: #5a4a3a;
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

  .info-btn,
  .help-btn,
  .swap-btn {
    width: 32px;
    height: 32px;
  }

  .info-icon {
    font-size: 18px;
  }

  .help-icon-svg,
  .swap-icon-svg {
    width: 18px;
    height: 18px;
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

.element-svg--tides {
  color: #5ab8d9;
}

.element-svg--bounce {
  color: #e85a5a;
}

.element-svg--honey {
  color: #f0a830;
}

.element-svg--acorn {
  color: #D2691E;
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

.music-control-wrapper {
  position: relative;
}

.sound-btn--active {
  background: linear-gradient(180deg, rgba(180, 220, 170, 0.95) 0%, rgba(140, 190, 130, 0.95) 100%);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 0 8px rgba(100, 180, 100, 0.4);
}

.volume-popup {
  position: fixed;
  top: 72px;
  right: 16px;
  z-index: 1000;
  min-width: 180px;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.98) 0%, rgba(240, 230, 210, 0.98) 100%);
  border-radius: 12px;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
  animation: popupFadeIn 0.15s ease;
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.volume-popup-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.volume-label {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #5a4a3a;
  font-weight: 600;
}

.volume-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, rgba(122, 92, 61, 0.3) 0%, rgba(122, 92, 61, 0.3) 100%);
  border-radius: 3px;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(180deg, #7cb668 0%, #5a9a4a 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: transform 0.1s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.volume-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: linear-gradient(180deg, #7cb668 0%, #5a9a4a 100%);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.volume-percent {
  font-family: 'Georgia', serif;
  font-size: 12px;
  color: #5a4a3a;
  min-width: 36px;
  text-align: right;
}

.mute-toggle {
  padding: 8px 12px;
  background: linear-gradient(180deg, rgba(139, 107, 74, 0.15) 0%, rgba(139, 107, 74, 0.25) 100%);
  border: 1px solid rgba(139, 107, 74, 0.3);
  border-radius: 6px;
  font-family: 'Georgia', serif;
  font-size: 13px;
  color: #5a4a3a;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mute-toggle:hover {
  background: linear-gradient(180deg, rgba(139, 107, 74, 0.25) 0%, rgba(139, 107, 74, 0.35) 100%);
}

.mute-toggle--muted {
  background: linear-gradient(180deg, rgba(124, 182, 104, 0.2) 0%, rgba(124, 182, 104, 0.3) 100%);
  border-color: rgba(124, 182, 104, 0.5);
  color: #4a8a3a;
}

.mute-toggle--muted:hover {
  background: linear-gradient(180deg, rgba(124, 182, 104, 0.3) 0%, rgba(124, 182, 104, 0.4) 100%);
}
</style>
