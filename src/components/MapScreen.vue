<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { DialogueScene as DialogueSceneType } from "../data/dialogues";
import type { WorldElement } from "../types/game";
import { WorldElement as WE } from "../types/game";
import DialogueScene from "./DialogueScene.vue";

interface Props {
	currentWorldIndex: number;
	previousWorldIndex: number;
	worldElementHistory: WorldElement[][];
	worldNames: string[]; // Names for each world index
	isAnimating: boolean;
	dialogue?: DialogueSceneType | null; // Optional dialogue to show on map
}

const props = defineProps<Props>();

const emit = defineEmits<{
	complete: [];
}>();

// Animation phases
type AnimationPhase = "entering" | "traveling" | "arrived" | "ready";
const animationPhase = ref<AnimationPhase>("entering");
const showContinue = ref(false);
const showDialogue = ref(false);
const dialogueComplete = ref(false);

let animationTimeouts: ReturnType<typeof setTimeout>[] = [];

function clearTimeouts() {
	animationTimeouts.forEach(clearTimeout);
	animationTimeouts = [];
}

// Get world icon type based on elements
function getWorldIconType(elements: WorldElement[]): string {
	if (elements.includes(WE.ICE)) return "ice";
	if (elements.includes(WE.POND)) return "night";
	if (elements.includes(WE.DIRT)) return "swamp";
	if (elements.includes(WE.FAIRY)) return "fairy";
	if (elements.includes(WE.RIVERS)) return "river";
	return "forest";
}

// Get world status
type WorldStatus = "completed" | "current" | "future";
function getWorldStatus(index: number): WorldStatus {
	if (index < props.currentWorldIndex) return "completed";
	if (index === props.currentWorldIndex) return "current";
	return "future";
}

// Get world position in zigzag pattern
function getWorldPosition(index: number) {
	const relativeIndex = index - props.currentWorldIndex;
	const yPercent = 55 - relativeIndex * 22;
	const xPercent = index % 2 === 0 ? 28 : 72;
	return {
		x: xPercent,
		y: Math.max(12, Math.min(88, yPercent)),
	};
}

// Get world name from prop (matches the actual game world names)
function getWorldName(index: number): string {
	return props.worldNames[index] ?? `World ${index + 1}`;
}

// Visible worlds (show previous, current, and next)
const visibleWorlds = computed(() => {
	const worlds: Array<{
		index: number;
		name: string;
		status: WorldStatus;
		iconType: string;
		x: number;
		y: number;
	}> = [];

	// Show 2 worlds before current (if they exist)
	const start = Math.max(0, props.currentWorldIndex - 2);
	// Show 2 worlds after current
	const end = props.currentWorldIndex + 2;

	for (let i = start; i <= end; i++) {
		const pos = getWorldPosition(i);
		const elements = props.worldElementHistory[i] ?? [];
		worlds.push({
			index: i,
			name: getWorldName(i),
			status: getWorldStatus(i),
			iconType: getWorldIconType(elements),
			x: pos.x,
			y: pos.y,
		});
	}

	return worlds;
});

// Get traveler position during animation
const travelerPosition = computed(() => {
	if (
		animationPhase.value === "entering" ||
		animationPhase.value === "traveling"
	) {
		// Position at previous world
		const pos = getWorldPosition(props.previousWorldIndex);
		if (animationPhase.value === "traveling") {
			// Transition to current world (CSS transition handles the animation)
			const currentPos = getWorldPosition(props.currentWorldIndex);
			return {
				left: `${currentPos.x}%`,
				top: `${currentPos.y}%`,
			};
		}
		return {
			left: `${pos.x}%`,
			top: `${pos.y}%`,
		};
	}
	// Arrived at current world
	const pos = getWorldPosition(props.currentWorldIndex);
	return {
		left: `${pos.x}%`,
		top: `${pos.y}%`,
	};
});

