<script setup lang="ts">
import { ref, computed } from "vue";
import { WorldElement as WE, type WorldElement } from "../types/game";

const emit = defineEmits<{
	close: [];
	start: [elements: WorldElement[]];
}>();

const allElements: { id: WorldElement; name: string; icon: string }[] = [
	{ id: WE.RIVERS, name: "Rivers", icon: "🌊" },
	{ id: WE.DIRT, name: "Dirt", icon: "🟫" },
	{ id: WE.ICE, name: "Ice", icon: "🧊" },
	{ id: WE.FAIRY, name: "Fairy Rings", icon: "🍄" },
];

const selectedElements = ref<Set<WorldElement>>(new Set());

const canSelectMore = computed(() => selectedElements.value.size < 2);

function toggleElement(element: WorldElement) {
	if (selectedElements.value.has(element)) {
		selectedElements.value.delete(element);
		// Trigger reactivity
		selectedElements.value = new Set(selectedElements.value);
	} else if (canSelectMore.value) {
		selectedElements.value.add(element);
		// Trigger reactivity
		selectedElements.value = new Set(selectedElements.value);
	}
}

function isSelected(element: WorldElement): boolean {
	return selectedElements.value.has(element);
}

function startWorld() {
	emit("start", Array.from(selectedElements.value));
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <button class="close-btn" @click="emit('close')">×</button>

      <h2 class="modal-title">Custom World</h2>

      <p class="modal-subtitle">Select up to 2 elements</p>

      <div class="elements-grid">
        <button
          v-for="element in allElements"
          :key="element.id"
          :class="[
            'element-btn',
            {
              'element-btn--selected': isSelected(element.id),
              'element-btn--disabled': !isSelected(element.id) && !canSelectMore,
            },
          ]"
          @click="toggleElement(element.id)"
        >
          <span class="element-icon">{{ element.icon }}</span>
          <span class="element-name">{{ element.name }}</span>
        </button>
      </div>

      <div class="selection-info">
        {{ selectedElements.size }} / 2 selected
      </div>

      <div class="nav-buttons">
        <button class="nav-btn" @click="emit('close')">
          Cancel
        </button>
        <button class="nav-btn nav-btn--primary" @click="startWorld">
          Go to World
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
  max-width: 360px;
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
  margin: 0 0 8px 0;
  text-align: center;
}

.modal-subtitle {
  font-size: 14px;
  color: #7a6a5a;
  text-align: center;
  margin: 0 0 20px 0;
}

.elements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.element-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border: 2px solid rgba(90, 74, 58, 0.2);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.15s ease;
}

.element-btn:hover:not(.element-btn--disabled) {
  border-color: rgba(90, 74, 58, 0.4);
  background: rgba(255, 255, 255, 0.8);
}

.element-btn--selected {
  border-color: #7cb668;
  background: rgba(124, 182, 104, 0.2);
  box-shadow: 0 0 0 2px rgba(124, 182, 104, 0.3);
}

.element-btn--selected:hover {
  border-color: #7cb668;
  background: rgba(124, 182, 104, 0.3);
}

.element-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.element-icon {
  font-size: 28px;
  line-height: 1;
}

.element-name {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #5a4a3a;
}

.selection-info {
  text-align: center;
  font-size: 13px;
  color: #7a6a5a;
  margin-bottom: 20px;
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
