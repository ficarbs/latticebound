# Latticebound

An original pixel-art monster-taming RPG that runs in the browser. Explore a small world on foot, bind wild **Kith**, fight turn-based battles, and grow every creature across one shared node map: **the Lattice**.

**Play it:** https://ficarbs.github.io/latticebound/

No install, no build step, no asset files. Every sprite, tile, sound and song is generated in code.

## What it is

- **Top-down exploration.** Six hand-built maps: Hearthvale, Mossway, Glimmer Grotto, Brinecliff, Saltmarsh and the Static Spire. Tall grass hides wild Kith, Tamers challenge you on sight, and your lead Kith follows you around.
- **Turn-based battles.** One Kith out per side, a party of three, and a Haven for the rest. Six elements (Ember, Tide, Bloom, Volt, Stone, Shade) with strengths and weaknesses, status effects, buffs, and Bind Seals for catching wild Kith.
- **Sync Burst.** A shared gauge fills as you trade blows. At 100 your Kith unleashes a burst in its own element that ignores resistances.
- **The Lattice.** One 163-node graph shared by every Kith. Six element arms radiate from a central Heart, and rings join neighbouring arms. Each level earns a Spark and each Spark lights one node next to a node that Kith already holds:
  - stat nodes (HP, EN, ATK, DEF, SPD), with larger ones at branch tips;
  - skill nodes, which any Kith can learn if it walks far enough, so an Ember fox can pick up Tide skills;
  - lock nodes that need Lattice Key I or II, earned from bosses;
  - Ascension nodes, where a Kith of the right level takes its next form.
- **24 Kith** across 10 families, including three starters with three forms each.
- **A short story** with two Wardens, a hollowed cave boss and something waiting at the top of the Spire.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / menu cursor | Arrow keys or WASD | D-pad |
| Confirm / talk / interact | Z, Enter or Space | Z button, or tap the option |
| Menu / back | X, Esc or Backspace | X button |
| Switch Kith on the Lattice | Q / E | tap the Kith tabs |

Menus, battle commands and Lattice nodes can all be clicked or tapped directly. The game saves automatically when you change maps, finish a battle, rest, or close the Lattice, and from the menu.

## Run locally

```bash
node server.js
```

Then open http://localhost:8131. Add `?gallery` to the URL to see every Kith sprite on one sheet.

## Files

| File | What it holds |
| --- | --- |
| `src/main.js` | Boot, game loop, title screen, screen wipes |
| `src/world.js` | Tile movement, camera, NPCs, warps, encounters, overworld rendering |
| `src/battle.js` | Battle flow, damage, AI, binding, battle rendering and effects |
| `src/lattice.js` | The Lattice screen |
| `src/grid.js` | Lattice graph generation and the order rival Kith fill it in |
| `src/kith.js` | Kith instances, stats, XP, evolution, items |
| `src/data.js` | Elements, skills, species, items |
| `src/maps.js` | Map layouts, NPCs, chests, warps, encounter tables |
| `src/story.js` | NPC, shop, boss and ending scripts |
| `src/ui.js` | Dialog, menus, party, bag, shop, spatial keyboard focus |
| `src/art.js` | Tiles, trees, buildings, people and props |
| `src/kithart.js` | Kith sprites: vector shapes snapped to a palette, shaded and outlined |
| `src/audio.js` | Sound effects and music |
| `src/save.js`, `src/state.js`, `src/input.js` | Save slot, shared state and tweens, input |

## Credits

Design, code, art and audio are original to this project. It is a fan of the genre, not a copy of any one game: the node-growth idea nods to classic sphere-grid progression, the partner creatures to monster-taming RPGs, and the Sync gauge to GhostX Solo.
