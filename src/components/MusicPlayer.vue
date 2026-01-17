<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const emit = defineEmits<{
	close: [];
}>();

interface Track {
	name: string;
	path: string;
}

const tracks: Track[] = [
	{ name: "Dewdrop Dawn", path: "/music/BGM 01.mp3" },
	{ name: "Spore Sprinkles", path: "/music/BGM 02.mp3" },
	{ name: "Moonlit Mycelium", path: "/music/BGM 03.mp3" },
	{ name: "Fungi Frolic", path: "/music/BGM 04.mp3" },
	{ name: "Whispering Caps", path: "/music/BGM 05.mp3" },
	{ name: "Toadstool Twilight", path: "/music/BGM 06.mp3" },
	{ name: "Mossy Meadow Dreams", path: "/music/BGM 07.mp3" },
	{ name: "Enchanted Undergrowth", path: "/music/BGM 08.mp3" },
	{ name: "Starlit Spores", path: "/music/BGM 09.mp3" },
];

const currentTrackIndex = ref<number | null>(null);
const isPlaying = ref(false);
const audio = ref<HTMLAudioElement | null>(null);
const progress = ref(0);
const duration = ref(0);

function playTrack(index: number) {
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
		audio.value.pause();
		audio.value = null;
	}

	// Play new track
	const track = tracks[index];
	if (!track) return;

	audio.value = new Audio(track.path);
	audio.value.volume = 0.3;
	currentTrackIndex.value = index;

	audio.value.addEventListener("timeupdate", () => {
		if (audio.value) {
			progress.value = audio.value.currentTime;
			duration.value = audio.value.duration || 0;
		}
	});

	audio.value.addEventListener("ended", () => {
		// Play next track
		const nextIndex = (index + 1) % tracks.length;
		playTrack(nextIndex);
	});

	audio.value.play();
	isPlaying.value = true;
}

function stopPlayback() {
	if (audio.value) {
		audio.value.pause();
		audio.value = null;
	}
	currentTrackIndex.value = null;
	isPlaying.value = false;
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

onMounted(() => {
	// Optional: auto-play first track
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
        <p class="now-playing-label">Now Playing</p>
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
      </div>

      <!-- Track List -->
      <div class="track-list">
        <button
          v-for="(track, index) in tracks"
          :key="track.path"
          :class="[
            'track-item',
            {
              'track-item--active': currentTrackIndex === index,
              'track-item--playing': currentTrackIndex === index && isPlaying,
            },
          ]"
          @click="playTrack(index)"
        >
          <span class="track-number">{{ index + 1 }}</span>
          <span class="track-name">{{ track.name }}</span>
          <span class="track-icon">
            <template v-if="currentTrackIndex === index && isPlaying">
              <span class="pause-icon">| |</span>
            </template>
            <template v-else>
              <span class="play-icon">&#9654;</span>
            </template>
          </span>
        </button>
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
  font-size: 12px;
  color: #8a9a7a;
  margin: 0 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
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

.track-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 24px;
}

.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 12px 16px;
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

.track-number {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #8a9a7a;
  flex-shrink: 0;
}

.track-item--active .track-number {
  background: rgba(124, 182, 104, 0.3);
  color: #c8e8b8;
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
  bottom: 40px;
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
