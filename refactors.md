# Mushroom Path - Refactoring Opportunities

A comprehensive code review identified the following opportunities to reduce duplicated code and improve maintainability.

---

## 1. Duplicated Tile Type Handler Chains

### Issue
Multiple locations have nearly identical if/else-if chains for checking tile types.

**File**: `src/composables/useGame.ts`

**Locations**:
- Lines 213-237: `canLandOn` function
- Lines 270-295: `isObstacle` function
- Lines 852-871: `simulateMoveForPathfinding` - tile conversion logic
- Lines 1572-1617: `plantMushroom` function

Each has similar patterns like:
```typescript
if (tile.type === TileType.GRASS) { ... }
else if (tile.type === TileType.DIRT) { ... }
else if (tile.type === TileType.LOW_SAND) { ... }
else if (tile.type === TileType.HONEY) { ... }
else if (tile.type === TileType.POND) { ... }
```

### Suggested Refactoring
Create tile conversion/handler maps:

```typescript
// Tile conversions when leaving a tile
const TILE_LEAVE_CONVERSIONS: Partial<Record<TileType, TileType>> = {
  [TileType.GRASS]: TileType.MUSHROOM,
  [TileType.DIRT]: TileType.GRASS,
  [TileType.LOW_SAND]: TileType.SAND_MUSHROOM,
  [TileType.HONEY]: TileType.HONEY_MUSHROOM,
};

function convertTileOnLeave(tileType: TileType): TileType | null {
  return TILE_LEAVE_CONVERSIONS[tileType] ?? null;
}
```

**Impact**: ~100 LOC reduction, eliminates 4 duplicate if-chains

---

## 2. Repeated Landing Sound Logic

### Issue
Nearly identical landing sound code blocks repeated 4+ times.

**File**: `src/composables/useGame.ts`

**Locations**:
- Lines 1483-1493 (main animation handler)
- Lines 1875-1885 (ice slide chain)
- Lines 1965-1976 (moveToPosition keyboard)
- Lines 2205-2214 (moveToPosition click)

Each has identical pattern:
```typescript
if (finalTile?.type === TileType.GRASS) {
    playLand();
} else if (finalTile?.type === TileType.DIRT) {
    playRandomDirt();
} else if (finalTile?.type === TileType.STONE) {
    playStone();
} // ... etc
```

### Suggested Refactoring
```typescript
const LANDING_SOUNDS: Partial<Record<TileType, () => void>> = {
  [TileType.GRASS]: playLand,
  [TileType.DIRT]: playRandomDirt,
  [TileType.STONE]: playStone,
  [TileType.POND]: playWater,
  [TileType.LOW_SAND]: playSandLand,
  [TileType.HONEY]: playHoneyLand,
};

function playLandingSound(tile: Tile | undefined): void {
  const soundFn = tile?.type ? LANDING_SOUNDS[tile.type] : undefined;
  soundFn?.();
}
```

**Impact**: ~60 LOC reduction

---

## 3. Duplicated Slide Animation Logic

### Issue
Nearly identical setInterval/animation loop patterns for water and ice slides.

**File**: `src/composables/useGame.ts`

**Locations**:
- Lines 1752-1766 (water slide - keyboard)
- Lines 1785-1819 (ice slide - keyboard)
- Lines 1805-1819 (water slide after ice - keyboard)
- Lines 2082-2096 (water slide - click)
- Lines 2115-2149 (ice slide - click)
- Lines 2135-2149 (water slide after ice - click)

All follow the same pattern:
```typescript
let pathIndex = 1;
const slideInterval = setInterval(() => {
    const nextPos = path[pathIndex];
    if (pathIndex < path.length && nextPos) {
        playerPosition.value = nextPos;
        pathIndex++;
    } else {
        clearInterval(slideInterval);
        isSliding.value = false;
        slidePath.value = [];
        // completion logic
    }
}, 150);
```

### Suggested Refactoring
```typescript
function animateAlongPath(
  path: Position[],
  intervalMs: number,
  onComplete: () => void
): () => void {
  let pathIndex = 1;
  slidePath.value = path;
  isSliding.value = true;

  const interval = setInterval(() => {
    const nextPos = path[pathIndex];
    if (pathIndex < path.length && nextPos) {
      playerPosition.value = nextPos;
      pathIndex++;
    } else {
      clearInterval(interval);
      isSliding.value = false;
      slidePath.value = [];
      onComplete();
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
```

**Impact**: ~100 LOC reduction, consolidates 6 animation loops

---

## 4. Duplicated Portal Teleport Animation

### Issue
Same nested setTimeout structure repeated in multiple places for portal teleportation.

**File**: `src/composables/useGame.ts`

**Locations**:
- Lines 1820-1861 (ice slide chaining to portal)
- Lines 1900-1950 (bounce pad chaining to portal)
- Lines 2150-2191 (click move chaining to portal)

