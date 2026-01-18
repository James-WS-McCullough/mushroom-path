<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";

const props = defineProps<{
	speakerName: string;
	text: string;
	speakerPosition: "left" | "right";
}>();

const emit = defineEmits<{
	complete: [];
}>();

const displayedText = ref("");
const isTyping = ref(false);
let typeInterval: ReturnType<typeof setInterval> | null = null;

const TYPING_SPEED = 30; // ms per character

function startTyping() {
	if (typeInterval) {
		clearInterval(typeInterval);
	}

	displayedText.value = "";
	isTyping.value = true;
	let index = 0;

	typeInterval = setInterval(() => {
		if (index < props.text.length) {
			displayedText.value += props.text[index];
			index++;
		} else {
			if (typeInterval) {
				clearInterval(typeInterval);
				typeInterval = null;
			}
			isTyping.value = false;
			emit("complete");
		}
	}, TYPING_SPEED);
}

function skipTyping() {
	if (typeInterval) {
		clearInterval(typeInterval);
		typeInterval = null;
	}
	displayedText.value = props.text;
	isTyping.value = false;
	emit("complete");
}

// Start typing when text changes
watch(
	() => props.text,
	() => {
		startTyping();
	},
	{ immediate: true },
);

onUnmounted(() => {
	if (typeInterval) {
		clearInterval(typeInterval);
	}
});

defineExpose({
	isTyping,
	skipTyping,
});
</script>

<template>
  <div :class="['dialogue-box', `dialogue-box--${speakerPosition}`]">
    <div class="dialogue-speaker">{{ speakerName }}</div>
    <div class="dialogue-text">
      {{ displayedText }}<span v-if="isTyping" class="dialogue-cursor">|</span>
    </div>
  </div>
</template>

<style scoped>
.dialogue-box {
  background: linear-gradient(180deg, #3a2a1a 0%, #2a1a0a 100%);
  border: 3px solid #5a4a3a;
  border-radius: 12px;
  padding: 16px 20px;
  min-height: 80px;
  position: relative;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.dialogue-speaker {
  position: absolute;
  top: -12px;
  background: linear-gradient(180deg, #6b8b5a 0%, #4a6a3a 100%);
  padding: 4px 16px;
  border-radius: 8px;
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #f5edd6;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dialogue-box--left .dialogue-speaker {
  left: 20px;
}

.dialogue-box--right .dialogue-speaker {
  right: 20px;
}

.dialogue-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #f5edd6;
  line-height: 1.5;
  margin-top: 8px;
  min-height: 48px;
}

.dialogue-cursor {
  animation: blink 0.5s infinite;
  color: #8b9b7a;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

@media (max-width: 480px) {
  .dialogue-box {
    padding: 12px 16px;
    min-height: 70px;
  }

  .dialogue-text {
    font-size: 16px;
    min-height: 40px;
  }

  .dialogue-speaker {
    font-size: 12px;
    padding: 3px 12px;
  }
}
</style>