// Generate path SVG data connecting world nodes
const pathData = computed(() => {
	const worlds = visibleWorlds.value;
	if (worlds.length < 2) return "";

	let d = "";
	for (let i = 0; i < worlds.length; i++) {
		const world = worlds[i]!;
		const x = world.x;
		const y = world.y;

		if (i === 0) {
			d = `M ${x} ${y}`;
		} else {
			const prevWorld = worlds[i - 1]!;
			// Create a curved path between nodes
			const midX = (prevWorld.x + x) / 2;
			const midY = (prevWorld.y + y) / 2;
			// Add some curve
			const curveX = midX + (i % 2 === 0 ? 10 : -10);
			d += ` Q ${curveX} ${midY} ${x} ${y}`;
		}
	}
	return d;
});

function handleClick() {
	// Don't allow click to dismiss while dialogue is showing
	if (showDialogue.value) return;

	if (showContinue.value) {
		emit("complete");
	}
}

function handleDialogueComplete() {
	showDialogue.value = false;
	dialogueComplete.value = true;
	// Show continue hint after dialogue
	showContinue.value = true;
}

// Watch for when we should show dialogue (after arriving)
watch(animationPhase, (phase) => {
	if (phase === "arrived" && props.dialogue && !dialogueComplete.value) {
		// Show dialogue shortly after arriving
		const t = setTimeout(() => {
			showDialogue.value = true;
		}, 500);
		animationTimeouts.push(t);
	}
});

onMounted(() => {
	if (props.isAnimating) {
		// Phase 1: Map fades in, characters at previous world (0-800ms)
		animationPhase.value = "entering";

		// Phase 2: Characters travel along path (800ms, takes 2.5s to complete at 3300ms)
		const t1 = setTimeout(() => {
			animationPhase.value = "traveling";
		}, 800);
		animationTimeouts.push(t1);

		// Phase 3: Arrive at new world, node glows (3500ms - after travel animation completes)
		const t2 = setTimeout(() => {
			animationPhase.value = "arrived";
		}, 3500);
		animationTimeouts.push(t2);

		// Phase 4: Show continue hint (4500ms - 1 second after arrival)
		// Only if no dialogue, otherwise dialogue completion will show it
		const t3 = setTimeout(() => {
			animationPhase.value = "ready";
			if (!props.dialogue) {
				showContinue.value = true;
			}
		}, 4500);
		animationTimeouts.push(t3);
	} else {
		// No animation, show immediately
		animationPhase.value = "ready";
		if (!props.dialogue) {
			showContinue.value = true;
		} else {
			showDialogue.value = true;
		}
	}
});

onUnmounted(() => {
	clearTimeouts();
});
</script>

<template>
  <div class="map-screen" @click="handleClick">
    <!-- Forest background -->
    <div class="forest-bg">
      <!-- Decorative trees in background -->
      <div class="bg-tree bg-tree--1"></div>
      <div class="bg-tree bg-tree--2"></div>
      <div class="bg-tree bg-tree--3"></div>
      <div class="bg-tree bg-tree--4"></div>
      <div class="bg-tree bg-tree--5"></div>
    </div>

    <!-- Winding path SVG -->
    <svg class="path-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        :d="pathData"
        fill="none"
        stroke="rgba(139, 107, 74, 0.6)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="8,4"
      />
    </svg>

    <!-- World nodes -->
    <div
      v-for="world in visibleWorlds"
      :key="world.index"
      :class="[
        'world-node',
        `world-node--${world.status}`,
        { 'world-node--glow': world.status === 'current' && (animationPhase === 'arrived' || animationPhase === 'ready') }
      ]"
      :style="{ left: world.x + '%', top: world.y + '%' }"
    >
      <div :class="['world-icon', `world-icon--${world.iconType}`]"></div>
      <span class="world-label">{{ world.name }}</span>
      <span v-if="world.status === 'completed'" class="world-checkmark">✓</span>
      <span class="world-number">{{ world.index + 1 }}</span>
    </div>

    <!-- Traveling characters (stay visible after arriving) -->
    <Transition name="travelers">
      <div
        v-if="isAnimating"
        :class="['travelers', { 'travelers--moving': animationPhase === 'traveling' }]"
        :style="travelerPosition"
      >
        <img src="/art/MushroomGirl.webp" alt="Sprout" class="traveler-sprite sprout-sprite" />
        <img src="/art/DialogueSprites/BlueGirl-Normal.webp" alt="Dew" class="traveler-sprite dew-sprite" />
      </div>
    </Transition>

    <!-- Continue hint -->
    <Transition name="continue-hint">
      <div v-if="showContinue && !showDialogue" class="continue-hint">
        Tap to continue
      </div>
    </Transition>

    <!-- Title -->
    <div class="map-title">World Map</div>

    <!-- Dialogue overlay -->
    <Transition name="dialogue-fade">
      <DialogueScene
        v-if="showDialogue && dialogue"
        :scene="dialogue"
        :can-skip="true"
        :overlay="true"
        @complete="handleDialogueComplete"
        @skip="handleDialogueComplete"
      />
    </Transition>
  </div>
