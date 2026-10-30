import { type Ref, ref } from "vue";
import { level1 } from "../data/levels";
import type { Level, WorldElement } from "../types/game";
import { generateLevel, getTileBudget } from "../utils/levelGenerator";

interface LevelQueue {
	/** Generate a level, sized for its place in the world (1 = first level) */
	getNextLevel: (levelNumber: number) => Level;
	setWorldElements: (
		elements: WorldElement[],
		startImmediately?: boolean,
	) => void;
	startGenerating: () => void;
	pauseGeneration: () => void;
	resumeGeneration: () => void;
}

export function useLevelQueue(): LevelQueue {
	const currentElements: Ref<WorldElement[]> = ref([]);

	function getNextLevel(levelNumber: number): Level {
		// Always generate synchronously - caller is responsible for showing loading state
		const newLevel = generateLevel(
			getTileBudget(levelNumber),
			currentElements.value,
		);
		return newLevel ?? level1;
	}

	function setWorldElements(
		elements: WorldElement[],
		_startImmediately = true,
	) {
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
