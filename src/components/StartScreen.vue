<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps<{
	hasSavedGame?: boolean;
}>();

const emit = defineEmits<{
	begin: [];
	continue: [];
	newGame: [];
	openMusicPlayer: [];
	startTutorial: [];
}>();

const isLeaving = ref(false);

// PWA Install prompt state
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const showInstallButton = ref(false);
const isIOS = ref(false);
const showIOSInstructions = ref(false);

// Type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function checkInstallability() {
	// Check if already installed as PWA
	const isStandalone = window.matchMedia("(display-mode: standalone)").matches
		|| (navigator as { standalone?: boolean }).standalone === true;

	if (isStandalone) {
		showInstallButton.value = false;
		return;
	}

	// Check for iOS Safari
	const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
	const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

	if (isIOSDevice && isSafari) {
		isIOS.value = true;
		showInstallButton.value = true;
	}
}

function handleBeforeInstallPrompt(e: Event) {
	// Prevent the mini-infobar from appearing on mobile
	e.preventDefault();
	// Save the event for later use
	deferredPrompt.value = e as BeforeInstallPromptEvent;
	showInstallButton.value = true;
}

async function handleInstallClick() {
	if (isIOS.value) {
		// Show iOS instructions
		showIOSInstructions.value = true;
		return;
	}

	if (!deferredPrompt.value) return;

	// Show the install prompt
	await deferredPrompt.value.prompt();

	// Wait for the user's response
	const { outcome } = await deferredPrompt.value.userChoice;

	if (outcome === "accepted") {
		showInstallButton.value = false;
	}

	// Clear the deferred prompt
	deferredPrompt.value = null;
}

function closeIOSInstructions() {
	showIOSInstructions.value = false;
}

onMounted(() => {
	checkInstallability();
	window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
	window.addEventListener("appinstalled", () => {
		showInstallButton.value = false;
	});
});

onUnmounted(() => {
	window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
});

function handleBegin() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("begin"), 600);
}

function handleContinue() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("continue"), 600);
}

function handleNewGame() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("newGame"), 600);
}

function handleTutorial() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("startTutorial"), 600);
}
</script>

<template>
  <div :class="['start-screen', { 'start-screen--leaving': isLeaving }]">
    <div class="start-content">
      <!-- Decorative mushrooms -->
      <div class="mushroom-row">
        <div class="deco-mushroom deco-mushroom--tan">
          <div class="deco-cap"></div>
          <div class="deco-stem"></div>
        </div>
        <div class="deco-mushroom deco-mushroom--red">
          <div class="deco-cap">
            <div class="deco-spots"></div>
          </div>
          <div class="deco-stem"></div>
        </div>
        <div class="deco-mushroom deco-mushroom--purple">
          <div class="deco-cap"></div>
          <div class="deco-stem"></div>
        </div>
      </div>

      <h1 class="title">Welcome to the</h1>
      <h2 class="subtitle">Mushroom Garden</h2>

      <!-- Continue button (when there's saved progress) -->
      <button v-if="props.hasSavedGame" class="begin-button" @click="handleContinue">
        <span class="begin-text">Continue</span>
      </button>
      <!-- Begin button (when starting fresh) -->
      <button v-else class="begin-button" @click="handleBegin">
        <span class="begin-text">Begin</span>
      </button>

      <div class="secondary-buttons">
        <!-- New Game button (only when there's saved progress) -->
        <button v-if="props.hasSavedGame" class="secondary-button" @click="handleNewGame">
          <span class="secondary-text">New Game</span>
        </button>
        <button class="secondary-button" @click="handleTutorial">
          <span class="secondary-text">Tutorial</span>
        </button>
        <button class="secondary-button" @click="emit('openMusicPlayer')">
          <span class="music-icon">♪</span>
          <span class="secondary-text">Music</span>
        </button>
      </div>

      <!-- Install App button (only on compatible devices) -->
      <button v-if="showInstallButton" class="install-button" @click="handleInstallClick">
        <svg class="install-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v10M7 12l5 5 5-5M5 19h14" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="install-text">Install App</span>
      </button>
    </div>

    <!-- iOS Install Instructions Modal -->
    <div v-if="showIOSInstructions" class="ios-modal-overlay" @click="closeIOSInstructions">
      <div class="ios-modal" @click.stop>
        <h3 class="ios-modal-title">Add to Home Screen</h3>
        <div class="ios-instructions">
          <div class="ios-step">
            <span class="ios-step-number">1</span>
            <span class="ios-step-text">Tap the <strong>Share</strong> button</span>
            <svg class="ios-share-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l4 4h-3v8h-2V6H8l4-4zm8 14v4H4v-4H2v6h20v-6h-2z"/>
            </svg>
          </div>
          <div class="ios-step">
            <span class="ios-step-number">2</span>
            <span class="ios-step-text">Scroll down and tap <strong>"Add to Home Screen"</strong></span>
          </div>
          <div class="ios-step">
            <span class="ios-step-number">3</span>
            <span class="ios-step-text">Tap <strong>"Add"</strong> to confirm</span>
          </div>
        </div>
        <button class="ios-modal-close" @click="closeIOSInstructions">Got it!</button>
      </div>
    </div>

    <!-- Ground decoration (outside animated content, fixed at bottom) -->
    <div class="ground">
      <div class="grass-tuft">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <div class="grass-tuft">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <div class="grass-tuft">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.start-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #4a6741 0%, #3d5636 50%, #2d4028 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  transition: opacity 0.6s ease;
}

.start-screen--leaving {
  opacity: 0;
}

.start-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: contentFadeIn 0.8s ease;
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mushroom-row {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.deco-mushroom {
  position: relative;
  width: 48px;
  height: 56px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: mushroomBounce 2s ease-in-out infinite;
}

.deco-mushroom:nth-child(1) {
  animation-delay: 0s;
}

.deco-mushroom:nth-child(2) {
  animation-delay: 0.3s;
  width: 56px;
  height: 64px;
}

.deco-mushroom:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes mushroomBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.deco-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 44px;
  height: 28px;
  border-radius: 22px 22px 8px 8px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
}

.deco-mushroom:nth-child(2) .deco-cap {
  width: 52px;
  height: 32px;
}

.deco-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 28px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 4px 4px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

.deco-mushroom:nth-child(2) .deco-stem {
  width: 22px;
  height: 32px;
}

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
  width: 8px;
  height: 6px;
  top: 8px;
  left: 8px;
}

