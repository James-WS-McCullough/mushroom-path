<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BottomBar from "./components/BottomBar.vue";
import CustomWorldModal from "./components/CustomWorldModal.vue";
import GameBoard from "./components/GameBoard.vue";
import StartScreen from "./components/StartScreen.vue";
import TopBar from "./components/TopBar.vue";
import TutorialModal from "./components/TutorialModal.vue";
import WelcomeSign from "./components/WelcomeSign.vue";
import { getLevelQueue } from "./composables/useLevelQueue";
import { changeWorldBGM, initializeAudio, playSuccess, playUndo, playVoiceSuccess, startBackgroundMusic } from "./composables/useSound";
import { level1 } from "./data/levels";
import type { Level, WorldElement } from "./types/game";
import { WorldElement as WE } from "./types/game";

const levelQueue = getLevelQueue();

// Preload character sprites to avoid loading delays during gameplay
const SPRITE_URLS = [
	"/art/MushroomGirl.webp",
	"/art/MushroomGirl-blink.webp",
	"/art/MushroomGirl-Jump.webp",
	"/art/MushroomGirl-Wave.webp",
	"/art/MushroomGirl-Stuck.webp",
];

function preloadSprites() {
	for (const url of SPRITE_URLS) {
		const img = new Image();
		img.src = url;
	}
}

// Start preloading immediately
preloadSprites();

const LEVELS_PER_WORLD = 8;

const forestWorldNames = [
	"Mossy Meadow",
	"Shady Grove",
	"Fern Hollow",
	"Dewdrop Dell",
	"Toadstool Trail",
	"Fungal Forest",
	"Mycelium Mile",
	"Cap Corner",
	"Bracket Bend",
	"Truffle Thicket",
	"Chanterelle Chase",
	"Porcini Path",
	"Morel Maze",
];

const iceWorldNames = [
	"Frozen Fungi Fjord",
	"Shivercap Summit",
	"Frostspore Falls",
	"Icicle Inn",
	"Permafrost Patch",
	"Snowcap Sanctuary",
	"Glacier Glade",
	"Blizzard Basin",
	"Tundra Trail",
	"Crystal Cap Cavern",
	"Chillcap Chasm",
	"Winter Whisper Woods",
	"Polar Porcini Peak",
];

const swampWorldNames = [
	"Mushroom Marsh",
	"Bogcap Bayou",
	"Murky Morel Mire",
	"Sludge Spore Swamp",
	"Dankwood Dell",
	"Foggy Fungus Fen",
	"Peatcap Pond",
	"Mildew Meadow",
	"Mossmire Hollow",
	"Wetland Whispers",
	"Brackish Basin",
	"Swampcap Sanctuary",
	"Quagmire Quarter",
];

const gameStarted = ref(false);
const currentLevel = ref<Level>(level1);
const levelKey = ref(0);
const showWinModal = ref(false);
const showTutorial = ref(false);
const isInitialTutorial = ref(false);
const showWelcomeSign = ref(false);
const showCustomWorldModal = ref(false);
const isFading = ref(false);
const isBlack = ref(false);

// Loading states for user feedback
const isLoading = ref(false);
const loadingMessage = ref("");

// Reference to GameBoard for undo functionality
const gameBoardRef = ref<InstanceType<typeof GameBoard> | null>(null);

const canUndo = computed(() => {
	return gameBoardRef.value?.canUndo ?? false;
});

// World and level tracking
const currentWorldIndex = ref(0);
const currentLevelNumber = ref(1);
const currentWorldElements = ref<WorldElement[]>([]);
// Random offsets for world names so first world isn't always the same
const forestNameOffset = Math.floor(Math.random() * forestWorldNames.length);
const iceNameOffset = Math.floor(Math.random() * iceWorldNames.length);
const swampNameOffset = Math.floor(Math.random() * swampWorldNames.length);

// All available world elements
const allElements: WorldElement[] = [WE.RIVERS, WE.DIRT, WE.ICE, WE.FAIRY];

// Update body class based on current biome (ice takes priority)
watch(currentWorldElements, (elements) => {
	document.body.classList.remove("biome-ice", "biome-swamp");
	if (elements.includes(WE.ICE)) {
		document.body.classList.add("biome-ice");
	} else if (elements.includes(WE.DIRT)) {
		document.body.classList.add("biome-swamp");
	}
}, { immediate: true });

