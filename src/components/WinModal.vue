<script setup lang="ts">
const emit = defineEmits<{
	restart: [];
}>();

function handleRestart() {
	emit("restart");
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <div class="modal__decoration">
        <div class="mini-mushroom"></div>
        <div class="mini-mushroom"></div>
        <div class="mini-mushroom"></div>
      </div>
      <h2 class="modal__title">Garden Complete!</h2>
      <p class="modal__message">
        You've planted mushrooms in every corner of the garden!
      </p>
      <button class="modal__button" @click="handleRestart">
        Play Again
      </button>
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
  z-index: 100;
  animation: fadeIn 0.3s ease;
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
  padding: 40px 48px;
  border-radius: 24px;
  text-align: center;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.4),
    0 0 0 4px rgba(139, 115, 85, 0.4),
    inset 0 2px 0 rgba(255, 255, 255, 0.5);
  animation: scaleIn 0.3s ease;
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

.modal__decoration {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
}

.mini-mushroom {
  position: relative;
  width: 36px;
  height: 40px;
  animation: bounce 0.6s ease-in-out infinite;
}

.mini-mushroom:nth-child(2) {
  animation-delay: 0.2s;
}

.mini-mushroom:nth-child(3) {
  animation-delay: 0.4s;
}

.mini-mushroom::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 20px;
  background: linear-gradient(135deg, #e8a87c 0%, #c47a5c 100%);
  border-radius: 16px 16px 6px 6px;
}

.mini-mushroom::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 20px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 4px 4px 6px 6px;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.modal__title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  color: #5a4a3a;
  margin: 0 0 12px 0;
}

.modal__message {
  font-size: 16px;
  color: #7a6a5a;
  margin: 0 0 24px 0;
  max-width: 280px;
}

.modal__button {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  border: none;
  padding: 14px 40px;
  border-radius: 24px;
  font-size: 18px;
  color: #fff8e7;
  cursor: pointer;
  font-family: 'Georgia', serif;
  box-shadow:
    0 4px 12px rgba(90, 154, 74, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.modal__button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 16px rgba(90, 154, 74, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #8bc475 0%, #6aaa5a 100%);
}

.modal__button:active {
  transform: translateY(0);
}
</style>
