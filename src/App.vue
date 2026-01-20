<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import BottomBar from "./components/BottomBar.vue";
import ConfirmModal from "./components/ConfirmModal.vue";
import CustomWorldModal from "./components/CustomWorldModal.vue";
import HelpModeModal from "./components/HelpModeModal.vue";
import DialogueScene from "./components/DialogueScene.vue";
import FirstTimeModal from "./components/FirstTimeModal.vue";
import GameBoard from "./components/GameBoard.vue";
import MapScreen from "./components/MapScreen.vue";
import MusicPlayer from "./components/MusicPlayer.vue";
import StartScreen from "./components/StartScreen.vue";
import TopBar from "./components/TopBar.vue";
import TutorialModal from "./components/TutorialModal.vue";
import WelcomeSign from "./components/WelcomeSign.vue";
import { getLevelQueue } from "./composables/useLevelQueue";
import {
	changeWorldBGM,
	initializeAudio,
	playSuccess,
	playUndo,
	playVoiceSuccess,
	startBackgroundMusic,
	startTutorialMusic,
	switchToTutorialMusic,
} from "./composables/useSound";
import type { DialogueScene as DialogueSceneType } from "./data/dialogues";
import {
	adventureScenes,
	introDialogue,
	levelDialogues,
	mechanicDialogues,
	worldEndDialogues,
} from "./data/dialogues";
import { level1 } from "./data/levels";
import {
	tutorialGoodbye,
	tutorialIntroDialogues,
	tutorialStuckDialogues,
} from "./data/tutorialDialogues";
import { tutorialLevels } from "./data/tutorialLevels";
import type { Level, WorldElement } from "./types/game";
import { WorldElement as WE } from "./types/game";

const levelQueue = getLevelQueue();

// Preload character sprites to avoid loading delays during gameplay
const SPRITE_URLS = [
	"/art/MushroomGirl.webp",
	"/art/MushroomGirl-blink.webp",
	"/art/MushroomGirl-Jump.webp",
	"/art/MushroomGirl-Wave.webp",
	"/art/MushroomGirl-Stuck.webp",
];

function preloadSprites() {
	for (const url of SPRITE_URLS) {
		const img = new Image();
		img.src = url;
	}
}

// Start preloading immediately
preloadSprites();

const LEVELS_PER_WORLD = 8;

const forestWorldNames = [
	"Mossy Meadow",
	"Shady Grove",
	"Fern Hollow",
	"Dewdrop Dell",
	"Toadstool Trail",
	"Fungal Forest",
	"Mycelium Mile",
	"Cap Corner",
	"Bracket Bend",
	"Truffle Thicket",
	"Chanterelle Chase",
	"Porcini Path",
	"Morel Maze",
];

const iceWorldNames = [
	"Frozen Fungi Fjord",
	"Shivercap Summit",
	"Frostspore Falls",
	"Icicle Inn",
	"Permafrost Patch",
	"Snowcap Sanctuary",
	"Glacier Glade",
	"Blizzard Basin",
	"Tundra Trail",
	"Crystal Cap Cavern",
	"Chillcap Chasm",
	"Winter Whisper Woods",
	"Polar Porcini Peak",
];

const swampWorldNames = [
	"Mushroom Marsh",
	"Bogcap Bayou",
	"Murky Morel Mire",
	"Sludge Spore Swamp",
	"Dankwood Dell",
	"Foggy Fungus Fen",
	"Peatcap Pond",
	"Mildew Meadow",
	"Mossmire Hollow",
	"Wetland Whispers",
	"Brackish Basin",
	"Swampcap Sanctuary",
	"Quagmire Quarter",
];

const nightWorldNames = [
	"Moonlit Marsh",
	"Twilight Thicket",
	"Firefly Fen",
	"Starspore Sanctuary",
	"Duskshroom Dell",
	"Midnight Meadow",
	"Glowcap Glade",
	"Nocturne Nook",
	"Shadowed Shallows",
	"Luminous Lagoon",
	"Dreamspore Dale",
	"Starglow Springs",
	"Mystic Moonpond",
];

const beachWorldNames = [
	"Sandy Shores",
	"Tidal Pools",
	"Coral Cove",
	"Driftwood Beach",
	"Seashell Bay",
	"Sunset Strand",
	"Kelp Coast",
	"Pebbly Point",
	"Foam Flats",
	"Sandcastle Spit",
	"Saltspray Sanctuary",
	"Seaside Shrooms",
	"Wavecrest Walk",
];

const bounceWorldNames = [
	"Springcap Meadows",
	"Bouncy Bog",
	"Trampo Trails",
	"Leap Lichen Lane",
	"Boingshroom Basin",
	"Hopscotch Hollow",
	"Springy Spore Fields",
	"Fungal Funhouse",
	"Reboundia",
	"Jumpy Junction",
];

const gameStarted = ref(false);
const currentLevel = ref<Level>(level1);
const levelKey = ref(0);
const showWinModal = ref(false);
const showTutorial = ref(false);
const isInitialTutorial = ref(false);
const showWelcomeSign = ref(false);
const showCustomWorldModal = ref(false);
const showMusicPlayer = ref(false);
const currentDialogue = ref<DialogueSceneType | null>(null);
const hasSeenIntro = localStorage.getItem("mushroom-path-intro-seen");
const isFading = ref(false);
const confirmAction = ref<"skip" | "restart" | null>(null);

// Tutorial world state
const showFirstTimeModal = ref(false);
const isInTutorial = ref(false);
const tutorialPuzzleIndex = ref(0);
const tutorialStuckShown = ref<boolean[]>([false, false, false, false, false]);
const hasTutorialComplete = localStorage.getItem(
	"mushroom-path-tutorial-complete",
);
const hasFirstTimeAsked = localStorage.getItem(
	"mushroom-path-first-time-asked",
);
const hasMetDew = ref(localStorage.getItem("mushroom-path-met-dew") === "true");

// Help mode state (persisted to localStorage)
const HELP_MODE_KEY = "mushroom-path-help-mode";
const isHelpModeEnabled = ref(localStorage.getItem(HELP_MODE_KEY) === "true");
const showHelpModeModal = ref(false);
const isHelpModeBlocked = ref(false); // Blocks controls when help mode detects impossible state

function toggleHelpMode(enabled: boolean) {
	isHelpModeEnabled.value = enabled;
	localStorage.setItem(HELP_MODE_KEY, enabled ? "true" : "false");
	// Clear blocked state if help mode is disabled
	if (!enabled) {
		isHelpModeBlocked.value = false;
	}
}

// Mechanic intro tracking
function hasSeenMechanic(mechanic: string): boolean {
	return localStorage.getItem(`mushroom-path-mechanic-${mechanic}`) === "true";
}

function markMechanicSeen(mechanic: string): void {
	localStorage.setItem(`mushroom-path-mechanic-${mechanic}`, "true");
}

// Queue of mechanic dialogues to show when entering a new world
const pendingMechanicDialogues = ref<DialogueSceneType[]>([]);

// Map WorldElement to mechanic key for dialogue lookup
function getMechanicKey(element: WorldElement): string {
	switch (element) {
		case WE.ICE:
			return "ice";
		case WE.DIRT:
			return "dirt";
		case WE.RIVERS:
			return "rivers";
		case WE.FAIRY:
			return "fairy";
		case WE.POND:
			return "pond";
		case WE.TIDES:
			return "tides";
		case WE.BOUNCE:
			return "bounce";
		case WE.HONEY:
			return "honey";
		default:
			return "";
	}
}

// Check for unseen mechanics in the given elements and queue their dialogues
function queueUnseenMechanicDialogues(elements: WorldElement[]): void {
	const dialogues: DialogueSceneType[] = [];
	for (const element of elements) {
		const key = getMechanicKey(element);
		if (key && !hasSeenMechanic(key) && mechanicDialogues[key]) {
			dialogues.push(mechanicDialogues[key]);
			markMechanicSeen(key);
		}
	}
	pendingMechanicDialogues.value = dialogues;
}

