<script setup lang="ts">
defineProps<{
	enabled: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
	close: [];
}>();
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <h2 class="modal__title">Assist Mode</h2>
      <p class="modal__description">
        When enabled, you'll be warned if a move makes the puzzle impossible to complete.
      </p>
      <div class="toggle-container">
        <span class="toggle-label">{{ enabled ? 'Enabled' : 'Disabled' }}</span>
        <button
          class="toggle-switch"
          :class="{ 'toggle-switch--on': enabled }"
          @click="emit('toggle', !enabled)"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
      <button class="modal__close-btn" @click="emit('close')">Done</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 250;
  animation: fadeIn 0.2s ease;
  backdrop-filter: blur(4px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: linear-gradient(135deg, #f5edd6 0%, #e8dcc4 100%);
  padding: 32px 40px;
  border-radius: 20px;
  text-align: center;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.4),
    0 0 0 4px rgba(139, 115, 85, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: scaleIn 0.2s ease;
  max-width: 320px;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal__title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #5a4a3a;
  margin: 0 0 12px 0;
}

.modal__description {
  font-size: 15px;
  color: #7a6a5a;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.toggle-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.toggle-label {
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: #5a4a3a;
  min-width: 70px;
}

.toggle-switch {
  position: relative;
  width: 56px;
  height: 30px;
  background: linear-gradient(135deg, #c0b090 0%, #a89878 100%);
  border: none;
  border-radius: 15px;
  cursor: pointer;
  padding: 0;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.2),
    0 1px 0 rgba(255, 255, 255, 0.3);
  transition: background 0.2s ease;
}

.toggle-switch--on {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  background: linear-gradient(180deg, #fff8e7 0%, #e8dcc4 100%);
  border-radius: 50%;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: transform 0.2s ease;
}

.toggle-switch--on .toggle-knob {
  transform: translateX(26px);
}

.modal__close-btn {
  border: none;
  padding: 12px 32px;
  border-radius: 20px;
  font-size: 16px;
  cursor: pointer;
  font-family: 'Georgia', serif;
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  color: #fff8e7;
  box-shadow:
    0 3px 8px rgba(90, 154, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.modal__close-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 5px 12px rgba(90, 154, 74, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #8bc475 0%, #6aaa5a 100%);
}

.modal__close-btn:active {
  transform: translateY(0);
}
</style>