function generateWorldElements(): WorldElement[] {
	// Randomly select 0, 1, or 2 elements
	const elementCount = Math.floor(Math.random() * 3); // 0, 1, or 2

	if (elementCount === 0) {
		return [];
	}

	// Shuffle all elements and pick the first N
	const shuffled = [...allElements].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, elementCount);
}

const currentWorldName = computed(() => {
	// Select name list based on biome (ice takes priority)
	if (currentWorldElements.value.includes(WE.ICE)) {
		const index = (currentWorldIndex.value + iceNameOffset) % iceWorldNames.length;
		return iceWorldNames[index] ?? "Frozen Fungi";
	} else if (currentWorldElements.value.includes(WE.DIRT)) {
		const index = (currentWorldIndex.value + swampNameOffset) % swampWorldNames.length;
		return swampWorldNames[index] ?? "Murky Marsh";
	} else {
		const index = (currentWorldIndex.value + forestNameOffset) % forestWorldNames.length;
		return forestWorldNames[index] ?? "Mushroom Garden";
	}
});

const displayName = computed(() => {
	return `${currentWorldName.value} - ${currentLevelNumber.value}`;
});

function getNewLevel(): Level {
	return levelQueue.getNextLevel();
}

function advanceLevel(): boolean {
	currentLevelNumber.value++;
	if (currentLevelNumber.value > LEVELS_PER_WORLD) {
		// Move to next world
		currentWorldIndex.value++;
		currentLevelNumber.value = 1;
		const newElements = generateWorldElements();
		currentWorldElements.value = newElements;
		levelQueue.setWorldElements(newElements);
		return true; // Entered new world
	}
	return false; // Same world
}

const pendingNewWorld = ref(false);

function handleWin() {
	playSuccess();
	// 20% chance to play a voice line
	if (Math.random() < 0.2) {
		playVoiceSuccess();
	}
	skipModalText.value = "Garden Complete!";
	randomizeWinMushrooms();
	showWinModal.value = true;

	// After showing the modal briefly, start the transition
	setTimeout(() => {
		pendingNewWorld.value = advanceLevel();
		startTransition();
	}, 1500);
}

function startTransition() {
	showWinModal.value = false;
	isFading.value = true;

	// Start fade to black immediately
	isBlack.value = true;

	// If entering a new world, start the BGM transition
	if (pendingNewWorld.value) {
		changeWorldBGM();
	}

	// After fade completes (500ms), generate new level
	setTimeout(() => {
		// Show loading message while generating
		loadingMessage.value = "Generating level...";

		// Small delay to let the message render before blocking work
		setTimeout(() => {
			currentLevel.value = getNewLevel();
			levelKey.value++;
			loadingMessage.value = "";

			// Small pause while black, then fade back in
			setTimeout(() => {
				isBlack.value = false;
				// After fade in completes, re-enable controls and maybe show welcome
				setTimeout(() => {
					isFading.value = false;
					if (pendingNewWorld.value) {
						showWelcomeSign.value = true;
						pendingNewWorld.value = false;
					}
				}, 500);
			}, 200);
		}, 50);
	}, 500);
}

const skipModalText = ref("");

// Random mushroom types for win modal
type MushroomType = "tan" | "red" | "purple";
const mushroomTypes: MushroomType[] = ["tan", "red", "purple"];
const winModalMushrooms = ref<MushroomType[]>(["tan", "red", "purple"]);

function randomizeWinMushrooms() {
	winModalMushrooms.value = [
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
	] as MushroomType[];
}

function handleSkip() {
	if (isFading.value) return;
	isFading.value = true;
	skipModalText.value = "Level Skipped";
	randomizeWinMushrooms();
	showWinModal.value = true;

	// Show modal briefly then start transition
	setTimeout(() => {
		pendingNewWorld.value = advanceLevel();
		startTransition();
	}, 1000);
}

function handleRestart() {
	if (isFading.value) return;
	playUndo();
	// Trigger restart in the GameBoard component
	levelKey.value++;
}

function handleUndo() {
	if (isFading.value) return;
	gameBoardRef.value?.undo();
}