const isBlack = ref(false);

// Loading states for user feedback
const isLoading = ref(false);
const loadingMessage = ref("");

// Reference to GameBoard for undo functionality
const gameBoardRef = ref<InstanceType<typeof GameBoard> | null>(null);

const canUndo = computed(() => {
	return gameBoardRef.value?.canUndo ?? false;
});

// Track mushrooms planted in current level (updated via event from GameBoard)
const levelMushroomsPlanted = ref(0);

function handleMushroomsChanged(count: number) {
	levelMushroomsPlanted.value = count;
}

// Displayed mushroom count (total + current level)
const displayedMushroomCount = computed(() => {
	return totalMushroomsPlanted.value + levelMushroomsPlanted.value;
});

// Hint system state
const hintTiles = ref<{ x: number; y: number }[]>([]);
const stuckTiles = ref<{ x: number; y: number }[]>([]);
const undoGlow = ref(false);
const restartGlow = ref(false);
const hintMessage = ref<string | null>(null);
const hintSprite = ref<string>("BlueGirl-Normal");
let hintTimeouts: ReturnType<typeof setTimeout>[] = [];

// Hint messages for success
const successHintMessages = [
	"over here, sprout!",
	"try this way~",
	"hop hop hop!",
	"this looks good!",
	"follow me~",
	"this one next!",
	"ooh, go here!",
	"jump this way!",
	"i think it's this one",
	"here here here!",
	"try hopping over there~",
	"that tile looks nice!",
];

// Hint messages for stuck/undo
const stuckHintMessages = [
	"hmm, let's go back...",
	"oops, undo that one!",
	"backtrack time~",
	"that's not it...",
	"wrong way, sprout!",
	"let's try that again",
	"mmm, go back a bit",
	"not quite right...",
	"undo undo!",
	"oopsie, backtrack!",
	"that path's no good",
	"hmm, retrace your steps~",
];

// Hint messages for when pathfinding times out (unsure)
const unsureHintMessages = [
	"hmm, i'm not sure...",
	"this one's tricky!",
	"let me think...",
	"i can't tell right now~",
	"hmm, you're on your own!",
	"this puzzle is hard!",
	"i need a moment...",
	"you got this, sprout!",
	"my brain is fuzzy~",
	"too many paths to check!",
];

// Hint messages for stuck/restart (when undo not available)
const restartHintMessages = [
	"let's start over!",
	"fresh start~",
	"try again from the top!",
	"hmm, restart maybe?",
	"new attempt time!",
	"let's reset this one",
	"from the beginning~",
	"clean slate!",
	"one more try!",
	"restart and retry~",
	"back to the start!",
	"let's try a new approach",
];

// Sprout's hint messages (used before meeting Dew)
const sproutSuccessMessages = [
	"maybe here?",
	"ooh this one!",
	"let's try this~",
	"hop hop!",
	"this way!",
];

const sproutStuckMessages = [
	"oops...",
	"hmm, go back?",
	"that wasn't right~",
	"uh oh!",
];

const sproutUnsureMessages = [
	"hmm...",
	"i dunno~",
	"this is hard!",
	"let me think...",
];

const sproutRestartMessages = [
	"start over!",
	"try again~",
	"one more time!",
	"from the top!",
];

// World and level tracking
const currentWorldIndex = ref(0);
const currentLevelNumber = ref(1);
const currentWorldElements = ref<WorldElement[]>([]);

// Map screen state
const showMapScreen = ref(false);
const worldElementHistory = ref<WorldElement[][]>([]);
const worldNameHistory = ref<string[]>([]);
const mapTransitionData = ref<{
	fromWorld: number;
	toWorld: number;
} | null>(null);
// Random offsets for world names so first world isn't always the same
const forestNameOffset = ref(
	Math.floor(Math.random() * forestWorldNames.length),
);
const iceNameOffset = ref(Math.floor(Math.random() * iceWorldNames.length));
const swampNameOffset = ref(Math.floor(Math.random() * swampWorldNames.length));
const nightNameOffset = ref(Math.floor(Math.random() * nightWorldNames.length));
const beachNameOffset = ref(Math.floor(Math.random() * beachWorldNames.length));
const bounceNameOffset = ref(Math.floor(Math.random() * bounceWorldNames.length));

// Save game progress to localStorage
const SAVE_KEY = "mushroom-path-progress";

interface SavedProgress {
	currentWorldIndex: number;
	currentLevelNumber: number;
	worldElementHistory: WorldElement[][];
	worldNameHistory: string[];
	currentWorldElements: WorldElement[];
	forestNameOffset: number;
	iceNameOffset: number;
	swampNameOffset: number;
	nightNameOffset: number;
	beachNameOffset: number;
	totalMushroomsPlanted: number;
}

// Total mushrooms planted across all sessions (persisted)
const totalMushroomsPlanted = ref(0);

