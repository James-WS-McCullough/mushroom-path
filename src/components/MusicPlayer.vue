<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

const emit = defineEmits<{
	close: [];
}>();

interface Track {
	name: string;
	path: string;
	category: "forest" | "ice" | "beach" | "dark";
}

const tracks: Track[] = [
	// Forest tracks
	{ name: "Dewdrop Dawn", path: "/music/BGM 01.mp3", category: "forest" },
	{ name: "Spore Sprinkles", path: "/music/BGM 02.mp3", category: "forest" },
	{ name: "Moonlit Mycelium", path: "/music/BGM 03.mp3", category: "forest" },
	{ name: "Fungi Frolic", path: "/music/BGM 04.mp3", category: "forest" },
	{ name: "Whispering Caps", path: "/music/BGM 05.mp3", category: "forest" },
	{ name: "Toadstool Twilight", path: "/music/BGM 06.mp3", category: "forest" },
	{ name: "Mossy Meadow Dreams", path: "/music/BGM 07.mp3", category: "forest" },
	{ name: "Enchanted Undergrowth", path: "/music/BGM 08.mp3", category: "forest" },
	{ name: "Starlit Spores", path: "/music/BGM 09.mp3", category: "forest" },
	// Ice tracks
	{ name: "Frozen Glade", path: "/music/BGM-Ice1.mp3", category: "ice" },
	{ name: "Crystal Cavern", path: "/music/BGM-Ice2.mp3", category: "ice" },
	{ name: "Snowdrift Whispers", path: "/music/BGM-Ice3.mp3", category: "ice" },
	{ name: "Glacial Dreams", path: "/music/BGM-Ice4.mp3", category: "ice" },
	// Beach tracks
	{ name: "Tidal Pools", path: "/music/BGM-Beach1.mp3", category: "beach" },
	{ name: "Sandy Shores", path: "/music/BGM-Beach2.mp3", category: "beach" },
	{ name: "Seaside Breeze", path: "/music/BGM-Beach3.mp3", category: "beach" },
	{ name: "Coastal Calm", path: "/music/BGM-Beach4.mp3", category: "beach" },
	// Dark/swamp tracks
	{ name: "Murky Depths", path: "/music/BGM-Dark1.mp3", category: "dark" },
	{ name: "Twilight Marsh", path: "/music/BGM-Dark2.mp3", category: "dark" },
	{ name: "Foggy Hollow", path: "/music/BGM-Dark3.mp3", category: "dark" },
	{ name: "Moonlit Bog", path: "/music/BGM-Dark4.mp3", category: "dark" },
	{ name: "Shadow Ferns", path: "/music/BGM-Dark5.mp3", category: "dark" },
	{ name: "Misty Thicket", path: "/music/BGM-Dark6.mp3", category: "dark" },
	{ name: "Dusk Spores", path: "/music/BGM-Dark7.mp3", category: "dark" },
	{ name: "Night Canopy", path: "/music/BGM-Dark8.mp3", category: "dark" },
];

const FADE_DURATION = 1000; // 1 second fade
const EXTRA_LOOP_TIME = 10000; // 10 seconds extra before transitioning

const currentTrackIndex = ref<number | null>(null);
const isPlaying = ref(false);
const isShuffleMode = ref(false);
const audio = ref<HTMLAudioElement | null>(null);
const progress = ref(0);
const duration = ref(0);
const volume = ref(0.3);

let shuffleTimeout: ReturnType<typeof setTimeout> | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function clearShuffleTimeout() {
	if (shuffleTimeout) {
		clearTimeout(shuffleTimeout);
		shuffleTimeout = null;
	}
}

function clearFadeInterval() {
	if (fadeInterval) {
		clearInterval(fadeInterval);
		fadeInterval = null;
	}
}

function fadeOut(audioEl: HTMLAudioElement): Promise<void> {
	return new Promise((resolve) => {
		clearFadeInterval();
		const startVolume = audioEl.volume;
		const steps = 20;
		const stepDuration = FADE_DURATION / steps;
		const volumeStep = startVolume / steps;
		let currentStep = 0;

		fadeInterval = setInterval(() => {
			currentStep++;
			audioEl.volume = Math.max(0, startVolume - volumeStep * currentStep);

			if (currentStep >= steps) {
				clearFadeInterval();
				audioEl.pause();
				resolve();
			}
		}, stepDuration);
	});
}

