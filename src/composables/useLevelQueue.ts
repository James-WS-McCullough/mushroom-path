import { type Ref, ref } from "vue";
import { level1 } from "../data/levels";
import type { Level, WorldElement } from "../types/game";
import { generateLevel } from "../utils/levelGenerator";

const QUEUE_SIZE = 3; // Number of levels to keep pre-generated

interface LevelQueue {
	getNextLevel: () => Level;
	setWorldElements: (elements: WorldElement[], startImmediately?: boolean) => void;
	startGenerating: () => void;
	pauseGeneration: () => void;
	resumeGeneration: () => void;
}

// Polyfill for requestIdleCallback
const requestIdle =
	typeof requestIdleCallback !== "undefined"
		? requestIdleCallback
		: (cb: () => void) => setTimeout(cb, 1);

const cancelIdle =
	typeof cancelIdleCallback !== "undefined"
		? cancelIdleCallback
		: (id: number) => clearTimeout(id);

export function useLevelQueue(): LevelQueue {
	const levelQueue: Ref<Level[]> = ref([]);
	const currentElements: Ref<WorldElement[]> = ref([]);
	let isGenerating = false;
	let generationScheduled = false;
	let isPaused = false;
	let pendingIdleCallback: number | null = null;

	function generateInBackground() {
		if (isGenerating || generationScheduled || isPaused) return;
		if (levelQueue.value.length >= QUEUE_SIZE) return;

		generationScheduled = true;

		// Use requestIdleCallback to only generate when browser is idle
		// This prevents blocking animations and user interactions
		pendingIdleCallback = requestIdle(() => {
			pendingIdleCallback = null;
			generationScheduled = false;

			// Check again in case state changed while waiting
			if (isPaused || levelQueue.value.length >= QUEUE_SIZE) return;

			isGenerating = true;

			try {
				const newLevel = generateLevel({}, currentElements.value);
				if (newLevel) {
					levelQueue.value.push(newLevel);
				}
			} catch (e) {
				// Silently handle generation errors
			}

			isGenerating = false;

			// Continue generating if queue isn't full and not paused
			if (levelQueue.value.length < QUEUE_SIZE && !isPaused) {
				generateInBackground();
			}
		});
	}

	function getNextLevel(): Level {
		// Try to get a pre-generated level
		if (levelQueue.value.length > 0) {
			const level = levelQueue.value.shift()!;

			// Trigger background generation to refill the queue
			generateInBackground();

			return level;
		}

		// Fallback: generate synchronously if queue is empty
		const newLevel = generateLevel({}, currentElements.value);

		// Start background generation for future levels
		generateInBackground();

		return newLevel ?? level1;
	}

	function setWorldElements(elements: WorldElement[], startImmediately = true) {
		// Clear queue when world elements change (new world)
		levelQueue.value = [];
		currentElements.value = elements;

		// Cancel any pending generation
		if (pendingIdleCallback !== null) {
			cancelIdle(pendingIdleCallback);
			pendingIdleCallback = null;
			generationScheduled = false;
		}

		// Only start generating if not paused and requested
		if (startImmediately && !isPaused) {
			generateInBackground();
		}
	}

	function startGenerating() {
		generateInBackground();
	}

	function pauseGeneration() {
		isPaused = true;
		// Cancel any pending idle callback
		if (pendingIdleCallback !== null) {
			cancelIdle(pendingIdleCallback);
			pendingIdleCallback = null;
			generationScheduled = false;
		}
	}

	function resumeGeneration() {
		isPaused = false;
		// Resume generation if queue isn't full
		if (levelQueue.value.length < QUEUE_SIZE) {
			generateInBackground();
		}
	}

	return {
		getNextLevel,
		setWorldElements,
		startGenerating,
		pauseGeneration,
		resumeGeneration,
	};
}

// Singleton instance for the app
let queueInstance: LevelQueue | null = null;

export function getLevelQueue(): LevelQueue {
	if (!queueInstance) {
		queueInstance = useLevelQueue();
	}
	return queueInstance;
}