function saveProgress(): void {
	const progress: SavedProgress = {
		currentWorldIndex: currentWorldIndex.value,
		currentLevelNumber: currentLevelNumber.value,
		worldElementHistory: worldElementHistory.value,
		worldNameHistory: worldNameHistory.value,
		currentWorldElements: currentWorldElements.value,
		forestNameOffset: forestNameOffset.value,
		iceNameOffset: iceNameOffset.value,
		swampNameOffset: swampNameOffset.value,
		nightNameOffset: nightNameOffset.value,
		beachNameOffset: beachNameOffset.value,
		totalMushroomsPlanted: totalMushroomsPlanted.value,
	};
	localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

function loadProgress(): SavedProgress | null {
	const saved = localStorage.getItem(SAVE_KEY);
	if (!saved) return null;
	try {
		return JSON.parse(saved) as SavedProgress;
	} catch {
		return null;
	}
}

function clearProgress(): void {
	localStorage.removeItem(SAVE_KEY);
}

function hasSavedProgress(): boolean {
	return localStorage.getItem(SAVE_KEY) !== null;
}

// All available world elements
const allElements: WorldElement[] = [
	WE.RIVERS,
	WE.DIRT,
	WE.ICE,
	WE.FAIRY,
	WE.POND,
	WE.TIDES,
	WE.BOUNCE,
];

// Update body class based on current biome (ice takes priority, then beach, then pond/night, then swamp)
watch(
	currentWorldElements,
	(elements) => {
		document.body.classList.remove("biome-ice", "biome-swamp", "biome-night", "biome-beach");
		if (elements.includes(WE.ICE)) {
			document.body.classList.add("biome-ice");
		} else if (elements.includes(WE.TIDES)) {
			document.body.classList.add("biome-beach");
		} else if (elements.includes(WE.POND)) {
			document.body.classList.add("biome-night");
		} else if (elements.includes(WE.DIRT)) {
			document.body.classList.add("biome-swamp");
		}
	},
	{ immediate: true },
);

function generateWorldElements(): WorldElement[] {
	// Get previous world's elements to avoid repetition
	const prevWorldElements =
		worldElementHistory.value[currentWorldIndex.value - 1] ?? [];

	// Helper to check if two element arrays are the same
	const isSameElements = (a: WorldElement[], b: WorldElement[]) => {
		if (a.length !== b.length) return false;
		const sortedA = [...a].sort();
		const sortedB = [...b].sort();
		return sortedA.every((el, i) => el === sortedB[i]);
	};

	// Try to generate different elements (max 10 attempts)
	for (let attempt = 0; attempt < 10; attempt++) {
		const result = generateWorldElementsInner();

		// Accept if different from previous world (or last attempt)
		if (!isSameElements(result, prevWorldElements) || attempt === 9) {
			return result;
		}
	}

	return []; // Fallback (shouldn't reach here)
}

function generateWorldElementsInner(): WorldElement[] {
	// Separate elements into seen and unseen
	const seenElements = allElements.filter((el) =>
		hasSeenMechanic(getMechanicKey(el)),
	);
	const unseenElements = allElements.filter(
		(el) => !hasSeenMechanic(getMechanicKey(el)),
	);

	// World 2 (index 1) should have at most 1 element - we just met Dew!
	const maxElements = currentWorldIndex.value === 1 ? 1 : 2;

	// World 2+ (index >= 1) must have at least 1 element to avoid consecutive empty worlds
	const minElements = currentWorldIndex.value >= 1 ? 1 : 0;

	// Decide whether to introduce a new element or remix seen elements
	// Higher chance to introduce new elements early, remix more later
	const shouldIntroduceNew =
		unseenElements.length > 0 &&
		(seenElements.length === 0 || Math.random() < 0.6);

	if (shouldIntroduceNew) {
		// INTRODUCTION WORLD: Only the new element, no mixing
		// This lets players learn one mechanic at a time
		const randomUnseen =
			unseenElements[Math.floor(Math.random() * unseenElements.length)]!;
		return [randomUnseen];
	}

	// REMIX WORLD: Combine previously seen elements
	// If no seen elements but we need at least 1, pick a random unseen element
	if (seenElements.length === 0) {
		if (minElements > 0 && unseenElements.length > 0) {
			const randomUnseen =
				unseenElements[Math.floor(Math.random() * unseenElements.length)]!;
			return [randomUnseen];
		}
		return [];
	}

	// Randomly select minElements to maxElements from seen elements
	const range = maxElements - minElements + 1;
	const elementCount = minElements + Math.floor(Math.random() * range);

	if (elementCount === 0) {
		return [];
	}

	const shuffledSeen = [...seenElements].sort(() => Math.random() - 0.5);
	const result = shuffledSeen.slice(0, elementCount);

	// Handle incompatible elements
	const incompatiblePairs: [WE, WE][] = [
		[WE.RIVERS, WE.POND], // Both water-based, conflicting mechanics
		[WE.ICE, WE.POND], // Vibes don't match (frozen vs lily-pads)
		[WE.TIDES, WE.ICE], // Beach and frozen don't mix
		[WE.TIDES, WE.POND], // Too much water mechanics confusion
		[WE.TIDES, WE.RIVERS], // Too much water mechanics confusion
	];

	for (const [a, b] of incompatiblePairs) {
		if (result.includes(a) && result.includes(b)) {
			// Remove one randomly (50/50 chance)
			const removeFirst = Math.random() < 0.5;
			if (removeFirst) {
				result.splice(result.indexOf(a), 1);
			} else {
				result.splice(result.indexOf(b), 1);
			}
		}
	}

	return result;
}

const currentWorldName = computed(() => {
	// Select name list based on biome (ice takes priority, then beach, then night, then swamp)
	if (currentWorldElements.value.includes(WE.ICE)) {
		const index =
			(currentWorldIndex.value + iceNameOffset.value) % iceWorldNames.length;
		return iceWorldNames[index] ?? "Frozen Fungi";
	} else if (currentWorldElements.value.includes(WE.TIDES)) {
		const index =
			(currentWorldIndex.value + beachNameOffset.value) %
			beachWorldNames.length;
		return beachWorldNames[index] ?? "Sandy Shores";
	} else if (currentWorldElements.value.includes(WE.POND)) {
		const index =
			(currentWorldIndex.value + nightNameOffset.value) %
			nightWorldNames.length;
		return nightWorldNames[index] ?? "Moonlit Marsh";
	} else if (currentWorldElements.value.includes(WE.DIRT)) {
		const index =
			(currentWorldIndex.value + swampNameOffset.value) %
			swampWorldNames.length;
		return swampWorldNames[index] ?? "Murky Marsh";
	} else if (currentWorldElements.value.includes(WE.BOUNCE)) {
		const index =
			(currentWorldIndex.value + bounceNameOffset.value) %
			bounceWorldNames.length;
		return bounceWorldNames[index] ?? "Springcap Meadows";
	} else {
		const index =
			(currentWorldIndex.value + forestNameOffset.value) %
			forestWorldNames.length;
		return forestWorldNames[index] ?? "Mushroom Garden";
	}
});

const displayName = computed(() => {
	// Show tutorial level name when in tutorial mode
	if (isInTutorial.value) {
		const tutorialLevel = tutorialLevels[tutorialPuzzleIndex.value];
		return tutorialLevel?.name ?? "Tutorial";
	}
	return `${currentWorldName.value} - ${currentLevelNumber.value}`;
});

function getNewLevel(): Level {
	return levelQueue.getNextLevel();
}

function advanceLevel(): boolean {
	currentLevelNumber.value++;
	if (currentLevelNumber.value > LEVELS_PER_WORLD) {
		// Track current world elements and name before moving to next world
		worldElementHistory.value[currentWorldIndex.value] = [
			...currentWorldElements.value,
		];
		worldNameHistory.value[currentWorldIndex.value] = currentWorldName.value;

		// Move to next world
		currentWorldIndex.value++;
		currentLevelNumber.value = 1;
		const newElements = generateWorldElements();
		currentWorldElements.value = newElements;
		// Don't start generating immediately - wait until map screen completes
		// This prevents blocking the map screen animation
		levelQueue.setWorldElements(newElements, false);
		// Queue mechanic intro dialogues for any new mechanics
		queueUnseenMechanicDialogues(newElements);
		return true; // Entered new world
	}
	return false; // Same world
}

const pendingNewWorld = ref(false);
const pendingWorldDialogue = ref<DialogueSceneType | null>(null);
const showWelcomeAfterDialogue = ref(false);

function handleWin() {
	// Clear hint state
	clearHintState();

	// Use tutorial-specific handler when in tutorial mode
	if (isInTutorial.value) {
		handleTutorialWin();
		return;
	}

	// Capture mushroom count immediately before any delays
	// This ensures we use the correct value even if the ref changes during the timeout
	const mushroomsToAdd = levelMushroomsPlanted.value;

	playSuccess();
	// 20% chance to play a voice line
	if (Math.random() < 0.2) {
		playVoiceSuccess();
	}
	skipModalText.value = "Garden Complete!";
	randomizeWinMushrooms();
	showWinModal.value = true;

	// Check for level-specific dialogue first (e.g., meeting Dew at world 1 level 4)
	const levelKey = `${currentWorldIndex.value}-${currentLevelNumber.value}`;
	const levelDialogue = levelDialogues[levelKey];
	// Only show level dialogue if it's not the "meet Dew" scene or we haven't met Dew yet
	const isMeetDewScene = levelKey === "0-3";
	if (levelDialogue && (!isMeetDewScene || !hasMetDew.value)) {
		pendingWorldDialogue.value = levelDialogue;
	} else {
		// Check if this is the last level of the world and if there's a dialogue
		const isLastLevelOfWorld = currentLevelNumber.value === LEVELS_PER_WORLD;
		if (isLastLevelOfWorld) {
			// Check for specific world dialogue first
			const worldDialogue = worldEndDialogues[currentWorldIndex.value];
			if (worldDialogue) {
				pendingWorldDialogue.value = worldDialogue;
			} else if (adventureScenes.length > 0) {
				// Play random adventure scenes (Dew is met at world 1 level 4)
				const randomScene =
					adventureScenes[Math.floor(Math.random() * adventureScenes.length)]!;
				pendingWorldDialogue.value = randomScene;
			}
		}
	}

	// After showing the modal briefly, start the transition
	setTimeout(() => {
		pendingNewWorld.value = advanceLevel();
		// Add captured mushroom count to total (using captured value, not ref)
		totalMushroomsPlanted.value += mushroomsToAdd;
		// Save progress only if tutorial is complete
		if (localStorage.getItem("mushroom-path-tutorial-complete")) {
			saveProgress();
		}
		startTransition();
	}, 1500);
}

function startTransition() {
	showWinModal.value = false;

	// If entering a new world, show the map screen instead of normal fade
	if (pendingNewWorld.value) {
		// Pause background generation during map animation to prevent freezing
		levelQueue.pauseGeneration();

		// Set up map transition data
		mapTransitionData.value = {
			fromWorld: currentWorldIndex.value - 1,
			toWorld: currentWorldIndex.value,
		};
		// Store the new world's elements and name in history
		worldElementHistory.value[currentWorldIndex.value] = [
			...currentWorldElements.value,
		];
		worldNameHistory.value[currentWorldIndex.value] = currentWorldName.value;
		showMapScreen.value = true;
		return;
	}

	// Same world - use existing fade transition
	performFadeTransition();
}

async function performFadeTransition() {
	isFading.value = true;

	// Start fade to black immediately
	isBlack.value = true;

	// If entering a new world, start the BGM transition
	if (pendingNewWorld.value) {
		changeWorldBGM();
	}

	// After fade completes (500ms), generate new level
	setTimeout(async () => {
		// Show loading message while generating
		loadingMessage.value = "Generating level...";

		// Wait for Vue to render the loading message before blocking
		await nextTick();
		// Additional frame to ensure paint
		await new Promise((r) => requestAnimationFrame(r));

		try {
			currentLevel.value = getNewLevel();
			levelKey.value++;
		} finally {
			// Always clear loading message
			loadingMessage.value = "";
		}

		// Small pause while black, then fade back in
		setTimeout(() => {
			isBlack.value = false;
			loadingMessage.value = ""; // Safety clear
			// After fade in completes, re-enable controls and maybe show welcome/dialogue
			setTimeout(() => {
				isFading.value = false;

				// Check for level-specific dialogue (e.g., meeting Dew) - shown regardless of new world
				if (pendingWorldDialogue.value && !pendingNewWorld.value) {
					currentDialogue.value = pendingWorldDialogue.value;
					pendingWorldDialogue.value = null;
				} else if (pendingNewWorld.value) {
					// Priority: mechanic dialogue > adventure scene > welcome sign
					if (pendingMechanicDialogues.value.length > 0) {
						// Show mechanic intro dialogue
						currentDialogue.value = pendingMechanicDialogues.value.shift()!;
						showWelcomeAfterDialogue.value = true;
						// Clear adventure scene since we're showing mechanic instead
						pendingWorldDialogue.value = null;
					} else if (pendingWorldDialogue.value) {
						// Show adventure scene
						currentDialogue.value = pendingWorldDialogue.value;
						pendingWorldDialogue.value = null;
						showWelcomeAfterDialogue.value = true;
					} else {
						showWelcomeSign.value = true;
					}
					pendingNewWorld.value = false;
				}
			}, 500);
		}, 200);
	}, 500);
}

function handleMapComplete() {
	showMapScreen.value = false;
	mapTransitionData.value = null;

	// Clear the world dialogue since it was shown on the map screen
	pendingWorldDialogue.value = null;

	// Resume background level generation now that map animation is done
	levelQueue.resumeGeneration();

	// Note: Don't call changeWorldBGM() here - performFadeTransition() will handle it
	// since pendingNewWorld is still true

	// Now do the normal fade transition to generate and show the new level
	performFadeTransition();
}

const skipModalText = ref("");

// Random mushroom types for win modal
type MushroomType = "tan" | "red" | "purple";
const mushroomTypes: MushroomType[] = ["tan", "red", "purple"];
const winModalMushrooms = ref<MushroomType[]>(["tan", "red", "purple"]);

function randomizeWinMushrooms() {
	winModalMushrooms.value = [
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
		mushroomTypes[Math.floor(Math.random() * mushroomTypes.length)],
	] as MushroomType[];
}

function handleSkip() {
	if (isFading.value) return;
	// Don't allow skipping during tutorial
	if (isInTutorial.value) return;
	confirmAction.value = "skip";
}

function doSkip() {
	isFading.value = true;
	skipModalText.value = "Level Skipped";
	randomizeWinMushrooms();
	showWinModal.value = true;

	// Check for level-specific dialogue first
	const levelKey = `${currentWorldIndex.value}-${currentLevelNumber.value}`;
	const levelDialogue = levelDialogues[levelKey];
	// Only show level dialogue if it's not the "meet Dew" scene or we haven't met Dew yet
	const isMeetDewScene = levelKey === "0-3";
	if (levelDialogue && (!isMeetDewScene || !hasMetDew.value)) {
		pendingWorldDialogue.value = levelDialogue;
	} else {
		// Check if this is the last level of the world and if there's a dialogue
		const isLastLevelOfWorld = currentLevelNumber.value === LEVELS_PER_WORLD;
		if (isLastLevelOfWorld) {
			const worldDialogue = worldEndDialogues[currentWorldIndex.value];
			if (worldDialogue) {
				pendingWorldDialogue.value = worldDialogue;
			} else if (adventureScenes.length > 0) {
				const randomScene =
					adventureScenes[Math.floor(Math.random() * adventureScenes.length)]!;
				pendingWorldDialogue.value = randomScene;
			}
		}
	}

	// Show modal briefly then start transition
	setTimeout(() => {
		pendingNewWorld.value = advanceLevel();
		// Skipping forfeits the level's mushrooms - don't add to total
		// Save progress only if tutorial is complete
		if (localStorage.getItem("mushroom-path-tutorial-complete")) {
			saveProgress();
		}
		startTransition();
	}, 1000);
}

function clearHintState() {
	// Clear all pending hint timeouts
	hintTimeouts.forEach(clearTimeout);
	hintTimeouts = [];

	hintTiles.value = [];
	stuckTiles.value = [];
	undoGlow.value = false;
	restartGlow.value = false;
	hintMessage.value = null;
	hintSprite.value = "BlueGirl-Normal";
}

function handleRestart() {
	if (isFading.value) return;
	confirmAction.value = "restart";
}

function doRestart() {
	playUndo();
	clearHintState();
	isHelpModeBlocked.value = false;
	// Trigger restart in the GameBoard component
	levelKey.value++;
}

function handleConfirmAction() {
	const action = confirmAction.value;
	confirmAction.value = null;
	if (action === "skip") {
		doSkip();
	} else if (action === "restart") {
		doRestart();
	}
}

function handleCancelAction() {
	confirmAction.value = null;
}

function handleUndo() {
	if (isFading.value) return;
	gameBoardRef.value?.undo();
	clearHintState();
	isHelpModeBlocked.value = false;
}

function handleHint() {
	if (isFading.value) return;

	// Clear previous hints
	clearHintState();

	// Get hint from game board
	const hint = gameBoardRef.value?.getHint?.();
	if (!hint) return;

	// Use Sprout's messages/sprite if we haven't met Dew yet
	// After meeting Dew, 30% chance Sprout gives the hint instead
	const useSprout = !hasMetDew.value || Math.random() < 0.3;

	if (hint.hintTiles && hint.hintTiles.length > 0) {
		// Show hint tiles - stagger them to show the route
		const tiles = hint.hintTiles;
		hintSprite.value = useSprout ? "MushroomGirl-Happy" : "BlueGirl-Normal";
		const messages = useSprout ? sproutSuccessMessages : successHintMessages;
		hintMessage.value =
			messages[Math.floor(Math.random() * messages.length)] ?? "Go this way!";

		// Show tiles one by one with delay
		const TILE_DELAY = 400; // ms between each tile
		tiles.forEach((tile, index) => {
			const timeoutId = setTimeout(() => {
				hintTiles.value = [...hintTiles.value, tile];
			}, index * TILE_DELAY);
			hintTimeouts.push(timeoutId);
		});

		// Auto-clear hint after all tiles shown + 2.5 seconds viewing time
		const totalShowTime = (tiles.length - 1) * TILE_DELAY + 2500;
		const clearTimeoutId = setTimeout(() => {
			hintTiles.value = [];
			hintMessage.value = null;
		}, totalShowTime);
		hintTimeouts.push(clearTimeoutId);
	} else if (hint.unsure) {
		// Pathfinding timed out - show unsure message
		hintSprite.value = useSprout ? "MushroomGirl-Confused" : "BlueGirl-Nervous";
		const messages = useSprout ? sproutUnsureMessages : unsureHintMessages;
		hintMessage.value =
			messages[Math.floor(Math.random() * messages.length)] ??
			"I'm not sure...";

		// Auto-clear after 3 seconds
		const clearTimeoutId = setTimeout(() => {
			hintMessage.value = null;
		}, 3000);
		hintTimeouts.push(clearTimeoutId);
	} else if (hint.needsUndo) {
		// Check if undo is available
		stuckTiles.value = hint.stuckTiles ?? [];
		hintSprite.value = useSprout ? "MushroomGirl-Nervous" : "BlueGirl-Nervous";

		if (canUndo.value) {
			// Glow the undo button
			undoGlow.value = true;
			const messages = useSprout ? sproutStuckMessages : stuckHintMessages;
			hintMessage.value =
				messages[Math.floor(Math.random() * messages.length)] ??
				"We need to go back...";
		} else {
			// Glow the restart button instead
			restartGlow.value = true;
			const messages = useSprout ? sproutRestartMessages : restartHintMessages;
			hintMessage.value =
				messages[Math.floor(Math.random() * messages.length)] ??
				"Let's start fresh!";
		}

		// Auto-clear glow after 3 seconds
		const clearTimeoutId = setTimeout(() => {
			undoGlow.value = false;
			restartGlow.value = false;
			stuckTiles.value = [];
			hintMessage.value = null;
		}, 3000);
		hintTimeouts.push(clearTimeoutId);
	}
}

function handleMoveCompleted() {
	// Only check if help mode is enabled
	if (!isHelpModeEnabled.value) return;
	// Don't interrupt existing hints
	if (hintMessage.value) return;
	// Don't show during transitions
	if (isFading.value) return;
	// Don't show during tutorial (has its own stuck handling)
	if (isInTutorial.value) return;

	// Get hint to check if level is impossible and get stuck tiles
	const hint = gameBoardRef.value?.getHint?.();
	if (hint?.needsUndo) {
		showAutoUndoHint(hint.stuckTiles ?? []);
	}
}

function showAutoUndoHint(stuckTilesData: { x: number; y: number }[]) {
	// Clear any previous hints
	clearHintState();

	// Block player controls until they undo or restart
	isHelpModeBlocked.value = true;

	// Use Sprout or Dew based on hasMetDew
	const useSprout = !hasMetDew.value || Math.random() < 0.3;

	// Show the stuck tiles with red glow
	stuckTiles.value = stuckTilesData;
	hintSprite.value = useSprout ? "MushroomGirl-Nervous" : "BlueGirl-Nervous";

	if (canUndo.value) {
		undoGlow.value = true;
		const messages = useSprout ? sproutStuckMessages : stuckHintMessages;
		hintMessage.value =
			messages[Math.floor(Math.random() * messages.length)] ??
			"We need to go back...";
	} else {
		restartGlow.value = true;
		const messages = useSprout ? sproutRestartMessages : restartHintMessages;
		hintMessage.value =
			messages[Math.floor(Math.random() * messages.length)] ??
			"Let's start fresh!";
	}

	// Keep all visual cues (stuck tiles, button glow, character message)
	// visible until player undos/restarts - no auto-clear
}

async function handleBegin() {
	// Show loading state
	isLoading.value = true;
	loadingMessage.value = "Loading audio...";

	// Small delay to ensure UI updates before potentially blocking work
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Initialize audio system (starts preloading sounds in background for mobile)
	initializeAudio();
	startBackgroundMusic();

	isLoading.value = false;
	loadingMessage.value = "";

	// Show intro dialogue if not seen before
	if (!hasSeenIntro) {
		currentDialogue.value = introDialogue;
		return;
	}

	// Otherwise go straight to game
	await startGame();
}

async function startGame() {
	isLoading.value = true;
	loadingMessage.value = "Generating level...";

	// Wait for Vue to render the loading message before blocking
	await nextTick();
	await new Promise((r) => requestAnimationFrame(r));

	// First world is always neutral (no elements)
	currentWorldElements.value = [];
	levelQueue.setWorldElements([]);

	// Record first world's elements and name in history for map screen
	worldElementHistory.value[0] = [];
	worldNameHistory.value[0] = currentWorldName.value;

	currentLevel.value = getNewLevel();
	gameStarted.value = true;
	isLoading.value = false;
	loadingMessage.value = "";

	// Show welcome sign for first world
	showWelcomeSign.value = true;
}

async function handleContinue() {
	// Show loading state
	isLoading.value = true;
	loadingMessage.value = "Loading audio...";

	await nextTick();
	await new Promise((r) => requestAnimationFrame(r));

	// Initialize audio system
	initializeAudio();
	startBackgroundMusic();

	loadingMessage.value = "Loading saved progress...";

	// Load saved progress
	const saved = loadProgress();
	if (!saved) {
		// Fallback to normal start if no save found
		isLoading.value = false;
		loadingMessage.value = "";
		await startGame();
		return;
	}

	// Restore all saved state
	currentWorldIndex.value = saved.currentWorldIndex;
	currentLevelNumber.value = saved.currentLevelNumber;
	worldElementHistory.value = saved.worldElementHistory;
	worldNameHistory.value = saved.worldNameHistory;
	currentWorldElements.value = saved.currentWorldElements;
	forestNameOffset.value = saved.forestNameOffset;
	iceNameOffset.value = saved.iceNameOffset;
	swampNameOffset.value = saved.swampNameOffset;
	nightNameOffset.value = saved.nightNameOffset;
	beachNameOffset.value = saved.beachNameOffset ?? 0;
	totalMushroomsPlanted.value = saved.totalMushroomsPlanted ?? 0;

	// Set the level queue to use the current world elements
	levelQueue.setWorldElements(saved.currentWorldElements);

	loadingMessage.value = "Generating level...";
	await nextTick();
	await new Promise((r) => requestAnimationFrame(r));

	// Generate the level for the current position
	currentLevel.value = getNewLevel();
	gameStarted.value = true;
	isLoading.value = false;
	loadingMessage.value = "";

	// Show welcome sign for the current world
	showWelcomeSign.value = true;
}

async function handleNewGame() {
	// Clear saved progress and reset total mushrooms
	clearProgress();
	totalMushroomsPlanted.value = 0;

	// Initialize audio system
	isLoading.value = true;
	loadingMessage.value = "Loading audio...";

	await new Promise((resolve) => setTimeout(resolve, 50));

	initializeAudio();
	startBackgroundMusic();

	isLoading.value = false;
	loadingMessage.value = "";

	// Show intro dialogue if not seen before
	if (!hasSeenIntro) {
		currentDialogue.value = introDialogue;
		return;
	}

	// Otherwise go straight to game
	await startGame();
}

function closeTutorial() {
	showTutorial.value = false;
	localStorage.setItem("mushroom-path-tutorial-seen", "true");
	// Only show welcome sign after closing the initial tutorial
	if (isInitialTutorial.value) {
		isInitialTutorial.value = false;
		showWelcomeSign.value = true;
	}
}

function closeWelcomeSign() {
	showWelcomeSign.value = false;
	// Start background level generation now that player is ready to play
	levelQueue.startGenerating();
}

function showNextMechanicDialogue(): void {
	if (pendingMechanicDialogues.value.length > 0) {
		const nextDialogue = pendingMechanicDialogues.value.shift()!;
		currentDialogue.value = nextDialogue;
	}
}

function openCustomWorldModal() {
	showCustomWorldModal.value = true;
}

async function startCustomWorld(elements: WorldElement[]) {
	showCustomWorldModal.value = false;

	// Ensure game is started
	gameStarted.value = true;

	// Track current world elements and name before incrementing
	worldElementHistory.value[currentWorldIndex.value] = [
		...currentWorldElements.value,
	];
	worldNameHistory.value[currentWorldIndex.value] = currentWorldName.value;

	// Set up custom world state
	currentWorldIndex.value++;
	currentLevelNumber.value = 1;
	currentWorldElements.value = elements;
	levelQueue.setWorldElements(elements);

	// Track new world elements and name in history (name updates after elements change)
	worldElementHistory.value[currentWorldIndex.value] = [...elements];
	worldNameHistory.value[currentWorldIndex.value] = currentWorldName.value;

	// Queue mechanic intro dialogues for any new mechanics
	queueUnseenMechanicDialogues(elements);

	// Mark as entering new world and use the proper transition flow
	pendingNewWorld.value = true;

	// Start the fade transition (same as normal world transition)
	isFading.value = true;
	isBlack.value = true;

	// Change BGM during fade
	changeWorldBGM();

	// After fade completes, generate new level
	setTimeout(async () => {
		loadingMessage.value = "Generating level...";

		// Wait for Vue to render the loading message before blocking
		await nextTick();
		await new Promise((r) => requestAnimationFrame(r));

		try {
			currentLevel.value = getNewLevel();
			levelKey.value++;
		} catch (e) {
			console.error("Failed to generate level:", e);
		} finally {
			// Always clear loading message
			loadingMessage.value = "";
		}

		// Fade back in (always runs, even if level generation failed)
		setTimeout(() => {
			isBlack.value = false;
			loadingMessage.value = ""; // Safety clear

			// After fade in, show dialogues or welcome sign
			setTimeout(() => {
				isFading.value = false;

				// Priority: mechanic dialogue > welcome sign
				if (pendingMechanicDialogues.value.length > 0) {
					currentDialogue.value = pendingMechanicDialogues.value.shift()!;
					showWelcomeAfterDialogue.value = true;
				} else {
					showWelcomeSign.value = true;
				}
				pendingNewWorld.value = false;
			}, 500);
		}, 200);
	}, 500);
}

async function handleDialogueComplete() {
	const dialogueId = currentDialogue.value?.id;
	currentDialogue.value = null;

	if (dialogueId === "intro") {
		localStorage.setItem("mushroom-path-intro-seen", "true");
		// Show first-time modal unless already asked or tutorial complete
		if (!hasFirstTimeAsked && !hasTutorialComplete) {
			showFirstTimeModal.value = true;
		} else {
			await startGame();
		}
	} else if (dialogueId === "meet-dew") {
		// Mark Dew as met so the scene doesn't replay
		localStorage.setItem("mushroom-path-met-dew", "true");
		hasMetDew.value = true;
	} else if (dialogueId?.startsWith("tutorial-intro-")) {
		// Tutorial intro dialogue finished, player can now play the puzzle
		// Game is already loaded, just let them play
	} else if (dialogueId === "tutorial-goodbye") {
		// Tutorial complete, mark as done and transition to regular game
		localStorage.setItem("mushroom-path-tutorial-complete", "true");
		isInTutorial.value = false;

		// Fade transition to first world
		isFading.value = true;
		isBlack.value = true;

		// Change to a new random BGM for the first world
		changeWorldBGM();

		setTimeout(async () => {
			// Reset world state for fresh start
			currentWorldIndex.value = 0;
			currentLevelNumber.value = 1;
			currentWorldElements.value = [];
			levelQueue.setWorldElements([]);

			// Record first world's elements and name in history for map screen
			worldElementHistory.value[0] = [];
			worldNameHistory.value[0] = currentWorldName.value;

			// Generate first level
			currentLevel.value = getNewLevel();
			levelKey.value++;

			// Fade back in
			setTimeout(() => {
				isBlack.value = false;
				setTimeout(() => {
					isFading.value = false;
					showWelcomeSign.value = true;
				}, 500);
			}, 200);
		}, 500);
	} else if (dialogueId?.startsWith("tutorial-stuck-")) {
		// Stuck dialogue finished, let player continue
	} else if (showWelcomeAfterDialogue.value) {
		// World-end dialogue finished, show welcome sign
		showWelcomeAfterDialogue.value = false;
		showWelcomeSign.value = true;
	} else if (pendingMechanicDialogues.value.length > 0) {
		// More mechanic dialogues in queue
		showNextMechanicDialogue();
	}
	// Otherwise dialogue was skipped or no follow-up needed
}

// First-time modal handlers
async function handleFirstTimeChoice(choice: "yes" | "no") {
	showFirstTimeModal.value = false;
	localStorage.setItem("mushroom-path-first-time-asked", "true");

	if (choice === "yes") {
		// Switch to tutorial music (Dewdrop Dawn)
		switchToTutorialMusic();
		await startTutorialMode();
	} else {
		// Skipping tutorial still counts as "complete" for save purposes
		localStorage.setItem("mushroom-path-tutorial-complete", "true");
		await startGame();
	}
}

async function startTutorialMode() {
	isInTutorial.value = true;
	tutorialPuzzleIndex.value = 0;
	tutorialStuckShown.value = [false, false, false, false, false];

	// Load the first tutorial level
	const firstLevel = tutorialLevels[0];
	if (firstLevel) {
		currentLevel.value = firstLevel;
		gameStarted.value = true;
		levelKey.value++;

		// Show the first tutorial intro dialogue
		const introDialogue = tutorialIntroDialogues[0];
		if (introDialogue) {
			currentDialogue.value = introDialogue;
		}
	}
}

// Handler for starting tutorial directly from start screen
async function handleStartTutorial() {
	// Initialize audio system
	isLoading.value = true;
	loadingMessage.value = "Loading audio...";
	await new Promise((resolve) => setTimeout(resolve, 50));

	initializeAudio();
	startTutorialMusic(); // Use Dewdrop Dawn for tutorial

	isLoading.value = false;
	loadingMessage.value = "";

	// Start the tutorial
	await startTutorialMode();
}

function handleTutorialWin() {
	playSuccess();
	skipModalText.value = "Garden Complete!";
	randomizeWinMushrooms();
	showWinModal.value = true;

	// After showing the modal briefly, advance to next puzzle or finish
	setTimeout(() => {
		showWinModal.value = false;
		isFading.value = true;
		isBlack.value = true;

		setTimeout(() => {
			tutorialPuzzleIndex.value++;

			if (tutorialPuzzleIndex.value >= tutorialLevels.length) {
				// Finished all tutorial puzzles - show goodbye dialogue
				isBlack.value = false;
				setTimeout(() => {
					isFading.value = false;
					currentDialogue.value = tutorialGoodbye;
				}, 500);
			} else {
				// Load next tutorial level
				const nextLevel = tutorialLevels[tutorialPuzzleIndex.value];
				if (nextLevel) {
					currentLevel.value = nextLevel;
					levelKey.value++;
				}

				// Fade back in
				setTimeout(() => {
					isBlack.value = false;
					setTimeout(() => {
						isFading.value = false;
						// Show intro dialogue for this puzzle
						const nextIntro = tutorialIntroDialogues[tutorialPuzzleIndex.value];
						if (nextIntro) {
							currentDialogue.value = nextIntro;
						}
					}, 500);
				}, 200);
			}
		}, 500);
	}, 1500);
}

// Computed to get isStuck value from GameBoard
const isPlayerStuck = computed(() => {
	const gameBoard = gameBoardRef.value;
	if (!gameBoard) return false;
	// Access isStuck - TypeScript thinks it's a boolean but it's actually a ComputedRef
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const isStuckRef = (gameBoard as any).isStuck;
	if (typeof isStuckRef === "boolean") return isStuckRef;
	return isStuckRef?.value ?? false;
});

// Watch for stuck state in tutorial mode to show stuck dialogues
watch(isPlayerStuck, (isStuck) => {
	if (!isInTutorial.value || !isStuck) return;
	if (currentDialogue.value) return; // Already showing a dialogue
	if (isFading.value) return; // Don't show during transitions

	const puzzleIndex = tutorialPuzzleIndex.value;
	if (puzzleIndex >= 0 && puzzleIndex < tutorialStuckShown.value.length) {
		// Only show stuck dialogue once per puzzle
		if (!tutorialStuckShown.value[puzzleIndex]) {
			tutorialStuckShown.value[puzzleIndex] = true;
			const stuckDialogue = tutorialStuckDialogues[puzzleIndex];
			if (stuckDialogue) {
				currentDialogue.value = stuckDialogue;
			}
		}
	}
});
</script>

<template>
  <!-- Map Screen (shown at world transitions) -->
  <Transition name="map-screen">
    <MapScreen
      v-if="showMapScreen && mapTransitionData"
      :current-world-index="mapTransitionData.toWorld"
      :previous-world-index="mapTransitionData.fromWorld"
      :world-element-history="worldElementHistory"
      :world-names="worldNameHistory"
      :is-animating="true"
      :dialogue="pendingWorldDialogue"
      @complete="handleMapComplete"
    />
  </Transition>

  <!-- Dialogue Scene (intro and story events) -->
  <Transition name="dialogue-fade">
    <DialogueScene
      v-if="currentDialogue"
      :scene="currentDialogue"
      :can-skip="true"
      :overlay="currentDialogue.overlay"
      @complete="handleDialogueComplete"
      @skip="handleDialogueComplete"
    />
  </Transition>

  <!-- Start Screen -->
  <StartScreen
    v-if="!gameStarted && !showMusicPlayer && !currentDialogue"
    :has-saved-game="hasSavedProgress()"
    @begin="handleBegin"
    @continue="handleContinue"
    @new-game="handleNewGame"
    @open-music-player="showMusicPlayer = true"
    @start-tutorial="handleStartTutorial"
  />

  <!-- Music Player -->
  <MusicPlayer v-if="showMusicPlayer && !currentDialogue" @close="showMusicPlayer = false" />

  <!-- Loading Overlay (shown during initial load) -->
  <div v-if="isLoading" class="loading-overlay">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ loadingMessage }}</p>
    </div>
  </div>

  <!-- First Time Modal (shown after intro dialogue for new players) -->
  <Transition name="modal">
    <FirstTimeModal v-if="showFirstTimeModal" @choose="handleFirstTimeChoice" />
  </Transition>

  <!-- Confirmation Modal for Skip/Restart -->
  <Transition name="modal">
    <ConfirmModal
      v-if="confirmAction"
      :title="confirmAction === 'skip' ? 'Skip Level?' : 'Restart Level?'"
      :message="confirmAction === 'restart' ? 'Are you sure you want to restart?' : (levelMushroomsPlanted === 0 ? 'Are you sure you want to skip this level?' : '')"
      :confirm-text="confirmAction === 'skip' ? 'Skip' : 'Restart'"
      @confirm="handleConfirmAction"
      @cancel="handleCancelAction"
    >
      <template v-if="confirmAction === 'skip' && levelMushroomsPlanted > 0" #message>
        <span class="message-line">If you skip, you won't keep the</span>
        <span class="message-line mushroom-count-line">
          <span>{{ levelMushroomsPlanted }} mushroom{{ levelMushroomsPlanted === 1 ? '' : 's' }}</span>
          <span class="inline-mushroom">
            <span class="inline-mushroom-cap"></span>
            <span class="inline-mushroom-stem"></span>
          </span>
        </span>
        <span class="message-line">you planted on this level.</span>
      </template>
    </ConfirmModal>
  </Transition>

  <!-- Game (stays visible for overlay dialogues) -->
  <div v-if="gameStarted && (!currentDialogue || currentDialogue.overlay)" class="layout">
    <TopBar
      :level-name="displayName"
      :elements="currentWorldElements"
      :help-mode-enabled="isHelpModeEnabled"
      @show-tutorial="showTutorial = true"
      @show-help-settings="showHelpModeModal = true"
    />

    <!-- Mushroom Counter -->
    <div class="mushroom-counter">
      <div class="mushroom-counter-icon">
        <div class="counter-mushroom-cap"></div>
        <div class="counter-mushroom-stem"></div>
      </div>
      <span class="mushroom-counter-text">{{ displayedMushroomCount }}</span>
    </div>

    <main class="app">
      <GameBoard
        ref="gameBoardRef"
        :key="levelKey"
        :level="currentLevel"
        :has-ice-element="currentWorldElements.includes(WE.ICE)"
        :has-dirt-element="currentWorldElements.includes(WE.DIRT)"
        :has-pond-element="currentWorldElements.includes(WE.POND)"
        :has-tides-element="currentWorldElements.includes(WE.TIDES)"
        :hint-tiles="hintTiles"
        :stuck-tiles="stuckTiles"
        :disabled="!!currentDialogue || isHelpModeBlocked"
        @win="handleWin"
        @mushrooms-changed="handleMushroomsChanged"
        @move-completed="handleMoveCompleted"
        @request-undo="handleUndo"
        @request-restart="handleRestart"
        @request-hint="handleHint"
      />

      <!-- Fade Transition Overlay (game area only) -->
      <div :class="['transition-overlay', { 'transition-overlay--black': isBlack }]">
        <p v-if="loadingMessage && isBlack" class="transition-loading-text">{{ loadingMessage }}</p>
      </div>
    </main>

    <!-- Dew Hint Message -->
    <Transition name="hint-message">
      <div v-if="hintMessage" class="hint-message">
        <img
          :src="`/art/DialogueSprites/${hintSprite}.webp`"
          alt="Dew"
          class="hint-sprite"
        />
        <div class="hint-message-content">
          <span class="hint-message-text">{{ hintMessage }}</span>
        </div>
      </div>
    </Transition>

    <BottomBar
      :disabled="isFading"
      :can-undo="canUndo"
      :undo-glow="undoGlow"
      :restart-glow="restartGlow"
      @restart="handleRestart"
      @undo="handleUndo"
      @skip="handleSkip"
      @hint="handleHint"
      @custom-world="openCustomWorldModal"
    />

    <!-- Win Modal -->
    <Transition name="modal">
      <div v-if="showWinModal" class="win-overlay">
        <div class="win-modal">
          <div class="win-wood-texture"></div>
          <div class="win-modal-content">
            <div class="win-decoration">
              <div
                v-for="(type, index) in winModalMushrooms"
                :key="index"
                :class="['deco-mushroom', `deco-mushroom--${type}`]"
              >
                <div class="deco-cap">
                  <div v-if="type === 'red'" class="deco-spots"></div>
                </div>
                <div class="deco-stem"></div>
              </div>
            </div>
            <h2 class="win-title">{{ skipModalText }}</h2>
          </div>
          <div class="win-nail win-nail--top-left"></div>
          <div class="win-nail win-nail--top-right"></div>
          <div class="win-nail win-nail--bottom-left"></div>
          <div class="win-nail win-nail--bottom-right"></div>
        </div>
      </div>
    </Transition>

    <!-- Tutorial Modal -->
    <TutorialModal v-if="showTutorial" @close="closeTutorial" />

    <!-- Help Mode Modal -->
    <Transition name="modal">
      <HelpModeModal
        v-if="showHelpModeModal"
        :enabled="isHelpModeEnabled"
        @toggle="toggleHelpMode"
        @close="showHelpModeModal = false"
      />
    </Transition>

    <!-- Welcome Sign for new worlds -->
    <WelcomeSign
      v-if="showWelcomeSign"
      :world-name="currentWorldName"
      @close="closeWelcomeSign"
    />

    <!-- Custom World Modal (dev only) -->
    <CustomWorldModal
      v-if="showCustomWorldModal"
      @close="showCustomWorldModal = false"
      @start="startCustomWorld"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.app {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* Mushroom Counter */
.mushroom-counter {
  position: absolute;
  top: 72px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 248, 230, 0.9);
  padding: 6px 12px 6px 8px;
  border-radius: 20px;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  z-index: 10;
}

