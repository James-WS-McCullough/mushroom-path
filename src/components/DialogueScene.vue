<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { DialogueLine, DialogueScene } from "../data/dialogues";
import DialogueBox from "./DialogueBox.vue";

const props = defineProps<{
	scene: DialogueScene;
	canSkip?: boolean;
	overlay?: boolean; // If true, show as overlay on top of game instead of full background
}>();

const emit = defineEmits<{
	complete: [];
	skip: [];
}>();

const currentLineIndex = ref(0);
const isTextComplete = ref(false);
const dialogueBoxRef = ref<InstanceType<typeof DialogueBox> | null>(null);

const currentLine = computed(() => {
	return props.scene.lines[currentLineIndex.value] as DialogueLine;
});

const isLastLine = computed(
	() => currentLineIndex.value === props.scene.lines.length - 1,
);

const leftSpriteUrl = computed(
	() => `/art/DialogueSprites/${currentLine.value.leftSprite}.webp`,
);
const rightSpriteUrl = computed(
	() => `/art/DialogueSprites/${currentLine.value.rightSprite}.webp`,
);

function handleTextComplete() {
	isTextComplete.value = true;
}

function handleClick() {
	if (!isTextComplete.value) {
		dialogueBoxRef.value?.skipTyping();
		return;
	}

	if (isLastLine.value) {
		emit("complete");
	} else {
		currentLineIndex.value++;
		isTextComplete.value = false;
	}
}

function handleSkip() {
	emit("skip");
}

function handleKeydown(e: KeyboardEvent) {
	if (e.code === "Space") {
		e.preventDefault();
		handleClick();
	}
}

onMounted(() => {
	window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
	window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div :class="['dialogue-scene', { 'dialogue-scene--overlay': overlay }]" @click="handleClick">
    <!-- Background (full image or overlay) -->
    <div class="scene-background">
      <img v-if="!overlay" :src="scene.background" alt="" class="background-image" />
    </div>

    <!-- Skip Button -->
    <button v-if="canSkip" class="skip-button" @click.stop="handleSkip">
      Skip
    </button>

    <!-- Characters -->
    <div class="characters">
      <div :class="['character', 'character--left', { 'character--speaking': currentLine.leftHighlight }]">
        <img :src="leftSpriteUrl" alt="" class="character-sprite character-sprite--flipped" />
      </div>
      <div :class="['character', 'character--right', { 'character--speaking': currentLine.rightHighlight }]">
        <img :src="rightSpriteUrl" alt="" class="character-sprite" />
      </div>
    </div>

    <!-- Dialogue Box -->
    <div class="dialogue-container">
      <DialogueBox
        ref="dialogueBoxRef"
        :speaker-name="currentLine.name"
        :text="currentLine.text"
        :speaker-position="currentLine.leftHighlight ? 'left' : 'right'"
        @complete="handleTextComplete"
      />
      <div class="dialogue-hint">
        <span v-if="isTextComplete && !isLastLine">Tap to continue</span>
        <span v-else-if="isTextComplete && isLastLine">Tap to continue</span>
        <span v-else>Tap to skip</span>
      </div>
    </div>

    <!-- Progress dots -->
    <div class="progress-dots">
      <div
        v-for="(_, index) in scene.lines"
        :key="index"
        :class="['progress-dot', { 'progress-dot--active': index === currentLineIndex, 'progress-dot--complete': index < currentLineIndex }]"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.dialogue-scene {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  overflow: hidden;
}

.scene-background {
  position: absolute;
  inset: 0;
}

.background-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
}

/* Overlay mode - semi-transparent background over the game */
.dialogue-scene--overlay .scene-background {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.dialogue-scene--overlay .character-sprite {
  height: 50vh;
  max-height: 450px;
  min-height: 250px;
}

.skip-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 16px;
  color: #c8d4b8;
  font-family: 'Georgia', serif;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.skip-button:hover {
  background: rgba(0, 0, 0, 0.6);
}

.characters {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
  pointer-events: none;
}

.character {
  position: absolute;
  bottom: 0;
  transition: transform 0.3s ease, filter 0.3s ease, z-index 0s;
  filter: brightness(0.7);
  z-index: 1;
}

.character--speaking {
  filter: brightness(1);
  z-index: 2;
}

.character--left {
  left: 3%;
  transform-origin: bottom left;
}

.character--right {
  right: 3%;
  transform-origin: bottom right;
}

.character--left.character--speaking {
  transform: scale(1.02);
}

.character--right.character--speaking {
  transform: scale(1.02);
}

.character-sprite {
  height: 70vh;
  max-height: 600px;
  min-height: 300px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
}

.character-sprite--flipped {
  transform: scaleX(-1);
}

.dialogue-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 5;
  padding: 0 20px 20px;
}

.dialogue-container > :deep(.dialogue-box) {
  max-width: 800px;
  margin: 0 auto;
}

.dialogue-hint {
  text-align: center;
  margin-top: 12px;
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: rgba(200, 212, 184, 0.7);
  animation: pulse 2s ease-in-out infinite;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.progress-dots {
  position: absolute;
  bottom: 160px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.progress-dot--active {
  background: #8bc34a;
  transform: scale(1.3);
}

.progress-dot--complete {
  background: rgba(139, 195, 74, 0.5);
}

@media (max-width: 600px) {
  .character--left {
    left: 1%;
  }

  .character--right {
    right: 1%;
  }

  .character-sprite {
    height: 55vh;
    max-height: 400px;
    min-height: 200px;
  }

  .dialogue-scene--overlay .character-sprite {
    height: 45vh;
    max-height: 350px;
    min-height: 180px;
  }

  .dialogue-container {
    padding: 0 12px 16px;
  }

  .skip-button {
    top: 12px;
    right: 12px;
    padding: 6px 12px;
    font-size: 12px;
  }

  .progress-dots {
    bottom: 140px;
  }
}

@media (max-width: 400px) {
  .character--left {
    left: -5%;
  }

  .character--right {
    right: -5%;
  }

  .character-sprite {
    height: 50vh;
    max-height: 350px;
  }

  .dialogue-scene--overlay .character-sprite {
    height: 40vh;
    max-height: 300px;
  }
}

/* Larger screens - bigger portraits */
@media (min-width: 800px) {
  .character-sprite {
    height: 75vh;
    max-height: 700px;
  }

  .dialogue-scene--overlay .character-sprite {
    height: 55vh;
    max-height: 500px;
  }
}

@media (min-width: 1200px) {
  .character-sprite {
    height: 80vh;
    max-height: 850px;
  }

  .dialogue-scene--overlay .character-sprite {
    height: 60vh;
    max-height: 600px;
  }

  .character--left {
    left: 5%;
  }

  .character--right {
    right: 5%;
  }
}
</style>
