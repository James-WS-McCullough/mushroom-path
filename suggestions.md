# Mushroom Path - Feature Suggestions

## Game Analysis

### What You've Built

A charming **Hamiltonian path puzzle game** where players plant mushrooms by walking on every grass tile exactly once. The game has surprisingly deep mechanics:

**Core Loop**: Move → plant mushroom → solve the path → progress to next level

**Current Features**:
| Category | Details |
|----------|---------|
| **Tiles** | 11 types: Grass, Mushroom, Bramble, Void, Stone, Water, Dirt, Ice, 3 Portal colors |
| **World Elements** | Rivers (auto-slide), Dirt (double-visit), Ice (slide physics), Fairy Rings (teleport) |
| **Progression** | Infinite worlds of 8 levels each, 3 biomes (Forest, Ice, Swamp) |
| **Audio** | 9 BGM tracks, 30+ SFX, 15 voice lines |
| **Polish** | Undo system, idle hints, camera panning, biome theming, reduced motion support |

---

## Feature Suggestions

### High Impact / Medium Effort

1. **Star Rating System**
   - Track moves used vs optimal solution length (you already compute the path!)
   - 3 stars = Optimal, 2 stars = +2 moves, 1 star = Completed
   - Adds replayability and a "perfect run" goal

2. **Daily Challenge Mode**
   - Seeded random level that's the same for all players each day
   - Leaderboard potential (local or online)
   - "Come back tomorrow" retention hook

3. **Level Select / World Map**
   - Visual map showing completed worlds
   - Replay favorite levels
   - See star ratings per level

4. **New Tile: Crumbling Stone**
   - Stone that breaks after stepping on it once
   - Creates one-way paths and timing puzzles
   - Fits existing mechanics naturally

---

### Quick Wins

5. **Statistics Screen**
   - Levels completed, mushrooms planted, worlds explored
   - Total play time, favorite biome
   - Longest win streak

6. **Confetti/Particles on World Complete**
   - Celebrate finishing all 8 levels in a world
   - More fanfare for milestone moments

7. **Hint System**
   - Show next 1-2 optimal moves (costs a star?)
   - Help stuck players without skipping entirely

8. **Shake Animation on Invalid Move**
   - Visual feedback when trying to walk into walls
   - Small polish that feels satisfying

---

### Ambitious Additions

9. **New World Element: Wind**
   - Arrows on tiles push player in a direction after moving
   - Can chain with ice for complex momentum puzzles

10. **New World Element: Seasons/Time**
    - Some tiles only passable in certain "phases"
    - Toggle with a button or automatic cycling
    - Adds timing puzzle layer

11. **Boss Levels**
    - Larger, hand-crafted puzzles at world 5, 10, 15...
    - Unique visuals and music
    - Major milestone feeling

12. **Level Editor + Sharing**
    - Let players create and share levels
    - Import/export as codes or URLs
    - Community content extends game life

13. **Story Mode / Characters**
    - Brief narrative between worlds
    - Meet other mushroom friends
    - Give context to the journey

---

### Visual Polish

14. **Weather Effects**
    - Rain in swamp biome
    - Snow particles in ice biome
    - Fireflies in forest biome

15. **Character Customization**
    - Unlock different mushroom hats/colors
    - Reward for completing worlds

16. **Animated World Transitions**
    - Instead of fade to black, show character walking to next area
    - More immersive progression

---

## Top 3 Recommendations

Based on effort vs. impact:

1. **Star Rating System** - Adds depth without new content, leverages existing path data
2. **Statistics Screen** - Low effort, makes players feel accomplished
3. **Crumbling Stone Tile** - New puzzle element that fits naturally, adds variety

---

## Character Ideas

A cast of friendly faces the player could meet throughout their mushroom-planting journey.

### Mushroom Folk

