<script setup lang="ts">
import { computed, ref } from "vue";
import BottomBar from "./components/BottomBar.vue";
import GameBoard from "./components/GameBoard.vue";
import StartScreen from "./components/StartScreen.vue";
import TopBar from "./components/TopBar.vue";
import TutorialModal from "./components/TutorialModal.vue";
import WelcomeSign from "./components/WelcomeSign.vue";
import { level1 } from "./data/levels";
import type { Level, WorldElement } from "./types/game";
import { WorldElement as WE } from "./types/game";
import { generateLevel } from "./utils/levelGenerator";

const LEVELS_PER_WORLD = 10;

const worldNames = [
	"Mossy Meadow",
	"Shady Grove",
	"Fern Hollow",
	"Dewdrop Dell",
	"Toadstool Trail",
	"Mushroom Marsh",
	"Spore Shore",
	"Fungal Forest",
	"Mycelium Mile",
	"Cap Corner",
	"Bracket Bend",
	"Truffle Thicket",
	"Chanterelle Chase",
	"Porcini Path",
	"Morel Maze",
];

const gameStarted = ref(false);
const currentLevel = ref<Level>(level1);
const levelKey = ref(0);
const showWinModal = ref(false);
const showTutorial = ref(false);
const showWelcomeSign = ref(false);
const isFading = ref(false);
const isBlack = ref(false);

// World and level tracking
const currentWorldIndex = ref(0);
const currentLevelNumber = ref(1);
const currentWorldElements = ref<WorldElement[]>([]);

// All available world elements
const allElements: WorldElement[] = [WE.RIVERS, WE.DIRT];

function generateWorldElements(): WorldElement[] {
	const elements: WorldElement[] = [];

	// 50% chance for a "classic" world with no elements
	if (Math.random() < 0.5) {
		return elements;
	}

	// Otherwise, randomly select elements
	for (const element of allElements) {
		if (Math.random() < 0.6) { // 60% chance for each element
			elements.push(element);
		}
	}

	return elements;
}

const currentWorldName = computed(() => {
	return (
		worldNames[currentWorldIndex.value % worldNames.length] ?? "Mushroom Garden"
	);
});

const displayName = computed(() => {
	return `${currentWorldName.value} - ${currentLevelNumber.value}`;
});

function getNewLevel(): Level {
	const newLevel = generateLevel({}, currentWorldElements.value);
	return newLevel ?? level1;
}

function advanceLevel(): boolean {
	currentLevelNumber.value++;
	if (currentLevelNumber.value > LEVELS_PER_WORLD) {
		// Move to next world
		currentWorldIndex.value++;
		currentLevelNumber.value = 1;
		currentWorldElements.value = generateWorldElements();
		return true; // Entered new world
	}
	return false; // Same world
}

const pendingNewWorld = ref(false);

function handleWin() {
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

	// After fade completes (500ms), generate new level
	setTimeout(() => {
		currentLevel.value = getNewLevel();
		levelKey.value++;

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
	// Trigger restart in the GameBoard component
	levelKey.value++;
}

function handleBegin() {
	// Generate elements for first world
	currentWorldElements.value = generateWorldElements();

	// Generate first level when game starts
	currentLevel.value = getNewLevel();
	gameStarted.value = true;

	// Show tutorial on first visit
	const hasSeenTutorial = localStorage.getItem("mushroom-path-tutorial-seen");
	if (!hasSeenTutorial) {
		showTutorial.value = true;
	} else {
		// Show welcome sign for first world if tutorial already seen
		showWelcomeSign.value = true;
	}
}

function closeTutorial() {
	showTutorial.value = false;
	localStorage.setItem("mushroom-path-tutorial-seen", "true");
	// Show welcome sign after closing tutorial
	showWelcomeSign.value = true;
}

function closeWelcomeSign() {
	showWelcomeSign.value = false;
}
</script>

<template>
  <!-- Start Screen -->
  <StartScreen v-if="!gameStarted" @begin="handleBegin" />

  <!-- Game -->
  <div v-else class="layout">
    <TopBar
      :level-name="displayName"
      :elements="currentWorldElements"
      @show-tutorial="showTutorial = true"
    />

    <main class="app">
      <GameBoard
        :key="levelKey"
        :level="currentLevel"
        @win="handleWin"
      />

      <!-- Fade Transition Overlay (game area only) -->
      <div :class="['transition-overlay', { 'transition-overlay--black': isBlack }]"></div>
    </main>

    <BottomBar
      :disabled="isFading"
      @restart="handleRestart"
      @skip="handleSkip"
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
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.app {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
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
}

.transition-overlay--black {
  opacity: 1;
}
</style>
