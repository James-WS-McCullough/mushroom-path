import { ref, type Ref } from "vue";
import type { Level, WorldElement } from "../types/game";
import { level1 } from "../data/levels";
import { generateLevel } from "../utils/levelGenerator";

const QUEUE_SIZE = 3; // Number of levels to keep pre-generated

interface LevelQueue {
	getNextLevel: () => Level;
	setWorldElements: (elements: WorldElement[]) => void;
	startGenerating: () => void;
}

export function useLevelQueue(): LevelQueue {
	const levelQueue: Ref<Level[]> = ref([]);
	const currentElements: Ref<WorldElement[]> = ref([]);
	let isGenerating = false;
	let generationScheduled = false;

	function generateInBackground() {
		if (isGenerating || generationScheduled) return;
		if (levelQueue.value.length >= QUEUE_SIZE) return;

		generationScheduled = true;

		// Use setTimeout to avoid blocking the main thread
		setTimeout(() => {
			generationScheduled = false;

			if (levelQueue.value.length >= QUEUE_SIZE) return;

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

			// Continue generating if queue isn't full
			if (levelQueue.value.length < QUEUE_SIZE) {
				generateInBackground();
			}
		}, 50); // Small delay to let other work happen
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

	function setWorldElements(elements: WorldElement[]) {
		// Clear queue when world elements change (new world)
		levelQueue.value = [];
		currentElements.value = elements;

		// Start generating levels for the new world
		generateInBackground();
	}

	function startGenerating() {
		generateInBackground();
	}

	return {
		getNextLevel,
		setWorldElements,
		startGenerating,
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