| Character | Species Inspiration | Personality | Role Ideas |
|-----------|---------------------|-------------|------------|
| **Chanty** | Chanterelle | Warm, nurturing grandmother type. Speaks in old proverbs. Always worried you haven't eaten enough. | Tutorial guide, gives encouragement after tough levels |
| **Mort** | Morel | Eccentric inventor/scientist. Talks too fast, always has a new theory about "spore dynamics." | Explains new mechanics, gives hints |
| **Shii** | Shiitake | Calm, zen-like monk. Speaks in riddles and koans. Meditates on stones. | Appears in peaceful moments, philosophical dialogue |
| **Russula** | Russula (red cap) | Hotheaded and competitive. Thinks she's the best gardener. Secretly insecure. | Rival character, challenges player to beat her times |
| **Pip & Pop** | Puffballs | Twin siblings who finish each other's sentences. Mischievous but kind-hearted. | Comic relief, appear when player is stuck |
| **Enoki** | Enoki | Shy, speaks quietly, easily startled. Has anxiety but tries her best. Very supportive. | Celebrates your wins, nervous about her own garden |
| **Boletus** | Porcini | Jolly merchant/chef. Obsessed with recipes. Hearty laugh. Calls everyone "friend." | Could run a cosmetics/hat shop |
| **Inky** | Inky Cap | Gloomy poet. Dramatic sighs. Writes sad poetry about decomposition. Secretly a softie. | Found in swamp biome, surprisingly helpful |
| **Truffle** | Truffle | Sophisticated, a bit snooty. Considers herself "rare and refined." French accent. | Appears in late-game worlds, high standards |
| **Amanita** | Fly Agaric | Mysterious elder. Knows ancient secrets. Speaks cryptically about "the old garden." | Lore character, hints at deeper story |

### Woodland Creatures

| Character | Animal | Personality | Role Ideas |
|-----------|--------|-------------|------------|
| **Hazel** | Dormouse | Perpetually sleepy. Yawns mid-sentence. Gives advice while half-asleep that's surprisingly wise. | Rest areas between worlds |
| **Bramble** | Hedgehog | Grumpy exterior, heart of gold. Pretends not to care but always helps. Loves berries. | Guards bramble-heavy levels, softens over time |
| **Fern** | Frog | Enthusiastic naturalist. Gets excited about EVERYTHING. "Oh wow, a puddle!" | Swamp biome guide, loves water levels |
| **Sleet** | Arctic Fox | Cool and collected. Dry wit. Secretly lonely in the frozen biome. | Ice world companion, warms up to player |
| **Moss** | Snail | Slow-talking philosopher. Takes forever to make a point but it's always profound. | Appears rarely, worth listening to |
| **Flicker** | Firefly | Hyperactive, short attention span. Speaks in quick bursts. Lights up when excited. | Night/dark level guide, hint system mascot |
| **Captain Quill** | Porcupine | Retired adventurer. Tells exaggerated tales of past explorations. Missing one quill (war wound, supposedly). | Gives level skip tokens, tells stories |
| **Dewdrop** | Spider | Artistic web-weaver. Sensitive about people being scared of her. Makes beautiful patterns. | Could weave hint paths, misunderstood friend |
| **Clover** | Rabbit | Optimistic to a fault. Everything is "the best day ever!" Brings good luck. | Bonus level appearances, lucky encounters |
| **Oakley** | Owl | Wise but absent-minded. Forgets what she was saying. Nocturnal schedule confuses her. | Statistics keeper, forgets your high scores |

### Biome-Specific Characters

**Forest Biome (Neutral)**
- Chanty (tutorial grandmother)
- Pip & Pop (mischief twins)
- Hazel (sleepy dormouse)

**Swamp Biome (Dirt Element)**
- Inky (gloomy poet)
- Fern (enthusiastic frog)
- Moss (philosophical snail)

**Ice Biome (Ice Element)**
- Sleet (cool arctic fox)
- A penguin named **Waddle** - clumsy, apologetic, keeps slipping
- **Frost** the snow hare - nervous, twitchy, speaks very fast

**Fairy Ring Biome (Portal Element)**
- **Luna** - a moth who guards the portals, speaks in moonlight metaphors
- **Blink** - a will-o'-wisp, playful trickster, teleports mid-conversation

### Potential Story Beats

