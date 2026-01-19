<script setup lang="ts">
defineProps<{
	title: string;
	message: string;
	confirmText?: string;
}>();

const emit = defineEmits<{
	confirm: [];
	cancel: [];
}>();
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal">
      <h2 class="modal__title">{{ title }}</h2>
      <p class="modal__message">
        <slot name="message">{{ message }}</slot>
      </p>
      <div class="modal__buttons">
        <button class="modal__button modal__button--cancel" @click="emit('cancel')">
          Cancel
        </button>
        <button class="modal__button modal__button--confirm" @click="emit('confirm')">
          {{ confirmText ?? 'Yes' }}
        </button>
      </div>
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

.modal__message {
  font-size: 16px;
  color: #7a6a5a;
  margin: 0 0 24px 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.modal__message :deep(.message-line) {
  display: block;
  width: 100%;
  text-align: center;
}

.modal__message :deep(.mushroom-count-line) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.modal__message :deep(.inline-mushroom) {
  display: inline-flex;
  position: relative;
  width: 14px;
  height: 16px;
  vertical-align: middle;
  margin: 0 2px;
}

.modal__message :deep(.inline-mushroom-cap) {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 8px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
  border-radius: 6px 6px 2px 2px;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

.modal__message :deep(.inline-mushroom-stem) {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 8px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 1px 1px 2px 2px;
}

.modal__buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal__button {
  border: none;
  padding: 12px 28px;
  border-radius: 20px;
  font-size: 16px;
  cursor: pointer;
  font-family: 'Georgia', serif;
  transition: all 0.2s ease;
}

.modal__button--cancel {
  background: linear-gradient(135deg, #d4c4a8 0%, #c0b090 100%);
  color: #5a4a3a;
  box-shadow:
    0 3px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.modal__button--cancel:hover {
  transform: translateY(-2px);
  box-shadow:
    0 5px 12px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  background: linear-gradient(135deg, #e0d0b8 0%, #d0c0a0 100%);
}

.modal__button--confirm {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  color: #fff8e7;
  box-shadow:
    0 3px 8px rgba(90, 154, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.modal__button--confirm:hover {
  transform: translateY(-2px);
  box-shadow:
    0 5px 12px rgba(90, 154, 74, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #8bc475 0%, #6aaa5a 100%);
}

.modal__button:active {
  transform: translateY(0);
}
</style>
