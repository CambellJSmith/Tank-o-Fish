# Tank-o-Fish

A small vanilla HTML, CSS, and JavaScript aquarium game prototype.

## Current playable loop

- begin with a completely bare aquarium: water and glass, with no substrate or decorations installed
- open the shop and buy one of five mystery egg types
- drag an egg from the tray into the aquarium; eggs settle on the bare glass or on whatever substrate is currently installed
- wait for it to hatch into a random species from that egg type's hidden pool
- click any fish in the tank to inspect its live species, rarity, growth, hunger, health, illness history, size, weight, appetite, and sale value
- each fish has individual size and weight variation even within the same species
- fish gain weight rapidly while growing and continue gaining weight more slowly after reaching adulthood
- sell a selected fish for its current live value; growth, health, illness history, rarity, individual size, and weight all contribute to price
- buy food, cleaning sponges, and medicine to care for the tank
- drag food from the cupboard into the aquarium and release it to scatter pellets; the fish swarm toward the food and eat it
- drop purchased sponges into the aquarium and leave them there until needed
- drag a placed sponge back and forth across visible dirt patches; each sponge can fully remove 25 patches across any number of separate cleaning sessions
- hold medicine over the water and move the spray through ill fish; every ill fish touched by the spray is cured
- buy tank decorations including rocks, coral, skulls, diving helmets, treasure chests, castle ruins, arches, driftwood, anchors, seaweed, shells, and toy submarines
- drag purchased decorations into the tank to place them, then drag placed decorations again whenever you want to rearrange the layout
- buy different sands, gravels, coral crush, and planted soil as substrate bags; drag a bag into the aquarium to install or replace the entire bottom layer
- keep fish fed and the tank clean so cured fish can gradually recover health

Fish use the PNG artwork already stored in `FishSprites/`, and each existing sprite maps to its own species.

## Run locally

This project uses JavaScript modules, so serve the repository over a local web server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Structure

- `index.html` — game shell, aquarium, HUD, fish info/sale panel, placement inventories, and shop markup
- `css/` — editor-style UI, aquarium visuals, fish rendering, care interactions, decoration/substrate visuals, fish info panel, and shop UI
- `js/data/` — mystery egg pools, fish species, fish valuation, care supplies, decorations, and substrate definitions
- `js/entities/` — egg, fish, food-pellet, persistent sponge, and movable tank-decoration runtime entities
- `js/game/` — shop, inventories, direct care tools, placement systems, tank simulation, fish inspection/selling, and main game orchestration
- `FishSprites/` — source fish sprite artwork
