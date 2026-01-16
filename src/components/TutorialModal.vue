<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { playTutorialAppears, playVoiceTutorial } from "../composables/useSound";

const emit = defineEmits<{
	close: [];
}>();

const currentPage = ref(0);

const pages = [
	{
		title: "Welcome!",
		text: "Fill every tile with mushrooms to complete the garden.",
		grid: [
			["G", "G", "G"],
			["G", "G", "G"],
			["G", "G", "G"],
		],
		playerPos: { x: 1, y: 1 },
	},
	{
		title: "Movement",
		text: "Use WASD or Arrow Keys to move. You can also click or tap tiles to hop there.",
		grid: [
			["G", "G", "G"],
			["G", "G", "G"],
			["G", "G", "G"],
		],
		playerPos: { x: 0, y: 0 },
		highlight: [
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
		],
	},
	{
		title: "Planting",
		text: "A mushroom grows on every tile you leave behind.",
		grid: [
			["M", "M", "G"],
			["G", "G", "G"],
			["G", "G", "G"],
		],
		playerPos: { x: 2, y: 0 },
	},
	{
		title: "Jumping",
		text: "Jump over one mushroom or bramble to reach the next tile.",
		grid: [
			["G", "M", "G"],
			["G", "G", "G"],
			["G", "G", "G"],
		],
		playerPos: { x: 0, y: 0 },
		highlight: [{ x: 2, y: 0 }],
		jumpArrow: { from: { x: 0, y: 0 }, to: { x: 2, y: 0 } },
	},
	{
		title: "Brambles",
		text: "Brambles block your path, but you can jump over them!",
		grid: [
			["G", "B", "G"],
			["G", "G", "G"],
			["B", "G", "B"],
		],
		playerPos: { x: 0, y: 0 },
	},
	{
		title: "Undo & Reset",
		text: "Made a mistake? Press Z to undo or R to restart the level.",
		grid: [
			["M", "M", "G"],
			["G", "M", "G"],
			["G", "G", "G"],
		],
		playerPos: { x: 2, y: 0 },
	},
	{
		title: "Goal",
		text: "Stand on the last empty tile to win. Plan your path!",
		grid: [
			["M", "M", "M"],
			["M", "M", "M"],
			["M", "M", "G"],
		],
		playerPos: { x: 2, y: 2 },
		isWin: true,
	},
];

const page = computed(() => {
	const p = pages[currentPage.value];
	const fallback = pages[0];
	if (!p && fallback) return fallback;
	if (!p) {
		return {
			title: "Welcome!",
			text: "",
			grid: [["G"]],
			playerPos: { x: 0, y: 0 },
		};
	}
	return p;
});

function nextPage() {
	if (currentPage.value < pages.length - 1) {
		currentPage.value++;
	} else {
		emit("close");
	}
}

function prevPage() {
	if (currentPage.value > 0) {
		currentPage.value--;
	}
}

function isHighlighted(x: number, y: number): boolean {
	if (!page.value.highlight) return false;
	return page.value.highlight.some((h) => h.x === x && h.y === y);
}

// Play voice lines for specific tutorial pages
watch(currentPage, (pageIndex) => {
	if (pageIndex === 2) {
		// Planting section
		playVoiceTutorial(1);
	} else if (pageIndex === 3) {
		// Jumping section
		playVoiceTutorial(2);
	} else if (pageIndex === 4) {
		// Brambles section
		playVoiceTutorial(3);
	}
});