1. **World 1**: Meet Chanty, who teaches you to garden
2. **World 2**: Russula challenges you to a gardening competition
3. **World 3**: Enoki is struggling with her garden, you inspire her
4. **World 5**: Meet Mort who explains a new mechanic
5. **World 8**: Encounter Amanita who hints at "the Great Garden"
6. **World 10**: Sleet joins you in the ice world, reveals loneliness
7. **World 15**: All characters gather for a celebration
8. **Endgame**: Discover Amanita's secret - the whole world IS a garden

### Character Dialogue Style Examples

**Chanty**: "Oh, little sprout! You've been working so hard. Remember - even the mightiest oak started as a tiny acorn. Now, have you eaten today?"

**Mort**: "Fascinating! FASCINATING! You see, the spore dispersal pattern suggests- wait, where was I? Oh yes! Try going left. Trust me. I've done the math. Probably."

**Inky**: *sigh* "Another garden complete. Yet... what is completion but the beginning of decay? ...That was beautiful. I should write that down."

**Russula**: "Oh, YOU again. I suppose you think you're quite the gardener. Well I'LL have you know I finished this level in HALF the moves. ...What do you mean you want to see proof?"

**Sleet**: "...You came all the way out here? To the ice? Most don't bother. ...It's fine. I prefer the quiet. ...Do you want to see something cool? There's a frozen waterfall nearby."

---

## New Content Ideas

### New World Elements

World elements are modifiers that change level generation and add new mechanics.

