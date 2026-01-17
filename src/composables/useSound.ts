// Sound utility for playing audio effects

import { ref } from "vue";

const audioCache = new Map<string, HTMLAudioElement>();

// Mute state (reactive for UI binding)
export const isMusicMuted = ref(false);
export const isSfxMuted = ref(false);

function getAudio(path: string): HTMLAudioElement {
	let audio = audioCache.get(path);
	if (!audio) {
		audio = new Audio(path);
		audioCache.set(path, audio);
	}
	return audio;
}

export function playSound(path: string, volume = 1) {
	if (isSfxMuted.value) return;
	const audio = getAudio(path);
	audio.currentTime = 0;
	audio.volume = volume;
	audio.play().catch(() => {
		// Ignore autoplay errors (user hasn't interacted yet)
	});
}

// Background music state
let musicStarted = false;
let bgmOpening: HTMLAudioElement | null = null;
let bgmLoop: HTMLAudioElement | null = null;
const BGM_VOLUME = 0.3;

function updateMusicVolume() {
	const volume = isMusicMuted.value ? 0 : BGM_VOLUME;
	if (bgmOpening) bgmOpening.volume = volume;
	if (bgmLoop) bgmLoop.volume = volume;
}

export function toggleMusicMute() {
	isMusicMuted.value = !isMusicMuted.value;
	updateMusicVolume();
}

export function toggleSfxMute() {
	isSfxMuted.value = !isSfxMuted.value;
}

export function startBackgroundMusic() {
	if (musicStarted) return;
	musicStarted = true;

	bgmOpening = new Audio("/music/main-bgm-opening.mp3");
	bgmLoop = new Audio("/music/main-bgm-loop.mp3");

	bgmOpening.volume = isMusicMuted.value ? 0 : BGM_VOLUME;
	bgmLoop.volume = isMusicMuted.value ? 0 : BGM_VOLUME;
	bgmLoop.loop = true;

	// When opening ends, start the loop
	bgmOpening.addEventListener("ended", () => {
		bgmLoop?.play().catch(() => {});
	});

	bgmOpening.play().catch(() => {
		// If autoplay fails, try starting the loop directly on next interaction
		musicStarted = false;
	});
}

export function playRandomPop(volume = 0.25) {
	const popNumber = Math.floor(Math.random() * 7) + 1;
	playSound(`/sfx/Pop-${popNumber}.mp3`, volume);
}

export function playRandomDirt(volume = 0.3) {
	const dirtNumber = Math.floor(Math.random() * 2) + 1;
	playSound(`/sfx/Dirt-${dirtNumber}.mp3`, volume);
}

export function playJump(volume = 0.35) {
	if (isSfxMuted.value) return;
	const audio = getAudio("/sfx/jump.mp3");
	audio.currentTime = 0;
	audio.volume = volume;
	// Vary pitch by ±10% randomly
	audio.playbackRate = 0.9 + Math.random() * 0.2;
	audio.play().catch(() => {});
}

export function playLand(volume = 0.3) {
	const landNumber = Math.floor(Math.random() * 2) + 1;
	playSound(`/sfx/land-${landNumber}.mp3`, volume);
}

export function playSuccess(volume = 0.6) {
	playSound("/sfx/success.mp3", volume);
}

export function playNewWorld(volume = 0.6) {
	playSound("/sfx/new-world.mp3", volume);
}

export function playTutorialAppears(volume = 0.5) {
	playSound("/sfx/tutorial-appears.mp3", volume);
}

export function playUndo(volume = 0.4) {
	playSound("/sfx/undo.mp3", volume);
}

export function playWater(volume = 0.4) {
	playSound("/sfx/hit-water.mp3", volume);
}

export function playStone(volume = 0.35) {
	playSound("/sfx/hit-stone.mp3", volume);
}

// Ice slide loop state
let iceSlideAudio: HTMLAudioElement | null = null;

export function startIceSlide(volume = 0.4) {
	if (isSfxMuted.value) return;
	if (iceSlideAudio) {
		stopIceSlide();
	}
	iceSlideAudio = new Audio("/sfx/ice-slide-loop.mp3");
	iceSlideAudio.loop = true;
	iceSlideAudio.volume = volume;
	iceSlideAudio.play().catch(() => {});
}

export function stopIceSlide() {
	if (iceSlideAudio) {
		iceSlideAudio.pause();
		iceSlideAudio.currentTime = 0;
		iceSlideAudio = null;
	}
}

export function playIce(volume = 0.4) {
	// For non-looping ice sound (e.g., landing on ice)
	playSound("/sfx/ice-slide.mp3", volume);
}

// Voice lines
export function playVoiceStuck(volume = 0.7) {
	const num = Math.floor(Math.random() * 2) + 1;
	playSound(`/voice/voice-stuck0${num}.mp3`, volume);
}

export function playVoiceWave(volume = 0.7) {
	const num = Math.floor(Math.random() * 4) + 1;
	playSound(`/voice/voice-wave0${num}.mp3`, volume);
}

export function playVoiceSuccess(volume = 0.7) {
	const num = Math.floor(Math.random() * 8) + 1;
	playSound(`/voice/voice-success0${num}.mp3`, volume);
}

export function playVoiceTutorial(section: 1 | 2 | 3, volume = 0.7) {
	playSound(`/voice/voice-tutorial0${section}.mp3`, volume);
}