onMounted(() => {
	playTutorialAppears();
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <button class="close-btn" @click="emit('close')">×</button>

      <h2 class="modal-title">{{ page.title }}</h2>

      <!-- Mini Grid Display -->
      <div class="grid-container">
        <div class="mini-grid">
          <template v-for="(row, y) in page.grid" :key="y">
            <div
              v-for="(cell, x) in row"
              :key="`${x}-${y}`"
              :class="[
                'mini-tile',
                {
                  'mini-tile--grass': cell === 'G',
                  'mini-tile--mushroom': cell === 'M',
                  'mini-tile--bramble': cell === 'B',
                  'mini-tile--highlight': isHighlighted(x, y),
                  'mini-tile--win': page.isWin && cell === 'G',
                }
              ]"
            >
              <!-- Mushroom sprite -->
              <div v-if="cell === 'M'" class="mini-mushroom"></div>

              <!-- Bramble thorns -->
              <div v-if="cell === 'B'" class="mini-bramble"></div>

              <!-- Player -->
              <div
                v-if="page.playerPos.x === x && page.playerPos.y === y"
                class="mini-player"
              ></div>
            </div>
          </template>
        </div>
      </div>

      <p class="modal-text">{{ page.text }}</p>

      <!-- Page Indicators -->
      <div class="page-dots">
        <span
          v-for="(_, i) in pages"
          :key="i"
          :class="['dot', { 'dot--active': i === currentPage }]"
          @click="currentPage = i"
        ></span>
      </div>

      <!-- Navigation Buttons -->
      <div class="nav-buttons">
        <button
          class="nav-btn"
          :disabled="currentPage === 0"
          @click="prevPage"
        >
          Back
        </button>
        <button class="nav-btn nav-btn--primary" @click="nextPage">
          {{ currentPage === pages.length - 1 ? "Got it!" : "Next" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  position: relative;
  background: linear-gradient(135deg, #f5edd6 0%, #e8dcc4 100%);
  padding: 32px;
  border-radius: 20px;
  max-width: 340px;
  width: 90%;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.5),
    0 0 0 4px rgba(139, 115, 85, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: scaleIn 0.2s ease;
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(90, 74, 58, 0.1);
  border-radius: 50%;
  font-size: 20px;
  color: #7a6a5a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: rgba(90, 74, 58, 0.2);
  color: #5a4a3a;
}

.modal-title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #5a4a3a;
  margin: 0 0 20px 0;
  text-align: center;
}

.grid-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 48px);
  grid-template-rows: repeat(3, 48px);
  gap: 3px;
  padding: 8px;
  background: rgba(139, 115, 85, 0.3);
  border-radius: 8px;
}

.mini-tile {
  position: relative;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-tile--grass {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.mini-tile--mushroom {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.mini-tile--bramble {
  background: linear-gradient(135deg, #5a4868 0%, #3a2d48 100%);
}

.mini-tile--highlight {
  box-shadow: 0 0 0 3px rgba(255, 223, 186, 0.9), inset 0 0 15px rgba(255, 240, 200, 0.4);
}

.mini-tile--win {
  animation: winPulse 1s ease-in-out infinite;
}

@keyframes winPulse {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.8), 0 0 12px rgba(255, 215, 0, 0.4);
  }
}

.mini-mushroom {
  position: relative;
  width: 20px;
  height: 22px;
}

.mini-mushroom::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 10px;
  background: linear-gradient(135deg, #e8a87c 0%, #c47a5c 100%);
  border-radius: 9px 9px 3px 3px;
}

.mini-mushroom::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 12px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 2px 2px 4px 4px;
}

.mini-bramble {
  width: 100%;
  height: 100%;
  position: relative;
}

.mini-bramble::before,
.mini-bramble::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 8px solid #2d2038;
}

.mini-bramble::before {
  top: 8px;
  left: 10px;
  transform: rotate(-20deg);
}

.mini-bramble::after {
  bottom: 10px;
  right: 10px;
  transform: rotate(30deg);
}

.mini-player {
  position: absolute;
  width: 24px;
  height: 30px;
  z-index: 10;
}

/* Player cap */
.mini-player::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 14px;
  background: linear-gradient(135deg, #e85a5a 0%, #c94444 100%);
  border-radius: 11px 11px 4px 4px;
}

/* Player body */
.mini-player::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 16px;
  background: linear-gradient(180deg, #6a9955 0%, #4a7940 100%);
  border-radius: 3px 3px 5px 5px;
}

.modal-text {
  font-size: 16px;
  color: #5a4a3a;
  text-align: center;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.page-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(90, 74, 58, 0.3);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dot:hover {
  background: rgba(90, 74, 58, 0.5);
}

.dot--active {
  background: #7cb668;
  transform: scale(1.2);
}

.nav-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.nav-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 20px;
  font-size: 15px;
  font-family: 'Georgia', serif;
  cursor: pointer;
  transition: all 0.15s ease;
  background: rgba(90, 74, 58, 0.15);
  color: #5a4a3a;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(90, 74, 58, 0.25);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-btn--primary {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  color: #fff8e7;
  box-shadow: 0 2px 8px rgba(90, 154, 74, 0.4);
}

.nav-btn--primary:hover {
  background: linear-gradient(135deg, #8bc475 0%, #6aaa5a 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(90, 154, 74, 0.5);
}
</style>