</template>

<style scoped>
.map-screen {
  position: fixed;
  inset: 0;
  z-index: 250;
  overflow: hidden;
  cursor: pointer;
  animation: mapFadeIn 0.5s ease;
}

@keyframes mapFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.forest-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,
    #2d4a2d 0%,
    #3d5a3d 20%,
    #4a6b4a 50%,
    #3d5a3d 80%,
    #2d4a2d 100%
  );
}

/* Background decorative trees */
.bg-tree {
  position: absolute;
  width: 80px;
  height: 120px;
  opacity: 0.3;
}

.bg-tree::before {
  content: "";
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 35px solid transparent;
  border-right: 35px solid transparent;
  border-bottom: 80px solid #1a3a1a;
}

.bg-tree::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 30px;
  background: #4a3528;
  border-radius: 2px;
}

.bg-tree--1 { left: 5%; top: 10%; }
.bg-tree--2 { right: 8%; top: 25%; }
.bg-tree--3 { left: 12%; bottom: 15%; }
.bg-tree--4 { right: 5%; bottom: 30%; }
.bg-tree--5 { left: 50%; top: 5%; transform: translateX(-50%) scale(0.8); }

/* Path SVG */
.path-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* World nodes */
.world-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #d4b896 0%, #c4a574 40%, #8b7355 100%);
  border: 4px solid #6b5343;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.world-node--current {
  border-color: #a08060;
  transform: translate(-50%, -50%) scale(1.1);
}

.world-node--current.world-node--glow {
  animation: nodeGlow 1.5s ease-in-out infinite;
  border-color: #ffd700;
}

.world-node--future {
  opacity: 0.4;
  filter: grayscale(60%);
  transform: translate(-50%, -50%) scale(0.85);
}

.world-node--completed {
  border-color: #5a8a5a;
}

@keyframes nodeGlow {
  0%, 100% {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(255, 215, 0, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.4),
      0 0 35px rgba(255, 215, 0, 0.7),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }
}

.world-label {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-family: 'Georgia', serif;
  font-size: 13px;
  color: #fff8e6;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  pointer-events: none;
}

.world-checkmark {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #6ab06a 0%, #4a8a4a 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: 2px solid #3a6a3a;
}

.world-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Georgia', serif;
  font-size: 11px;
  color: rgba(255, 248, 230, 0.6);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

/* World icons */
.world-icon {
  width: 40px;
  height: 40px;
  position: relative;
}

/* Forest icon - mushroom */
.world-icon--forest::before {
  content: "";
  position: absolute;
  width: 26px;
  height: 16px;
  background: radial-gradient(ellipse at 50% 80%, #e85a5a 0%, #c42a2a 100%);
  border-radius: 50% 50% 10% 10%;
  top: 4px;
  left: 7px;
}

.world-icon--forest::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 18px;
  background: linear-gradient(180deg, #f5e6d3 0%, #deb887 100%);
  border-radius: 3px 3px 5px 5px;
  top: 16px;
  left: 15px;
}

/* Ice icon - mountain peak */
.world-icon--ice::before {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-bottom: 30px solid #7ec8e3;
  top: 5px;
  left: 2px;
}

.world-icon--ice::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 14px solid #fff;
  top: 5px;
  left: 10px;
}

