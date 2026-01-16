<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
	begin: [];
}>();

const isLeaving = ref(false);

function handleBegin() {
	if (isLeaving.value) return;
	isLeaving.value = true;
	setTimeout(() => emit("begin"), 600);
}
</script>

<template>
  <div :class="['start-screen', { 'start-screen--leaving': isLeaving }]">
    <div class="start-content">
      <!-- Decorative mushrooms -->
      <div class="mushroom-row">
        <div class="deco-mushroom deco-mushroom--tan">
          <div class="deco-cap"></div>
          <div class="deco-stem"></div>
        </div>
        <div class="deco-mushroom deco-mushroom--red">
          <div class="deco-cap">
            <div class="deco-spots"></div>
          </div>
          <div class="deco-stem"></div>
        </div>
        <div class="deco-mushroom deco-mushroom--purple">
          <div class="deco-cap"></div>
          <div class="deco-stem"></div>
        </div>
      </div>

      <h1 class="title">Welcome to the</h1>
      <h2 class="subtitle">Mushroom Garden</h2>

      <button class="begin-button" @click="handleBegin">
        <span class="begin-text">Begin</span>
      </button>

      <!-- Ground decoration -->
      <div class="ground">
        <div class="grass-tuft">
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
        </div>
        <div class="grass-tuft">
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
          <div class="grass-blade"></div>
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
.start-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #4a6741 0%, #3d5636 50%, #2d4028 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  transition: opacity 0.6s ease;
}

.start-screen--leaving {
  opacity: 0;
}

.start-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: contentFadeIn 0.8s ease;
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mushroom-row {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.deco-mushroom {
  position: relative;
  width: 48px;
  height: 56px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: mushroomBounce 2s ease-in-out infinite;
}

.deco-mushroom:nth-child(1) {
  animation-delay: 0s;
}

.deco-mushroom:nth-child(2) {
  animation-delay: 0.3s;
  width: 56px;
  height: 64px;
}

.deco-mushroom:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes mushroomBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.deco-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 44px;
  height: 28px;
  border-radius: 22px 22px 8px 8px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
}

.deco-mushroom:nth-child(2) .deco-cap {
  width: 52px;
  height: 32px;
}

.deco-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 28px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 4px 4px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

.deco-mushroom:nth-child(2) .deco-stem {
  width: 22px;
  height: 32px;
}

.deco-mushroom--tan .deco-cap {
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
}

.deco-mushroom--tan .deco-cap::before,
.deco-mushroom--tan .deco-cap::after {
  content: "";
  position: absolute;
  background: #fff5eb;
  border-radius: 50%;
}

.deco-mushroom--tan .deco-cap::before {
  width: 8px;
  height: 6px;
  top: 8px;
  left: 8px;
}

.deco-mushroom--tan .deco-cap::after {
  width: 6px;
  height: 5px;
  top: 12px;
  right: 10px;
}

.deco-mushroom--red .deco-cap {
  background: linear-gradient(135deg, #e85a5a 0%, #d43d3d 50%, #c42a2a 100%);
}

.deco-spots::before,
.deco-spots::after {
  content: "";
  position: absolute;
  background: #fff;
  border-radius: 50%;
}

.deco-spots::before {
  width: 8px;
  height: 6px;
  top: 6px;
  left: 8px;
}

.deco-spots::after {
  width: 6px;
  height: 5px;
  top: 12px;
  right: 12px;
}

.deco-mushroom--purple .deco-cap {
  background: linear-gradient(135deg, #a67cb8 0%, #8e5ca0 50%, #7a4a8c 100%);
}

.deco-mushroom--purple .deco-cap::before,
.deco-mushroom--purple .deco-cap::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.deco-mushroom--purple .deco-cap::before {
  width: 7px;
  height: 5px;
  top: 8px;
  left: 10px;
}

.deco-mushroom--purple .deco-cap::after {
  width: 5px;
  height: 4px;
  top: 14px;
  right: 12px;
}

.title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #c8d4b8;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.subtitle {
  font-family: 'Georgia', serif;
  font-size: 48px;
  color: #f5edd6;
  margin: 8px 0 0 0;
  text-shadow:
    0 3px 0 #3d5636,
    0 4px 8px rgba(0, 0, 0, 0.4);
  letter-spacing: 2px;
}

.begin-button {
  margin-top: 48px;
  padding: 16px 48px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow:
    0 6px 0 #8b5a3a,
    0 8px 16px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.begin-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 0 #8b5a3a,
    0 10px 20px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
}

.begin-button:active {
  transform: translateY(2px);
  box-shadow:
    0 4px 0 #8b5a3a,
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 0 rgba(255, 255, 255, 0.3);
}

.begin-text {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #fff8e7;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.ground {
  position: absolute;
  bottom: 60px;
  display: flex;
  gap: 80px;
}

.grass-tuft {
  display: flex;
  gap: 3px;
}

.grass-blade {
  width: 4px;
  height: 20px;
  background: linear-gradient(to top, #3d5636, #6b9a5a);
  border-radius: 3px 3px 0 0;
  transform-origin: bottom;
}

.grass-blade:nth-child(1) {
  transform: rotate(-12deg);
  height: 16px;
}

.grass-blade:nth-child(2) {
  height: 22px;
}

.grass-blade:nth-child(3) {
  transform: rotate(12deg);
  height: 18px;
}
</style>