async function handleBegin() {
	// Show loading state
	isLoading.value = true;
	loadingMessage.value = "Loading audio...";

	// Small delay to ensure UI updates before potentially blocking work
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Initialize audio system (starts preloading sounds in background for mobile)
	initializeAudio();
	startBackgroundMusic();

	// First world is always neutral (no elements)
	currentWorldElements.value = [];
	levelQueue.setWorldElements([]);

	// Generate first level when game starts
	loadingMessage.value = "Generating level...";
	await new Promise((resolve) => setTimeout(resolve, 50));

	currentLevel.value = getNewLevel();
	gameStarted.value = true;
	isLoading.value = false;
	loadingMessage.value = "";

	// Show tutorial on first visit
	const hasSeenTutorial = localStorage.getItem("mushroom-path-tutorial-seen");
	if (!hasSeenTutorial) {
		isInitialTutorial.value = true;
		showTutorial.value = true;
	} else {
		// Show welcome sign for first world if tutorial already seen
		showWelcomeSign.value = true;
	}
}

function closeTutorial() {
	showTutorial.value = false;
	localStorage.setItem("mushroom-path-tutorial-seen", "true");
	// Only show welcome sign after closing the initial tutorial
	if (isInitialTutorial.value) {
		isInitialTutorial.value = false;
		showWelcomeSign.value = true;
	}
}

function closeWelcomeSign() {
	showWelcomeSign.value = false;
}

function openCustomWorldModal() {
	showCustomWorldModal.value = true;
}

function startCustomWorld(elements: WorldElement[]) {
	showCustomWorldModal.value = false;

	// Set up custom world
	currentWorldIndex.value++;
	currentLevelNumber.value = 1;
	currentWorldElements.value = elements;
	levelQueue.setWorldElements(elements);

	// Change BGM for the new world
	changeWorldBGM();

	// Generate new level with selected elements
	currentLevel.value = getNewLevel();
	levelKey.value++;

	// Show welcome sign for the new world
	showWelcomeSign.value = true;
}
</script>

<template>
  <!-- Start Screen -->
  <StartScreen v-if="!gameStarted" @begin="handleBegin" />

  <!-- Loading Overlay (shown during initial load) -->
  <div v-if="isLoading" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ loadingMessage }}</p>
    </div>
  </div>

  <!-- Game -->
  <div v-else class="layout">
    <TopBar
      :level-name="displayName"
      :elements="currentWorldElements"
      @show-tutorial="showTutorial = true"
    />

    <main class="app">
      <GameBoard
        ref="gameBoardRef"
        :key="levelKey"
        :level="currentLevel"
        :has-ice-element="currentWorldElements.includes(WE.ICE)"
        :has-dirt-element="currentWorldElements.includes(WE.DIRT)"
        @win="handleWin"
      />

      <!-- Fade Transition Overlay (game area only) -->
      <div :class="['transition-overlay', { 'transition-overlay--black': isBlack }]">
        <p v-if="loadingMessage && isBlack" class="transition-loading-text">{{ loadingMessage }}</p>
      </div>
    </main>

    <BottomBar
      :disabled="isFading"
      :can-undo="canUndo"
      @restart="handleRestart"
      @undo="handleUndo"
      @skip="handleSkip"
      @custom-world="openCustomWorldModal"
    />

    <!-- Win Modal -->
    <Transition name="modal">
      <div v-if="showWinModal" class="win-overlay">
        <div class="win-modal">
          <div class="win-wood-texture"></div>
          <div class="win-modal-content">
            <div class="win-decoration">
              <div
                v-for="(type, index) in winModalMushrooms"
                :key="index"
                :class="['deco-mushroom', `deco-mushroom--${type}`]"
              >
                <div class="deco-cap">
                  <div v-if="type === 'red'" class="deco-spots"></div>
                </div>
                <div class="deco-stem"></div>
              </div>
            </div>
            <h2 class="win-title">{{ skipModalText }}</h2>
          </div>
          <div class="win-nail win-nail--top-left"></div>
          <div class="win-nail win-nail--top-right"></div>
          <div class="win-nail win-nail--bottom-left"></div>
          <div class="win-nail win-nail--bottom-right"></div>
        </div>
      </div>
    </Transition>

    <!-- Tutorial Modal -->
    <TutorialModal v-if="showTutorial" @close="closeTutorial" />

    <!-- Welcome Sign for new worlds -->
    <WelcomeSign
      v-if="showWelcomeSign"
      :world-name="currentWorldName"
      @close="closeWelcomeSign"
    />

    <!-- Custom World Modal (dev only) -->
    <CustomWorldModal
      v-if="showCustomWorldModal"
      @close="showCustomWorldModal = false"
      @start="startCustomWorld"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* Win Modal Styles */