.mushroom-counter-icon {
  position: relative;
  width: 20px;
  height: 24px;
}

.counter-mushroom-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 12px;
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
  border-radius: 9px 9px 3px 3px;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

.counter-mushroom-cap::before {
  content: "";
  position: absolute;
  width: 4px;
  height: 3px;
  background: #fff5eb;
  border-radius: 50%;
  top: 3px;
  left: 3px;
}

.counter-mushroom-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 12px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 2px 2px 3px 3px;
}

.mushroom-counter-text {
  font-family: 'Georgia', serif;
  font-size: 16px;
  font-weight: bold;
  color: #5a4a3a;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  min-width: 24px;
  text-align: center;
}

@media (max-width: 480px) {
  .mushroom-counter {
    top: 56px;
    right: 8px;
    padding: 5px 10px 5px 6px;
  }

  .mushroom-counter-text {
    font-size: 14px;
  }
}

/* Dew Hint Message */
.hint-message {
  position: fixed;
  bottom: 68px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 150;
  display: flex;
  align-items: flex-end;
  gap: 0;
}

.hint-sprite {
  width: 100px;
  height: auto;
  margin-bottom: -8px;
  margin-right: -12px;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transform: scaleX(-1);
}

.hint-message-content {
  background: linear-gradient(180deg, rgba(255, 248, 230, 0.98) 0%, rgba(245, 235, 210, 0.98) 100%);
  padding: 10px 16px;
  border-radius: 16px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.25),
    0 0 0 2px rgba(139, 107, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
}