| Element | Description | Puzzle Mechanic | Synergies |
|---------|-------------|-----------------|-----------|
| **Wind** | Gusts that push the player | After each move, wind pushes you one tile in its direction. Tiles show wind arrows. | Ice (double slide), Portals (wind after teleport) |
| **Seasons** | Tiles cycle between states | Some grass only exists in Spring/Summer, some paths freeze in Winter. Button or auto-cycle. | Ice (permanent in winter), Dirt (muddy in spring) |
| **Overgrowth** | Vines that spread each turn | After X moves, vines grow onto adjacent grass, blocking paths. Race against time. | Dirt (vines avoid mud), Fairy (vines can't cross portals) |
| **Tides** | Water levels rise and fall | Low tide reveals paths, high tide floods areas. Cycles every few moves. | Rivers (tides affect flow), Ice (frozen tides) |
| **Shadows** | Limited visibility | Only see tiles near the player or in light. Fireflies/torches reveal areas. | Fairy (portals glow), Ice (reflective, always visible) |
| **Magnetism** | Push/pull forces | Magnetic tiles attract or repel the player. Red pushes, blue pulls. | Ice (magnetic slide), Stone (blocks magnetism) |
| **Echoes** | Delayed repeat moves | A ghost repeats your moves 3 steps behind. Don't let it catch you or block your path. | Portals (ghost uses them too), Ice (ghost slides) |
| **Gravity** | Directional falling | After each move, player "falls" in gravity direction until hitting something. | Ice (fall then slide), Rivers (fall into water) |
| **Memory** | Tiles forget visits | Mushrooms revert to grass after X turns. Must complete before tiles reset. | Dirt (takes longer to forget), Ice (never forgets) |
| **Symbiosis** | Paired tiles | Two tiles are linked - stepping on one affects the other (opens/closes). | Portals (triple links), Rivers (linked flow) |

### New Tile Types

#### Movement Tiles

| Tile | Visual | Behavior | Puzzle Use |
|------|--------|----------|------------|
| **Crumbling Stone** | Cracked stone with dust | Walk on once, then it breaks into void | One-way paths, timing puzzles |
| **Bounce Pad** | Springy mushroom cap | Launches player 2 tiles in facing direction | Jump over gaps, chain bounces |
| **Conveyor** | Wooden slats with arrows | Standing on it moves you one tile each turn | Forced movement, timing |
| **One-Way Gate** | Wooden gate with arrow | Can only pass in arrow direction | Directional mazes |
| **Rotating Platform** | Stone with curved arrows | Rotates 90° after stepping on it, changing available exits | Dynamic pathfinding |
| **Telepad** | Glowing rune circle | Single teleport destination (one-way, unlike portal pairs) | Asymmetric shortcuts |
| **Slime Trail** | Gooey green path | First visit: normal. Second visit: slide like ice | Risk/reward paths |
| **Quicksand** | Bubbling tan pit | Takes 2 moves to escape (stuck for one turn) | Timing, patience |

#### Interactive Tiles

| Tile | Visual | Behavior | Puzzle Use |
|------|--------|----------|------------|
| **Pressure Plate** | Stone button, depressed | While standing on it, linked tiles change state | Doors, bridges, sequences |
| **Crystal Switch** | Colored gem on pedestal | Toggle on/off, affects all matching color tiles | Multi-switch puzzles |
| **Locked Gate** | Wooden door with keyhole | Requires key tile to be collected first | Key hunts, routing |
| **Key** | Golden mushroom key | Collect to unlock matching gate, consumed on use | Adds collection objective |
| **Bridge (Retracted)** | Gap with bridge posts | Extend with switch, creates stone path over void | Reveals new routes |
| **Torch** | Glowing flame on post | Lights up surrounding tiles (for shadow element) | Visibility puzzles |
| **Bell Flower** | Chiming flower | Alerts nearby creatures/triggers events when stepped on | Sound-based puzzles |

#### Hazard Tiles

| Tile | Visual | Behavior | Puzzle Use |
|------|--------|----------|------------|
| **Thorns** | Sharp bramble variant | Can pass through but takes away one "health" or undo | Risk/reward shortcuts |
| **Hot Spring** | Steaming water pool | Safe to step on, but must exit immediately next turn | Timing, can't linger |
| **Spore Cloud** | Purple hazy tile | Obscures vision, random push direction when entered | Chaos element |
| **Frozen Grass** | Icy grass blades | Grass that acts like ice until visited (then normal mushroom) | Hybrid tile |
| **Magma Crack** | Glowing orange fissure | Cycles between safe (cooled) and dangerous (glowing) | Timing puzzle |
| **Web** | Spider silk covering | First visit: stuck for one turn. Second: breaks, normal tile | Slowdown hazard |

#### Nature Tiles

| Tile | Visual | Behavior | Puzzle Use |
|------|--------|----------|------------|
| **Flower Patch** | Colorful wildflowers | Like grass but spawns butterfly visual on completion | Aesthetic variant |
| **Tall Grass** | Swaying long grass | Hides the tile beneath until adjacent (fog of war) | Discovery element |
| **Lily Pad** | Floating leaf on water | Walkable water tile, but sinks after one use | Water navigation |
| **Log Bridge** | Fallen tree trunk | Like stone but rolls away after 2 uses | Limited-use bridge |
| **Mushroom Circle** | Ring of small mushrooms | Fairy ring without teleport - just decorative or bonus points | World building |
| **Ancient Tree** | Large tree taking 4 tiles | Obstacle but can walk around, provides shade (shadow element) | Landmark, navigation |
| **Berry Bush** | Bush with red berries | Collectible bonus, doesn't affect path | Optional objectives |
| **Hollow Stump** | Old tree stump | Can hide inside to skip one "echo" turn | Echo element counter |

### New Biomes

Biomes affect the visual theme and which elements/tiles naturally appear.

#### Nature Biomes

| Biome | Color Palette | Native Elements | Native Tiles | Atmosphere |
|-------|---------------|-----------------|--------------|------------|
| **Autumn Grove** | Orange, red, gold, brown | Wind, Memory | Leaf piles (like dirt), falling leaves | Cozy, nostalgic, crunchy leaves |
| **Cherry Blossom** | Pink, white, soft green | Seasons, Overgrowth | Flower patches, petal streams | Peaceful, Japanese garden feel |
| **Rainforest** | Deep green, vibrant colors | Overgrowth, Tides | Vines, lily pads, tall grass | Lush, dense, humid |
| **Meadow** | Bright green, yellow, blue | Wind, Symbiosis | Flower patches, bee paths | Sunny, cheerful, open |
| **Mangrove** | Murky green, brown, teal | Tides, Rivers | Log bridges, tangled roots | Mysterious, coastal swamp |

#### Extreme Biomes

| Biome | Color Palette | Native Elements | Native Tiles | Atmosphere |
|-------|---------------|-----------------|--------------|------------|
| **Volcanic** | Black, orange, red | Gravity, Memory | Magma cracks, hot springs, obsidian stone | Dangerous, dramatic, glowing |
| **Crystal Cave** | Purple, blue, cyan glow | Shadows, Magnetism | Crystal switches, glowing stones | Underground, magical, echoing |
| **Desert Canyon** | Tan, orange, terracotta | Wind, Seasons | Quicksand, crumbling stone, cacti | Arid, ancient, layered |
| **Tundra** | White, pale blue, grey | Ice, Gravity | Frozen grass, snow drifts, ice caves | Harsh, beautiful, sparse |
| **Deep Ocean** | Dark blue, bioluminescent | Tides, Shadows | Lily pads (bubbles), current tiles | Underwater, dreamlike |

#### Magical Biomes

| Biome | Color Palette | Native Elements | Native Tiles | Atmosphere |
|-------|---------------|-----------------|--------------|------------|
| **Fairy Hollow** | Pastel rainbow, sparkles | Fairy, Echoes | All portal types, bell flowers | Whimsical, enchanted, glittery |
| **Moonlit Grove** | Silver, deep blue, purple | Shadows, Seasons | Torches, glowing mushrooms | Nocturnal, serene, mysterious |
| **Mycelium Network** | Bioluminescent, deep purple | Symbiosis, Echoes | Connected tiles, neural patterns | Underground, connected, alien |
| **Spirit Woods** | Faded colors, misty | Echoes, Memory | Hollow stumps, ghost tiles | Haunted but gentle, melancholy |
| **Sky Garden** | White, gold, soft blue | Wind, Gravity | Cloud platforms, updrafts | Heavenly, floating, airy |

#### Seasonal Biomes (for Seasons element)

| Biome | Description |
|-------|-------------|
| **Eternal Spring** | Always blooming, flowers everywhere, gentle rain |
| **Endless Summer** | Golden light, long shadows, buzzing insects |
| **Forever Autumn** | Perpetual leaf fall, harvest decorations, warm tones |
| **Lasting Winter** | Gentle snow, cozy frost patterns, holiday feel |

### Element + Biome Combinations

Some natural pairings that create unique experiences:

| Combination | Experience |
|-------------|------------|
| Wind + Desert Canyon | Sandstorms push you, dust obscures paths |
| Tides + Mangrove | Water levels reveal/hide root bridges |
| Shadows + Crystal Cave | Light gems to navigate the darkness |
| Echoes + Spirit Woods | Friendly ghosts follow your path |
| Overgrowth + Rainforest | Race against encroaching jungle |
| Seasons + Cherry Blossom | Watch the trees cycle through bloom |
| Gravity + Sky Garden | Fall upward through cloud platforms |
| Memory + Spirit Woods | Paths fade like forgotten memories |
| Magnetism + Crystal Cave | Push/pull through gem-studded tunnels |
| Symbiosis + Mycelium Network | Everything is connected underground |

### Tile Interaction Matrix

How new tiles could interact with existing elements:

| Tile | + Ice | + Rivers | + Dirt | + Fairy |
|------|-------|----------|--------|---------|
| Crumbling Stone | Slide then break | Water erodes faster | Mud stabilizes it | Can't teleport onto |
| Bounce Pad | Bounce then slide | Bounce over water | Mud dampens bounce | Bounce into portal? |
| Conveyor | Conveyor then slide | Against/with current | Mud slows conveyor | Exit at portal |
| Pressure Plate | Ice slides off (no trigger) | Underwater plates | Mud keeps pressed | Teleport triggers |
| Quicksand | Frozen = safe | Waterlogged = deeper | Extra muddy | Can't place portals |

### Progressive Unlock Suggestion

Introduce new content gradually:

| World | New Element | New Tiles | New Biome |
|-------|-------------|-----------|-----------|
| 1-2 | (Base game) | Grass, Bramble, Stone | Forest |
| 3-4 | Rivers | Water | Meadow |
| 5-6 | Dirt | Dirt tiles | Swamp |
| 7-8 | Ice | Ice tiles | Tundra |
| 9-10 | Fairy | Portals | Fairy Hollow |
| 11-12 | Wind | Conveyor | Desert Canyon |
| 13-14 | Crumbling | Crumbling Stone | Volcanic |
| 15-16 | Shadows | Torches, Tall Grass | Crystal Cave |
| 17-18 | Tides | Lily Pads | Mangrove |
| 19-20 | Seasons | Frozen Grass | Cherry Blossom |
| 21+ | Combinations | Mixed | Mixed |

---

## Autumn Biome - Detailed Design

### Autumn Grove Theme

**Color Palette**: Warm oranges, deep reds, golden yellows, rustic browns, touches of remaining green

**Atmosphere**: Cozy, nostalgic, the crisp feeling of fall. Leaves gently falling, warm afternoon light filtering through trees.

### Autumn-Specific Tiles

| Tile | Visual | Behavior | Notes |
|------|--------|----------|-------|
| **Leaf Pile** | Heap of colorful fallen leaves | Like grass, but leaves scatter when you plant a mushroom | Satisfying crunch visual/audio |
| **Acorn** | Golden acorn on grass | Collectible bonus item (optional objective) | Squirrels might appear nearby |
| **Pumpkin Patch** | Orange pumpkins in grass | Obstacle like bramble, but can be jumped over | Seasonal Halloween variant |
| **Hay Bale** | Stacked hay cube | Like stone - walkable, reusable, doesn't grow mushrooms | Farm aesthetic |
| **Corn Maze Wall** | Dried corn stalks | Impassable barrier, like bramble but taller visual | Creates maze-like levels |
| **Muddy Leaves** | Wet leaves in puddle | Hybrid: leaf pile + water slide mechanics | Slippery autumn rain |
| **Bare Branch** | Fallen tree branch | One-use bridge over gaps, breaks after crossing | Like crumbling stone |
| **Toadstool Ring** | Circle of red-capped mushrooms | Decorative grass variant, extra cozy | Visual only |
| **Harvest Basket** | Woven basket | Goal tile - must end on this to "complete harvest" | Alternative win condition? |

### Autumn World Element: "Falling Leaves"

**Mechanic**: Leaves drift down and accumulate on tiles over time.

| Turn | Effect |
|------|--------|
| Start | Some tiles have leaf piles, others are clear |
| Every 3 moves | New leaves fall onto 1-2 random empty grass tiles, creating leaf piles |
| Leaf pile stepped on | Scatters (becomes mushroom as normal) |

**Puzzle implications**:
- Plan around where leaves will fall
- Leaves can block paths if not cleared in time
- Creates dynamic, changing board state

### Autumn World Element: "Harvest"

**Mechanic**: Certain tiles contain harvestable items (apples, acorns, pumpkins). Must collect all before completing the level.

- Adds collection objective on top of path-finding
- Items don't block movement, just need to be stepped on
- Counter shows "3/5 acorns collected"

### Autumn World Names

| Name | Vibe |
|------|------|
| Amber Woods | Classic autumn forest |
| Cider Hollow | Cozy orchard feel |
| Harvest Glen | Farmland adjacent |
| Maple Heights | Scenic overlook |
| Rustling Vale | Wind through leaves |
| Acorn Ridge | Squirrel territory |
| Twilight Meadow | Late afternoon golden hour |
| Pumpkin Patch | Halloween-adjacent |
| Crimson Trail | Deep red maples |
| Foggy Orchard | Mysterious morning mist |

### Autumn Characters

| Character | Species | Personality | Role |
|-----------|---------|-------------|------|
| **Maple** | Red squirrel | Hyperactive collector, always hoarding acorns, speaks quickly, easily distracted by shiny things | Harvest element guide, bonus objectives |
| **Bramley** | Hedgehog (brown/orange) | Preparing for hibernation, sleepy but determined, gives cozy advice | Appears when player is idle |
| **Gourd** | Pumpkin sprite | Round, jolly, slightly spooky, loves Halloween, tells "scary" stories that aren't scary | Comic relief, Halloween event |
| **Rustle** | Owl with autumn plumage | Wise about the changing seasons, melancholic about leaves falling, poetic | Lore/story moments |
| **Cider** | Apple worm | Lives in apples, pops out unexpectedly, very apologetic about startling you | Hidden character, appears randomly |

### Autumn Audio Suggestions

**Ambient sounds**:
- Leaves crunching underfoot
- Wind rustling through trees
- Distant geese honking
- Acorns dropping
- Crackling (distant bonfire?)

**Music mood**: Warm acoustic guitar, soft piano, gentle strings. Think "cozy sweater" energy. Slower tempo than forest, more contemplative.

---

## Additional Game Element Ideas

### Movement Modifiers

| Element | Mechanic | Complexity |
|---------|----------|------------|
| **Sticky Honey** | Tiles covered in honey slow you - takes 2 inputs to leave | Low |
| **Boost Pads** | Step on to launch 2-3 tiles in a direction | Medium |
| **Rotating Tiles** | Platform rotates 90° after you step off, changing connections | Medium |
| **Mirror Tiles** | Your input is reversed (left = right) while on these | Medium |
| **Momentum** | Moving in a direction gives +1 move in same direction | High |

### State-Change Mechanics

| Element | Mechanic | Complexity |
|---------|----------|------------|
| **Day/Night Cycle** | Some tiles only passable at day or night, cycles every X moves | Medium |
| **Temperature** | Hot tiles melt ice, cold tiles freeze water, player carries temperature | High |
| **Weight Plates** | Standing on plate A opens gate B, need to route carefully | Medium |
| **Color Switches** | Red switch toggles red tiles (solid ↔ passable) | Medium |
| **Growing Vines** | Vines spread each turn, must complete before blocked | Medium |

### Risk/Reward Mechanics

| Element | Mechanic | Complexity |
|---------|----------|------------|
| **Shortcuts** | Dangerous path is shorter but risky (thorns, crumbling) | Low |
| **Bonus Collectibles** | Optional items off the main path for completionists | Low |
| **Time Pressure** | Optional timer for bonus stars, no penalty for slow | Low |
| **Fragile Tiles** | Some grass breaks after 2 visits instead of 1 | Medium |
| **Score Multiplier** | Chain moves without undoing for higher score | Low |

### Visual/Feel Improvements

| Idea | Description |
|------|-------------|
| **Footprints** | Show where you've walked on dirt/sand/snow |
| **Trail particles** | Spores/leaves/sparkles follow the player |
| **Tile reactions** | Grass sways when you pass, water ripples |
| **Weather states** | Rain, snow, sunshine affect biome feel |
| **Wildlife** | Butterflies, birds, rabbits appear in background |
| **Growth animation** | Mushrooms visibly sprout with particle effects |

### Puzzle Modifiers (for difficulty)

| Modifier | Effect |
|----------|--------|
| **No Undo** | Hardcore mode, mistakes are permanent |
| **Limited Moves** | Must complete in exactly N moves |
| **Blind** | Tiles only revealed when adjacent |
| **Mirrored** | Second mushroom spawns in mirrored position |
| **Shrinking** | Border tiles fall away every X turns |

---

## Beach/Tides Biome - Implementation Notes

*Already partially implemented as TIDES world element*

### Current Implementation
- LOW_SAND: Floods every 5 moves (TIDE_PERIOD)
- SEA: Always impassable water
- SAND_MUSHROOM: Mushroom on sand (still floods)
- Global tide phase counter

### Expansion Ideas

| Tile | Behavior |
|------|----------|
| **Sandcastle** | Like bramble but washes away when flooded |
| **Tide Pool** | Safe during flood, like stone but coastal |
| **Seaweed** | Slippery when wet (flood = ice physics) |
| **Driftwood** | Moves with tide direction each flood cycle |
| **Crab** | Moves sideways each turn, obstacle that relocates |
| **Buried Treasure** | Revealed only at low tide, collectible |

### Beach World Names
- Sandy Shores
- Tidal Pools
- Coral Cove
- Driftwood Beach
- Seashell Bay
- Sunset Strand
- Kelp Coast
- Foam Flats
