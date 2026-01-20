import { type Ref, ref } from "vue";
import { level1 } from "../data/levels";
import type { Level, WorldElement } from "../types/game";
import { generateLevel } from "../utils/levelGenerator";

interface LevelQueue {
	getNextLevel: () => Level;
	setWorldElements: (elements: WorldElement[], startImmediately?: boolean) => void;
	startGenerating: () => void;
	pauseGeneration: () => void;
	resumeGeneration: () => void;
}

export function useLevelQueue(): LevelQueue {
	const currentElements: Ref<WorldElement[]> = ref([]);

	function getNextLevel(): Level {
		// Always generate synchronously - caller is responsible for showing loading state
		const newLevel = generateLevel({}, currentElements.value);
		return newLevel ?? level1;
	}

	function setWorldElements(elements: WorldElement[], _startImmediately = true) {
		currentElements.value = elements;
	}

	// These are no-ops now - kept for API compatibility
	function startGenerating() {}
	function pauseGeneration() {}
	function resumeGeneration() {}

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
