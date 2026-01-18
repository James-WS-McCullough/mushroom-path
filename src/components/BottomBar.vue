<script setup lang="ts">
defineProps<{
	disabled: boolean;
	canUndo: boolean;
	undoGlow: boolean;
	restartGlow?: boolean;
}>();

const emit = defineEmits<{
	restart: [];
	undo: [];
	skip: [];
	hint: [];
	customWorld: [];
}>();

const isDev = import.meta.env.DEV;
</script>

<template>
  <div class="bottom-bar">
    <div class="wood-texture"></div>
    <div class="bar-content">
      <button
        class="bar-btn"
        :class="{ 'bar-btn--glow': restartGlow }"
        @click="emit('restart')"
        :disabled="disabled"
      >
        <span class="btn-icon">↺</span>
        <span class="btn-label">Restart</span>
      </button>
      <div class="bar-divider"></div>
      <button
        class="bar-btn"
        :class="{ 'bar-btn--glow': undoGlow }"
        @click="emit('undo')"
        :disabled="disabled || !canUndo"
      >
        <span class="btn-icon">↩</span>
        <span class="btn-label">Undo</span>
      </button>
      <div class="bar-divider"></div>
      <button class="bar-btn bar-btn--hint" @click="emit('hint')" :disabled="disabled">
        <span class="btn-icon">💡</span>
        <span class="btn-label">Hint</span>
      </button>
      <div class="bar-divider"></div>
      <button class="bar-btn" @click="emit('skip')" :disabled="disabled">
        <span class="btn-label">Skip</span>
        <span class="btn-icon">→</span>
      </button>
      <template v-if="isDev">
        <div class="bar-divider"></div>
        <button class="bar-btn bar-btn--dev" @click="emit('customWorld')" :disabled="disabled">
          <span class="btn-icon">⚙</span>
          Custom
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bottom-bar {
  position: relative;
  width: 100%;
  height: 56px;
  border-radius: 0;
  overflow: hidden;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  z-index: 200;
}

.wood-texture {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 20px,
      rgba(0, 0, 0, 0.03) 20px,
      rgba(0, 0, 0, 0.03) 21px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 60px,
      rgba(0, 0, 0, 0.05) 60px,
      rgba(0, 0, 0, 0.05) 62px
    ),
    linear-gradient(
      180deg,
      #a08060 0%,
      #8b6b4a 20%,
      #7a5c3d 50%,
      #8b6b4a 80%,
      #6d4c35 100%
    );
}

.wood-texture::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 30px 8px at 30% 30%, rgba(139, 107, 74, 0.4) 0%, transparent 100%),
    radial-gradient(ellipse 25px 6px at 70% 60%, rgba(139, 107, 74, 0.3) 0%, transparent 100%);
}

.wood-texture::after {
  content: "";
  position: absolute;
  inset: 0;
  border-top: 3px solid rgba(93, 65, 40, 0.6);
  border-bottom: 3px solid rgba(93, 65, 40, 0.6);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.bar-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 8px;
  gap: 4px;
}

.bar-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.95) 0%, rgba(240, 230, 210, 0.95) 100%);
  border: none;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 15px;
  color: #5a4a3a;
  cursor: pointer;
  font-family: 'Georgia', serif;
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.15s ease;
  text-shadow: none;
  font-weight: 500;
}

.bar-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    0 3px 6px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  background: linear-gradient(180deg, rgba(255, 255, 240, 0.98) 0%, rgba(250, 240, 220, 0.98) 100%);
}

.bar-btn:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.bar-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
  line-height: 1;
}

.bar-divider {
  width: 2px;
  height: 28px;
  background: linear-gradient(180deg, rgba(93, 65, 40, 0.3) 0%, rgba(93, 65, 40, 0.6) 50%, rgba(93, 65, 40, 0.3) 100%);
  border-radius: 1px;
  margin: 0 4px;
}

.bar-btn--hint {
  background: linear-gradient(180deg, rgba(255, 245, 220, 0.95) 0%, rgba(250, 235, 200, 0.95) 100%);
}

.bar-btn--hint:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(255, 250, 230, 0.98) 0%, rgba(255, 245, 215, 0.98) 100%);
}

.bar-btn--glow {
  animation: buttonGlow 0.6s ease-in-out infinite;
  box-shadow:
    0 0 12px rgba(255, 100, 80, 0.9),
    0 0 24px rgba(255, 80, 60, 0.6),
    0 0 40px rgba(255, 60, 40, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform: scale(1.08);
  z-index: 10;
}

@keyframes buttonGlow {
  0%, 100% {
    box-shadow:
      0 0 12px rgba(255, 100, 80, 0.9),
      0 0 24px rgba(255, 80, 60, 0.6),
      0 0 40px rgba(255, 60, 40, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transform: scale(1.08);
  }
  50% {
    box-shadow:
      0 0 20px rgba(255, 120, 100, 1),
      0 0 40px rgba(255, 100, 80, 0.8),
      0 0 60px rgba(255, 80, 60, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    transform: scale(1.15);
  }
}

.bar-btn--dev {
  background: linear-gradient(180deg, rgba(230, 220, 255, 0.95) 0%, rgba(210, 200, 240, 0.95) 100%);
  color: #4a4a6a;
}

.bar-btn--dev:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(240, 235, 255, 0.98) 0%, rgba(225, 215, 250, 0.98) 100%);
}

@media (max-width: 480px) {
  .bottom-bar {
    height: 72px;
  }

  .bar-content {
    gap: 4px;
    padding: 0 6px;
  }

  .bar-btn {
    padding: 14px 12px;
    font-size: 15px;
    gap: 5px;
    border-radius: 10px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .bar-divider {
    margin: 0 2px;
    height: 32px;
  }
}

@media (max-width: 360px) {
  .btn-label {
    display: none;
  }

  .bar-btn {
    padding: 14px 14px;
  }
}
</style>