All share identical structure with nested timeouts for shrink -> poof -> move -> poof -> grow phases.

### Suggested Refactoring
```typescript
function performPortalTeleport(
  fromPos: Position,
  toPos: Position,
  onComplete: () => void
): void {
  isTeleporting.value = true;
  teleportPhase.value = "shrinking";

  setTimeout(() => {
    poofPositions.value = [fromPos];
    playTeleportPoof();
    playerPosition.value = toPos;

    setTimeout(() => {
      poofPositions.value = [toPos];
      playTeleportPoof();
      teleportPhase.value = "growing";

      setTimeout(() => {
        isTeleporting.value = false;
        teleportPhase.value = null;
        poofPositions.value = [];
        onComplete();
      }, ANIMATION_TIMINGS.GROW_PHASE);
    }, ANIMATION_TIMINGS.POOF_PAUSE);
  }, ANIMATION_TIMINGS.SHRINK_PHASE);
}
```

**Impact**: ~80 LOC reduction

---

## 5. Magic Numbers Throughout

### Issue
Hardcoded timing values and game constants scattered throughout the code.

**File**: `src/composables/useGame.ts`

**Examples**:
- `1600` ms - acorn popup timeout
- `5` - TIDE_PERIOD (also duplicated in levelGenerator.ts)
- `400`, `200`, `800`, `150`, `350` ms - various animation delays
- `5000` - MAX_PATHFINDING_ITERATIONS
- `3` - MAX_BOUNCE_DISTANCE
- `4000` - IDLE_HINT_THRESHOLD
- `8` - TILES_HINT_THRESHOLD

### Suggested Refactoring
Create a constants file `src/constants/game.ts`:

```typescript
export const ANIMATION_TIMINGS = {
  HOP_COMPLETION: 200,
  SLIDE_STEP: 150,
  SHRINK_PHASE: 200,
  POOF_PAUSE: 350,
  GROW_PHASE: 200,
  MUSHROOM_POPUP: 400,
  DIRT_CLEANUP: 800,
  ACORN_POPUP: 1600,
} as const;

export const GAME_CONSTANTS = {
  TIDE_PERIOD: 5,
  MAX_PATHFINDING_ITERATIONS: 5000,
  MAX_BOUNCE_DISTANCE: 3,
  IDLE_HINT_THRESHOLD_MS: 4000,
  TILES_HINT_THRESHOLD: 8,
} as const;
```

**Impact**: Improved maintainability, single source of truth for timing

---

## 6. Shared Position Utilities

### Issue
Nearly identical utility functions exist in both main files.

**Files**: `src/composables/useGame.ts` and `src/utils/levelGenerator.ts`

Both define:
- `getDirectionDelta(direction)` - identical switch statements
- Position key utilities (`posKey`, `parseKey`) - only in levelGenerator but useful elsewhere

### Suggested Refactoring
Create `src/utils/positionUtils.ts`:

```typescript
import type { Position, Direction, FlowDirection } from "@/types/game";

export const DIRECTION_DELTAS: Record<Direction | FlowDirection, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function getDirectionDelta(dir: Direction | FlowDirection): Position {
  return DIRECTION_DELTAS[dir];
}

export function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function posKeyFromPosition(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function parseKey(key: string): Position {
  const [x, y] = key.split(",").map(Number);
  return { x: x ?? 0, y: y ?? 0 };
}
```

**Impact**: ~40 LOC reduction, eliminates duplication across files

---

## 7. Large GameTile Class Bindings

### Issue
Massive computed property with 70+ individual class bindings, many following repetitive patterns.

**File**: `src/components/GameTile.vue` (Lines 68-224)

Example of repeated pattern:
```typescript
"tile--low-sand": props.tile.type === TileType.LOW_SAND,
"tile--low-sand-flooded": props.tile.type === TileType.LOW_SAND && isLowSandFlooded.value,
"tile--low-sand-receding": props.tile.type === TileType.LOW_SAND && isTideReceding.value,
"tile--low-sand-warning": props.tile.type === TileType.LOW_SAND && props.movesUntilFlood === 1,
```

Similar patterns exist for HONEY, SAND_MUSHROOM, HONEY_MUSHROOM, etc.

### Suggested Refactoring
Create helper functions:

```typescript
function tideAwareClasses(
  baseClass: string,
  isActive: boolean,
  isFlooded: boolean,
  isReceding: boolean,
  isWarning: boolean
): Record<string, boolean> {
  return {
    [baseClass]: isActive,
    [`${baseClass}-flooded`]: isActive && isFlooded,
    [`${baseClass}-receding`]: isActive && isReceding,
    [`${baseClass}-warning`]: isActive && isWarning,
  };
}

// Usage in computed:
...tideAwareClasses(
  "tile--low-sand",
  props.tile.type === TileType.LOW_SAND,
  isLowSandFlooded.value,
  isTideReceding.value,
  props.movesUntilFlood === 1
),
```