.hint-message-content::before {
  content: "";
  position: absolute;
  left: -10px;
  bottom: 16px;
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 12px solid rgba(255, 248, 230, 0.98);
  filter: drop-shadow(-2px 0 2px rgba(0, 0, 0, 0.1));
}

.hint-message-text {
  font-family: 'Georgia', serif;
  font-size: 17px;
  color: #4a3a2a;
}

/* Hint message transition */
.hint-message-enter-active {
  animation: hintMessageIn 0.3s ease-out;
}

.hint-message-leave-active {
  animation: hintMessageOut 0.2s ease-in;
}

@keyframes hintMessageIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes hintMessageOut {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(10px) scale(0.95);
  }
}

@media (max-width: 480px) {
  .hint-message {
    bottom: 84px;
  }

  .hint-sprite {
    width: 80px;
    margin-bottom: -6px;
    margin-right: -10px;
  }

  .hint-message-content {
    padding: 10px 14px;
  }

  .hint-message-text {
    font-size: 15px;
  }
}

/* Win Modal Styles */
.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.win-modal {
  position: relative;
  background: linear-gradient(180deg, #a08060 0%, #8b6b4a 50%, #7a5c3d 100%);
  padding: 40px 48px;
  border-radius: 10px;
  text-align: center;
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.4),
    inset 0 3px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 0 rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.win-wood-texture {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 30px,
      rgba(0, 0, 0, 0.03) 30px,
      rgba(0, 0, 0, 0.03) 31px
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 80px,
      rgba(0, 0, 0, 0.05) 80px,
      rgba(0, 0, 0, 0.05) 82px
    );
  pointer-events: none;
}

