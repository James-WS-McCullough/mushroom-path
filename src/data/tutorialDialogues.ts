import type { DialogueScene } from "./dialogues";

// Tutorial intro dialogues - played before each puzzle (overlay mode, no background)

export const tutorialIntro1: DialogueScene = {
	id: "tutorial-intro-1",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "alright little one~ show me how youre gonna plant all those mushrooms!",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "okay okay watch this grandpa!!",
			leftSprite: "MushroomGirl-Excited",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "i just hop around with the arrow keys or WASD... or tap where i wanna go!",
			leftSprite: "MushroomGirl-Confident",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "and im gonna plant a mushroom every chance i get~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "ill hop all over and leave mushrooms everywhere!! easy peasy~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "oho~ my clever little sprout! show me then~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

export const tutorialIntro2: DialogueScene = {
	id: "tutorial-intro-2",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "hmm but what about those prickly brambles?",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "pfft thats nothing grandpa! i just jump right over em~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "AND i can jump over mushrooms too!! so once i plant one i can hop over it!",
			leftSprite: "MushroomGirl-Excited",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "very impressive~ lets see it!",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

export const tutorialIntro3: DialogueScene = {
	id: "tutorial-intro-3",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "be careful on this one little sprout~",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "dont worry grandpa i got this!! itll be easy~",
			leftSprite: "MushroomGirl-Confident",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "hehe~ just remember to think ahead!",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "yeah yeah lets gooo already~",
			leftSprite: "MushroomGirl-Excited",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
	],
};

export const tutorialIntro4: DialogueScene = {
	id: "tutorial-intro-4",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "ooh look at these stone paths~",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "oh i know about those!! mushrooms cant grow on stone right?",
			leftSprite: "MushroomGirl-Excited",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "exactly right~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "so i can walk on stone as many times as i want!! its like a little bridge~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "look at you figuring it all out~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

export const tutorialIntro5: DialogueScene = {
	id: "tutorial-intro-5",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "ewww grandpa look at all this mud!!",
			leftSprite: "MushroomGirl-Confused",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "i cant plant mushrooms in mud...",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "hmm~ you can borrow my old shovel! that should help you clear away the dirt~",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "ooh!! so i step on the dirt to clear it... then step again to plant!",
			leftSprite: "MushroomGirl-Excited",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "exactly right~ clever girl!",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "hehe nothing can stop me now~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
	],
};

// Stuck dialogues - shown when player gets stuck (overlay on game)

export const tutorialStuck1: DialogueScene = {
	id: "tutorial-stuck-1",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "umm... grandpa... i think i messed up...",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "thats okay little one~ mistakes help us learn!",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "press Z or tap the undo button to go back a step~",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "or press R to start fresh! no shame in trying again~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

export const tutorialStuck2: DialogueScene = {
	id: "tutorial-stuck-2",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "ahhh i jumped to the wrong spot!!",
			leftSprite: "MushroomGirl-Embaresed",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "thats okay! just press Z or tap undo to go back~",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "jumping takes practice~ think about where youll land before you leap!",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
	],
};

export const tutorialStuck3: DialogueScene = {
	id: "tutorial-stuck-3",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "okay maybe i should have thought ahead a little more...",
			leftSprite: "MushroomGirl-Embaresed",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "hehe~ every gardener gets lost sometimes! thats how we find new paths~",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "but if i have to undo it means i messed up...",
			leftSprite: "MushroomGirl-Nervous",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "not at all little one~ undoing is just part of learning!",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "press Z or tap undo as much as you need~ what matters is you get there in the end!",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

export const tutorialStuck4: DialogueScene = {
	id: "tutorial-stuck-4",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "i keep getting stuck on the wrong side...",
			leftSprite: "MushroomGirl-Tired",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "remember~ you can cross the stone as many times as you need!",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "try undoing a few steps and using the stone to get around~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
	],
};

export const tutorialStuck5: DialogueScene = {
	id: "tutorial-stuck-5",
	background: "",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: true,
	lines: [
		{
			speaker: "sprout",
			name: "Sprout",
			text: "the mud is confusing me grandpa...",
			leftSprite: "MushroomGirl-Tired",
			rightSprite: "Grandpa-Normal",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "youre almost there little one~ i believe in you!",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "take your time and undo if you need to~ youve got this!",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
	],
};

// Goodbye dialogue - after completing all 5 puzzles

export const tutorialGoodbye: DialogueScene = {
	id: "tutorial-goodbye",
	background: "/art/DialogueBackgrounds/GrandpasGarden.webp",
	leftCharacter: "sprout",
	rightCharacter: "grandpa",
	overlay: false,
	lines: [
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "look at you! all grown up and ready for the big forest~",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "told ya i could do it!! im gonna plant SO many mushrooms~",
			leftSprite: "MushroomGirl-Smug",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "im so proud of you little one... now remember...",
			leftSprite: "MushroomGirl-Happy",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "taking a break is never giving up. rest when you need to~",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Normal",
			rightHighlight: true,
		},
		{
			speaker: "grandpa",
			name: "Grandpa",
			text: "the forest will always be waiting for you with open arms~",
			leftSprite: "MushroomGirl",
			rightSprite: "Grandpa-Silly",
			rightHighlight: true,
		},
		{
			speaker: "sprout",
			name: "Sprout",
			text: "ill make you proud grandpa!! here i go~!!",
			leftSprite: "MushroomGirl-Waving",
			rightSprite: "Grandpa-Silly",
			leftHighlight: true,
		},
	],
};

// Export all intro dialogues as an array for easy indexing
export const tutorialIntroDialogues: DialogueScene[] = [
	tutorialIntro1,
	tutorialIntro2,
	tutorialIntro3,
	tutorialIntro4,
	tutorialIntro5,
];

// Export all stuck dialogues as an array for easy indexing
export const tutorialStuckDialogues: DialogueScene[] = [
	tutorialStuck1,
	tutorialStuck2,
	tutorialStuck3,
	tutorialStuck4,
	tutorialStuck5,
];
