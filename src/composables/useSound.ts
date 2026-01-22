// Sound utility for playing audio effects using Web Audio API
// Optimized for mobile with proper AudioContext handling

import { ref } from "vue";

// Mute state (reactive for UI binding)
export const isMusicMuted = ref(false);
export const isSfxMuted = ref(false);

// Music volume (0-1 scale, reactive for UI binding)
export const musicVolume = ref(1);

// Set music volume (0-1)
export function setMusicVolume(volume: number): void {
	musicVolume.value = Math.max(0, Math.min(1, volume));
	updateMusicVolume();
}

function updateMusicVolume(): void {
	if (currentBgm) {
		currentBgm.volume = BGM_VOLUME * musicVolume.value;
	}
}

// ============================================
// Web Audio API Core
// ============================================

let audioContext: AudioContext | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
const loadingPromises = new Map<string, Promise<AudioBuffer>>();

function getAudioContext(): AudioContext {
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

// Resume audio context on user interaction (required for mobile)
async function ensureAudioContextResumed(): Promise<void> {
	const ctx = getAudioContext();
	if (ctx.state === "suspended") {
		await ctx.resume();
	}
}

// Set up event listeners to resume audio context on any interaction
function setupAudioContextListeners(): void {
	const resume = () => {
		ensureAudioContextResumed();
		tryResumeMusic();
	};
	document.addEventListener("click", resume);
	document.addEventListener("touchstart", resume);
	document.addEventListener("keydown", resume);
}

// Detect if we're on a mobile device
function isMobileDevice(): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent,
	);
}

// Track if music was playing before visibility change (for mobile resume)
let wasPlayingBeforeHidden = false;

// Handle visibility changes - only pause on mobile (browsers force it anyway)
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		// On mobile, track if music was playing so we can resume
		if (isMobileDevice() && currentBgm && !currentBgm.paused) {
			wasPlayingBeforeHidden = true;
			// Don't manually pause - let the browser handle it
		}
	} else {
		// Resume audio context first
		ensureAudioContextResumed();

		// On mobile, try to resume if music was playing before
		if (isMobileDevice() && wasPlayingBeforeHidden && currentBgm && musicStarted && !isMusicMuted.value) {
			wasPlayingBeforeHidden = false;
			// Try to resume - if it fails due to autoplay policy, the next user interaction will resume it
			currentBgm.play().catch(() => {
				// Mark that we need to resume on next interaction
				needsResumeOnInteraction = true;
			});
		}
	}
});

// Flag to resume music on next user interaction (for mobile autoplay policy)
let needsResumeOnInteraction = false;

// Resume music on user interaction if needed
function tryResumeMusic(): void {
	if (needsResumeOnInteraction && currentBgm && musicStarted && !isMusicMuted.value) {
		currentBgm.play().catch(() => {});
		needsResumeOnInteraction = false;
	}
}

// ============================================
// Audio Loading & Caching
// ============================================