function fadeIn(audioEl: HTMLAudioElement, volume: number): void {
	clearFadeInterval();
	audioEl.volume = 0;
	audioEl.play().catch(() => {});

	const steps = 20;
	const stepDuration = FADE_DURATION / steps;
	const volumeStep = volume / steps;
	let currentStep = 0;

	fadeInterval = setInterval(() => {
		currentStep++;
		audioEl.volume = Math.min(volume, volumeStep * currentStep);

		if (currentStep >= steps) {
			clearFadeInterval();
		}
	}, stepDuration);
}

function getRandomTrackIndex(excludeIndex?: number): number {
	let newIndex: number;
	do {
		newIndex = Math.floor(Math.random() * tracks.length);
	} while (newIndex === excludeIndex && tracks.length > 1);
	return newIndex;
}

function scheduleNextShuffleTrack() {
	clearShuffleTimeout();
	if (!audio.value || !isShuffleMode.value) return;

	// Wait for duration to be loaded
	const waitForDuration = () => {
		if (!audio.value) return;

		if (audio.value.duration && isFinite(audio.value.duration)) {
			const totalWait = (audio.value.duration * 1000) + EXTRA_LOOP_TIME;
			shuffleTimeout = setTimeout(async () => {
				if (!isShuffleMode.value || !audio.value) return;
				await transitionToNextTrack();
			}, totalWait);
		} else {
			// Duration not ready yet, wait a bit and try again
			setTimeout(waitForDuration, 100);
		}
	};
	waitForDuration();
}

async function transitionToNextTrack() {
	if (!audio.value) return;

	const oldAudio = audio.value;
	const nextIndex = getRandomTrackIndex(currentTrackIndex.value ?? undefined);

	// Fade out current track
	await fadeOut(oldAudio);

	// Start next track
	const track = tracks[nextIndex];
	if (!track) return;

	audio.value = new Audio(track.path);
	audio.value.loop = true;
	currentTrackIndex.value = nextIndex;

	audio.value.addEventListener("timeupdate", updateProgress);
	audio.value.addEventListener("loadedmetadata", () => {
		if (audio.value) {
			duration.value = audio.value.duration || 0;
		}
	});

	fadeIn(audio.value, volume.value);
	isPlaying.value = true;

	// Schedule next transition
	scheduleNextShuffleTrack();
}

function updateProgress() {
	if (audio.value) {
		progress.value = audio.value.currentTime;
		duration.value = audio.value.duration || 0;
	}
}

function playTrack(index: number) {
	// Exit shuffle mode when directly selecting a track
	isShuffleMode.value = false;
	clearShuffleTimeout();

	// If clicking the same track, toggle play/pause
	if (currentTrackIndex.value === index && audio.value) {
		if (isPlaying.value) {
			audio.value.pause();
			isPlaying.value = false;
		} else {
			audio.value.play();
			isPlaying.value = true;
		}
		return;
	}

	// Stop current track if playing
	if (audio.value) {
		clearFadeInterval();
		audio.value.pause();
		audio.value = null;
	}

	// Play new track (loops forever when directly selected)
	const track = tracks[index];
	if (!track) return;

	audio.value = new Audio(track.path);
	audio.value.volume = volume.value;
	audio.value.loop = true; // Loop forever when directly selected
	currentTrackIndex.value = index;

	audio.value.addEventListener("timeupdate", updateProgress);
	audio.value.addEventListener("loadedmetadata", () => {
		if (audio.value) {
			duration.value = audio.value.duration || 0;
		}
	});

	audio.value.play();
	isPlaying.value = true;
}

function startShuffle() {
	// Stop current playback
	if (audio.value) {
		clearFadeInterval();
		audio.value.pause();
		audio.value = null;
	}
	clearShuffleTimeout();

	isShuffleMode.value = true;

	// Pick a random track
	const randomIndex = getRandomTrackIndex();
	const track = tracks[randomIndex];
	if (!track) return;

	audio.value = new Audio(track.path);
	audio.value.volume = volume.value;
	audio.value.loop = true;
	currentTrackIndex.value = randomIndex;

	audio.value.addEventListener("timeupdate", updateProgress);
	audio.value.addEventListener("loadedmetadata", () => {
		if (audio.value) {
			duration.value = audio.value.duration || 0;
		}
	});

	audio.value.play();
	isPlaying.value = true;

	// Schedule transition to next track
	scheduleNextShuffleTrack();
}