.win-modal-content {
  position: relative;
  z-index: 1;
}

.win-nail {
  position: absolute;
  width: 10px;
  height: 10px;
  background: radial-gradient(circle at 30% 30%, #888 0%, #555 100%);
  border-radius: 50%;
  box-shadow:
    inset 0 -1px 0 rgba(0, 0, 0, 0.4),
    0 1px 2px rgba(0, 0, 0, 0.3);
  z-index: 2;
}

.win-nail--top-left {
  top: 12px;
  left: 12px;
}

.win-nail--top-right {
  top: 12px;
  right: 12px;
}

.win-nail--bottom-left {
  bottom: 12px;
  left: 12px;
}

.win-nail--bottom-right {
  bottom: 12px;
  right: 12px;
}

.win-decoration {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.deco-mushroom {
  position: relative;
  width: 40px;
  height: 48px;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.3));
  animation: bounce 1.5s ease-in-out infinite;
}

.deco-mushroom:nth-child(1) {
  animation-delay: 0s;
}

.deco-mushroom:nth-child(2) {
  animation-delay: 0.2s;
  width: 46px;
  height: 54px;
}

.deco-mushroom:nth-child(3) {
  animation-delay: 0.4s;
}

.deco-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 24px;
  border-radius: 18px 18px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.deco-mushroom:nth-child(2) .deco-cap {
  width: 42px;
  height: 28px;
}

