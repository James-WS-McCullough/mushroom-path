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
let currentBgm: HTMLAudioElement | null = null;
const BGM_VOLUME = 0.2;
const FADE_DURATION = 1000; // 1 second fade

// World BGM playlist system
const BGM_TRACKS = [
	"/music/BGM 01.mp3",
	"/music/BGM 02.mp3",
	"/music/BGM 03.mp3",
	"/music/BGM 04.mp3",
	"/music/BGM 05.mp3",
	"/music/BGM 06.mp3",
	"/music/BGM 07.mp3",
	"/music/BGM 08.mp3",
	"/music/BGM 09.mp3",
];

let bgmPlaylist: string[] = [];
let currentPlaylistIndex = 0;

function shufflePlaylist() {
	// Fisher-Yates shuffle
	bgmPlaylist = [...BGM_TRACKS];
	for (let i = bgmPlaylist.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = bgmPlaylist[i]!;
		bgmPlaylist[i] = bgmPlaylist[j]!;
		bgmPlaylist[j] = temp;
	}
	currentPlaylistIndex = 0;
}

function getNextBgmTrack(): string {
	if (bgmPlaylist.length === 0 || currentPlaylistIndex >= bgmPlaylist.length) {
		shufflePlaylist();
	}
	const track = bgmPlaylist[currentPlaylistIndex]!;
	currentPlaylistIndex++;
	return track;
}

function updateMusicVolume() {
	const volume = isMusicMuted.value ? 0 : BGM_VOLUME;
	if (currentBgm) currentBgm.volume = volume;
}

export function toggleMusicMute() {
	isMusicMuted.value = !isMusicMuted.value;
	updateMusicVolume();
}

export function toggleSfxMute() {
	isSfxMuted.value = !isSfxMuted.value;
}

function fadeOutAudio(audio: HTMLAudioElement, duration: number): Promise<void> {
	return new Promise((resolve) => {
		const startVolume = audio.volume;
		const steps = 20;
		const stepDuration = duration / steps;
		const volumeStep = startVolume / steps;
		let currentStep = 0;

		const fadeInterval = setInterval(() => {
			currentStep++;
			audio.volume = Math.max(0, startVolume - volumeStep * currentStep);

			if (currentStep >= steps) {
				clearInterval(fadeInterval);
				audio.pause();
				audio.currentTime = 0;
				resolve();
			}
		}, stepDuration);
	});
}

function fadeInAudio(audio: HTMLAudioElement, targetVolume: number, duration: number): void {
	audio.volume = 0;
	audio.play().catch(() => {});

	const steps = 20;
	const stepDuration = duration / steps;
	const volumeStep = targetVolume / steps;
	let currentStep = 0;

	const fadeInterval = setInterval(() => {
		currentStep++;
		audio.volume = Math.min(targetVolume, volumeStep * currentStep);

		if (currentStep >= steps) {
			clearInterval(fadeInterval);
		}
	}, stepDuration);
}

export function startBackgroundMusic() {
	if (musicStarted) return;
	musicStarted = true;

	// Initialize playlist and start first track
	shufflePlaylist();
	const firstTrack = getNextBgmTrack();

	currentBgm = new Audio(firstTrack);
	currentBgm.loop = true;
	currentBgm.volume = isMusicMuted.value ? 0 : BGM_VOLUME;

	currentBgm.play().catch(() => {
		// If autoplay fails, reset state
		musicStarted = false;
	});
}

export async function changeWorldBGM() {
	if (!musicStarted) return;

	const nextTrack = getNextBgmTrack();
	const targetVolume = isMusicMuted.value ? 0 : BGM_VOLUME;

	// Fade out current BGM
	if (currentBgm) {
		await fadeOutAudio(currentBgm, FADE_DURATION);
	}

	// Create and fade in new BGM
	currentBgm = new Audio(nextTrack);
	currentBgm.loop = true;
	fadeInAudio(currentBgm, targetVolume, FADE_DURATION);
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

export function playTeleportPoof(volume = 0.5) {
	playSound("/sfx/teleport-poof.mp3", volume);
}
