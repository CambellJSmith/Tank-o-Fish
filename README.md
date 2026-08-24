# Tank-o-Fish

A small vanilla HTML, CSS, and JavaScript aquarium game prototype.

## Current playable loop

- open the egg shop
- buy one of three starter eggs
- drag the purchased egg from the tray into the aquarium
- release it anywhere over the water
- watch it sink to the sand and wait for it to hatch
- the baby fish begins swimming around the tank and gradually grows

The fish are currently rendered with simple CSS shapes so the gameplay code is independent of final art. The existing `FishSprites/` folder is untouched and can be wired into the fish renderer once sprite-to-species mappings are decided.

## Run locally

This project uses JavaScript modules, so serve the repository over a local web server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

## Structure

- `index.html` — page shell and aquarium markup
- `css/` — base styles, aquarium presentation, and interface styles
- `js/data/` — egg and fish definitions
- `js/entities/` — egg and fish runtime entities
- `js/game/` — game orchestration, shop, inventory, and tank logic
- `FishSprites/` — existing fish sprite assets reserved for later integration