async function loadSound(path: string): Promise<AudioBuffer> {
	// Return cached buffer if available
	const cached = audioBufferCache.get(path);
	if (cached) {
		return cached;
	}

	// Return existing loading promise if in progress
	const existingPromise = loadingPromises.get(path);
	if (existingPromise) {
		return existingPromise;
	}

	// Fetch and decode
	const loadPromise = fetch(path)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Failed to load audio: ${path}`);
			}
			return response.arrayBuffer();
		})
		.then((arrayBuffer) => getAudioContext().decodeAudioData(arrayBuffer))
		.then((audioBuffer) => {
			audioBufferCache.set(path, audioBuffer);
			loadingPromises.delete(path);
			return audioBuffer;
		})
		.catch((error) => {
			loadingPromises.delete(path);
			console.warn(`Failed to load sound: ${path}`, error);
			throw error;
		});

	loadingPromises.set(path, loadPromise);
	return loadPromise;
}

async function preloadSounds(paths: string[]): Promise<void> {
	await Promise.all(paths.map((path) => loadSound(path).catch(() => {})));
}

// All SFX paths to preload
const ALL_SFX_PATHS = [
	// Pop sounds (7 variants)
	...Array.from({ length: 7 }, (_, i) => `/sfx/Pop-${i + 1}.mp3`),
	// Dirt sounds
	"/sfx/Dirt-1.mp3",
	"/sfx/Dirt-2.mp3",
	"/sfx/shovel-dirt.mp3",
	// Movement sounds
	"/sfx/jump.mp3",
	"/sfx/land-1.mp3",
	"/sfx/land-2.mp3",
	// Tile sounds
	"/sfx/hit-water.mp3",
	"/sfx/hit-stone.mp3",
	"/sfx/ice-slide.mp3",
	"/sfx/ice-slide-loop.mp3",
	// UI sounds
	"/sfx/success.mp3",
	"/sfx/new-world.mp3",
	"/sfx/tutorial-appears.mp3",
	"/sfx/undo.mp3",
	"/sfx/teleport-poof.mp3",
	// Bouncepad and tide sounds
	"/sfx/bouncepad.mp3",
	"/sfx/waves-rise.mp3",
	"/sfx/waves-fall.mp3",
	"/sfx/sand-land.mp3",
	// Acorn and squirrel sounds
	"/sfx/acorn.mp3",
	"/sfx/squirrel.mp3",
	// Voice lines
	"/voice/voice-stuck01.mp3",
	"/voice/voice-stuck02.mp3",
	...Array.from({ length: 4 }, (_, i) => `/voice/voice-wave0${i + 1}.mp3`),
	...Array.from({ length: 8 }, (_, i) => `/voice/voice-success0${i + 1}.mp3`),
	"/voice/voice-tutorial01.mp3",
];

// Initialize audio system (call on first user interaction)
export function initializeAudio(): void {
	setupAudioContextListeners();
	ensureAudioContextResumed();
	// Preload sounds in background (don't block UI)
	preloadSounds(ALL_SFX_PATHS);
}

// ============================================
// Sound Playback
// ============================================

export async function playSound(path: string, volume = 1): Promise<void> {
	if (isSfxMuted.value) return;

	try {
		await ensureAudioContextResumed();
		const buffer = await loadSound(path);
		const ctx = getAudioContext();

		// Create fresh source node (required - they're one-shot)
		const source = ctx.createBufferSource();
		source.buffer = buffer;

		// Create gain node for volume control
		const gainNode = ctx.createGain();
		gainNode.gain.value = volume;

		// Connect: source -> gain -> destination
		source.connect(gainNode);
		gainNode.connect(ctx.destination);

		source.start(0);
	} catch {
		// Silently fail - sound playback is not critical
	}
}

// Play sound with variable playback rate (for pitch variation)
async function playSoundWithRate(
	path: string,
	volume: number,
	playbackRate: number,
): Promise<void> {
	if (isSfxMuted.value) return;

	try {
		await ensureAudioContextResumed();
		const buffer = await loadSound(path);
		const ctx = getAudioContext();

		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.playbackRate.value = playbackRate;

		const gainNode = ctx.createGain();
		gainNode.gain.value = volume;

		source.connect(gainNode);
		gainNode.connect(ctx.destination);

		source.start(0);
	} catch {
		// Silently fail
	}
}

// ============================================
// Background Music (HTML5 Audio for streaming)
// ============================================

let musicStarted = false;
let currentBgm: HTMLAudioElement | null = null;
const BGM_VOLUME = 0.2;
const FADE_DURATION = 1000;

// Default forest tracks
const BGM_TRACKS_DEFAULT = [
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

// Ice biome tracks
const BGM_TRACKS_ICE = [
	"/music/BGM-Ice1.mp3",
	"/music/BGM-Ice2.mp3",
	"/music/BGM-Ice3.mp3",
	"/music/BGM-Ice4.mp3",
];

// Beach biome tracks
const BGM_TRACKS_BEACH = [
	"/music/BGM-Beach1.mp3",
	"/music/BGM-Beach2.mp3",
	"/music/BGM-Beach3.mp3",
	"/music/BGM-Beach4.mp3",
];

// Dark biome tracks (swamp/night)
const BGM_TRACKS_DARK = [
	"/music/BGM-Dark1.mp3",
	"/music/BGM-Dark2.mp3",
	"/music/BGM-Dark3.mp3",
	"/music/BGM-Dark4.mp3",
	"/music/BGM-Dark5.mp3",
	"/music/BGM-Dark6.mp3",
	"/music/BGM-Dark7.mp3",
	"/music/BGM-Dark8.mp3",
];

export type BiomeType = "default" | "ice" | "beach" | "dark";

/** Determine the music biome based on world elements */
export function getBiomeFromElements(elements: string[]): BiomeType {
	// Ice takes priority
	if (elements.includes("ice")) return "ice";
	// Beach/tides
	if (elements.includes("tides")) return "beach";
	// Dark for pond (night) or dirt (swamp)
	if (elements.includes("pond") || elements.includes("dirt")) return "dark";
	// Default for everything else
	return "default";
}

function getTracksForBiome(biome: BiomeType): string[] {
	switch (biome) {
		case "ice":
			return BGM_TRACKS_ICE;
		case "beach":
			return BGM_TRACKS_BEACH;
		case "dark":
			return BGM_TRACKS_DARK;
		default:
			return BGM_TRACKS_DEFAULT;
	}
}

let bgmPlaylist: string[] = [];
let currentPlaylistIndex = 0;
let currentBiome: BiomeType = "default";

function shufflePlaylist(tracks: string[] = BGM_TRACKS_DEFAULT): void {
	bgmPlaylist = [...tracks];
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
		shufflePlaylist(getTracksForBiome(currentBiome));
	}
	const track = bgmPlaylist[currentPlaylistIndex]!;
	currentPlaylistIndex++;
	return track;
}

function updateMusicMuted(): void {
	if (currentBgm) {
		currentBgm.muted = isMusicMuted.value;
	}
}

export function toggleMusicMute(): void {
	isMusicMuted.value = !isMusicMuted.value;
	updateMusicMuted();
}

export function toggleSfxMute(): void {
	isSfxMuted.value = !isSfxMuted.value;
}

function fadeOutAudio(
	audio: HTMLAudioElement,
	duration: number,
): Promise<void> {
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

function fadeInAudio(
	audio: HTMLAudioElement,
	targetVolume: number,
	duration: number,
): void {
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

export function startBackgroundMusic(): void {
	if (musicStarted) return;
	musicStarted = true;

	shufflePlaylist();
	const firstTrack = getNextBgmTrack();

	currentBgm = new Audio(firstTrack);
	currentBgm.loop = true;
	currentBgm.volume = BGM_VOLUME;
	currentBgm.muted = isMusicMuted.value;

	currentBgm.play().catch(() => {
		musicStarted = false;
	});
}

// Start with a specific track (used for tutorial)
export function startTutorialMusic(): void {
	if (musicStarted) return;
	musicStarted = true;

	// Use Dewdrop Dawn (BGM 01) for tutorial
	const tutorialTrack = "/music/BGM 01.mp3";

	currentBgm = new Audio(tutorialTrack);
	currentBgm.loop = true;
	currentBgm.volume = BGM_VOLUME;
	currentBgm.muted = isMusicMuted.value;

	currentBgm.play().catch(() => {
		musicStarted = false;
	});

	// Pre-shuffle playlist for when we transition out of tutorial
	shufflePlaylist();
}

export async function changeWorldBGM(biome: BiomeType = "default"): Promise<void> {
	if (!musicStarted) return;

	// If biome changed, reshuffle with new biome's tracks
	if (biome !== currentBiome) {
		currentBiome = biome;
		shufflePlaylist(getTracksForBiome(biome));
	}

	const nextTrack = getNextBgmTrack();

	if (currentBgm) {
		await fadeOutAudio(currentBgm, FADE_DURATION);
	}

	currentBgm = new Audio(nextTrack);
	currentBgm.loop = true;
	currentBgm.muted = isMusicMuted.value;
	fadeInAudio(currentBgm, BGM_VOLUME, FADE_DURATION);
}

// Switch to tutorial music (Dewdrop Dawn)
export async function switchToTutorialMusic(): Promise<void> {
	if (!musicStarted) return;

	const tutorialTrack = "/music/BGM 01.mp3";

	if (currentBgm) {
		await fadeOutAudio(currentBgm, FADE_DURATION);
	}

	currentBgm = new Audio(tutorialTrack);
	currentBgm.loop = true;
	currentBgm.muted = isMusicMuted.value;
	fadeInAudio(currentBgm, BGM_VOLUME, FADE_DURATION);
}

// ============================================
// Sound Effect Functions
// ============================================

export function playRandomPop(volume = 0.25): void {
	const popNumber = Math.floor(Math.random() * 7) + 1;
	playSound(`/sfx/Pop-${popNumber}.mp3`, volume);
}

export function playRandomDirt(volume = 0.3): void {
	const dirtNumber = Math.floor(Math.random() * 2) + 1;
	playSound(`/sfx/Dirt-${dirtNumber}.mp3`, volume);
}

export function playShovelDirt(volume = 0.4): void {
	playSound("/sfx/shovel-dirt.mp3", volume);
}

export function playJump(volume = 0.35): void {
	// Vary pitch by ±10% randomly
	const playbackRate = 0.9 + Math.random() * 0.2;
	playSoundWithRate("/sfx/jump.mp3", volume, playbackRate);
}

export function playLand(volume = 0.3): void {
	const landNumber = Math.floor(Math.random() * 2) + 1;
	playSound(`/sfx/land-${landNumber}.mp3`, volume);
}

export function playSuccess(volume = 0.6): void {
	playSound("/sfx/success.mp3", volume);
}

export function playNewWorld(volume = 0.6): void {
	playSound("/sfx/new-world.mp3", volume);
}

export function playTutorialAppears(volume = 0.5): void {
	playSound("/sfx/tutorial-appears.mp3", volume);
}

export function playUndo(volume = 0.4): void {
	playSound("/sfx/undo.mp3", volume);
}

export function playWater(volume = 0.4): void {
	playSound("/sfx/hit-water.mp3", volume);
}

export function playStone(volume = 0.35): void {
	playSound("/sfx/hit-stone.mp3", volume);
}

// ============================================
// Ice Slide Loop (Web Audio API)
// ============================================

let iceSlideSource: AudioBufferSourceNode | null = null;
let iceSlideGain: GainNode | null = null;

export async function startIceSlide(volume = 0.4): Promise<void> {
	if (isSfxMuted.value) return;

	stopIceSlide();

	try {
		await ensureAudioContextResumed();
		const buffer = await loadSound("/sfx/ice-slide-loop.mp3");
		const ctx = getAudioContext();

		iceSlideSource = ctx.createBufferSource();
		iceSlideSource.buffer = buffer;
		iceSlideSource.loop = true;

		iceSlideGain = ctx.createGain();
		iceSlideGain.gain.value = volume;

		iceSlideSource.connect(iceSlideGain);
		iceSlideGain.connect(ctx.destination);

		iceSlideSource.start(0);
	} catch {
		// Silently fail
	}
}

export function stopIceSlide(): void {
	if (iceSlideSource) {
		try {
			iceSlideSource.stop();
		} catch {
			// May already be stopped
		}
		iceSlideSource.disconnect();
		iceSlideSource = null;
	}
	if (iceSlideGain) {
		iceSlideGain.disconnect();
		iceSlideGain = null;
	}
}

export function playIce(volume = 0.4): void {
	playSound("/sfx/ice-slide.mp3", volume);
}

export function playBouncepad(volume = 0.4): void {
	playSound("/sfx/bouncepad.mp3", volume);
}

export function playWavesRise(volume = 0.4): void {
	playSound("/sfx/waves-rise.mp3", volume);
}

export function playWavesFall(volume = 0.4): void {
	playSound("/sfx/waves-fall.mp3", volume);
}

export function playSandLand(volume = 0.3): void {
	playSound("/sfx/sand-land.mp3", volume);
}

export function playHoneyLand(volume = 0.3): void {
	playSound("/sfx/honey-land.mp3", volume);
}

export function playAcorn(volume = 0.5): void {
	playSound("/sfx/acorn.mp3", volume);
}

export function playSquirrel(volume = 0.5): void {
	playSound("/sfx/squirrel.mp3", volume);
}

// ============================================
// Voice Lines
// ============================================

export function playVoiceStuck(volume = 0.7): void {
	const num = Math.floor(Math.random() * 2) + 1;
	playSound(`/voice/voice-stuck0${num}.mp3`, volume);
}

export function playVoiceWave(volume = 0.7): void {
	const num = Math.floor(Math.random() * 4) + 1;
	playSound(`/voice/voice-wave0${num}.mp3`, volume);
}

export function playVoiceSuccess(volume = 0.7): void {
	const num = Math.floor(Math.random() * 8) + 1;
	playSound(`/voice/voice-success0${num}.mp3`, volume);
}

export function playVoiceTutorial(section: 1 | 2 | 3, volume = 0.7): void {
	playSound(`/voice/voice-tutorial0${section}.mp3`, volume);
}

export function playTeleportPoof(volume = 0.5): void {
	playSound("/sfx/teleport-poof.mp3", volume);
}

// Lily-pad sounds
export function playLilypadSink(volume = 0.3): void {
	playSound("/sfx/lilypad-sink.mp3", volume);
}

export function playLilypadSurface(volume = 0.25): void {
	playSound("/sfx/lilypad-resurface.mp3", volume);
}