/* Swamp icon - twisted tree */
.world-icon--swamp::before {
  content: "";
  position: absolute;
  width: 8px;
  height: 22px;
  background: #4a3728;
  border-radius: 2px;
  top: 14px;
  left: 16px;
  transform: skewX(-5deg);
}

.world-icon--swamp::after {
  content: "";
  position: absolute;
  width: 28px;
  height: 20px;
  background: radial-gradient(ellipse, #5d7a4a 40%, #3d5a3d 100%);
  border-radius: 50%;
  top: 2px;
  left: 6px;
}

/* Night/Pond icon - crescent moon */
.world-icon--night::before {
  content: "";
  position: absolute;
  width: 28px;
  height: 28px;
  background: #f4e4ba;
  border-radius: 50%;
  top: 6px;
  left: 6px;
  box-shadow: inset -10px 3px 0 0 #2d4a4a;
}

/* Fairy icon - flower */
.world-icon--fairy::before {
  content: "";
  position: absolute;
  width: 28px;
  height: 28px;
  background:
    radial-gradient(circle at 50% 20%, #ff9eb5 8px, transparent 8px),
    radial-gradient(circle at 80% 50%, #ff9eb5 8px, transparent 8px),
    radial-gradient(circle at 50% 80%, #ff9eb5 8px, transparent 8px),
    radial-gradient(circle at 20% 50%, #ff9eb5 8px, transparent 8px);
  top: 6px;
  left: 6px;
}

.world-icon--fairy::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  background: #ffeb3b;
  border-radius: 50%;
  top: 14px;
  left: 14px;
}

/* River icon - water droplet */
.world-icon--river::before {
  content: "";
  position: absolute;
  width: 22px;
  height: 28px;
  background: linear-gradient(180deg, #4a90d9 0%, #2e6cb5 100%);
  border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
  top: 4px;
  left: 9px;
}

.world-icon--river::after {
  content: "";
  position: absolute;
  width: 7px;
  height: 10px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  top: 10px;
  left: 13px;
}

/* Traveling characters */
.travelers {
  position: absolute;
  transform: translate(-50%, -120%);
  display: flex;
  gap: 4px;
  z-index: 10;
  pointer-events: none;
}

.travelers--moving {
  transition: left 2.5s ease-in-out, top 2.5s ease-in-out;
}

.traveler-sprite {
  width: 50px;
  height: auto;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
  animation: travelHop 0.35s ease-in-out infinite;
}

.sprout-sprite {
  animation-delay: 0s;
}

.dew-sprite {
  width: 40px;
  animation-delay: 0.1s;
}

@keyframes travelHop {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.travelers-enter-active,
.travelers-leave-active {
  transition: opacity 0.3s ease;
}

.travelers-enter-from,
.travelers-leave-to {
  opacity: 0;
}

/* Continue hint */
.continue-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #fff8e6;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
  animation: hintPulse 2s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.continue-hint-enter-active {
  animation: hintAppear 0.5s ease;
}

.continue-hint-leave-active {
  animation: hintAppear 0.3s ease reverse;
}

@keyframes hintAppear {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Map title */
.map-title {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Georgia', serif;
  font-size: 28px;
  color: #fff8e6;
  text-shadow:
    0 2px 0 #3d2a1a,
    0 3px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

/* Mobile adjustments */
@media (max-width: 480px) {
  .world-node {
    width: 70px;
    height: 70px;
  }

  .world-icon {
    width: 35px;
    height: 35px;
  }

  .world-label {
    font-size: 11px;
    bottom: -24px;
  }

  .traveler-sprite {
    width: 40px;
  }

  .dew-sprite {
    width: 32px;
  }

  .continue-hint {
    font-size: 16px;
    bottom: 30px;
  }

  .map-title {
    font-size: 22px;
    top: 16px;
  }
}

/* Dialogue Fade Transition */
.dialogue-fade-enter-active,
.dialogue-fade-leave-active {
  transition: opacity 0.4s ease;
}

.dialogue-fade-enter-from,
.dialogue-fade-leave-to {
  opacity: 0;
}
</style>
