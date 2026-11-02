# Farming Mode

A cozy idle/incremental mode for Mushroom Garden, separate from the puzzle
game except for sharing its art, sounds and music. You grow mushrooms, sell
them at a hollow log, and build out a little supply chain of helpers and
cooking stations - a light touch of Factorio/Satisfactory in a cottagecore
mushroom farm.

## Core loop

1. Tap an empty plot to plant a mushroom.
2. It grows for **10 seconds** (sprout → bud → ripe), or **5 seconds if watered**.
3. Tap a ripe mushroom to put it in **your basket** (holds ~10, upgradable).
4. Tap the **hollow log** to sell everything in your basket for 🍄 (currency).
5. Spend 🍄 to expand the farm, place stations and hire helpers.

Ripe mushrooms never wilt - they wait patiently to be picked.

## The farm

- Starts as a 3×3 patch of plots plus the hollow log.
- Faded "ghost" plots appear next to the farm showing their price; tap to buy.
  A plot's price depends only on how far out it is: 10 beside the starting
  patch, ×1.3 for each ring further out. Buildings and helpers cost the
  same every time (a Dew is a Dew), so more 🍄 means a bigger farm. Only
  upgrades get dearer per level.
- Everything on the farm sits on a tile: plots, the log, barrels, sprinklers,
  paths and cooking stations. Non-plot tiles are obstacles for helpers.
- A general place / move / remove tool lets players rearrange their layout.
  Removing a building or helper sells it back for 90% of its price; extra
  logs can be removed for nothing back, but there's always at least one.

## Water

- **Watering can** (free, from the start): tap a growing plot to water it.
- **Sprinklers**: take up a tile and keep the **8 surrounding tiles** watered.
  They replace the watering can as the farm grows.
- Watered soil looks darker and sparkly.

## The hollow log

- The one place mushrooms (and cooked goods) are sold.
- Extra logs can be bought (1500 🍄), or found by luck: a plot bought at
  least 10 tiles from every log (diagonals count as one) has a 3% chance
  of holding one.
- Movable, so it becomes the heart the supply chain flows towards.

## Helpers

Each helper walks a fixed pattern across the farm. They don't have jobs -
every helper:

- **On her route**: harvests ripe mushrooms into her basket (if there's room)
  and plants on empty plots as she leaves them.
- **At stations beside her route** (the 4 neighbouring tiles): follows the
  player's setting for that helper at that station:
  - ⬇️ **Drop off** - put in whatever the station accepts
  - ⬆️ **Pick up** - take whatever the station has ready
  - ⏸️ **Ignore** - walk past

Selecting a helper shows her route as a dotted trail and lights up each
station she passes, with a tappable icon to cycle its setting. Different
helpers can treat the same station differently, which is how mushrooms are
handed along a chain.

Helpers pass through each other (no traffic jams). An unripe mushroom ahead
is an obstacle: she jumps over it if the tile beyond is free, otherwise waits.

### Roster

| Helper | Movement | Likes |
|---|---|---|
| 🌱 Sprout | Walks left ↔ right along her row | Long clear rows |
| 💧 Dew | Walks up ↕ down her column | Tall columns |
| 🐇 Hopper | Moves 2 tiles at a time, leaping anything | Checkerboards |
| ⛸️ Skater | Slides until blocked, then turns right | Sprinklers as bumpers |
| 🧚 Fairy | Hops between two fairy rings you place | Linking far corners |

Readability: route previews, basket icons above helpers, barrel fill gauges,
per-helper stats (harvests/min, % waiting, % basket full).

## Stations and items

All stations share one item and recipe system:

| Station | Takes | Gives back |
|---|---|---|
| 🪵 Hollow log | anything sellable | 🍄 currency |
| 🛢️ Barrel | anything (~20) | the same items - hand-off between helpers |
| 🪨 Path | - | grows nothing; helpers on paths never harvest (conveyor lanes) |
| 🔥 Campfire | 3 mushrooms | 1 roasted skewer (sells for 5) every 5s |
| 🍲 Stew pot | 4 mushrooms + 1 water bucket | mushroom stew (sells for 14) every 8s |
| 🪣 Well | - | a water bucket every 4s (can't be sold) |

Example chain:

```
🌱 Sprout harvests row 1 → ⬇️ barrel
💧 Dew on a path: ⬆️ barrel → ⬇️ campfire → ⬆️ skewers → ⬇️ log
```

## Technical approach

- `src/farm/` holds a pure simulation (`tick(state, ms)` plus player actions)
  with no Vue, timers or sound, so it's fully unit-testable with fake time.
- `FarmScreen.vue` runs the loop with `requestAnimationFrame` and renders,
  reusing the puzzle game's tile art, character sprites and sounds.
- Separate save (`mushroom-farm-save`), autosaved regularly.
- Offline progress: on return, simulate the time away (capped at ~8 hours)
  and show a "while you were away" summary.

## Build phases

1. **Foundations** ✅ - "Farming" on the start screen, simulation core, tap
   to plant/harvest into your basket, tap the log to sell, watering can,
   growth stages, saving and offline progress.
2. **Building and sprinklers** ✅ - build mode with faded plots to buy
   around the farm, sprinklers that water the 8 tiles around them,
   moving the log and sprinklers, removing sprinklers.
3. **Helpers** ✅ - Sprout and Dew, baskets, barrels and paths, per-station
   pick up/drop off settings, route previews and stats, and a "while you
   were away" summary.
4. **Cooking** ✅ - items (mushrooms, skewers, water, stew), the campfire,
   well and stew pot, a "both" station setting (the default at cooking
   stations), and cooking by hand by tapping stations.
5. **More helpers and progression** ✅ - Hopper (leaps 2 tiles), Skater
   (slides and turns right when blocked), Fairy (zips between two rings,
   tending the 3x3 patch around each); upgrades (bigger baskets, helper
   baskets, quicker helpers, faster growth, golden mushrooms worth 25);
   extra hollow logs, bought or found in plots far from every log; and a
   balancing pass (helpers cost 60 and pay for themselves in a few
   minutes; clever layouts like a Skater loop earn ~50 🍄/min).

Hopper, Skater and Fairy currently borrow Sprout's and Dew's art with a
badge; the sprite table in `src/farm/FarmHelper.vue` is ready for their
own art.