.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.win-modal {
  position: relative;
  background: linear-gradient(180deg, #a08060 0%, #8b6b4a 50%, #7a5c3d 100%);
  padding: 40px 48px;
  border-radius: 10px;
  text-align: center;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.4),
    inset 0 3px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.win-wood-texture {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 30px,
      rgba(0, 0, 0, 0.03) 30px,
      rgba(0, 0, 0, 0.03) 31px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 80px,
      rgba(0, 0, 0, 0.05) 80px,
      rgba(0, 0, 0, 0.05) 82px
    );
  pointer-events: none;
}

.win-modal-content {
  position: relative;
  z-index: 1;
}

.win-nail {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle at 30% 30%, #888 0%, #555 100%);
  border-radius: 50%;
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.win-nail--top-left {
  top: 12px;
  left: 12px;
}

.win-nail--top-right {
  top: 12px;
  right: 12px;
}

.win-nail--bottom-left {
  bottom: 12px;
  left: 12px;
}

.win-nail--bottom-right {
  bottom: 12px;
  right: 12px;
}

.win-decoration {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.deco-mushroom {
  position: relative;
  width: 40px;
  height: 48px;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
  animation: bounce 1.5s ease-in-out infinite;
}

.deco-mushroom:nth-child(1) {
  animation-delay: 0s;
}

.deco-mushroom:nth-child(2) {
  animation-delay: 0.2s;
  width: 46px;
  height: 54px;
}

.deco-mushroom:nth-child(3) {
  animation-delay: 0.4s;
}

.deco-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 24px;
  border-radius: 18px 18px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.deco-mushroom:nth-child(2) .deco-cap {
  width: 42px;
  height: 28px;
}

.deco-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 24px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 3px 3px 5px 5px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

.deco-mushroom:nth-child(2) .deco-stem {
  width: 18px;
  height: 26px;
}

/* Tan mushroom */
.deco-mushroom--tan .deco-cap {
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
}

.deco-mushroom--tan .deco-cap::before,
.deco-mushroom--tan .deco-cap::after {
  content: "";
  position: absolute;
  background: #fff5eb;
  border-radius: 50%;
}

.deco-mushroom--tan .deco-cap::before {
  width: 6px;
  height: 5px;
  top: 6px;
  left: 6px;
}

.deco-mushroom--tan .deco-cap::after {
  width: 5px;
  height: 4px;
  top: 10px;
  right: 8px;
}

/* Red mushroom */
.deco-mushroom--red .deco-cap {
  background: linear-gradient(135deg, #e85a5a 0%, #d43d3d 50%, #c42a2a 100%);
}

.deco-spots::before,
.deco-spots::after {
  content: "";
  position: absolute;
  background: #fff;
  border-radius: 50%;
}

.deco-spots::before {
  width: 6px;
  height: 5px;
  top: 5px;
  left: 6px;
}

.deco-spots::after {
  width: 5px;
  height: 4px;
  top: 10px;
  right: 8px;
}

/* Purple mushroom */
.deco-mushroom--purple .deco-cap {
  background: linear-gradient(135deg, #a67cb8 0%, #8e5ca0 50%, #7a4a8c 100%);
}

.deco-mushroom--purple .deco-cap::before,
.deco-mushroom--purple .deco-cap::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.deco-mushroom--purple .deco-cap::before {
  width: 5px;
  height: 4px;
  top: 6px;
  left: 8px;
}

.deco-mushroom--purple .deco-cap::after {
  width: 4px;
  height: 3px;
  top: 11px;
  right: 9px;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.win-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  color: #fff8e7;
  margin: 0;
  text-shadow:
    0 2px 0 #4a3a2a,
    0 3px 6px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .win-modal,
.modal-leave-active .win-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .win-modal,
.modal-leave-to .win-modal {
  transform: scale(0.9);
  opacity: 0;
}

/* Fade Transition Overlay */
.transition-overlay {
  position: absolute;
  inset: 0;
  background: #1a1a1a;
  z-index: 50;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transition-overlay--black {
  opacity: 1;
}

.transition-loading-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Loading Overlay (initial load) */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 248, 230, 0.3);
  border-top-color: #fff8e6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #fff8e6;
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
</style>
