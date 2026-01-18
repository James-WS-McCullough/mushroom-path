<script setup lang="ts">
const emit = defineEmits<{
	choose: [choice: "yes" | "no"];
}>();

function handleYes() {
	emit("choose", "yes");
}

function handleNo() {
	emit("choose", "no");
}
</script>

<template>
  <div class="modal-overlay">
    <div class="modal">
      <h2 class="modal-title">Is this your first time playing?</h2>

      <p class="modal-text">
        Grandpa can show you around the garden!
      </p>

      <div class="modal-buttons">
        <button class="modal-btn modal-btn--primary" @click="handleYes">
          Yes, teach me!
        </button>
        <button class="modal-btn modal-btn--secondary" @click="handleNo">
          No, I know the way
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
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
  position: relative;
  background: linear-gradient(135deg, #f5edd6 0%, #e8dcc4 100%);
  padding: 32px;
  border-radius: 20px;
  max-width: 340px;
  width: 90%;
  text-align: center;
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

.modal-title {
  font-family: "Georgia", serif;
  font-size: 22px;
  color: #5a4a3a;
  margin: 0 0 16px 0;
  line-height: 1.3;
}

.modal-text {
  font-size: 16px;
  color: #7a6a5a;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-btn {
  padding: 14px 24px;
  border: none;
  border-radius: 20px;
  font-size: 16px;
  font-family: "Georgia", serif;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-btn--primary {
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
  color: #fff8e7;
  box-shadow: 0 2px 8px rgba(90, 154, 74, 0.4);
}

.modal-btn--primary:hover {
  background: linear-gradient(135deg, #8bc475 0%, #6aaa5a 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(90, 154, 74, 0.5);
}

.modal-btn--secondary {
  background: rgba(90, 74, 58, 0.15);
  color: #5a4a3a;
}

.modal-btn--secondary:hover {
  background: rgba(90, 74, 58, 0.25);
}
</style>