.deco-mushroom--tan .deco-cap::after {
  width: 6px;
  height: 5px;
  top: 12px;
  right: 10px;
}

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
  width: 8px;
  height: 6px;
  top: 6px;
  left: 8px;
}

.deco-spots::after {
  width: 6px;
  height: 5px;
  top: 12px;
  right: 12px;
}

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
  width: 7px;
  height: 5px;
  top: 8px;
  left: 10px;
}

.deco-mushroom--purple .deco-cap::after {
  width: 5px;
  height: 4px;
  top: 14px;
  right: 12px;
}

.title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #c8d4b8;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
  text-align: center;
}

.subtitle {
  font-family: 'Georgia', serif;
  font-size: 48px;
  color: #f5edd6;
  margin: 8px 0 0 0;
  text-shadow:
    0 3px 0 #3d5636,
    0 4px 8px rgba(0, 0, 0, 0.4);
  letter-spacing: 2px;
  text-align: center;
}

@media (max-width: 480px) {
  .subtitle {
    font-size: 36px;
  }
}

.begin-button {
  margin-top: 48px;
  padding: 16px 48px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow:
    0 6px 0 #8b5a3a,
    0 8px 16px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.begin-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 0 #8b5a3a,
    0 10px 20px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
}

.begin-button:active {
  transform: translateY(2px);
  box-shadow:
    0 4px 0 #8b5a3a,
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
}

.begin-text {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #fff8e7;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.secondary-buttons {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.secondary-button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.secondary-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.music-icon {
  font-size: 14px;
  color: #c8d4b8;
}

.secondary-text {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #c8d4b8;
  letter-spacing: 1px;
}

.ground {
  position: absolute;
  bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 80px;
}

.grass-tuft {
  display: flex;
  gap: 3px;
}

.grass-blade {
  width: 4px;
  height: 20px;
  background: linear-gradient(to top, #3d5636, #6b9a5a);
  border-radius: 3px 3px 0 0;
  transform-origin: bottom;
}

.grass-blade:nth-child(1) {
  transform: rotate(-12deg);
  height: 16px;
}

.grass-blade:nth-child(2) {
  height: 22px;
}

.grass-blade:nth-child(3) {
  transform: rotate(12deg);
  height: 18px;
}

/* Install App Button */
.install-button {
  margin-top: 24px;
  padding: 10px 20px;
  background: rgba(124, 182, 104, 0.2);
  border: 1px solid rgba(124, 182, 104, 0.4);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
}

.install-button:hover {
  background: rgba(124, 182, 104, 0.3);
  border-color: rgba(124, 182, 104, 0.6);
  transform: translateY(-1px);
}

.install-button:active {
  transform: translateY(1px);
}

.install-icon {
  width: 18px;
  height: 18px;
  color: #a8d898;
}

.install-text {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #a8d898;
  letter-spacing: 1px;
}

/* iOS Instructions Modal */
.ios-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ios-modal {
  background: linear-gradient(180deg, #4a6741 0%, #3d5636 100%);
  border-radius: 16px;
  padding: 24px;
  max-width: 320px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ios-modal-title {
  font-family: 'Georgia', serif;
  font-size: 22px;
  color: #f5edd6;
  margin: 0 0 20px 0;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.ios-instructions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ios-step {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
  border-radius: 8px;
}

.ios-step-number {
  width: 28px;
  height: 28px;
  background: rgba(124, 182, 104, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #a8d898;
  flex-shrink: 0;
}

.ios-step-text {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #c8d4b8;
  line-height: 1.4;
}

.ios-step-text strong {
  color: #f5edd6;
}

.ios-share-icon {
  width: 20px;
  height: 20px;
  color: #6eb5ff;
  flex-shrink: 0;
  margin-left: auto;
}

.ios-modal-close {
  margin-top: 20px;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  border: none;
  border-radius: 8px;
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: #fff8e7;
  cursor: pointer;
  box-shadow: 0 3px 0 #3d6a30;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.ios-modal-close:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 0 #3d6a30;
}

.ios-modal-close:active {
  transform: translateY(1px);
  box-shadow: 0 2px 0 #3d6a30;
}
</style>