**Impact**: ~40 LOC reduction, improved readability

---

## 8. Duplicate Movement Validation

### Issue
Nearly identical move validation logic in `tryMove` and `canReachByClick`.

**File**: `src/composables/useGame.ts`

Both check:
1. If adjacent tile is landable
2. If on honey (can't jump)
3. If adjacent is obstacle, check jump position

### Suggested Refactoring
```typescript
function getReachablePosition(
  from: Position,
  direction: Direction
): Position | null {
  const delta = getDirectionDelta(direction);
  const adjacent = { x: from.x + delta.x, y: from.y + delta.y };

  if (canLandOn(adjacent)) {
    return adjacent;
  }

  const currentTile = getTile(from);
  if (currentTile?.type === TileType.HONEY) {
    return null; // Can't jump from honey
  }

  if (isObstacle(adjacent)) {
    const jumpPos = { x: from.x + delta.x * 2, y: from.y + delta.y * 2 };
    if (canLandOn(jumpPos)) {
      return jumpPos;
    }
  }

  return null;
}
```

**Impact**: ~50 LOC reduction

---

## 9. Grid Iteration Utility

### Issue
Same nested loops for iterating grid appear 20+ times across files.

**Files**: `src/composables/useGame.ts`, `src/utils/levelGenerator.ts`

Repeated pattern:
```typescript
for (let y = 0; y < grid.length; y++) {
  const row = grid[y];
  if (!row) continue;
  for (let x = 0; x < row.length; x++) {
    // do something with row[x], x, y
  }
}
```

### Suggested Refactoring
Add to `src/utils/gridUtils.ts`:

```typescript
export function forEachCell<T>(
  grid: T[][],
  callback: (value: T, x: number, y: number) => void
): void {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell !== undefined) {
        callback(cell, x, y);
      }
    }
  }
}

export function findInGrid<T>(
  grid: T[][],
  predicate: (value: T, x: number, y: number) => boolean
): { value: T; x: number; y: number } | null {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell !== undefined && predicate(cell, x, y)) {
        return { value: cell, x, y };
      }
    }
  }
  return null;
}

export function countInGrid<T>(
  grid: T[][],
  predicate: (value: T) => boolean
): number {
  let count = 0;
  forEachCell(grid, (value) => {
    if (predicate(value)) count++;
  });
  return count;
}
```

**Impact**: ~30 LOC reduction, cleaner code

---

## 10. Bounce Pad Landing Check Duplication

### Issue
Three nearly identical `canLandOn` helper functions defined inside different bounce pad handlers.

**File**: `src/composables/useGame.ts`

**Locations**:
- Lines 956-968: `canLandOnForBounce` (ice->bounce chain)
- Lines 1029-1041: `canLandOnForPathfinding` (direct bounce pathfinding)
- Lines 1244-1257: `canLandOnTile` (gameplay bounce)

All check the same blocked tile types with minor variations for tide phase.

### Suggested Refactoring
```typescript
function canBounceOntoTile(
  tileType: TileType | undefined,
  currentTidePhase: number
): boolean {
  if (!tileType) return false;

  const BLOCKED_TILES: TileType[] = [
    TileType.VOID,
    TileType.BRAMBLE,
    TileType.MUSHROOM,
    TileType.SAND_MUSHROOM,
    TileType.HONEY_MUSHROOM,
    TileType.POND_WATER,
    TileType.SEA,
  ];

  if (BLOCKED_TILES.includes(tileType)) return false;
  if (tileType === TileType.LOW_SAND && currentTidePhase === 0) return false;

  return true;
}
```

**Impact**: ~40 LOC reduction

---

## Summary

| Priority | Issue | Estimated LOC Reduction |
|----------|-------|------------------------|
| High | Tile type handler maps | ~100 |
| High | Landing sound function | ~60 |
| High | Shared position utilities | ~40 |
| Medium | Animation timing constants | ~50 |
| Medium | Portal teleport function | ~80 |
| Medium | Slide animation helper | ~100 |
| Medium | Movement validation | ~50 |
| Medium | Bounce landing check | ~40 |
| Low | GameTile class helpers | ~40 |
| Low | Grid iteration utilities | ~30 |

**Total Potential Reduction**: ~590 lines of code

### Recommended Implementation Order

1. **Create utility files first** (positionUtils.ts, gridUtils.ts, constants.ts) - low risk, immediate benefit
2. **Extract landing sound helper** - simple, high-frequency duplication
3. **Create tile conversion maps** - centralizes game rules
4. **Consolidate animation functions** - moderate complexity, significant benefit
5. **Refactor GameTile class bindings** - optional, mainly for readability
