<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FlowDirection, Tile } from "../types/game";
import { TileType } from "../types/game";
import { type BrambleLinks, createBrambleArt } from "../utils/brambleArt";

interface LilypadState {
	submerged: boolean;
	cooldown: number;
	resurfacing?: boolean;
}

const props = defineProps<{
	tile: Tile;
	isPlayerHere: boolean;
	isReachable: boolean;
	isJustPlanted: boolean;
	isJustCleaned?: boolean;
	isHinted?: boolean;
	isStuckHighlight?: boolean;
	isBounceActivated?: boolean;
	flowDirection?: FlowDirection | null;
	hasIceElement?: boolean;
	hasDirtElement?: boolean;
	hasPondElement?: boolean;
	hasTidesElement?: boolean;
	hasAcornElement?: boolean;
	hasStarElement?: boolean;
	shouldShimmer?: boolean;
	lilypadState?: LilypadState;
	tidePhase?: number;
	movesUntilFlood?: number;
	squirrelRequirement?: number;
	collectedAcorns?: number;
	starTrailFromDirection?: "up" | "down" | "left" | "right" | null; // Direction the trail comes FROM
	starTrailToDirection?: "up" | "down" | "left" | "right" | null; // Direction the trail goes TO
	brambleLinks?: BrambleLinks; // Neighbouring brambles, so canes join up across tiles
}>();

// Check if low sand tiles are currently flooded (tidePhase === 0)
const isLowSandFlooded = computed(() => props.tidePhase === 0);

// Track when tide is receding (transitioning from flooded to normal)
const isTideReceding = ref(false);

watch(
	() => props.tidePhase,
	(newPhase, oldPhase) => {
		// Detect transition from flooded (0) to normal (1)
		if (oldPhase === 0 && newPhase === 1) {
			isTideReceding.value = true;
			// Clear the receding state after animation completes
			setTimeout(() => {
				isTideReceding.value = false;
			}, 600);
		}
	},
);

const emit = defineEmits<{
	click: [];
}>();

// Check if tile is a portal type
const isPortal = computed(() => {
	return (
		props.tile.type === TileType.PORTAL_PINK ||
		props.tile.type === TileType.PORTAL_BLUE ||
		props.tile.type === TileType.PORTAL_YELLOW
	);
});

const tileClass = computed(() => {
	// Shimmer applies to grass, dirt, low_sand, and acorn tiles when hints are active and player is not here
	const canShimmer =
		props.shouldShimmer &&
		!props.isPlayerHere &&
		(props.tile.type === TileType.GRASS ||
			props.tile.type === TileType.DIRT ||
			props.tile.type === TileType.LOW_SAND ||
			props.tile.type === TileType.ACORN ||
			props.tile.type === TileType.BASE_STAR ||
			props.tile.type === TileType.STAR_PATH);

	// Night biome (pond element) overrides other biomes
	const isNightBiome = props.hasPondElement && !props.hasIceElement;

	// Beach biome (tides element)
	const isBeachBiome =
		props.hasTidesElement && !props.hasIceElement && !isNightBiome;

	// Starlit biome (star element) - between beach and autumn
	const isStarlitBiome =
		props.hasStarElement &&
		!props.hasIceElement &&
		!isNightBiome &&
		!isBeachBiome;

	// Autumn biome (acorn element) - higher priority than swamp
	const isAutumnBiome =
		props.hasAcornElement &&
		!props.hasIceElement &&
		!isNightBiome &&
		!isBeachBiome &&
		!isStarlitBiome;

	return {
		tile: true,
		"tile--grass": props.tile.type === TileType.GRASS,
		"tile--bramble": props.tile.type === TileType.BRAMBLE,
		"tile--mushroom": props.tile.type === TileType.MUSHROOM,
		"tile--void": props.tile.type === TileType.VOID,
		"tile--stone": props.tile.type === TileType.STONE,
		"tile--water": props.tile.type === TileType.WATER,
		"tile--dirt": props.tile.type === TileType.DIRT,
		"tile--ice": props.tile.type === TileType.ICE,
		"tile--pond": props.tile.type === TileType.POND,
		"tile--pond-submerged":
			props.tile.type === TileType.POND && props.lilypadState?.submerged,
		"tile--pond-water": props.tile.type === TileType.POND_WATER,
		// Tides tiles
		"tile--low-sand": props.tile.type === TileType.LOW_SAND,
		"tile--low-sand-flooded":
			props.tile.type === TileType.LOW_SAND && isLowSandFlooded.value,
		"tile--low-sand-receding":
			props.tile.type === TileType.LOW_SAND && isTideReceding.value,
		"tile--low-sand-warning":
			props.tile.type === TileType.LOW_SAND && props.movesUntilFlood === 1,
		"tile--sea": props.tile.type === TileType.SEA,
		"tile--sea-high-tide":
			props.tile.type === TileType.SEA && isLowSandFlooded.value,
		"tile--sea-receding":
			props.tile.type === TileType.SEA && isTideReceding.value,
		// Bounce pad
		"tile--bounce-pad": props.tile.type === TileType.BOUNCE_PAD,
		// Honey
		"tile--honey": props.tile.type === TileType.HONEY,
		"tile--honey-mushroom": props.tile.type === TileType.HONEY_MUSHROOM,
		// Honey biome variants (grass background for HONEY tiles)
		"tile--honey-frosty":
			props.hasIceElement && props.tile.type === TileType.HONEY,
		"tile--honey-night": isNightBiome && props.tile.type === TileType.HONEY,
		"tile--honey-beach": isBeachBiome && props.tile.type === TileType.HONEY,
		"tile--honey-swamp":
			!props.hasIceElement &&
			!isNightBiome &&
			!isBeachBiome &&
			!isAutumnBiome &&
			props.hasDirtElement &&
			props.tile.type === TileType.HONEY,
		"tile--honey-autumn": isAutumnBiome && props.tile.type === TileType.HONEY,
		// Honey mushroom biome variants (mushroom background for HONEY_MUSHROOM tiles)
		"tile--honey-mushroom-frosty":
			props.hasIceElement && props.tile.type === TileType.HONEY_MUSHROOM,
		"tile--honey-mushroom-night":
			isNightBiome && props.tile.type === TileType.HONEY_MUSHROOM,
		"tile--honey-mushroom-beach":
			isBeachBiome && props.tile.type === TileType.HONEY_MUSHROOM,
		"tile--honey-mushroom-swamp":
			!props.hasIceElement &&
			!isNightBiome &&
			!isBeachBiome &&
			!isAutumnBiome &&
			props.hasDirtElement &&
			props.tile.type === TileType.HONEY_MUSHROOM,
		"tile--honey-mushroom-autumn":
			isAutumnBiome && props.tile.type === TileType.HONEY_MUSHROOM,
		// Acorn tile
		"tile--acorn": props.tile.type === TileType.ACORN,
		// Squirrel tile
		"tile--squirrel": props.tile.type === TileType.SQUIRREL,
		"tile--squirrel-ready":
			props.tile.type === TileType.SQUIRREL &&
			(props.collectedAcorns ?? 0) >= (props.squirrelRequirement ?? 1),
		// Star path tiles
		"tile--base-star": props.tile.type === TileType.BASE_STAR,
		"tile--star-path": props.tile.type === TileType.STAR_PATH,
		"tile--star-mushroom": props.tile.type === TileType.STAR_MUSHROOM,
		// Sand mushroom (mushroom planted on low sand)
		"tile--sand-mushroom": props.tile.type === TileType.SAND_MUSHROOM,
		"tile--sand-mushroom-flooded":
			props.tile.type === TileType.SAND_MUSHROOM && isLowSandFlooded.value,
		"tile--sand-mushroom-receding":
			props.tile.type === TileType.SAND_MUSHROOM && isTideReceding.value,
		"tile--sand-mushroom-warning":
			props.tile.type === TileType.SAND_MUSHROOM && props.movesUntilFlood === 1,
		"tile--portal": isPortal.value,
		"tile--portal-pink": props.tile.type === TileType.PORTAL_PINK,
		"tile--portal-blue": props.tile.type === TileType.PORTAL_BLUE,
		"tile--portal-yellow": props.tile.type === TileType.PORTAL_YELLOW,
		"tile--reachable": props.isReachable && !props.isPlayerHere,
		"tile--has-player": props.isPlayerHere,
		"tile--just-cleaned": props.isJustCleaned,
		"tile--hinted": props.isHinted,
		"tile--stuck-highlight": props.isStuckHighlight,
		"tile--shimmer": canShimmer,
		// Ice biome takes priority over swamp, night, and beach
		"tile--frosty":
			props.hasIceElement &&
			(props.tile.type === TileType.GRASS || isPortal.value),
		"tile--frosty-mushroom":
			props.hasIceElement && props.tile.type === TileType.MUSHROOM,
		"tile--frosty-dirt":
			props.hasIceElement &&
			(props.tile.type === TileType.DIRT || props.isJustCleaned),
		// Night biome (pond element) - dark blues
		"tile--night":
			isNightBiome && (props.tile.type === TileType.GRASS || isPortal.value),
		"tile--night-mushroom":
			isNightBiome && props.tile.type === TileType.MUSHROOM,
		"tile--night-dirt":
			isNightBiome &&
			(props.tile.type === TileType.DIRT || props.isJustCleaned),
		// Beach biome (tides element) - sandy warm tones
		"tile--beach":
			isBeachBiome && (props.tile.type === TileType.GRASS || isPortal.value),
		"tile--beach-mushroom":
			isBeachBiome && props.tile.type === TileType.MUSHROOM,
		// Autumn biome (acorn element) - warm orange/red tones
		"tile--autumn":
			isAutumnBiome &&
			(props.tile.type === TileType.GRASS ||
				props.tile.type === TileType.ACORN ||
				props.tile.type === TileType.SQUIRREL ||
				isPortal.value),
		"tile--autumn-mushroom":
			isAutumnBiome && props.tile.type === TileType.MUSHROOM,
		"tile--autumn-dirt":
			isAutumnBiome &&
			(props.tile.type === TileType.DIRT || props.isJustCleaned),
		// Starlit biome (star element) - pale green/blue pastels
		"tile--starlit":
			isStarlitBiome &&
			(props.tile.type === TileType.GRASS ||
				props.tile.type === TileType.BASE_STAR ||
				props.tile.type === TileType.STAR_PATH ||
				isPortal.value),
		"tile--starlit-mushroom":
			isStarlitBiome && props.tile.type === TileType.MUSHROOM,
		"tile--starlit-dirt":
			isStarlitBiome &&
			(props.tile.type === TileType.DIRT || props.isJustCleaned),
		// Swamp biome (fallback when no ice, night, beach, starlit, or autumn)
		"tile--swamp":
			!props.hasIceElement &&
			!isNightBiome &&
			!isBeachBiome &&
			!isStarlitBiome &&
			!isAutumnBiome &&
			props.hasDirtElement &&
			(props.tile.type === TileType.GRASS || isPortal.value),
		"tile--swamp-mushroom":
			!props.hasIceElement &&
			!isNightBiome &&
			!isBeachBiome &&
			!isStarlitBiome &&
			!isAutumnBiome &&
			props.hasDirtElement &&
			props.tile.type === TileType.MUSHROOM,
		"tile--swamp-dirt":
			!props.hasIceElement &&
			!isNightBiome &&
			!isBeachBiome &&
			!isStarlitBiome &&
			!isAutumnBiome &&
			props.hasDirtElement &&
			(props.tile.type === TileType.DIRT || props.isJustCleaned),
	};
});

const arrowRotation = computed(() => {
	// Chevrons point down at 0deg, so rotate to match flow direction
	switch (props.flowDirection) {
		case "down":
			return "0deg";
		case "left":
			return "90deg";
		case "up":
			return "180deg";
		case "right":
			return "270deg";
		default:
			return "0deg";
	}
});

// Deterministic mushroom variant based on position (0-4)
const mushroomVariant = computed(() => {
	const hash = props.tile.position.x * 7 + props.tile.position.y * 13;
	return hash % 5;
});

// Thorny canes, joined up with any neighbouring brambles
const brambleArt = computed(() =>
	props.tile.type === TileType.BRAMBLE
		? createBrambleArt(
				props.tile.position,
				props.brambleLinks ?? {
					up: false,
					down: false,
					left: false,
					right: false,
				},
			)
		: null,
);

// Deterministic honey splatter variant based on position (0-3)
const honeyVariant = computed(() => {
	const hash = props.tile.position.x * 19 + props.tile.position.y * 23;
	return hash % 4;
});

// Deterministic star mushroom variant based on position (0-4)
const starMushroomVariant = computed(() => {
	const hash = props.tile.position.x * 29 + props.tile.position.y * 31;
	return hash % 5;
});

// Deterministic dirt layout variant based on position (0-3)
const dirtVariant = computed(() => {
	const hash = props.tile.position.x * 29 + props.tile.position.y * 31;
	return hash % 4;
});

// Deterministic pond water variant based on position (0-4)
// 0: just ripples, 1: mini lily-pads, 2: reeds, 3: frog, 4: just ripples
const pondWaterVariant = computed(() => {
	const hash = props.tile.position.x * 19 + props.tile.position.y * 23;
	return hash % 5;
});

function handleClick() {
	if (props.isReachable && !props.isPlayerHere) {
		emit("click");
	}
}
</script>