.deco-stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 24px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 3px 3px 5px 5px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

.deco-mushroom:nth-child(2) .deco-stem {
  width: 18px;
  height: 26px;
}

/* Tan mushroom */
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
  width: 6px;
  height: 5px;
  top: 6px;
  left: 6px;
}

.deco-mushroom--tan .deco-cap::after {
  width: 5px;
  height: 4px;
  top: 10px;
  right: 8px;
}

/* Red mushroom */
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
  width: 6px;
  height: 5px;
  top: 5px;
  left: 6px;
}

.deco-spots::after {
  width: 5px;
  height: 4px;
  top: 10px;
  right: 8px;
}

/* Purple mushroom */
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
  width: 5px;
  height: 4px;
  top: 6px;
  left: 8px;
}

.deco-mushroom--purple .deco-cap::after {
  width: 4px;
  height: 3px;
  top: 11px;
  right: 9px;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.win-title {
  font-family: 'Georgia', serif;
  font-size: 32px;
  color: #fff8e7;
  margin: 0;
  text-shadow:
    0 2px 0 #4a3a2a,
    0 3px 6px rgba(0, 0, 0, 0.4);
  letter-spacing: 1px;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .win-modal,
.modal-leave-active .win-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .win-modal,
.modal-leave-to .win-modal {
  transform: scale(0.9);
  opacity: 0;
}

/* Fade Transition Overlay */
.transition-overlay {
  position: absolute;
  inset: 0;
  background: #1a1a1a;
  z-index: 50;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.transition-overlay--black {
  opacity: 1;
}

.transition-loading-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Loading Overlay (initial load) */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(40, 50, 30, 0.9);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 248, 230, 0.3);
  border-top-color: #fff8e6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-family: 'Georgia', serif;
  font-size: 18px;
  color: #fff8e6;
  margin: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* Dialogue Fade Transition */
.dialogue-fade-enter-active,
.dialogue-fade-leave-active {
  transition: opacity 0.4s ease;
}

.dialogue-fade-enter-from,
.dialogue-fade-leave-to {
  opacity: 0;
}

/* Map Screen Transition */
.map-screen-enter-active,
.map-screen-leave-active {
  transition: opacity 0.5s ease;
}

.map-screen-enter-from,
.map-screen-leave-to {
  opacity: 0;
}
</style>
