<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

defineProps<{
	worldName: string;
}>();

const emit = defineEmits<{
	close: [];
}>();

const isLeaving = ref(false);
let timeout: ReturnType<typeof setTimeout> | null = null;

function startClose() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("close"), 400);
}

onMounted(() => {
	timeout = setTimeout(startClose, 3000);
});

onUnmounted(() => {
	if (timeout) clearTimeout(timeout);
});
</script>

<template>
  <div :class="['welcome-overlay', { 'welcome-overlay--leaving': isLeaving }]">
    <div class="signpost" @click.stop>
      <!-- Post -->
      <div class="post"></div>

      <!-- Sign board -->
      <div class="sign-board">
        <div class="wood-texture"></div>
        <div class="sign-content">
          <span class="welcome-text">Welcome to...</span>
          <h2 class="world-name">{{ worldName }}</h2>
        </div>
        <!-- Decorative nails -->
        <div class="nail nail--left"></div>
        <div class="nail nail--right"></div>
      </div>

      <!-- Decorative mushrooms at base -->
      <div class="base-decoration">
        <div class="tiny-mushroom tiny-mushroom--left">
          <div class="tiny-cap"></div>
          <div class="tiny-stem"></div>
        </div>
        <div class="tiny-mushroom tiny-mushroom--right">
          <div class="tiny-cap tiny-cap--red"></div>
          <div class="tiny-stem"></div>
        </div>
        <div class="grass-tuft">
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.welcome-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 150;
  animation: fadeIn 0.4s ease;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.welcome-overlay--leaving {
  opacity: 0;
}

.welcome-overlay--leaving .signpost {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.signpost {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: signBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: transform 0.4s ease, opacity 0.4s ease;
}

@keyframes signBounce {
  0% {
    transform: scale(0.8) translateY(30px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.post {
  width: 20px;
  height: 100px;
  background: linear-gradient(90deg, #6d5243 0%, #8b6b52 50%, #6d5243 100%);
  border-radius: 4px;
  box-shadow:
    inset -3px 0 0 rgba(0, 0, 0, 0.2),
    3px 6px 12px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.post::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100%;
  background: repeating-linear-gradient(
    180deg,
    transparent 0px,
    transparent 15px,
    rgba(0, 0, 0, 0.05) 15px,
    rgba(0, 0, 0, 0.05) 16px
  );
}

.sign-board {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 340px;
  min-height: 130px;
  background: linear-gradient(180deg, #a08060 0%, #8b6b4a 50%, #7a5c3d 100%);
  border-radius: 10px;
  padding: 28px 36px;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.4),
    inset 0 3px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  z-index: 2;
  overflow: hidden;
}

.wood-texture {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 30px,
      rgba(0, 0, 0, 0.03) 30px,
      rgba(0, 0, 0, 0.03) 31px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 80px,
      rgba(0, 0, 0, 0.05) 80px,
      rgba(0, 0, 0, 0.05) 82px
    );
  pointer-events: none;
}

.sign-content {
  position: relative;
  text-align: center;
  z-index: 1;
}

.welcome-text {
  display: block;
  font-family: 'Georgia', serif;
  font-size: 20px;
  color: #f5edd6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  margin-bottom: 12px;
  opacity: 0.9;
}

.world-name {
  font-family: 'Georgia', serif;
  font-size: 36px;
  color: #fff8e7;
  margin: 0;
  text-shadow:
    0 2px 0 #4a3a2a,
    0 3px 6px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

.nail {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  background: radial-gradient(circle at 30% 30%, #888 0%, #555 100%);
  border-radius: 50%;
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.3);
}

.nail--left {
  left: 10px;
}

.nail--right {
  right: 10px;
}

.base-decoration {
  position: absolute;
  bottom: -20px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  z-index: 0;
}

.tiny-mushroom {
  position: relative;
  width: 14px;
  height: 16px;
}

.tiny-mushroom--left {
  transform: rotate(-10deg);
}

.tiny-mushroom--right {
  transform: rotate(8deg);
}

.tiny-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 8px;
  background: linear-gradient(135deg, #e8a87c 0%, #c47a5c 100%);
  border-radius: 6px 6px 3px 3px;
}

.tiny-cap--red {
  background: linear-gradient(135deg, #e85a5a 0%, #c42a2a 100%);
}

.tiny-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 5px;
  height: 9px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 2px;
}

.grass-tuft {
  display: flex;
  gap: 2px;
  margin-bottom: 2px;
}

.grass-tuft .grass-blade {
  width: 3px;
  height: 12px;
  background: linear-gradient(to top, #5a9a4a, #8bc475);
  border-radius: 2px 2px 0 0;
}

.grass-tuft .grass-blade:nth-child(1) {
  transform: rotate(-15deg);
  height: 10px;
}

.grass-tuft .grass-blade:nth-child(3) {
  transform: rotate(15deg);
  height: 9px;
}

</style>