<template>
  <div :class="tileClass" @click="handleClick">
    <!-- Grass details -->
    <div v-if="tile.type === TileType.GRASS" class="grass-detail">
      <div class="grass-blade"></div>
      <div class="grass-blade"></div>
      <div class="grass-blade"></div>
    </div>


    <!-- Mushroom sprites - different variants -->
    <div v-if="tile.type === TileType.MUSHROOM" :class="['mushroom-container', { 'mushroom--pop': isJustPlanted }]">
      <!-- Variant 0: Single tan mushroom -->
      <div v-if="mushroomVariant === 0" class="mushroom mushroom--tan">
        <div class="mushroom__cap"></div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 1: Single red mushroom -->
      <div v-else-if="mushroomVariant === 1" class="mushroom mushroom--red">
        <div class="mushroom__cap">
          <div class="mushroom__spots"></div>
        </div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 2: Double tan mushrooms -->
      <div v-else-if="mushroomVariant === 2" class="mushroom-cluster">
        <div class="mushroom mushroom--tan mushroom--small mushroom--left">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tan mushroom--small mushroom--right">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
      </div>

      <!-- Variant 3: Single purple mushroom -->
      <div v-else-if="mushroomVariant === 3" class="mushroom mushroom--purple">
        <div class="mushroom__cap"></div>
        <div class="mushroom__stem"></div>
      </div>

      <!-- Variant 4: Triple small mushrooms -->
      <div v-else class="mushroom-cluster mushroom-cluster--triple">
        <div class="mushroom mushroom--tiny mushroom--tan">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tiny mushroom--red">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <div class="mushroom mushroom--tiny mushroom--tan">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
      </div>
    </div>

    <!-- Star Mushroom - unique glowing star-themed mushroom for starlit biome -->
    <div v-if="tile.type === TileType.STAR_MUSHROOM" :class="['star-mushroom-container', { 'mushroom--pop': isJustPlanted }]">
      <!-- Ground star imprint beneath the mushroom -->
      <div class="star-mushroom__ground-star"></div>

      <!-- Variant 0: Single gold star mushroom -->
      <div v-if="starMushroomVariant === 0" class="star-mushroom star-mushroom--gold">
        <div class="star-mushroom__glow"></div>
        <div class="star-mushroom__cap">
          <div class="star-mushroom__star"></div>
        </div>
        <div class="star-mushroom__stem"></div>
      </div>

      <!-- Variant 1: Single silver/blue star mushroom -->
      <div v-else-if="starMushroomVariant === 1" class="star-mushroom star-mushroom--silver">
        <div class="star-mushroom__glow"></div>
        <div class="star-mushroom__cap">
          <div class="star-mushroom__star"></div>
        </div>
        <div class="star-mushroom__stem"></div>
      </div>

      <!-- Variant 2: Double star mushrooms (gold + silver) -->
      <div v-else-if="starMushroomVariant === 2" class="star-mushroom-cluster">
        <div class="star-mushroom star-mushroom--gold star-mushroom--small star-mushroom--left">
          <div class="star-mushroom__glow"></div>
          <div class="star-mushroom__cap">
            <div class="star-mushroom__star"></div>
          </div>
          <div class="star-mushroom__stem"></div>
        </div>
        <div class="star-mushroom star-mushroom--silver star-mushroom--small star-mushroom--right">
          <div class="star-mushroom__glow"></div>
          <div class="star-mushroom__cap">
            <div class="star-mushroom__star"></div>
          </div>
          <div class="star-mushroom__stem"></div>
        </div>
      </div>

      <!-- Variant 3: Single pink/rose star mushroom -->
      <div v-else-if="starMushroomVariant === 3" class="star-mushroom star-mushroom--rose">
        <div class="star-mushroom__glow"></div>
        <div class="star-mushroom__cap">
          <div class="star-mushroom__star"></div>
        </div>
        <div class="star-mushroom__stem"></div>
      </div>

      <!-- Variant 4: Triple tiny star mushrooms -->
      <div v-else class="star-mushroom-cluster star-mushroom-cluster--triple">
        <div class="star-mushroom star-mushroom--tiny star-mushroom--gold">
          <div class="star-mushroom__glow"></div>
          <div class="star-mushroom__cap">
            <div class="star-mushroom__star"></div>
          </div>
          <div class="star-mushroom__stem"></div>
        </div>
        <div class="star-mushroom star-mushroom--tiny star-mushroom--silver">
          <div class="star-mushroom__glow"></div>
          <div class="star-mushroom__cap">
            <div class="star-mushroom__star"></div>
          </div>
          <div class="star-mushroom__stem"></div>
        </div>
        <div class="star-mushroom star-mushroom--tiny star-mushroom--rose">
          <div class="star-mushroom__glow"></div>
          <div class="star-mushroom__cap">
            <div class="star-mushroom__star"></div>
          </div>
          <div class="star-mushroom__stem"></div>
        </div>
      </div>
    </div>

    <!-- Bramble: thorny canes snaking across the tile -->
    <svg v-if="brambleArt" class="bramble" viewBox="0 0 64 64" aria-hidden="true">
      <g class="bramble__shadow" transform="translate(0.8 1.6)">
        <path v-for="(cane, i) in brambleArt.canes" :key="i" :d="cane.d" :stroke-width="cane.width + 2.4" />
        <path class="bramble__thorn-shapes" :d="brambleArt.thorns" />
      </g>
      <g class="bramble__canes">
        <path
          v-for="(cane, i) in brambleArt.canes"
          :key="i"
          :class="`bramble__cane--${cane.layer}`"
          :d="cane.d"
          :stroke-width="cane.width"
        />
      </g>
      <path class="bramble__thorns" :d="brambleArt.thorns" />
      <g class="bramble__highlights" transform="translate(-0.5 -0.7)">
        <template v-for="(cane, i) in brambleArt.canes" :key="i">
          <path v-if="cane.layer === 'front'" :d="cane.d" :stroke-width="cane.width * 0.3" />
        </template>
      </g>
      <g class="bramble__berries">
        <circle v-for="(berry, i) in brambleArt.berries" :key="i" :cx="berry.x" :cy="berry.y" :r="berry.r" />
      </g>
    </svg>

    <!-- Stone tile details -->
    <div v-if="tile.type === TileType.STONE" class="stone-detail">
      <div class="stone-crack stone-crack--1"></div>
      <div class="stone-crack stone-crack--2"></div>
      <div class="pebble pebble--1"></div>
      <div class="pebble pebble--2"></div>
      <div class="pebble pebble--3"></div>
    </div>

    <!-- Dirt tile details (also shows during cleaning animation) -->
    <div
      v-if="tile.type === TileType.DIRT || isJustCleaned"
      :class="['dirt-detail', { 'dirt-detail--fading': isJustCleaned }]"
    >
      <!-- Variant 0: Original layout - clumps top-left, bottom-right, center -->
      <template v-if="dirtVariant === 0">
        <div class="dirt-clump dirt-clump--1"></div>
        <div class="dirt-clump dirt-clump--2"></div>
        <div class="dirt-clump dirt-clump--3"></div>
        <div class="dirt-rock dirt-rock--1"></div>
        <div class="dirt-rock dirt-rock--2"></div>
      </template>
      <!-- Variant 1: Diagonal stripe - top-right to bottom-left -->
      <template v-else-if="dirtVariant === 1">
        <div class="dirt-clump dirt-clump--v1-1"></div>
        <div class="dirt-clump dirt-clump--v1-2"></div>
        <div class="dirt-clump dirt-clump--v1-3"></div>
        <div class="dirt-rock dirt-rock--v1-1"></div>
        <div class="dirt-rock dirt-rock--v1-2"></div>
      </template>
      <!-- Variant 2: Scattered small patches with more rocks -->
      <template v-else-if="dirtVariant === 2">
        <div class="dirt-clump dirt-clump--v2-1"></div>
        <div class="dirt-clump dirt-clump--v2-2"></div>
        <div class="dirt-rock dirt-rock--v2-1"></div>
        <div class="dirt-rock dirt-rock--v2-2"></div>
        <div class="dirt-rock dirt-rock--v2-3"></div>
        <div class="dirt-rock dirt-rock--v2-4"></div>
      </template>
      <!-- Variant 3: Large central patch -->
      <template v-else>
        <div class="dirt-clump dirt-clump--v3-1"></div>
        <div class="dirt-clump dirt-clump--v3-2"></div>
        <div class="dirt-clump dirt-clump--v3-3"></div>
        <div class="dirt-rock dirt-rock--v3-1"></div>
      </template>
    </div>

    <!-- Water tile with ripples, flow lines, and chevrons -->
    <div v-if="tile.type === TileType.WATER" class="water-detail">
      <!-- Background ripples for water aesthetic -->
      <div class="water-ripples">
        <div class="ripple ripple--1"></div>
        <div class="ripple ripple--2"></div>
        <div class="ripple ripple--3"></div>
      </div>
      <!-- Directional elements rotated to match flow -->
      <div class="water-flow" :style="{ '--flow-angle': arrowRotation }">
        <!-- Animated flowing waves -->
        <div class="water-waves">
          <div class="wave wave--1"></div>
          <div class="wave wave--2"></div>
          <div class="wave wave--3"></div>
        </div>
        <!-- Flow direction chevrons -->
        <div class="flow-chevrons">
          <div class="chevron chevron--1"></div>
          <div class="chevron chevron--2"></div>
          <div class="chevron chevron--3"></div>
        </div>
      </div>
    </div>

    <!-- Ice tile with frost and shimmer -->
    <div v-if="tile.type === TileType.ICE" class="ice-detail">
      <div class="ice-shine"></div>
      <div class="ice-cracks">
        <div class="ice-crack ice-crack--1"></div>
        <div class="ice-crack ice-crack--2"></div>
        <div class="ice-crack ice-crack--3"></div>
      </div>
      <div class="ice-sparkles">
        <div class="sparkle sparkle--1"></div>
        <div class="sparkle sparkle--2"></div>
        <div class="sparkle sparkle--3"></div>
      </div>
    </div>

    <!-- Pond tile with lily-pad -->
    <div v-if="tile.type === TileType.POND" class="pond-detail">
      <!-- Gentle pond ripples (slower than river) -->
      <div class="pond-ripples">
        <div class="pond-ripple pond-ripple--1"></div>
        <div class="pond-ripple pond-ripple--2"></div>
      </div>
      <!-- Lily-pad (always present, animated on state change) -->
      <div class="lilypad" :class="{
        'lilypad--submerged': lilypadState?.submerged,
        'lilypad--resurfacing': lilypadState?.resurfacing
      }">
        <div class="lilypad-pad"></div>
        <div class="lilypad-flower">
          <div class="lilypad-petal lilypad-petal--1"></div>
          <div class="lilypad-petal lilypad-petal--2"></div>
          <div class="lilypad-petal lilypad-petal--3"></div>
          <div class="lilypad-center"></div>
        </div>
      </div>
      <!-- Bubble hints when submerged -->
      <div v-if="lilypadState?.submerged" class="pond-bubbles">
        <div class="bubble bubble--1"></div>
        <div class="bubble bubble--2"></div>
        <div class="bubble bubble--3"></div>
        <!-- Cooldown indicator -->
        <div v-if="lilypadState?.cooldown > 0" class="cooldown-indicator">
          {{ lilypadState.cooldown }}
        </div>
      </div>
    </div>

    <!-- Deep pond water (impassable) -->
    <div v-if="tile.type === TileType.POND_WATER" class="pond-water-detail">
      <!-- Slow ambient ripples (always shown) -->
      <div class="pond-water-ripples">
        <div class="pond-water-ripple pond-water-ripple--1"></div>
        <div class="pond-water-ripple pond-water-ripple--2"></div>
        <div class="pond-water-ripple pond-water-ripple--3"></div>
      </div>

      <!-- Variant 0 & 4: Just ripples, no decoration -->

      <!-- Variant 1: Mini decorative lily-pads -->
      <div v-if="pondWaterVariant === 1" class="mini-lilypads">
        <div class="mini-lilypad mini-lilypad--1"></div>
        <div class="mini-lilypad mini-lilypad--2"></div>
      </div>

      <!-- Variant 2: Reeds/cattails -->
      <div v-if="pondWaterVariant === 2" class="pond-reeds">
        <div class="reed reed--1"></div>
        <div class="reed reed--2"></div>
      </div>

      <!-- Variant 3: Frog chilling -->
      <div v-if="pondWaterVariant === 3" class="pond-frog">
        <div class="frog-body"></div>
        <div class="frog-eye frog-eye--left"></div>
        <div class="frog-eye frog-eye--right"></div>
        <div class="frog-leg frog-leg--left"></div>
        <div class="frog-leg frog-leg--right"></div>
      </div>
    </div>

    <!-- Low sand tile (tidal zone) -->
    <div v-if="tile.type === TileType.LOW_SAND" class="low-sand-detail">
      <!-- Sandy texture with wave patterns -->
      <div class="sand-texture">
        <div class="sand-ripple sand-ripple--1"></div>
        <div class="sand-ripple sand-ripple--2"></div>
      </div>
      <!-- Seashells scattered -->
      <div class="seashells">
        <div class="shell shell--1"></div>
        <div class="shell shell--2"></div>
      </div>
      <!-- Warning state - water rising at edges when about to flood -->
      <div v-if="movesUntilFlood === 1" class="tide-warning">
        <div class="rising-water"></div>
        <div class="warning-foam">
          <div class="foam-bubble foam-bubble--1"></div>
          <div class="foam-bubble foam-bubble--2"></div>
          <div class="foam-bubble foam-bubble--3"></div>
          <div class="foam-bubble foam-bubble--4"></div>
        </div>
      </div>
      <!-- Flood water overlay when tide is high -->
      <div v-if="isLowSandFlooded" class="flood-water">
        <div class="flood-ripple flood-ripple--1"></div>
        <div class="flood-ripple flood-ripple--2"></div>
      </div>
      <!-- Tide countdown indicator -->
      <div v-if="movesUntilFlood !== undefined && !isLowSandFlooded" :class="['tide-countdown', { 'tide-countdown--warning': movesUntilFlood === 1 }]">
        {{ movesUntilFlood }}
      </div>
    </div>

    <!-- Sea tile (always water, syncs visually with tide) -->
    <div v-if="tile.type === TileType.SEA" class="sea-detail">
      <!-- Ocean waves -->
      <div class="sea-waves">
        <div class="sea-wave sea-wave--1"></div>
        <div class="sea-wave sea-wave--2"></div>
        <div class="sea-wave sea-wave--3"></div>
      </div>
      <!-- Foam at edges -->
      <div class="sea-foam">
        <div class="foam-patch foam-patch--1"></div>
        <div class="foam-patch foam-patch--2"></div>
      </div>
    </div>

    <!-- Bounce pad tile - red mushroom square with white dots -->
    <div v-if="tile.type === TileType.BOUNCE_PAD" :class="['bounce-pad-detail', { 'bounce-pad--activated': isBounceActivated }]">
      <!-- White dots on red background -->
      <div class="bounce-dot bounce-dot--1"></div>
      <div class="bounce-dot bounce-dot--2"></div>
      <div class="bounce-dot bounce-dot--3"></div>
      <div class="bounce-dot bounce-dot--4"></div>
      <div class="bounce-dot bounce-dot--5"></div>
      <!-- Ripple effect when activated -->
      <div v-if="isBounceActivated" class="bounce-ripple"></div>
      <div v-if="isBounceActivated" class="bounce-ripple bounce-ripple--delayed"></div>
    </div>

    <!-- Honey tile - golden honey splatter on grass -->
    <div v-if="tile.type === TileType.HONEY" class="honey-detail">
      <svg class="honey-splatter" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="honeyGradient" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffca28" stop-opacity="0.92" />
            <stop offset="50%" stop-color="#ffa000" stop-opacity="0.88" />
            <stop offset="100%" stop-color="#ff8f00" stop-opacity="0.82" />
          </radialGradient>
        </defs>
        <!-- Variant 0: Single large blob -->
        <g v-if="honeyVariant === 0">
          <path
            class="honey-path"
            d="M48,8
               C58,6 68,10 76,16
               Q82,22 85,32
               C88,42 92,48 88,58
               Q84,68 80,75
               C74,84 65,90 55,92
               Q45,94 38,90
               C28,86 20,82 15,72
               Q10,62 8,50
               C6,38 10,26 18,18
               Q26,10 38,8
               C42,7 45,8 48,8 Z"
            fill="url(#honeyGradient)"
          />
        </g>
        <!-- Variant 1: Two medium blobs -->
        <g v-else-if="honeyVariant === 1">
          <path
            class="honey-path"
            d="M35,15
               C45,12 55,18 58,28
               Q60,38 55,48
               C50,58 38,60 28,55
               Q18,50 18,38
               C18,26 25,18 35,15 Z"
            fill="url(#honeyGradient)"
          />
          <path
            class="honey-path"
            d="M65,45
               C75,42 85,50 85,62
               Q85,74 75,80
               C65,86 52,82 50,70
               Q48,58 55,50
               C58,46 62,46 65,45 Z"
            fill="url(#honeyGradient)"
          />
        </g>
        <!-- Variant 2: One large + two small drops -->
        <g v-else-if="honeyVariant === 2">
          <path
            class="honey-path"
            d="M50,20
               C62,18 72,25 75,38
               Q78,51 70,62
               C62,73 48,75 38,68
               Q28,61 28,48
               C28,35 38,22 50,20 Z"
            fill="url(#honeyGradient)"
          />
          <ellipse class="honey-path" cx="22" cy="30" rx="12" ry="10" fill="url(#honeyGradient)" />
          <ellipse class="honey-path" cx="78" cy="75" rx="10" ry="12" fill="url(#honeyGradient)" />
        </g>
        <!-- Variant 3: Three scattered drops -->
        <g v-else>
          <path
            class="honey-path"
            d="M30,18
               C40,15 48,22 48,32
               Q48,42 40,48
               C32,54 20,50 18,40
               Q16,30 22,22
               C25,18 28,18 30,18 Z"
            fill="url(#honeyGradient)"
          />
          <path
            class="honey-path"
            d="M68,35
               C78,33 86,42 84,52
               Q82,62 72,65
               C62,68 55,60 56,50
               Q57,40 64,36
               C66,35 67,35 68,35 Z"
            fill="url(#honeyGradient)"
          />
          <path
            class="honey-path"
            d="M45,62
               C55,60 62,68 60,78
               Q58,88 48,90
               C38,92 32,84 34,74
               Q36,64 42,62
               C44,61 45,62 45,62 Z"
            fill="url(#honeyGradient)"
          />
        </g>
      </svg>
      <div class="honey-shine"></div>
    </div>

    <!-- Honey mushroom tile (mushroom planted on honey) -->
    <div v-if="tile.type === TileType.HONEY_MUSHROOM" class="honey-mushroom-detail">
      <!-- Honey splatter visible underneath -->
      <svg class="honey-splatter honey-splatter--under" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id="honeyGradientUnder" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffca28" stop-opacity="0.88" />
            <stop offset="50%" stop-color="#ffa000" stop-opacity="0.82" />
            <stop offset="100%" stop-color="#ff8f00" stop-opacity="0.75" />
          </radialGradient>
        </defs>
        <!-- Variant 0: Single large blob -->
        <g v-if="honeyVariant === 0">
          <path
            class="honey-path"
            d="M48,8
               C58,6 68,10 76,16
               Q82,22 85,32
               C88,42 92,48 88,58
               Q84,68 80,75
               C74,84 65,90 55,92
               Q45,94 38,90
               C28,86 20,82 15,72
               Q10,62 8,50
               C6,38 10,26 18,18
               Q26,10 38,8
               C42,7 45,8 48,8 Z"
            fill="url(#honeyGradientUnder)"
          />
        </g>
        <!-- Variant 1: Two medium blobs -->
        <g v-else-if="honeyVariant === 1">
          <path
            class="honey-path"
            d="M35,15
               C45,12 55,18 58,28
               Q60,38 55,48
               C50,58 38,60 28,55
               Q18,50 18,38
               C18,26 25,18 35,15 Z"
            fill="url(#honeyGradientUnder)"
          />
          <path
            class="honey-path"
            d="M65,45
               C75,42 85,50 85,62
               Q85,74 75,80
               C65,86 52,82 50,70
               Q48,58 55,50
               C58,46 62,46 65,45 Z"
            fill="url(#honeyGradientUnder)"
          />
        </g>
        <!-- Variant 2: One large + two small drops -->
        <g v-else-if="honeyVariant === 2">
          <path
            class="honey-path"
            d="M50,20
               C62,18 72,25 75,38
               Q78,51 70,62
               C62,73 48,75 38,68
               Q28,61 28,48
               C28,35 38,22 50,20 Z"
            fill="url(#honeyGradientUnder)"
          />
          <ellipse class="honey-path" cx="22" cy="30" rx="12" ry="10" fill="url(#honeyGradientUnder)" />
          <ellipse class="honey-path" cx="78" cy="75" rx="10" ry="12" fill="url(#honeyGradientUnder)" />
        </g>
        <!-- Variant 3: Three scattered drops -->
        <g v-else>
          <path
            class="honey-path"
            d="M30,18
               C40,15 48,22 48,32
               Q48,42 40,48
               C32,54 20,50 18,40
               Q16,30 22,22
               C25,18 28,18 30,18 Z"
            fill="url(#honeyGradientUnder)"
          />
          <path
            class="honey-path"
            d="M68,35
               C78,33 86,42 84,52
               Q82,62 72,65
               C62,68 55,60 56,50
               Q57,40 64,36
               C66,35 67,35 68,35 Z"
            fill="url(#honeyGradientUnder)"
          />
          <path
            class="honey-path"
            d="M45,62
               C55,60 62,68 60,78
               Q58,88 48,90
               C38,92 32,84 34,74
               Q36,64 42,62
               C44,61 45,62 45,62 Z"
            fill="url(#honeyGradientUnder)"
          />
        </g>
      </svg>
      <!-- Mushroom on top with pop animation -->
      <div :class="['honey-mushroom-container', { 'mushroom--pop': isJustPlanted }]">
        <!-- Variant 0: Single tan mushroom -->
        <div v-if="mushroomVariant === 0" class="mushroom mushroom--tan">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <!-- Variant 1: Single red mushroom -->
        <div v-else-if="mushroomVariant === 1" class="mushroom mushroom--red">
          <div class="mushroom__cap">
            <div class="mushroom__spots"></div>
          </div>
          <div class="mushroom__stem"></div>
        </div>
        <!-- Variant 2: Double tan mushrooms -->
        <div v-else-if="mushroomVariant === 2" class="mushroom-cluster">
          <div class="mushroom mushroom--tan mushroom--small mushroom--left">
            <div class="mushroom__cap"></div>
            <div class="mushroom__stem"></div>
          </div>
          <div class="mushroom mushroom--tan mushroom--small mushroom--right">
            <div class="mushroom__cap"></div>
            <div class="mushroom__stem"></div>
          </div>
        </div>
        <!-- Variant 3: Single purple mushroom -->
        <div v-else-if="mushroomVariant === 3" class="mushroom mushroom--purple">
          <div class="mushroom__cap"></div>
          <div class="mushroom__stem"></div>
        </div>
        <!-- Variant 4: Triple small mushrooms -->
        <div v-else class="mushroom-cluster mushroom-cluster--triple">
          <div class="mushroom mushroom--tiny mushroom--tan">
            <div class="mushroom__cap"></div>
            <div class="mushroom__stem"></div>
          </div>
          <div class="mushroom mushroom--tiny mushroom--red">
            <div class="mushroom__cap"></div>
            <div class="mushroom__stem"></div>
          </div>
          <div class="mushroom mushroom--tiny mushroom--tan">
            <div class="mushroom__cap"></div>
            <div class="mushroom__stem"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sand mushroom tile (mushroom planted on tidal sand) -->
    <div v-if="tile.type === TileType.SAND_MUSHROOM" class="sand-mushroom-detail">
      <!-- Sandy base texture (darker than low sand) -->
      <div class="sand-mushroom-texture">
        <div class="sand-ripple sand-ripple--1"></div>
        <div class="sand-ripple sand-ripple--2"></div>
      </div>
      <!-- Warning state - water rising at edges when about to flood -->
      <div v-if="movesUntilFlood === 1" class="tide-warning">
        <div class="rising-water"></div>
        <div class="warning-foam">
          <div class="foam-bubble foam-bubble--1"></div>
          <div class="foam-bubble foam-bubble--2"></div>
          <div class="foam-bubble foam-bubble--3"></div>
          <div class="foam-bubble foam-bubble--4"></div>
        </div>
      </div>
      <!-- Flood water overlay when tide is high -->
      <div v-if="isLowSandFlooded" class="flood-water">
        <div class="flood-ripple flood-ripple--1"></div>
        <div class="flood-ripple flood-ripple--2"></div>
      </div>
      <!-- Mushroom variants on top of sand with pop animation -->
      <div :class="['sand-mushroom-container', { 'mushroom--pop': isJustPlanted }]">
        <!-- Variant 0: Single tan beach mushroom -->
        <div v-if="mushroomVariant === 0" class="sand-mushroom sand-mushroom--tan">
          <div class="sand-mushroom__cap"></div>
          <div class="sand-mushroom__stem"></div>
        </div>

        <!-- Variant 1: Single coral/pink mushroom -->
        <div v-else-if="mushroomVariant === 1" class="sand-mushroom sand-mushroom--coral">
          <div class="sand-mushroom__cap">
            <div class="sand-mushroom__spots"></div>
          </div>
          <div class="sand-mushroom__stem"></div>
        </div>

        <!-- Variant 2: Double small beach mushrooms -->
        <div v-else-if="mushroomVariant === 2" class="sand-mushroom-cluster">
          <div class="sand-mushroom sand-mushroom--tan sand-mushroom--small sand-mushroom--left">
            <div class="sand-mushroom__cap"></div>
            <div class="sand-mushroom__stem"></div>
          </div>
          <div class="sand-mushroom sand-mushroom--tan sand-mushroom--small sand-mushroom--right">
            <div class="sand-mushroom__cap"></div>
            <div class="sand-mushroom__stem"></div>
          </div>
        </div>

        <!-- Variant 3: Single seafoam/teal mushroom -->
        <div v-else-if="mushroomVariant === 3" class="sand-mushroom sand-mushroom--seafoam">
          <div class="sand-mushroom__cap"></div>
          <div class="sand-mushroom__stem"></div>
        </div>

        <!-- Variant 4: Triple tiny beach mushrooms -->
        <div v-else class="sand-mushroom-cluster sand-mushroom-cluster--triple">
          <div class="sand-mushroom sand-mushroom--tiny sand-mushroom--tan">
            <div class="sand-mushroom__cap"></div>
            <div class="sand-mushroom__stem"></div>
          </div>
          <div class="sand-mushroom sand-mushroom--tiny sand-mushroom--coral">
            <div class="sand-mushroom__cap"></div>
            <div class="sand-mushroom__stem"></div>
          </div>
          <div class="sand-mushroom sand-mushroom--tiny sand-mushroom--tan">
            <div class="sand-mushroom__cap"></div>
            <div class="sand-mushroom__stem"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acorn tile - collectible acorn on grass -->
    <div v-if="tile.type === TileType.ACORN" class="acorn-tile">
      <div class="grass-detail">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <div class="acorn">
        <div class="acorn__cap"></div>
        <div class="acorn__body"></div>
        <div class="acorn__shine"></div>
      </div>
    </div>

    <!-- Squirrel tile - needs acorns to pass -->
    <div v-if="tile.type === TileType.SQUIRREL" class="squirrel-tile">
      <div class="grass-detail">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <div class="squirrel">
        <div class="squirrel__body"></div>
        <div class="squirrel__head"></div>
        <div class="squirrel__ear"></div>
        <div class="squirrel__tail"></div>
        <div class="squirrel__eye"></div>
      </div>
      <!-- Acorn requirement counter -->
      <div class="squirrel-requirement">
        <span class="requirement-count">{{ squirrelRequirement ?? 1 }}</span>
        <svg class="requirement-acorn" viewBox="0 0 16 20" width="10" height="12">
          <ellipse cx="8" cy="5" rx="6" ry="4" fill="#8B4513"/>
          <ellipse cx="8" cy="13" rx="5" ry="7" fill="#D2691E"/>
        </svg>
      </div>
    </div>

    <!-- Base Star tile - landing here blooms connected star paths -->
    <div v-if="tile.type === TileType.BASE_STAR" class="star-tile star-tile--base">
      <div class="grass-detail">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <!-- Trail connector showing path to next star -->
      <div v-if="starTrailToDirection" :class="['star-trail', `star-trail--to-${starTrailToDirection}`]"></div>
      <div class="star star--base">
        <div class="star__shape"></div>
        <div class="star__glow"></div>
      </div>
    </div>

    <!-- Star Path tile - blooms to mushroom when base star is landed on -->
    <div v-if="tile.type === TileType.STAR_PATH" class="star-tile star-tile--path">
      <div class="grass-detail">
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
        <div class="grass-blade"></div>
      </div>
      <!-- Trail connectors showing path from previous and to next star -->
      <div v-if="starTrailFromDirection" :class="['star-trail', `star-trail--from-${starTrailFromDirection}`]"></div>
      <div v-if="starTrailToDirection" :class="['star-trail', `star-trail--to-${starTrailToDirection}`]"></div>
      <div class="star star--path">
        <div class="star__shape"></div>
        <div class="star__sparkle"></div>
      </div>
    </div>

    <!-- Fairy ring portal flowers -->
    <div v-if="isPortal" class="portal-detail">
      <!-- Fairy ring circle of small flowers -->
      <div class="fairy-ring">
        <div class="ring-flower ring-flower--1"></div>
        <div class="ring-flower ring-flower--2"></div>
        <div class="ring-flower ring-flower--3"></div>
        <div class="ring-flower ring-flower--4"></div>
        <div class="ring-flower ring-flower--5"></div>
        <div class="ring-flower ring-flower--6"></div>
        <div class="ring-flower ring-flower--7"></div>
        <div class="ring-flower ring-flower--8"></div>
      </div>
      <!-- Central larger flower -->
      <div class="portal-flower">
        <div class="flower-petals">
          <div class="petal petal--1"></div>
          <div class="petal petal--2"></div>
          <div class="petal petal--3"></div>
          <div class="petal petal--4"></div>
          <div class="petal petal--5"></div>
        </div>
        <div class="flower-center"></div>
      </div>
      <!-- Magical sparkles -->
      <div class="portal-sparkles">
        <div class="portal-sparkle portal-sparkle--1"></div>
        <div class="portal-sparkle portal-sparkle--2"></div>
        <div class="portal-sparkle portal-sparkle--3"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tile {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  box-shadow: inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  contain: layout style;
}