function stopPlayback() {
	clearShuffleTimeout();
	clearFadeInterval();
	if (audio.value) {
		audio.value.pause();
		audio.value = null;
	}
	currentTrackIndex.value = null;
	isPlaying.value = false;
	isShuffleMode.value = false;
	progress.value = 0;
	duration.value = 0;
}

function formatTime(seconds: number): string {
	if (!seconds || !isFinite(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function handleClose() {
	stopPlayback();
	emit("close");
}

function seekTo(event: MouseEvent) {
	if (!audio.value || !duration.value) return;
	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const percent = (event.clientX - rect.left) / rect.width;
	audio.value.currentTime = percent * duration.value;
}

function updateVolume(event: Event) {
	const target = event.target as HTMLInputElement;
	volume.value = parseFloat(target.value);
	if (audio.value) {
		audio.value.volume = volume.value;
	}
}

// Group tracks by category for display
const tracksByCategory = computed(() => {
	const categories = [
		{ key: "forest" as const, label: "Forest" },
		{ key: "ice" as const, label: "Ice" },
		{ key: "beach" as const, label: "Beach" },
		{ key: "dark" as const, label: "Night" },
	];

	return categories.map((cat) => ({
		...cat,
		tracks: tracks
			.map((track, index) => ({ ...track, originalIndex: index }))
			.filter((track) => track.category === cat.key),
	}));
});

onUnmounted(() => {
	stopPlayback();
});
</script>

<template>
  <div class="music-player">
    <div class="player-content">
      <button class="close-btn" @click="handleClose">
        <span>Back</span>
      </button>

      <div class="header">
        <div class="header-mushroom">
          <div class="header-cap"></div>
          <div class="header-stem"></div>
        </div>
        <h1 class="player-title">Lofi beats to plant mushrooms to</h1>
      </div>

      <!-- Now Playing -->
      <div v-if="currentTrackIndex !== null" class="now-playing">
        <p class="now-playing-label">
          Now Playing
          <span v-if="isShuffleMode" class="shuffle-indicator">🔀 Shuffle</span>
        </p>
        <p class="now-playing-title">{{ tracks[currentTrackIndex]?.name }}</p>
        <div class="progress-bar" @click="seekTo">
          <div
            class="progress-fill"
            :style="{ width: duration ? `${(progress / duration) * 100}%` : '0%' }"
          ></div>
        </div>
        <div class="time-display">
          <span>{{ formatTime(progress) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
        <div class="volume-control">
          <span class="volume-icon">{{ volume > 0 ? '🔊' : '🔇' }}</span>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.01"
            :value="volume"
            class="volume-slider"
            @input="updateVolume"
          />
        </div>
      </div>

      <!-- Shuffle Button -->
      <button
        :class="['shuffle-btn', { 'shuffle-btn--active': isShuffleMode }]"
        @click="startShuffle"
      >
        <span class="shuffle-icon">🔀</span>
        <span>Shuffle All</span>
      </button>

      <!-- Track List by Category -->
      <div class="track-categories">
        <div v-for="category in tracksByCategory" :key="category.key" class="track-category">
          <h3 class="category-title">{{ category.label }}</h3>
          <div class="track-list">
            <button
              v-for="track in category.tracks"
              :key="track.path"
              :class="[
                'track-item',
                {
                  'track-item--active': currentTrackIndex === track.originalIndex,
                  'track-item--playing': currentTrackIndex === track.originalIndex && isPlaying,
                },
              ]"
              @click="playTrack(track.originalIndex)"
            >
              <span class="track-name">{{ track.name }}</span>
              <span class="track-icon">
                <template v-if="currentTrackIndex === track.originalIndex && isPlaying">
                  <span class="pause-icon">| |</span>
                </template>
                <template v-else>
                  <span class="play-icon">&#9654;</span>
                </template>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Stop Button -->
      <button v-if="isPlaying" class="stop-btn" @click="stopPlayback">
        Stop
      </button>
    </div>

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
    </div>
  </div>
</template>

<style scoped>
.music-player {
  position: fixed;
  inset: 0;
  background: linear-gradient(180deg, #3d5048 0%, #2d3d38 50%, #1d2d28 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 200;
  overflow-y: auto;
  padding: 24px;
}

.player-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  width: 100%;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  align-self: flex-start;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  color: #c8d4b8;
  font-family: 'Georgia', serif;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
  margin-bottom: 24px;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}

.header-mushroom {
  position: relative;
  width: 64px;
  height: 72px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.header-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 36px;
  background: linear-gradient(135deg, #7cb668 0%, #5a9a4a 50%, #4a8a3a 100%);
  border-radius: 30px 30px 10px 10px;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.1);
}

.header-cap::before,
.header-cap::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

.header-cap::before {
  width: 10px;
  height: 8px;
  top: 10px;
  left: 12px;
}

.header-cap::after {
  width: 8px;
  height: 6px;
  top: 16px;
  right: 14px;
}

.header-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 36px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 4px 4px 8px 8px;
}

.player-title {
  font-family: 'Georgia', serif;
  font-size: 24px;
  color: #f5edd6;
  text-align: center;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1.3;
}

.now-playing {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 16px;
  width: 100%;
  margin-bottom: 24px;
}

.now-playing-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #8a9a7a;
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.shuffle-indicator {
  background: rgba(124, 182, 104, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  color: #a8d898;
}

.now-playing-title {
  font-family: 'Georgia', serif;
  font-size: 20px;
  color: #f5edd6;
  margin: 0 0 12px 0;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #7cb668 0%, #9acd8a 100%);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.time-display {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #8a9a7a;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.volume-icon {
  font-size: 16px;
  width: 20px;
}

.volume-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #9acd8a 0%, #7cb668 100%);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #9acd8a 0%, #7cb668 100%);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.volume-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
}

.shuffle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: rgba(124, 182, 104, 0.15);
  border: 1px solid rgba(124, 182, 104, 0.3);
  padding: 14px 20px;
  border-radius: 10px;
  color: #c8e8b8;
  font-family: 'Georgia', serif;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
}

.shuffle-btn:hover {
  background: rgba(124, 182, 104, 0.25);
  border-color: rgba(124, 182, 104, 0.5);
}

.shuffle-btn--active {
  background: rgba(124, 182, 104, 0.3);
  border-color: rgba(124, 182, 104, 0.6);
  box-shadow: 0 0 12px rgba(124, 182, 104, 0.3);
}

.shuffle-icon {
  font-size: 18px;
}

.track-categories {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-bottom: 24px;
}

.track-category {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-title {
  font-family: 'Georgia', serif;
  font-size: 14px;
  color: #8a9a7a;
  margin: 0;
  padding-left: 4px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.track-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.track-item--active {
  background: rgba(124, 182, 104, 0.2);
  border-color: rgba(124, 182, 104, 0.4);
}

.track-item--playing {
  animation: playingPulse 2s ease-in-out infinite;
}

@keyframes playingPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(124, 182, 104, 0);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(124, 182, 104, 0.2);
  }
}

.track-name {
  flex: 1;
  font-family: 'Georgia', serif;
  font-size: 16px;
  color: #d8e4c8;
}

.track-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a9a7a;
  font-size: 12px;
}

.track-item--active .track-icon {
  color: #a8d898;
}

.play-icon {
  font-size: 10px;
}

.pause-icon {
  font-size: 10px;
  letter-spacing: 2px;
}

.stop-btn {
  background: rgba(200, 100, 100, 0.3);
  border: 1px solid rgba(200, 100, 100, 0.5);
  padding: 10px 24px;
  border-radius: 8px;
  color: #f5d8d8;
  font-family: 'Georgia', serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stop-btn:hover {
  background: rgba(200, 100, 100, 0.4);
}

.ground {
  position: fixed;
  bottom: calc(40px + env(safe-area-inset-bottom, 0px));
  display: flex;
  gap: 120px;
  pointer-events: none;
}

.grass-tuft {
  display: flex;
  gap: 3px;
}

.grass-blade {
  width: 4px;
  height: 20px;
  background: linear-gradient(to top, #2d3d38, #4a6a5a);
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

@media (max-width: 480px) {
  .music-player {
    padding: 16px;
  }

  .player-title {
    font-size: 20px;
  }

  .track-item {
    padding: 10px 12px;
  }

  .track-name {
    font-size: 14px;
  }
}
</style>