/* Grass tile */
.tile--grass {
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(140, 200, 120, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.grass-detail {
  position: absolute;
  bottom: 8px;
  display: flex;
  gap: 6px;
}

.grass-blade {
  width: 3px;
  height: 12px;
  background: linear-gradient(to top, #5a9a4a, #8bc475);
  border-radius: 3px 3px 0 0;
  transform-origin: bottom;
}

.grass-blade:nth-child(1) {
  transform: rotate(-15deg);
  height: 10px;
}

.grass-blade:nth-child(2) {
  height: 14px;
}

.grass-blade:nth-child(3) {
  transform: rotate(15deg);
  height: 11px;
}

/* Frosty grass tile (ice world) - lavender-blue frost */
.tile--frosty {
  background:
    radial-gradient(circle at 20% 80%, rgba(220, 225, 245, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(235, 240, 255, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #c8d0e8 0%, #b0b8d0 100%);
}

.tile--frosty .grass-detail {
  opacity: 0.6;
}

.tile--frosty .grass-blade {
  background: linear-gradient(to top, #98a0c0, #c0c8e0);
}

/* Swamp grass tile (dirt/swamp biome) - dense murky greens */
.tile--swamp {
  background:
    radial-gradient(circle at 20% 80%, rgba(60, 90, 50, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(70, 100, 55, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #4a6b3a 0%, #3a5a2a 100%);
}

.tile--swamp .grass-blade {
  background: linear-gradient(to top, #3a5a2a, #5a7a4a);
}

/* Void tile (invisible, empty space) */
.tile--void {
  background: transparent;
  box-shadow: none;
  pointer-events: none;
}

/* Bramble tile - a tangle of thorny canes */
.tile--bramble {
  background:
    radial-gradient(circle at 35% 40%, rgba(70, 50, 72, 0.35) 0%, transparent 55%),
    radial-gradient(circle at 70% 70%, rgba(24, 16, 28, 0.3) 0%, transparent 50%),
    linear-gradient(135deg, #3c2f43 0%, #33283a 55%, #2b2232 100%);
  cursor: not-allowed;
  /* Let canes reach across the gap to neighbouring brambles */
  overflow: visible;
}

.bramble {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.bramble path {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bramble__shadow path {
  stroke: rgba(12, 6, 14, 0.3);
}

.bramble__shadow .bramble__thorn-shapes {
  fill: rgba(12, 6, 14, 0.25);
  stroke: none;
}

.bramble__cane--front {
  stroke: #604158;
}

.bramble__cane--back {
  stroke: #47324a;
}

.bramble .bramble__thorns {
  fill: #94788a;
  stroke: #604158;
  stroke-width: 0.4;
  stroke-linejoin: round;
}

.bramble__highlights path {
  stroke: rgba(176, 136, 160, 0.25);
}

.bramble__berries circle {
  fill: #2c2032;
  stroke: #4a3a50;
  stroke-width: 0.6;
}

/* Stone tile */
.tile--stone {
  background:
    radial-gradient(circle at 30% 30%, rgba(160, 160, 160, 0.3) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(100, 100, 100, 0.2) 0%, transparent 30%),
    linear-gradient(135deg, #9a9590 0%, #7a756f 50%, #6a655f 100%);
}

.stone-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.stone-crack {
  position: absolute;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 1px;
}

.stone-crack--1 {
  width: 18px;
  height: 2px;
  top: 20px;
  left: 12px;
  transform: rotate(-8deg);
}

.stone-crack--2 {
  width: 12px;
  height: 1px;
  bottom: 18px;
  right: 14px;
  transform: rotate(15deg);
}

.pebble {
  position: absolute;
  background: linear-gradient(135deg, #b0aaa4 0%, #8a847e 100%);
  border-radius: 50%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.pebble--1 {
  width: 8px;
  height: 6px;
  bottom: 10px;
  left: 10px;
}

.pebble--2 {
  width: 6px;
  height: 5px;
  bottom: 14px;
  right: 16px;
}

.pebble--3 {
  width: 5px;
  height: 4px;
  top: 12px;
  right: 12px;
}

/* Dirt tile - grass with mud patches */
.tile--dirt {
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(140, 200, 120, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.dirt-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.dirt-clump {
  position: absolute;
  background: linear-gradient(135deg, #8b6b4a 0%, #6d5238 100%);
  border-radius: 50% 45% 50% 45%;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.15);
}

.dirt-clump--1 {
  width: 32px;
  height: 24px;
  top: 4px;
  left: 4px;
  transform: rotate(-5deg);
}

.dirt-clump--2 {
  width: 28px;
  height: 20px;
  bottom: 6px;
  right: 4px;
  transform: rotate(8deg);
}

.dirt-clump--3 {
  width: 20px;
  height: 16px;
  top: 26px;
  right: 18px;
  transform: rotate(-3deg);
}

.dirt-rock {
  position: absolute;
  background: linear-gradient(135deg, #7a5c40 0%, #5a4230 100%);
  border-radius: 40% 50% 45% 55%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.2);
}

.dirt-rock--1 {
  width: 8px;
  height: 6px;
  top: 30px;
  left: 8px;
}

.dirt-rock--2 {
  width: 7px;
  height: 5px;
  bottom: 28px;
  right: 28px;
}

/* Dirt Variant 1: Diagonal stripe - top-right to bottom-left */
.dirt-clump--v1-1 {
  width: 26px;
  height: 20px;
  top: 6px;
  right: 8px;
  transform: rotate(12deg);
}

.dirt-clump--v1-2 {
  width: 30px;
  height: 22px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-8deg);
}

.dirt-clump--v1-3 {
  width: 24px;
  height: 18px;
  bottom: 8px;
  left: 6px;
  transform: rotate(5deg);
}

.dirt-rock--v1-1 {
  width: 7px;
  height: 5px;
  top: 12px;
  left: 14px;
}

.dirt-rock--v1-2 {
  width: 6px;
  height: 5px;
  bottom: 14px;
  right: 16px;
}

/* Dirt Variant 2: Scattered small patches with more rocks */
.dirt-clump--v2-1 {
  width: 22px;
  height: 16px;
  top: 8px;
  left: 50%;
  transform: translateX(-50%) rotate(-6deg);
}

.dirt-clump--v2-2 {
  width: 20px;
  height: 14px;
  bottom: 10px;
  left: 8px;
  transform: rotate(10deg);
}

.dirt-rock--v2-1 {
  width: 9px;
  height: 7px;
  top: 28px;
  left: 10px;
}

.dirt-rock--v2-2 {
  width: 8px;
  height: 6px;
  top: 20px;
  right: 8px;
}

.dirt-rock--v2-3 {
  width: 7px;
  height: 5px;
  bottom: 12px;
  right: 12px;
}

.dirt-rock--v2-4 {
  width: 6px;
  height: 5px;
  bottom: 26px;
  right: 30px;
}

/* Dirt Variant 3: Large central patch */
.dirt-clump--v3-1 {
  width: 36px;
  height: 26px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-3deg);
}

.dirt-clump--v3-2 {
  width: 18px;
  height: 14px;
  top: 6px;
  left: 6px;
  transform: rotate(15deg);
}

.dirt-clump--v3-3 {
  width: 16px;
  height: 12px;
  bottom: 8px;
  right: 10px;
  transform: rotate(-10deg);
}

.dirt-rock--v3-1 {
  width: 8px;
  height: 6px;
  bottom: 10px;
  left: 14px;
}

/* Frosty dirt tile (ice biome) - frosty grass with mud */
.tile--frosty-dirt {
  background:
    radial-gradient(circle at 20% 80%, rgba(220, 225, 245, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(235, 240, 255, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #c8d0e8 0%, #b0b8d0 100%);
}

/* Swamp dirt tile (swamp biome) - swampy grass with mud */
.tile--swamp-dirt {
  background:
    radial-gradient(circle at 20% 80%, rgba(60, 90, 50, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(70, 100, 55, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #4a6b3a 0%, #3a5a2a 100%);
}

/* Grass growing animation when cleaned */
.tile--just-cleaned .grass-detail {
  animation: grassGrow 0.5s ease-out forwards;
}

.tile--just-cleaned .grass-blade {
  animation: bladeGrow 0.4s ease-out forwards;
}

.tile--just-cleaned .grass-blade:nth-child(1) {
  animation-delay: 0.1s;
}

.tile--just-cleaned .grass-blade:nth-child(2) {
  animation-delay: 0.15s;
}

.tile--just-cleaned .grass-blade:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes grassGrow {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes bladeGrow {
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  100% {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* Dirt fading out animation when cleaned */
.dirt-detail--fading {
  animation: dirtFadeOut 0.7s ease-out forwards;
  pointer-events: none;
}

.dirt-detail--fading .dirt-clump,
.dirt-detail--fading .dirt-rock {
  animation: dirtScatter 0.6s ease-out forwards;
}

@keyframes dirtFadeOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes dirtScatter {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.3) translateY(-8px);
    opacity: 0;
  }
}

/* Water tile */
.tile--water {
  background:
    radial-gradient(circle at 30% 30%, rgba(100, 180, 220, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(60, 140, 200, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #4a9fd9 0%, #3580b8 50%, #2a6a9a 100%);
  overflow: hidden;
}

.water-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Background ripples - not rotated, gives water texture */
.water-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.ripple {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  animation: rippleExpand 3s ease-out infinite;
}

.ripple--1 {
  top: 20%;
  left: 25%;
  animation-delay: 0s;
}

.ripple--2 {
  top: 50%;
  left: 60%;
  animation-delay: 1s;
}

.ripple--3 {
  top: 70%;
  left: 30%;
  animation-delay: 2s;
}

@keyframes rippleExpand {
  0% {
    width: 0;
    height: 0;
    opacity: 0.4;
    transform: translate(-50%, -50%);
  }
  100% {
    width: 50px;
    height: 50px;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}

/* Directional flow elements - rotated based on flow direction */
.water-flow {
  position: absolute;
  inset: 0;
  transform: rotate(var(--flow-angle, 0deg));
}

/* Animated flowing waves - more transparent */
.water-waves {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.wave {
  position: absolute;
  left: 10%;
  width: 80%;
  height: 4px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 30%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.12) 70%,
    transparent 100%
  );
  border-radius: 2px;
  animation: waveFlow 1.5s linear infinite;
}

.wave--1 {
  animation-delay: 0s;
}

.wave--2 {
  animation-delay: 0.5s;
}

.wave--3 {
  animation-delay: 1s;
}

@keyframes waveFlow {
  0% {
    top: 5px;
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    top: 55px;
    opacity: 0;
  }
}

/* Flow direction chevrons - pointing in flow direction (down after rotation) */
.flow-chevrons {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.chevron {
  width: 10px;
  height: 10px;
  border-right: 2px solid rgba(30, 80, 140, 0.7);
  border-bottom: 2px solid rgba(30, 80, 140, 0.7);
  transform: rotate(45deg);
}

/* Ice tile */
.tile--ice {
  background:
    radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.6) 0%, transparent 40%),
    radial-gradient(circle at 75% 75%, rgba(200, 230, 255, 0.4) 0%, transparent 35%),
    linear-gradient(135deg, #b8e4f0 0%, #8fcde0 50%, #6ab8d0 100%);
}

.ice-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ice-shine {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, transparent 60%);
  border-radius: 50%;
}

.ice-cracks {
  position: absolute;
  inset: 0;
}

.ice-crack {
  position: absolute;
  background: rgba(150, 200, 220, 0.5);
  border-radius: 1px;
}

.ice-crack--1 {
  width: 20px;
  height: 1px;
  top: 22px;
  left: 8px;
  transform: rotate(-15deg);
}

.ice-crack--2 {
  width: 15px;
  height: 1px;
  bottom: 20px;
  right: 10px;
  transform: rotate(25deg);
}

.ice-crack--3 {
  width: 12px;
  height: 1px;
  top: 38px;
  left: 28px;
  transform: rotate(-5deg);
}

.ice-sparkles {
  position: absolute;
  inset: 0;
}

.sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: sparkle 2s ease-in-out infinite;
}

.sparkle--1 {
  top: 12px;
  right: 14px;
  animation-delay: 0s;
}

.sparkle--2 {
  bottom: 16px;
  left: 18px;
  width: 3px;
  height: 3px;
  animation-delay: 0.7s;
}

.sparkle--3 {
  top: 32px;
  left: 12px;
  width: 2px;
  height: 2px;
  animation-delay: 1.4s;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
}

/* Portal tiles - fairy ring flowers */
.tile--portal {
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.portal-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Fairy ring - circle of small flowers around the edge */
.fairy-ring {
  position: absolute;
  inset: 4px;
}

.ring-flower {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

/* Position ring flowers in a circle */
.ring-flower--1 { top: 0; left: 50%; transform: translateX(-50%); }
.ring-flower--2 { top: 8px; right: 8px; }
.ring-flower--3 { top: 50%; right: 0; transform: translateY(-50%); }
.ring-flower--4 { bottom: 8px; right: 8px; }
.ring-flower--5 { bottom: 0; left: 50%; transform: translateX(-50%); }
.ring-flower--6 { bottom: 8px; left: 8px; }
.ring-flower--7 { top: 50%; left: 0; transform: translateY(-50%); }
.ring-flower--8 { top: 8px; left: 8px; }

/* Central flower */
.portal-flower {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
}

.flower-petals {
  position: absolute;
  inset: 0;
  animation: flowerPulse 3s ease-in-out infinite;
}

.petal {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50% 50% 50% 0;
  top: 50%;
  left: 50%;
  transform-origin: 0% 100%;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.petal--1 { transform: rotate(0deg) translateY(-100%); }
.petal--2 { transform: rotate(72deg) translateY(-100%); }
.petal--3 { transform: rotate(144deg) translateY(-100%); }
.petal--4 { transform: rotate(216deg) translateY(-100%); }
.petal--5 { transform: rotate(288deg) translateY(-100%); }

.flower-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: radial-gradient(circle, #fff9c4 0%, #ffeb3b 100%);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255, 235, 59, 0.6);
}

@keyframes flowerPulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* Portal sparkles */
.portal-sparkles {
  position: absolute;
  inset: 0;
}

.portal-sparkle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: portalSparkle 2s ease-in-out infinite;
}

.portal-sparkle--1 {
  top: 10px;
  right: 12px;
  animation-delay: 0s;
}

.portal-sparkle--2 {
  bottom: 12px;
  left: 10px;
  width: 3px;
  height: 3px;
  animation-delay: 0.7s;
}

.portal-sparkle--3 {
  top: 14px;
  left: 14px;
  width: 2px;
  height: 2px;
  animation-delay: 1.3s;
}

@keyframes portalSparkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(1) translateY(0);
  }
  50% {
    opacity: 1;
    transform: scale(1.5) translateY(-3px);
  }
}

/* Pink portal flowers (roses) */
.tile--portal-pink .ring-flower {
  background: radial-gradient(circle, #ffb6c1 0%, #ff69b4 100%);
}

.tile--portal-pink .petal {
  background: linear-gradient(135deg, #ffb6c1 0%, #ff69b4 50%, #db7093 100%);
}

.tile--portal-pink .portal-sparkle {
  background: #ffb6c1;
  box-shadow: 0 0 4px #ff69b4;
}

/* Blue portal flowers (forget-me-nots) */
.tile--portal-blue .ring-flower {
  background: radial-gradient(circle, #add8e6 0%, #6495ed 100%);
}

.tile--portal-blue .petal {
  background: linear-gradient(135deg, #add8e6 0%, #6495ed 50%, #4169e1 100%);
}

.tile--portal-blue .portal-sparkle {
  background: #add8e6;
  box-shadow: 0 0 4px #6495ed;
}

/* Yellow portal flowers (buttercups) */
.tile--portal-yellow .ring-flower {
  background: radial-gradient(circle, #fff9c4 0%, #ffd700 100%);
}

.tile--portal-yellow .petal {
  background: linear-gradient(135deg, #fff9c4 0%, #ffd700 50%, #ffa500 100%);
}

.tile--portal-yellow .portal-sparkle {
  background: #fff9c4;
  box-shadow: 0 0 4px #ffd700;
}

/* Mushroom tile (planted) - darker grass to show it's been visited */
.tile--mushroom {
  background:
    radial-gradient(circle at 20% 80%, rgba(90, 140, 70, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #5a9a4a 0%, #4a8040 100%);
}

/* Frosty mushroom tile (darker frost where mushroom grew) */
.tile--frosty-mushroom {
  background:
    radial-gradient(circle at 20% 80%, rgba(160, 168, 200, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #a0a8c8 0%, #8890b0 100%);
}

/* Swamp mushroom tile (darker swamp where mushroom grew) */
.tile--swamp-mushroom {
  background:
    radial-gradient(circle at 20% 80%, rgba(40, 60, 35, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #3a5530 0%, #2a4520 100%);
}

.mushroom-container {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 40px;
}

.mushroom-container.mushroom--pop {
  animation: mushroomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.sand-mushroom-container.mushroom--pop {
  animation: sandMushroomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.honey-mushroom-container.mushroom--pop {
  animation: mushroomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes mushroomPop {
  0% {
    transform: scale(0) translateY(20px);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes sandMushroomPop {
  0% {
    transform: translateX(-50%) scale(0) translateY(20px);
    opacity: 0;
  }
  50% {
    transform: translateX(-50%) scale(1.2) translateY(-5px);
    opacity: 1;
  }
  100% {
    transform: translateX(-50%) scale(1) translateY(0);
    opacity: 1;
  }
}

.mushroom {
  position: relative;
  width: 32px;
  height: 36px;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

.mushroom__cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 18px;
  border-radius: 15px 15px 6px 6px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.1);
}

.mushroom__stem {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: 18px;
  background: linear-gradient(180deg, #f5e6d3 0%, #e8d4c0 100%);
  border-radius: 3px 3px 5px 5px;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.05);
}

/* Tan mushroom (default) */
.mushroom--tan .mushroom__cap {
  background: linear-gradient(135deg, #e8a87c 0%, #d4896a 50%, #c47a5c 100%);
}

.mushroom--tan .mushroom__cap::before,
.mushroom--tan .mushroom__cap::after {
  content: "";
  position: absolute;
  background: #fff5eb;
  border-radius: 50%;
}

.mushroom--tan .mushroom__cap::before {
  width: 6px;
  height: 4px;
  top: 5px;
  left: 6px;
}

.mushroom--tan .mushroom__cap::after {
  width: 5px;
  height: 4px;
  top: 8px;
  right: 7px;
}

/* Red mushroom (amanita style) */
.mushroom--red .mushroom__cap {
  background: linear-gradient(135deg, #e85a5a 0%, #d43d3d 50%, #c42a2a 100%);
}

.mushroom__spots {
  position: absolute;
  inset: 0;
}

.mushroom__spots::before,
.mushroom__spots::after {
  content: "";
  position: absolute;
  background: #fff;
  border-radius: 50%;
}

.mushroom__spots::before {
  width: 5px;
  height: 4px;
  top: 4px;
  left: 5px;
}

.mushroom__spots::after {
  width: 4px;
  height: 3px;
  top: 7px;
  right: 8px;
}

/* Purple mushroom */
.mushroom--purple .mushroom__cap {
  background: linear-gradient(135deg, #a67cb8 0%, #8e5ca0 50%, #7a4a8c 100%);
}

.mushroom--purple .mushroom__cap::before,
.mushroom--purple .mushroom__cap::after {
  content: "";
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
}

.mushroom--purple .mushroom__cap::before {
  width: 5px;
  height: 3px;
  top: 5px;
  left: 7px;
}

.mushroom--purple .mushroom__cap::after {
  width: 4px;
  height: 3px;
  top: 9px;
  right: 8px;
}

/* Mushroom clusters */
.mushroom-cluster {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.mushroom--small {
  width: 22px;
  height: 26px;
}

.mushroom--small .mushroom__cap {
  width: 20px;
  height: 12px;
  border-radius: 10px 10px 4px 4px;
}

.mushroom--small .mushroom__stem {
  width: 8px;
  height: 14px;
}

.mushroom--small .mushroom__cap::before {
  width: 4px;
  height: 3px;
  top: 3px;
  left: 4px;
}

.mushroom--small .mushroom__cap::after {
  width: 3px;
  height: 2px;
  top: 5px;
  right: 5px;
}

.mushroom--left {
  transform: rotate(-8deg);
}

.mushroom--right {
  transform: rotate(8deg);
}

/* Triple cluster */
.mushroom-cluster--triple {
  gap: 1px;
}

.mushroom--tiny {
  width: 16px;
  height: 20px;
}

.mushroom--tiny .mushroom__cap {
  width: 14px;
  height: 9px;
  border-radius: 7px 7px 3px 3px;
}

.mushroom--tiny .mushroom__stem {
  width: 6px;
  height: 11px;
}

.mushroom--tiny .mushroom__cap::before,
.mushroom--tiny .mushroom__cap::after {
  display: none;
}

.mushroom--tiny .mushroom__spots::before {
  width: 3px;
  height: 2px;
  top: 2px;
  left: 3px;
}

.mushroom--tiny .mushroom__spots::after {
  width: 2px;
  height: 2px;
  top: 4px;
  right: 4px;
}

.mushroom-cluster--triple .mushroom:nth-child(1) {
  transform: rotate(-12deg);
  margin-bottom: 2px;
}

.mushroom-cluster--triple .mushroom:nth-child(2) {
  margin-bottom: 4px;
}

.mushroom-cluster--triple .mushroom:nth-child(3) {
  transform: rotate(10deg);
}

/* Pond tile - dark calm water */
.tile--pond {
  background:
    radial-gradient(circle at 30% 30%, rgba(60, 100, 120, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(40, 80, 100, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #2a5a70 0%, #1a4a5a 50%, #103a48 100%);
  overflow: hidden;
}

.tile--pond-submerged {
  background:
    radial-gradient(circle at 30% 30%, rgba(40, 80, 100, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(30, 60, 80, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #1a4a58 0%, #103848 50%, #082830 100%);
}

.pond-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Gentle pond ripples - slower than river */
.pond-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.pond-ripple {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: pondRipple 5s ease-out infinite;
}

.pond-ripple--1 {
  top: 30%;
  left: 40%;
  animation-delay: 0s;
}

.pond-ripple--2 {
  top: 60%;
  left: 55%;
  animation-delay: 2.5s;
}

@keyframes pondRipple {
  0% {
    width: 0;
    height: 0;
    opacity: 0.3;
    transform: translate(-50%, -50%);
  }
  100% {
    width: 40px;
    height: 40px;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}

/* Lily-pad - large, nearly edge-to-edge */
.lilypad {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  opacity: 1;
  animation: lilypadFloat 4s ease-in-out infinite;
  /* Transition for resurface - cubic-bezier gives a bounce effect */
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease-out;
}

.lilypad-pad {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 54px;
  height: 50px;
  background: linear-gradient(135deg, #5a9a58 0%, #4a8548 40%, #3a7038 100%);
  border-radius: 50%;
  /* Notch cutout using clip-path - V-shaped notch pointing to center */
  clip-path: polygon(
    50% 5%,
    95% 25%,
    100% 55%,
    95% 85%,
    50% 100%,
    5% 85%,
    0% 55%,
    5% 25%,
    38% 25%,
    50% 45%,
    62% 25%
  );
  box-shadow:
    inset 0 3px 6px rgba(120, 180, 120, 0.4),
    inset 0 -3px 6px rgba(0, 0, 0, 0.25),
    0 3px 6px rgba(0, 0, 0, 0.35);
}

.lilypad-pad::before {
  content: "";
  position: absolute;
  top: 25%;
  left: 25%;
  width: 35%;
  height: 45%;
  background: linear-gradient(135deg, rgba(140, 200, 140, 0.5) 0%, transparent 60%);
  border-radius: 50%;
}

/* Vein lines on the pad */
.lilypad-pad::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80%;
  height: 80%;
  transform: translate(-50%, -50%);
  background:
    linear-gradient(0deg, transparent 48%, rgba(60, 100, 60, 0.2) 49%, rgba(60, 100, 60, 0.2) 51%, transparent 52%),
    linear-gradient(60deg, transparent 48%, rgba(60, 100, 60, 0.15) 49%, rgba(60, 100, 60, 0.15) 51%, transparent 52%),
    linear-gradient(-60deg, transparent 48%, rgba(60, 100, 60, 0.15) 49%, rgba(60, 100, 60, 0.15) 51%, transparent 52%);
  border-radius: 50%;
}

/* Lily-pad flower */
.lilypad-flower {
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 18px;
}

.lilypad-petal {
  position: absolute;
  width: 9px;
  height: 12px;
  background: linear-gradient(135deg, #ffc0cb 0%, #ff9aaa 50%, #ff7088 100%);
  border-radius: 50% 50% 50% 50%;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.1);
}

.lilypad-petal--1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%) rotate(0deg);
}

.lilypad-petal--2 {
  top: 5px;
  left: -1px;
  transform: rotate(-35deg);
}

.lilypad-petal--3 {
  top: 5px;
  right: -1px;
  transform: rotate(35deg);
}

.lilypad-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 7px;
  height: 7px;
  background: radial-gradient(circle, #fffde0 0%, #ffe135 60%, #ffc107 100%);
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(255, 200, 0, 0.5);
}

@keyframes lilypadFloat {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0) rotate(0deg);
  }
  25% {
    transform: translate(-50%, -50%) translateY(-2px) rotate(1deg);
  }
  75% {
    transform: translate(-50%, -50%) translateY(-1px) rotate(-1deg);
  }
}

/* Lily-pad submerged state - sinks down and fades */
.lilypad--submerged {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4) translateY(20px);
  animation: lilypadSink 0.6s ease-in forwards;
}

/* Lily-pad resurfacing state - pops up with bounce */
.lilypad--resurfacing {
  animation: lilypadResurface 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, lilypadFloat 4s ease-in-out 0.7s infinite;
}

@keyframes lilypadSink {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0);
  }
  30% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.95) translateY(3px) rotate(-2deg);
  }
  60% {
    opacity: 0.5;
    transform: translate(-50%, -50%) scale(0.7) translateY(10px) rotate(2deg);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4) translateY(20px);
  }
}

/* Resurface animation when lily-pad comes back */
@keyframes lilypadResurface {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4) translateY(20px);
  }
  40% {
    opacity: 0.6;
    transform: translate(-50%, -50%) scale(0.9) translateY(-2px);
  }
  70% {
    opacity: 0.9;
    transform: translate(-50%, -50%) scale(1.08) translateY(-3px);
  }
  85% {
    transform: translate(-50%, -50%) scale(0.98) translateY(1px);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) translateY(0);
  }
}

/* Bubbles when lily-pad is submerged */
.pond-bubbles {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bubble {
  position: absolute;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: bubbleRise 2s ease-in-out infinite;
}

.bubble--1 {
  width: 6px;
  height: 6px;
  left: 35%;
  animation-delay: 0s;
}

.bubble--2 {
  width: 4px;
  height: 4px;
  left: 50%;
  animation-delay: 0.6s;
}

.bubble--3 {
  width: 5px;
  height: 5px;
  left: 60%;
  animation-delay: 1.2s;
}

@keyframes bubbleRise {
  0% {
    bottom: 20%;
    opacity: 0;
  }
  20% {
    opacity: 0.6;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    bottom: 70%;
    opacity: 0;
  }
}

/* Cooldown indicator */
.cooldown-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Deep pond water tile (impassable) - same water color as lily-pad tiles */
.tile--pond-water {
  background:
    radial-gradient(circle at 30% 30%, rgba(60, 100, 120, 0.4) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(40, 80, 100, 0.3) 0%, transparent 35%),
    linear-gradient(135deg, #2a5a70 0%, #1a4a5a 50%, #103a48 100%);
  overflow: hidden;
  cursor: not-allowed;
}

.pond-water-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Ambient ripples for deep water - slow and visible */
.pond-water-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.pond-water-ripple {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(140, 200, 230, 0.4);
  animation: pondWaterRipple 8s ease-out infinite;
}

.pond-water-ripple--1 {
  top: 30%;
  left: 35%;
  animation-delay: 0s;
}

.pond-water-ripple--2 {
  top: 50%;
  left: 65%;
  animation-delay: 2.5s;
}

.pond-water-ripple--3 {
  top: 65%;
  left: 30%;
  animation-delay: 5s;
}

@keyframes pondWaterRipple {
  0% {
    width: 0;
    height: 0;
    opacity: 0.6;
    transform: translate(-50%, -50%);
  }
  50% {
    opacity: 0.3;
  }
  100% {
    width: 40px;
    height: 40px;
    opacity: 0;
    transform: translate(-50%, -50%);
  }
}

/* Mini decorative lily-pads (not walkable) */
.mini-lilypads {
  position: absolute;
  inset: 0;
}

.mini-lilypad {
  position: absolute;
  width: 12px;
  height: 10px;
  background: radial-gradient(ellipse at 40% 40%, #5a9a60 0%, #3a7a40 60%, #2a6a30 100%);
  border-radius: 50%;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%, 50% 50%);
}

.mini-lilypad--1 {
  top: 20%;
  left: 15%;
  transform: rotate(-15deg);
}

.mini-lilypad--2 {
  top: 55%;
  right: 20%;
  width: 10px;
  height: 8px;
  transform: rotate(25deg);
}

/* Reeds/cattails decoration */
.pond-reeds {
  position: absolute;
  bottom: 4px;
  left: 6px;
  display: flex;
  gap: 4px;
}

.reed {
  width: 3px;
  height: 18px;
  background: linear-gradient(to top, #2a4a40 0%, #4a6a50 50%, #3a5a45 100%);
  border-radius: 2px 2px 0 0;
  position: relative;
}

.reed::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 8px;
  background: linear-gradient(to top, #3a5a45 0%, #5a7a55 100%);
  border-radius: 3px 3px 0 0;
}

.reed--1 {
  height: 20px;
  transform: rotate(-3deg);
}

.reed--2 {
  height: 16px;
  transform: rotate(5deg);
}

/* Frog chilling on the water */
.pond-frog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: frogBob 4s ease-in-out infinite;
}

.frog-body {
  width: 16px;
  height: 12px;
  background: radial-gradient(ellipse at 50% 40%, #6a9a50 0%, #4a8a40 50%, #3a7a30 100%);
  border-radius: 50% 50% 40% 40%;
  position: relative;
}

.frog-eye {
  position: absolute;
  width: 5px;
  height: 5px;
  background: radial-gradient(circle at 40% 40%, #2a2a2a 30%, #1a1a1a 100%);
  border-radius: 50%;
  top: -2px;
}

.frog-eye--left {
  left: 1px;
}

.frog-eye--right {
  right: 1px;
}

.frog-eye::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  top: 1px;
  left: 1px;
}

.frog-leg {
  position: absolute;
  width: 6px;
  height: 3px;
  background: #4a8a40;
  border-radius: 0 50% 50% 0;
  top: 8px;
}

.frog-leg--left {
  left: -4px;
  transform: rotate(20deg);
}

.frog-leg--right {
  right: -4px;
  transform: rotate(-20deg) scaleX(-1);
}

@keyframes frogBob {
  0%, 100% {
    transform: translate(-50%, -50%) translateY(0);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-2px);
  }
}

/* Night biome grass - dark teal-green tones (distinct from blue water) */
.tile--night {
  background:
    radial-gradient(circle at 20% 80%, rgba(50, 90, 70, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(60, 100, 80, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #2a5848 0%, #1e4838 100%);
}

.tile--night .grass-blade {
  background: linear-gradient(to top, #1e4838, #3a6858);
}

/* Night biome mushroom - darker green tones */
.tile--night-mushroom {
  background:
    radial-gradient(circle at 20% 80%, rgba(40, 70, 50, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #1e4838 0%, #153828 100%);
}

/* Night biome dirt - darker earthy tones */
.tile--night-dirt {
  background:
    radial-gradient(circle at 20% 80%, rgba(50, 90, 70, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(60, 100, 80, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #2a5848 0%, #1e4838 100%);
}

.tile--night-dirt .dirt-clump {
  /* More contrast: earthy brown that stands out against dark teal grass */
  background: linear-gradient(135deg, #5a4a38 0%, #4a3a28 100%);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25);
}

.tile--night-dirt .dirt-rock {
  background: linear-gradient(135deg, #4a3a28 0%, #3a2a18 100%);
}

/* Night biome portal - dark teal-green grass */
.tile--night.tile--portal {
  background:
    radial-gradient(circle at 50% 50%, rgba(100, 180, 150, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(50, 90, 70, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #2a5848 0%, #1e4838 100%);
}

.tile--night .portal-sparkle {
  background: #5ae8a8;
  box-shadow: 0 0 6px #3ac888, 0 0 12px rgba(90, 232, 168, 0.5);
}

.tile--night .ring-flower {
  filter: brightness(0.8) saturate(0.9);
}

.tile--night .flower-center {
  background: radial-gradient(circle, #a8ffd8 0%, #5ae8a8 100%);
  box-shadow: 0 0 8px rgba(90, 232, 168, 0.8);
}

/* Frosty biome portal - icy blue-gray grass */
.tile--frosty.tile--portal {
  background:
    radial-gradient(circle at 50% 50%, rgba(220, 235, 255, 0.4) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(180, 200, 230, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #c8d0e8 0%, #b0b8d0 100%);
}

.tile--frosty .portal-sparkle {
  background: #e8f4ff;
  box-shadow: 0 0 6px #b0d0f0, 0 0 12px rgba(200, 220, 255, 0.6);
}

.tile--frosty .ring-flower {
  filter: brightness(1.1) saturate(0.8);
}

.tile--frosty .flower-center {
  background: radial-gradient(circle, #e8f4ff 0%, #a0d0f0 100%);
  box-shadow: 0 0 8px rgba(160, 208, 240, 0.8);
}

/* Swamp biome portal - murky dark green grass */
.tile--swamp.tile--portal {
  background:
    radial-gradient(circle at 50% 50%, rgba(100, 140, 80, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, rgba(60, 90, 50, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #4a6b3a 0%, #3a5a2a 100%);
}

.tile--swamp .portal-sparkle {
  background: #8bc878;
  box-shadow: 0 0 6px #6aa858, 0 0 12px rgba(106, 168, 88, 0.5);
}

/* Adjacent tile highlight */
.tile--reachable {
  cursor: pointer;
  box-shadow:
    0 0 0 3px rgba(255, 223, 186, 0.7),
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    inset 0 0 20px rgba(255, 240, 200, 0.3);
}

.tile--reachable:hover {
  transform: scale(1.05);
  box-shadow:
    0 0 0 4px rgba(255, 223, 186, 0.95),
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    inset 0 0 25px rgba(255, 240, 200, 0.5);
}

/* Shimmer hint animation for remaining tiles */
.tile--shimmer {
  animation: tileShimmer 2.5s ease-in-out infinite;
}

@keyframes tileShimmer {
  0%, 100% {
    filter: brightness(1);
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.1),
      0 0 0 0 rgba(255, 255, 200, 0);
  }
  50% {
    filter: brightness(1.2);
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.1),
      0 0 12px 2px rgba(255, 255, 200, 0.5);
  }
}

/* Hint highlight for suggested moves */
.tile--hinted {
  animation: hintGlow 1.2s ease-in-out infinite;
  z-index: 5;
}

@keyframes hintGlow {
  0%, 100% {
    box-shadow:
      0 0 0 4px rgba(255, 220, 100, 0.7),
      0 0 12px 4px rgba(255, 200, 50, 0.4),
      inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 5px rgba(255, 230, 120, 0.9),
      0 0 20px 8px rgba(255, 210, 80, 0.6),
      inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  }
}

/* Hint highlight on flooded low sand - needs stronger glow to show through water */
.tile--hinted.tile--low-sand-flooded {
  animation: hintGlowFlooded 1.2s ease-in-out infinite;
}

@keyframes hintGlowFlooded {
  0%, 100% {
    box-shadow:
      0 0 0 5px rgba(255, 220, 100, 0.9),
      0 0 16px 6px rgba(255, 200, 50, 0.6),
      inset 0 0 12px rgba(255, 220, 100, 0.4);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(255, 230, 120, 1),
      0 0 24px 10px rgba(255, 210, 80, 0.8),
      inset 0 0 16px rgba(255, 230, 120, 0.5);
  }
}

/* Stuck highlight - red glow for tiles around player when no path */
.tile--stuck-highlight {
  animation: stuckGlow 0.8s ease-in-out infinite;
  z-index: 5;
}

@keyframes stuckGlow {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(255, 80, 60, 0.6),
      0 0 10px 3px rgba(255, 60, 40, 0.4),
      inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow:
      0 0 0 4px rgba(255, 100, 80, 0.8),
      0 0 16px 6px rgba(255, 80, 60, 0.5),
      inset 0 -4px 0 rgba(0, 0, 0, 0.1);
  }
}

/* ========== LOW SAND TILES (Tidal Zone) ========== */
.tile--low-sand {
  background: linear-gradient(
    135deg,
    #e8dcc0 0%,
    #d4c4a0 40%,
    #c8b890 100%
  );
  box-shadow:
    inset 0 -4px 0 rgba(0, 0, 0, 0.1),
    inset 0 0 15px rgba(160, 140, 100, 0.3);
}

.tile--low-sand-flooded {
  animation: tidalFlood 0.6s ease-out forwards;
}

@keyframes tidalFlood {
  0% {
    background: linear-gradient(135deg, #e8dcc0 0%, #d4c4a0 40%, #c8b890 100%);
  }
  100% {
    background: linear-gradient(
      135deg,
      #7ab5d4 0%,
      #5a9fc8 40%,
      #4a8fb8 100%
    );
  }
}

.tile--low-sand-receding {
  animation: tidalRecede 0.6s ease-out forwards;
}

@keyframes tidalRecede {
  0% {
    background: linear-gradient(
      135deg,
      #7ab5d4 0%,
      #5a9fc8 40%,
      #4a8fb8 100%
    );
  }
  100% {
    background: linear-gradient(135deg, #e8dcc0 0%, #d4c4a0 40%, #c8b890 100%);
  }
}

.low-sand-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Sand texture with ripple patterns */
.sand-texture {
  position: absolute;
  inset: 0;
}

.sand-ripple {
  position: absolute;
  width: 100%;
  height: 3px;
  background: rgba(180, 160, 120, 0.3);
  border-radius: 50%;
}

.sand-ripple--1 {
  top: 30%;
  transform: scaleX(0.7);
}

.sand-ripple--2 {
  top: 60%;
  transform: scaleX(0.5);
  left: 20%;
}

/* Seashells decoration */
.seashells {
  position: absolute;
  inset: 0;
}

.shell {
  position: absolute;
  width: 8px;
  height: 6px;
  background: radial-gradient(ellipse at 30% 30%, #f5efe5 0%, #d4c8b8 50%, #b8a898 100%);
  border-radius: 50% 50% 0 0;
  transform: rotate(-15deg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.shell::after {
  content: "";
  position: absolute;
  top: 40%;
  left: 10%;
  right: 10%;
  height: 1px;
  background: rgba(160, 140, 120, 0.4);
  box-shadow:
    0 2px 0 rgba(160, 140, 120, 0.3),
    0 4px 0 rgba(160, 140, 120, 0.2);
}

.shell--1 {
  bottom: 15%;
  left: 20%;
}

.shell--2 {
  bottom: 25%;
  right: 25%;
  transform: rotate(30deg);
  width: 6px;
  height: 5px;
}

/* Flood water overlay */
.flood-water {
  position: absolute;
  inset: 0;
  background: rgba(90, 160, 200, 0.6);
  animation: floodWaterPulse 1.5s ease-in-out infinite;
}

@keyframes floodWaterPulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
}

.flood-ripple {
  position: absolute;
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: floodRippleExpand 2s ease-out infinite;
}

.flood-ripple--1 {
  top: 30%;
  left: 25%;
  animation-delay: 0s;
}

.flood-ripple--2 {
  top: 50%;
  left: 55%;
  animation-delay: 0.7s;
}

@keyframes floodRippleExpand {
  0% {
    transform: scale(0.3);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* Tide countdown indicator */
.tide-countdown {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  background: rgba(70, 130, 180, 0.85);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Warning state countdown - pulsing */
.tide-countdown--warning {
  animation: countdownPulse 0.6s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(70, 130, 180, 0.6);
}

@keyframes countdownPulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 8px rgba(70, 130, 180, 0.6);
  }
  50% {
    transform: scale(1.15);
    box-shadow: 0 0 12px rgba(70, 130, 180, 0.8);
  }
}

/* ========== LOW SAND WARNING STATE ========== */
.tile--low-sand-warning {
  animation: sandWarningPulse 1s ease-in-out infinite;
}

@keyframes sandWarningPulse {
  0%, 100% {
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.1),
      inset 0 0 15px rgba(160, 140, 100, 0.3);
  }
  50% {
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.1),
      inset 0 0 20px rgba(90, 150, 200, 0.4),
      0 0 8px rgba(90, 150, 200, 0.3);
  }
}

/* Rising water at edges */
.tide-warning {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.rising-water {
  position: absolute;
  inset: -2px;
  border: 3px solid transparent;
  border-radius: 8px;
  background: linear-gradient(
    to top,
    rgba(90, 160, 210, 0.5) 0%,
    rgba(90, 160, 210, 0.2) 40%,
    transparent 70%
  );
  animation: waterRise 1.2s ease-in-out infinite;
}

@keyframes waterRise {
  0%, 100% {
    opacity: 0.6;
    transform: translateY(4px);
  }
  50% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Warning foam bubbles */
.warning-foam {
  position: absolute;
  inset: 0;
}

.foam-bubble {
  position: absolute;
  width: 8px;
  height: 8px;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.5) 40%,
    rgba(200, 230, 255, 0.3) 70%,
    transparent 100%
  );
  border-radius: 50%;
  animation: foamFloat 1.5s ease-in-out infinite;
}

.foam-bubble--1 {
  bottom: 8px;
  left: 10%;
  animation-delay: 0s;
}

.foam-bubble--2 {
  bottom: 6px;
  right: 15%;
  width: 6px;
  height: 6px;
  animation-delay: 0.3s;
}

.foam-bubble--3 {
  bottom: 10px;
  left: 40%;
  width: 5px;
  height: 5px;
  animation-delay: 0.6s;
}

.foam-bubble--4 {
  bottom: 5px;
  right: 35%;
  width: 7px;
  height: 7px;
  animation-delay: 0.9s;
}

@keyframes foamFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-6px) scale(1.1);
    opacity: 1;
  }
}

/* ========== SEA TILES (Always impassable) ========== */
.tile--sea {
  background: linear-gradient(
    135deg,
    #4a9fd9 0%,
    #3580b8 50%,
    #2a70a8 100%
  );
  box-shadow:
    inset 0 -4px 0 rgba(0, 0, 0, 0.15),
    inset 0 0 20px rgba(30, 80, 140, 0.4);
}

.tile--sea-high-tide {
  animation: seaHighTide 0.6s ease-out forwards;
}

@keyframes seaHighTide {
  0% {
    background: linear-gradient(135deg, #4a90c8 0%, #3a80b8 50%, #2a70a8 100%);
  }
  100% {
    background: linear-gradient(
      135deg,
      #3580b8 0%,
      #2060a0 50%,
      #1a5090 100%
    );
    box-shadow:
      inset 0 -6px 0 rgba(0, 0, 0, 0.2),
      inset 0 0 25px rgba(20, 60, 120, 0.5);
  }
}

.tile--sea-receding {
  animation: seaRecede 0.6s ease-out forwards;
}

@keyframes seaRecede {
  0% {
    background: linear-gradient(
      135deg,
      #3580b8 0%,
      #2060a0 50%,
      #1a5090 100%
    );
    box-shadow:
      inset 0 -6px 0 rgba(0, 0, 0, 0.2),
      inset 0 0 25px rgba(20, 60, 120, 0.5);
  }
  100% {
    background: linear-gradient(135deg, #4a90c8 0%, #3a80b8 50%, #2a70a8 100%);
  }
}

.sea-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Sea waves */
.sea-waves {
  position: absolute;
  inset: 0;
}

.sea-wave {
  position: absolute;
  width: 120%;
  height: 8px;
  left: -10%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 25%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.3) 75%,
    transparent 100%
  );
  border-radius: 50%;
  animation: seaWaveMove 3s ease-in-out infinite;
}

.sea-wave--1 {
  top: 20%;
  animation-delay: 0s;
}

.sea-wave--2 {
  top: 45%;
  animation-delay: 1s;
  width: 100%;
  left: 0;
}

.sea-wave--3 {
  top: 70%;
  animation-delay: 2s;
  width: 110%;
  left: -5%;
}

@keyframes seaWaveMove {
  0%, 100% {
    transform: translateX(-5%) scaleY(1);
    opacity: 0.6;
  }
  50% {
    transform: translateX(5%) scaleY(1.2);
    opacity: 0.9;
  }
}

/* Sea foam at edges */
.sea-foam {
  position: absolute;
  inset: 0;
}

.foam-patch {
  position: absolute;
  width: 12px;
  height: 8px;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.3) 60%,
    transparent 100%
  );
  border-radius: 50%;
  animation: foamBubble 2.5s ease-in-out infinite;
}

.foam-patch--1 {
  top: 15%;
  right: 15%;
  animation-delay: 0s;
}

.foam-patch--2 {
  bottom: 20%;
  left: 20%;
  animation-delay: 1.2s;
  width: 10px;
  height: 6px;
}

@keyframes foamBubble {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
}

/* ========== BOUNCE PAD TILES ========== */
.tile--bounce-pad {
  background: linear-gradient(
    135deg,
    #e85a5a 0%,
    #d42a2a 50%,
    #b81a1a 100%
  );
  border-radius: 6px;
  box-shadow:
    inset 0 3px 0 rgba(255, 255, 255, 0.25),
    inset 0 -4px 0 rgba(0, 0, 0, 0.25),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.bounce-pad-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* White dots on red mushroom cap */
.bounce-dot {
  position: absolute;
  background: radial-gradient(
    ellipse at 30% 30%,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 250, 245, 0.85) 50%,
    rgba(240, 235, 230, 0.7) 100%
  );
  border-radius: 50%;
  box-shadow:
    inset 0 -1px 2px rgba(0, 0, 0, 0.1),
    0 1px 2px rgba(0, 0, 0, 0.15);
}

.bounce-dot--1 {
  width: 14px;
  height: 12px;
  top: 15%;
  left: 20%;
}

.bounce-dot--2 {
  width: 10px;
  height: 9px;
  top: 20%;
  right: 18%;
}

.bounce-dot--3 {
  width: 12px;
  height: 10px;
  bottom: 25%;
  left: 35%;
}

.bounce-dot--4 {
  width: 8px;
  height: 7px;
  bottom: 18%;
  right: 25%;
}

.bounce-dot--5 {
  width: 6px;
  height: 5px;
  top: 45%;
  left: 55%;
}

/* Subtle pulse animation for bounce pads */
.tile--bounce-pad {
  animation: bouncePadPulse 2s ease-in-out infinite;
}

@keyframes bouncePadPulse {
  0%, 100% {
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.25),
      inset 0 -4px 0 rgba(0, 0, 0, 0.25),
      0 2px 4px rgba(0, 0, 0, 0.3);
  }
  50% {
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.35),
      inset 0 -4px 0 rgba(0, 0, 0, 0.2),
      0 3px 8px rgba(200, 50, 50, 0.4);
  }
}

/* Player on bounce pad - ready to bounce */
.tile--bounce-pad.tile--has-player {
  animation: bouncePadActive 0.4s ease-in-out infinite;
}

@keyframes bouncePadActive {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.3),
      inset 0 -4px 0 rgba(0, 0, 0, 0.25),
      0 2px 6px rgba(200, 50, 50, 0.5);
  }
  50% {
    transform: scale(1.02);
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.4),
      inset 0 -4px 0 rgba(0, 0, 0, 0.2),
      0 4px 12px rgba(200, 50, 50, 0.6);
  }
}

/* Hint glow on bounce pad - combines bounce pad pulse with golden hint glow */
.tile--bounce-pad.tile--hinted {
  animation:
    bouncePadPulseHinted 2s ease-in-out infinite,
    hintGlowOverlay 1.2s ease-in-out infinite;
  z-index: 5;
}

/* Bounce pad pulse that works with hint glow overlay */
@keyframes bouncePadPulseHinted {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

/* Hint glow as a separate overlay effect using filter */
@keyframes hintGlowOverlay {
  0%, 100% {
    box-shadow:
      0 0 0 4px rgba(255, 220, 100, 0.7),
      0 0 12px 4px rgba(255, 200, 50, 0.4),
      inset 0 3px 0 rgba(255, 255, 255, 0.25),
      inset 0 -4px 0 rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow:
      0 0 0 5px rgba(255, 230, 120, 0.9),
      0 0 20px 8px rgba(255, 210, 80, 0.6),
      inset 0 3px 0 rgba(255, 255, 255, 0.35),
      inset 0 -4px 0 rgba(0, 0, 0, 0.2);
  }
}

/* Bounce pad activation - squish and spring effect */
.bounce-pad--activated {
  animation: bouncePadSquish 0.4s ease-out forwards;
}

@keyframes bouncePadSquish {
  0% {
    transform: scale(1, 1);
  }
  15% {
    transform: scale(1.15, 0.7);
  }
  30% {
    transform: scale(0.9, 1.1);
  }
  45% {
    transform: scale(1.05, 0.95);
  }
  60% {
    transform: scale(0.98, 1.02);
  }
  100% {
    transform: scale(1, 1);
  }
}

/* Ripple effect expanding outward */
.bounce-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid rgba(255, 200, 200, 0.8);
  transform: translate(-50%, -50%) scale(0);
  animation: bounceRippleExpand 0.5s ease-out forwards;
  pointer-events: none;
}

.bounce-ripple--delayed {
  animation-delay: 0.1s;
  border-color: rgba(255, 150, 150, 0.6);
}

@keyframes bounceRippleExpand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

/* ========== HONEY TILES ========== */
/* Honey tiles use EXACT same grass colors as the biomes */
.tile--honey {
  /* Default grass base - matches .tile--grass exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(140, 200, 120, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

/* Honey mushroom uses MUSHROOM colors (darker than grass) */
.tile--honey-mushroom {
  /* Default mushroom base - matches .tile--mushroom exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(90, 140, 70, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #5a9a4a 0%, #4a8040 100%);
}

/* Biome variants for honey tiles - match exact biome grass colors */
.tile--honey-frosty {
  /* Matches .tile--frosty exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(220, 225, 245, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(235, 240, 255, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #c8d0e8 0%, #b0b8d0 100%);
}

.tile--honey-night {
  /* Matches .tile--night exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(50, 90, 70, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(60, 100, 80, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #2a5848 0%, #1e4838 100%);
}

.tile--honey-beach {
  /* Beach uses default grass colors */
  background:
    radial-gradient(circle at 20% 80%, rgba(120, 180, 100, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(140, 200, 120, 0.3) 0%, transparent 25%),
    linear-gradient(135deg, #7cb668 0%, #5a9a4a 100%);
}

.tile--honey-swamp {
  /* Matches .tile--swamp exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(60, 90, 50, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(70, 100, 55, 0.4) 0%, transparent 25%),
    linear-gradient(135deg, #4a6b3a 0%, #3a5a2a 100%);
}

.tile--honey-autumn {
  /* Matches .tile--autumn exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(198, 140, 82, 0.4) 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, rgba(212, 149, 80, 0.3) 0%, transparent 25%),
    linear-gradient(145deg, #c68c52 0%, #b57342 100%);
}

/* Biome variants for honey-mushroom tiles - match exact biome MUSHROOM colors */
.tile--honey-mushroom-frosty {
  /* Matches .tile--frosty-mushroom exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(160, 168, 200, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #a0a8c8 0%, #8890b0 100%);
}

.tile--honey-mushroom-night {
  /* Matches .tile--night-mushroom exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(40, 70, 50, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #1e4838 0%, #153828 100%);
}

.tile--honey-mushroom-beach {
  /* Beach mushroom uses default mushroom colors */
  background:
    radial-gradient(circle at 20% 80%, rgba(90, 140, 70, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #5a9a4a 0%, #4a8040 100%);
}

.tile--honey-mushroom-swamp {
  /* Matches .tile--swamp-mushroom exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(40, 60, 35, 0.4) 0%, transparent 30%),
    linear-gradient(135deg, #3a5530 0%, #2a4520 100%);
}

.tile--honey-mushroom-autumn {
  /* Matches .tile--autumn-mushroom exactly */
  background:
    radial-gradient(circle at 20% 80%, rgba(180, 106, 56, 0.4) 0%, transparent 30%),
    linear-gradient(145deg, #b46a38 0%, #955328 100%);
}

.honey-detail,
.honey-mushroom-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.honey-splatter {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  height: 90%;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.15));
}

.honey-splatter--under {
  /* Slightly smaller when under mushroom */
  width: 85%;
  height: 85%;
}

.honey-path {
  /* Flat appearance - no heavy shadows */
}

.honey-shine {
  position: absolute;
  top: 25%;
  left: 30%;
  width: 20%;
  height: 12%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 75%
  );
  border-radius: 50%;
  transform: rotate(-15deg);
  pointer-events: none;
}

/* Honey mushroom container */
.honey-mushroom-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Honey mushroom variants - golden/amber themed with variety */

/* Shared glossy honey coating effect for all honey mushroom caps */
.honey-mushroom-container .mushroom__cap {
  box-shadow:
    inset 0 -3px 6px rgba(180, 120, 20, 0.4),
    inset 0 2px 4px rgba(255, 230, 150, 0.5),
    0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Variant 0: Tan -> Light golden honey */
.honey-mushroom-container .mushroom--tan .mushroom__cap {
  background: linear-gradient(135deg, #f5d070 0%, #e8b840 50%, #d0a030 100%);
}

.honey-mushroom-container .mushroom--tan .mushroom__cap::before,
.honey-mushroom-container .mushroom--tan .mushroom__cap::after {
  background: rgba(255, 245, 200, 0.7);
}

/* Variant 1: Red -> Deep amber/orange */
.honey-mushroom-container .mushroom--red .mushroom__cap {
  background: linear-gradient(135deg, #e89050 0%, #d06820 50%, #b85010 100%);
}

.honey-mushroom-container .mushroom--red .mushroom__spots::before,
.honey-mushroom-container .mushroom--red .mushroom__spots::after {
  background: #fff0c0 !important;
}

/* Variant 2: Double tan -> Warm caramel */
.honey-mushroom-container .mushroom-cluster .mushroom--tan .mushroom__cap {
  background: linear-gradient(135deg, #e0a850 0%, #c88830 50%, #a87020 100%);
}

.honey-mushroom-container .mushroom-cluster .mushroom--tan .mushroom__cap::before,
.honey-mushroom-container .mushroom-cluster .mushroom--tan .mushroom__cap::after {
  background: rgba(255, 235, 180, 0.65);
}

/* Variant 3: Purple -> Rich butterscotch */
.honey-mushroom-container .mushroom--purple .mushroom__cap {
  background: linear-gradient(135deg, #d8a040 0%, #c08020 50%, #986810 100%);
}

.honey-mushroom-container .mushroom--purple .mushroom__cap::before,
.honey-mushroom-container .mushroom--purple .mushroom__cap::after {
  background: rgba(255, 230, 170, 0.6);
}

/* Variant 4: Triple -> Mixed honey tones */
.honey-mushroom-container .mushroom-cluster--triple .mushroom:nth-child(1) .mushroom__cap {
  background: linear-gradient(135deg, #f0c860 0%, #d8a830 50%, #c09020 100%);
}

.honey-mushroom-container .mushroom-cluster--triple .mushroom:nth-child(2) .mushroom__cap {
  background: linear-gradient(135deg, #e8a048 0%, #d08028 50%, #b06818 100%);
}

.honey-mushroom-container .mushroom-cluster--triple .mushroom:nth-child(3) .mushroom__cap {
  background: linear-gradient(135deg, #ddb850 0%, #c09830 50%, #a08020 100%);
}

/* Warm honey-tinted stems for all variants */
.honey-mushroom-container .mushroom__stem {
  background: linear-gradient(
    to bottom,
    #f5e8d0 0%,
    #e8d8c0 50%,
    #d8c8b0 100%
  ) !important;
}

/* ========== SAND MUSHROOM TILES (Mushroom planted on tidal sand) ========== */
.tile--sand-mushroom {
  /* Darker sandy tone to show mushroom impact */
  background: linear-gradient(
    135deg,
    #c8b890 0%,
    #b8a880 40%,
    #a89870 100%
  );
  box-shadow:
    inset 0 -4px 0 rgba(0, 0, 0, 0.12),
    inset 0 0 15px rgba(140, 120, 80, 0.4);
}

.tile--sand-mushroom-flooded {
  animation: sandMushroomFlood 0.6s ease-out forwards;
}

@keyframes sandMushroomFlood {
  0% {
    background: linear-gradient(135deg, #c8b890 0%, #b8a880 40%, #a89870 100%);
  }
  100% {
    background: linear-gradient(
      135deg,
      #6aa0c4 0%,
      #4a8fb8 40%,
      #3a7fa8 100%
    );
  }
}

.tile--sand-mushroom-receding {
  animation: sandMushroomRecede 0.6s ease-out forwards;
}

@keyframes sandMushroomRecede {
  0% {
    background: linear-gradient(
      135deg,
      #6aa0c4 0%,
      #4a8fb8 40%,
      #3a7fa8 100%
    );
  }
  100% {
    background: linear-gradient(135deg, #c8b890 0%, #b8a880 40%, #a89870 100%);
  }
}

.tile--sand-mushroom-warning {
  animation: sandMushroomWarningPulse 1s ease-in-out infinite;
}

@keyframes sandMushroomWarningPulse {
  0%, 100% {
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.12),
      inset 0 0 15px rgba(140, 120, 80, 0.4);
  }
  50% {
    box-shadow:
      inset 0 -4px 0 rgba(0, 0, 0, 0.12),
      inset 0 0 20px rgba(90, 150, 200, 0.4),
      0 0 8px rgba(90, 150, 200, 0.3);
  }
}

.sand-mushroom-detail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Sandy texture (darker) */
.sand-mushroom-texture {
  position: absolute;
  inset: 0;
}

/* Sand mushroom container - positioned at bottom center */
.sand-mushroom-container {
  position: absolute;
  bottom: 16%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

/* Base sand mushroom styles */
.sand-mushroom {
  position: relative;
}

.sand-mushroom__cap {
  width: 28px;
  height: 16px;
  border-radius: 50% 50% 20% 20%;
  position: relative;
  box-shadow:
    inset 0 -4px 6px rgba(80, 50, 20, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.2);
}

.sand-mushroom__stem {
  width: 10px;
  height: 12px;
  background: linear-gradient(
    90deg,
    #e8d8c8 0%,
    #f5ece0 50%,
    #e0d0c0 100%
  );
  margin: 0 auto;
  border-radius: 3px 3px 4px 4px;
  box-shadow:
    inset 2px 0 3px rgba(0, 0, 0, 0.1),
    inset -2px 0 3px rgba(0, 0, 0, 0.1);
}

/* Tan beach mushroom (variant 0) */
.sand-mushroom--tan .sand-mushroom__cap {
  background: radial-gradient(
    ellipse at 50% 80%,
    #c9a86c 0%,
    #b08850 50%,
    #8a6830 100%
  );
}

.sand-mushroom--tan .sand-mushroom__cap::before {
  content: "";
  position: absolute;
  width: 6px;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  top: 30%;
  left: 25%;
}

.sand-mushroom--tan .sand-mushroom__cap::after {
  content: "";
  position: absolute;
  width: 4px;
  height: 3px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  top: 45%;
  right: 30%;
}

/* Coral/pink beach mushroom (variant 1) */
.sand-mushroom--coral .sand-mushroom__cap {
  background: radial-gradient(
    ellipse at 50% 80%,
    #e8a090 0%,
    #d08070 50%,
    #b06050 100%
  );
}

.sand-mushroom--coral .sand-mushroom__spots {
  position: absolute;
  inset: 0;
}

.sand-mushroom--coral .sand-mushroom__spots::before {
  content: "";
  position: absolute;
  width: 5px;
  height: 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  top: 25%;
  left: 20%;
}

.sand-mushroom--coral .sand-mushroom__spots::after {
  content: "";
  position: absolute;
  width: 4px;
  height: 3px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  top: 40%;
  right: 25%;
}

/* Seafoam/teal beach mushroom (variant 3) */
.sand-mushroom--seafoam .sand-mushroom__cap {
  background: radial-gradient(
    ellipse at 50% 80%,
    #7bc4b8 0%,
    #5aa898 50%,
    #3a8878 100%
  );
}

.sand-mushroom--seafoam .sand-mushroom__cap::before {
  content: "";
  position: absolute;
  width: 5px;
  height: 4px;
  background: rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  top: 28%;
  left: 22%;
}

.sand-mushroom--seafoam .sand-mushroom__cap::after {
  content: "";
  position: absolute;
  width: 4px;
  height: 3px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  top: 42%;
  right: 28%;
}

/* Small mushroom variant (for clusters) */
.sand-mushroom--small .sand-mushroom__cap {
  width: 18px;
  height: 11px;
}

.sand-mushroom--small .sand-mushroom__stem {
  width: 7px;
  height: 9px;
}

/* Tiny mushroom variant (for triple clusters) */
.sand-mushroom--tiny .sand-mushroom__cap {
  width: 12px;
  height: 8px;
}

.sand-mushroom--tiny .sand-mushroom__stem {
  width: 5px;
  height: 7px;
}

/* Double mushroom cluster (variant 2) */
.sand-mushroom-cluster {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.sand-mushroom--left {
  transform: rotate(-8deg);
}

.sand-mushroom--right {
  transform: rotate(8deg);
}

/* Triple mushroom cluster (variant 4) */
.sand-mushroom-cluster--triple {
  gap: 1px;
}

.sand-mushroom-cluster--triple .sand-mushroom:nth-child(1) {
  transform: rotate(-12deg) translateY(2px);
}

.sand-mushroom-cluster--triple .sand-mushroom:nth-child(2) {
  transform: translateY(-2px);
}

.sand-mushroom-cluster--triple .sand-mushroom:nth-child(3) {
  transform: rotate(12deg) translateY(2px);
}

/* Mobile performance optimizations - reduce animation complexity */
@media (max-width: 768px) {
  /* Disable water ripple animations on mobile */
  .ripple {
    animation: none;
    opacity: 0.2;
    width: 20px;
    height: 20px;
  }

  /* Simplify water wave animations */
  .wave {
    animation-duration: 2s;
  }

  /* Reduce sparkle animations */
  .sparkle,
  .portal-sparkle {
    animation-duration: 3s;
  }

  /* Disable hover transform on mobile (tap targets don't need hover) */
  .tile--reachable:hover {
    transform: none;
  }
}

/* Respect user's reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .tile {
    transition: none;
  }

  .ripple,
  .wave,
  .sparkle,
  .portal-sparkle,
  .tile--shimmer,
  .mushroom--pop,
  .flower-petals {
    animation: none;
  }
}

/* ======================================
   ACORN TILE STYLES
   ====================================== */

.tile--acorn {
  background: linear-gradient(145deg, #8fbc8f, #6b8e6b);
}

.acorn-tile {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.acorn {
  position: relative;
  width: 24px;
  height: 30px;
  z-index: 2;
  animation: acorn-bob 2s ease-in-out infinite;
}

@keyframes acorn-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.acorn__cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 12px;
  background: linear-gradient(145deg, #8B4513, #654321);
  border-radius: 50% 50% 0 0;
  z-index: 1;
}

.acorn__cap::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 6px;
  background: #654321;
  border-radius: 2px 2px 0 0;
}

/* Crosshatch pattern on acorn cap */
.acorn__cap::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  right: 3px;
  bottom: 0;
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.15) 2px,
      rgba(0,0,0,0.15) 3px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.15) 2px,
      rgba(0,0,0,0.15) 3px
    );
  border-radius: 50% 50% 0 0;
}

.acorn__body {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 20px;
  background: linear-gradient(145deg, #D2691E, #A0522D);
  border-radius: 50% 50% 45% 45%;
}

.acorn__shine {
  position: absolute;
  top: 14px;
  left: 7px;
  width: 5px;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: rotate(-20deg);
}

/* ======================================
   SQUIRREL TILE STYLES
   ====================================== */

.tile--squirrel {
  background: linear-gradient(145deg, #8fbc8f, #6b8e6b);
}

.tile--squirrel-ready {
  background: linear-gradient(145deg, #9fcc9f, #7b9e7b);
}

.squirrel-tile {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.squirrel {
  position: relative;
  width: 32px;
  height: 32px;
  z-index: 2;
}

.squirrel__body {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 16px;
  background: linear-gradient(145deg, #D2691E, #A0522D);
  border-radius: 50% 50% 40% 40%;
}

.squirrel__head {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-40%);
  width: 14px;
  height: 12px;
  background: linear-gradient(145deg, #CD853F, #A0522D);
  border-radius: 50%;
}

.squirrel__ear {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-20%);
  width: 6px;
  height: 8px;
  background: #D2691E;
  border-radius: 50% 50% 30% 30%;
}

.squirrel__tail {
  position: absolute;
  bottom: 8px;
  right: 0;
  width: 16px;
  height: 20px;
  background: linear-gradient(145deg, #CD853F, #A0522D);
  border-radius: 80% 80% 20% 80%;
  transform: rotate(-30deg);
  transform-origin: bottom left;
}

.squirrel__eye {
  position: absolute;
  top: 5px;
  left: 50%;
  transform: translateX(-20%);
  width: 4px;
  height: 4px;
  background: #2d2d2d;
  border-radius: 50%;
}

.squirrel__eye::after {
  content: '';
  position: absolute;
  top: 0;
  left: 1px;
  width: 1px;
  height: 1px;
  background: white;
  border-radius: 50%;
}

/* Acorn requirement counter on squirrel */
.squirrel-requirement {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(0, 0, 0, 0.7);
  padding: 3px 6px;
  border-radius: 10px;
  z-index: 3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.requirement-count {
  color: #FFD700;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.requirement-acorn {
  opacity: 0.9;
  width: 12px;
  height: 12px;
}

/* Squirrel ready to be fed animation */
.tile--squirrel-ready .squirrel {
  animation: squirrel-excited 0.5s ease-in-out infinite;
}

@keyframes squirrel-excited {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-2px) rotate(-3deg); }
  75% { transform: translateY(-2px) rotate(3deg); }
}

.tile--squirrel-ready .squirrel-requirement {
  background: rgba(0, 128, 0, 0.7);
}

/* ======================================
   AUTUMN BIOME STYLES
   ====================================== */

.tile--autumn {
  background: linear-gradient(145deg, #c68c52, #b57342);
}

.tile--autumn .grass-blade {
  background: linear-gradient(to top, #c68c52 0%, #d49550 50%, #e5b572 100%);
}

.tile--autumn-mushroom {
  background: linear-gradient(145deg, #b46a38, #955328);
}

/* Autumn mushroom cap colors - warm amber-reds */
.tile--autumn-mushroom .mushroom--tan .mushroom__cap {
  background: linear-gradient(145deg, #cc5f28, #a94d1e);
}

.tile--autumn-mushroom .mushroom--red .mushroom__cap {
  background: linear-gradient(145deg, #be2535, #901018);
}

.tile--autumn-mushroom .mushroom--purple .mushroom__cap {
  background: linear-gradient(145deg, #823c2a, #5f2c1a);
}

.tile--autumn-dirt {
  /* Autumn grass showing through dirt - matches autumn grass */
  background: linear-gradient(145deg, #c68c52, #b57342);
}

.tile--autumn-dirt .dirt-clump {
  background: linear-gradient(145deg, #82523a, #62402e);
}

.tile--autumn-dirt .dirt-rock {
  background: linear-gradient(135deg, #92624a, #724a38);
}

/* Autumn acorn tile - warm amber tones */
.tile--autumn.tile--acorn {
  background: linear-gradient(145deg, #c68c52, #b57342);
}

.tile--autumn .acorn-tile .grass-blade {
  background: linear-gradient(to top, #c68c52 0%, #d49550 50%, #e5b572 100%);
}

/* Autumn squirrel tile */
.tile--autumn.tile--squirrel,
.tile--autumn.tile--squirrel-ready {
  background: linear-gradient(145deg, #c68c52, #b57342);
}

.tile--autumn .squirrel-tile .grass-blade {
  background: linear-gradient(to top, #c68c52 0%, #d49550 50%, #e5b572 100%);
}

/* ======================================
   STAR PATH TILE STYLES
   ====================================== */

.tile--base-star {
  background: linear-gradient(145deg, #8fbc8f, #6b8e6b);
}

.tile--star-path {
  background: linear-gradient(145deg, #8fbc8f, #6b8e6b);
}

.star-tile {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Base star - larger yellow 5-point star with magical glow */
.star--base {
  position: relative;
  width: 36px;
  height: 36px;
  z-index: 2;
}

.star--base .star__shape {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #FFD700 0%, #FFC000 50%, #FFB000 100%);
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.8));
}

.star--base .star__glow {
  position: absolute;
  inset: -8px;
  background: radial-gradient(
    circle,
    rgba(255, 215, 0, 0.6) 0%,
    rgba(255, 200, 0, 0.3) 40%,
    transparent 70%
  );
  animation: star-pulse 2s ease-in-out infinite;
}

@keyframes star-pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

/* Star path - smaller yellow stars with gentle sparkle */
.star--path {
  position: relative;
  width: 24px;
  height: 24px;
  z-index: 2;
}

.star--path .star__shape {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #FFE44D 0%, #FFD700 50%, #FFC000 100%);
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.6));
}

.star--path .star__sparkle {
  position: absolute;
  inset: -4px;
  background: radial-gradient(
    circle,
    rgba(255, 255, 200, 0.5) 0%,
    rgba(255, 230, 100, 0.2) 40%,
    transparent 60%
  );
  animation: star-sparkle 3s ease-in-out infinite;
}

@keyframes star-sparkle {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1) rotate(0deg);
  }
  33% {
    opacity: 0.8;
    transform: scale(1.1) rotate(5deg);
  }
  66% {
    opacity: 0.6;
    transform: scale(0.95) rotate(-5deg);
  }
}

/* Star trail connector - shows path from previous star in chain */
.star-trail {
  position: absolute;
  background: linear-gradient(
    90deg,
    rgba(255, 215, 0, 0.6) 0%,
    rgba(255, 230, 100, 0.4) 50%,
    transparent 100%
  );
  z-index: 1;
  pointer-events: none;
}

/* Trail coming from the left (previous star is to the left) */
.star-trail--from-left {
  left: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

/* Trail coming from the right */
.star-trail--from-right {
  right: -3px;
  top: 50%;
  transform: translateY(-50%) rotate(180deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

/* Trail coming from above */
.star-trail--from-up {
  top: -3px;
  left: 50%;
  transform: translateX(-50%) rotate(90deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

/* Trail coming from below */
.star-trail--from-down {
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%) rotate(-90deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

/* Trail going TO a direction (outgoing) - same visual but positioned on opposite side */
.star-trail--to-left {
  left: -3px;
  top: 50%;
  transform: translateY(-50%) rotate(180deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

.star-trail--to-right {
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

.star-trail--to-up {
  top: -3px;
  left: 50%;
  transform: translateX(-50%) rotate(-90deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

.star-trail--to-down {
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%) rotate(90deg);
  width: 35px;
  height: 8px;
  border-radius: 4px 0 0 4px;
}

/* ======================================
   STARLIT BIOME STYLES
   ====================================== */

.tile--starlit {
  background: linear-gradient(145deg, #98c8a8, #7ab090);
}

.tile--starlit .grass-blade {
  background: linear-gradient(to top, #7ab090 0%, #98c8a8 50%, #b0dcc0 100%);
}

.tile--starlit-mushroom {
  background: linear-gradient(145deg, #7aa888, #5c9070);
}

/* Starlit mushroom cap colors - soft magical hues */
.tile--starlit-mushroom .mushroom--tan .mushroom__cap {
  background: linear-gradient(145deg, #c4b8a0, #a09080);
}

.tile--starlit-mushroom .mushroom--red .mushroom__cap {
  background: linear-gradient(145deg, #c87088, #a05068);
}

.tile--starlit-mushroom .mushroom--purple .mushroom__cap {
  background: linear-gradient(145deg, #9080b0, #706090);
}

/* Starlit dirt - uses same background as starlit grass */
.tile--starlit-dirt {
  background: linear-gradient(145deg, #98c8a8, #7ab090);
}

.tile--starlit-dirt .dirt-clump,
.tile--starlit-dirt .dirt-clump--1,
.tile--starlit-dirt .dirt-clump--2,
.tile--starlit-dirt .dirt-clump--3 {
  background: radial-gradient(ellipse, #5a8068 0%, #4a7058 70%, transparent 100%);
}

.tile--starlit-dirt .dirt-rock,
.tile--starlit-dirt .dirt-rock--1,
.tile--starlit-dirt .dirt-rock--2 {
  background: radial-gradient(ellipse, #7a9888 30%, #6a8878 100%);
}

/* Starlit dirt uses normal starlit grass blade colors */
.tile--starlit-dirt .grass-blade {
  background: linear-gradient(to top, #7ab090 0%, #98c8a8 50%, #b0dcc0 100%);
}

/* Starlit star tiles */
.tile--starlit.tile--base-star {
  background: linear-gradient(145deg, #98c8a8, #7ab090);
}

.tile--starlit.tile--star-path {
  background: linear-gradient(145deg, #98c8a8, #7ab090);
}

.tile--starlit .star-tile .grass-blade {
  background: linear-gradient(to top, #7ab090 0%, #98c8a8 50%, #b0dcc0 100%);
}

/* ==========================================================================
   STAR MUSHROOM - Unique glowing mushroom for starlit biome
   ========================================================================== */
.tile--star-mushroom {
  background: linear-gradient(145deg, #7aa888, #5c9070);
}

.star-mushroom-container {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.star-mushroom-container.mushroom--pop {
  animation: mushroomPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* Ground star imprint beneath mushrooms */
.star-mushroom__ground-star {
  position: absolute;
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
  width: 65%;
  height: 35%;
  background: linear-gradient(145deg, rgba(255, 220, 100, 0.7), rgba(230, 190, 60, 0.5));
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  z-index: 0;
  opacity: 0.8;
  filter: blur(0.5px);
}

.star-mushroom {
  position: relative;
  width: 60%;
  height: 70%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  z-index: 2;
}

/* Magical glow effect behind the mushroom */
.star-mushroom__glow {
  position: absolute;
  width: 120%;
  height: 120%;
  top: -10%;
  left: -10%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 223, 128, 0.4) 0%, rgba(255, 200, 100, 0.2) 40%, transparent 70%);
  animation: star-mushroom-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

/* Mushroom cap base styles */
.star-mushroom__cap {
  width: 100%;
  height: 55%;
  border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%;
  position: relative;
  box-shadow:
    inset 2px 2px 4px rgba(255, 255, 255, 0.4),
    inset -2px -2px 4px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

/* Star shape on the cap */
.star-mushroom__star {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  height: 50%;
  clip-path: polygon(
    50% 0%,
    61% 35%,
    98% 35%,
    68% 57%,
    79% 91%,
    50% 70%,
    21% 91%,
    32% 57%,
    2% 35%,
    39% 35%
  );
  animation: star-twinkle 1.5s ease-in-out infinite;
}

/* Mushroom stem */
.star-mushroom__stem {
  width: 35%;
  height: 45%;
  background: linear-gradient(90deg, #e8d8a8 0%, #f5ead0 50%, #e8d8a8 100%);
  border-radius: 20% 20% 30% 30% / 10% 10% 40% 40%;
  position: relative;
  top: -5%;
  box-shadow:
    inset 1px 0 2px rgba(255, 255, 255, 0.3),
    inset -1px 0 2px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

/* ==========================================================================
   STAR MUSHROOM COLOR VARIANTS
   ========================================================================== */

/* Gold variant (default) */
.star-mushroom--gold .star-mushroom__cap {
  background: linear-gradient(145deg, #f0d878, #d4b850);
}
.star-mushroom--gold .star-mushroom__star {
  background: linear-gradient(145deg, #fff8e0, #ffe090);
}
.star-mushroom--gold .star-mushroom__glow {
  background: radial-gradient(ellipse, rgba(255, 223, 128, 0.4) 0%, rgba(255, 200, 100, 0.2) 40%, transparent 70%);
}

/* Silver/Blue variant */
.star-mushroom--silver .star-mushroom__cap {
  background: linear-gradient(145deg, #b8c8d8, #98a8b8);
}
.star-mushroom--silver .star-mushroom__star {
  background: linear-gradient(145deg, #e8f0ff, #c0d0e8);
}
.star-mushroom--silver .star-mushroom__glow {
  background: radial-gradient(ellipse, rgba(180, 200, 230, 0.4) 0%, rgba(150, 180, 220, 0.2) 40%, transparent 70%);
}
.star-mushroom--silver .star-mushroom__stem {
  background: linear-gradient(90deg, #c8d0d8 0%, #e0e8f0 50%, #c8d0d8 100%);
}

/* Rose/Pink variant */
.star-mushroom--rose .star-mushroom__cap {
  background: linear-gradient(145deg, #e8a0b8, #d080a0);
}
.star-mushroom--rose .star-mushroom__star {
  background: linear-gradient(145deg, #ffe0e8, #ffc0d0);
}
.star-mushroom--rose .star-mushroom__glow {
  background: radial-gradient(ellipse, rgba(255, 180, 200, 0.4) 0%, rgba(230, 150, 180, 0.2) 40%, transparent 70%);
}
.star-mushroom--rose .star-mushroom__stem {
  background: linear-gradient(90deg, #e8d0d8 0%, #f5e8ec 50%, #e8d0d8 100%);
}

/* ==========================================================================
   STAR MUSHROOM SIZE VARIANTS
   ========================================================================== */

/* Cluster container */
.star-mushroom-cluster {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2;
}

/* Small variant (for double clusters) */
.star-mushroom--small {
  width: 45%;
  height: 55%;
}

.star-mushroom--small .star-mushroom__cap {
  height: 50%;
}

.star-mushroom--small .star-mushroom__stem {
  width: 30%;
  height: 40%;
}

.star-mushroom--small .star-mushroom__glow {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.star-mushroom--small .star-mushroom__star {
  width: 45%;
  height: 45%;
}

/* Positioning for double cluster */
.star-mushroom--left {
  position: absolute;
  left: 5%;
  bottom: 15%;
}

.star-mushroom--right {
  position: absolute;
  right: 5%;
  bottom: 5%;
}

/* Triple cluster */
.star-mushroom-cluster--triple {
  gap: 2%;
  padding-bottom: 10%;
}

/* Tiny variant (for triple clusters) */
.star-mushroom--tiny {
  width: 30%;
  height: 45%;
  position: relative;
}

.star-mushroom--tiny .star-mushroom__cap {
  height: 45%;
}

.star-mushroom--tiny .star-mushroom__stem {
  width: 28%;
  height: 35%;
}

.star-mushroom--tiny .star-mushroom__glow {
  width: 90%;
  height: 90%;
  top: 5%;
  left: 5%;
}

.star-mushroom--tiny .star-mushroom__star {
  width: 40%;
  height: 40%;
}

.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(1) {
  transform: translateY(10%);
}

.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(2) {
  transform: translateY(-5%);
}

.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(3) {
  transform: translateY(15%);
}

/* ==========================================================================
   STAR MUSHROOM ANIMATIONS
   ========================================================================== */

/* Pulsing glow animation */
@keyframes star-mushroom-pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

/* Star twinkle animation */
@keyframes star-twinkle {
  0%, 100% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* Stagger animations for clusters */
.star-mushroom--left .star-mushroom__glow {
  animation-delay: 0s;
}
.star-mushroom--right .star-mushroom__glow {
  animation-delay: 0.5s;
}
.star-mushroom--left .star-mushroom__star {
  animation-delay: 0.2s;
}
.star-mushroom--right .star-mushroom__star {
  animation-delay: 0.7s;
}

.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(1) .star-mushroom__glow {
  animation-delay: 0s;
}
.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(2) .star-mushroom__glow {
  animation-delay: 0.4s;
}
.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(3) .star-mushroom__glow {
  animation-delay: 0.8s;
}
.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(1) .star-mushroom__star {
  animation-delay: 0.1s;
}
.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(2) .star-mushroom__star {
  animation-delay: 0.5s;
}
.star-mushroom-cluster--triple .star-mushroom--tiny:nth-child(3) .star-mushroom__star {
  animation-delay: 0.9s;
}
</style>
