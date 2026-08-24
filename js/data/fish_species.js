const SPRITE_PREFIX = "6a6b29ac-af37-4dc3-a09c-c369c53b0443";
const MISSING_SPRITE_NUMBERS = new Set([36, 144]);

const SPECIES_PREFIXES = Object.freeze([
    "bubble",
    "pebble",
    "coral",
    "moon",
    "moss",
    "sunny",
    "cloud",
    "berry",
    "mint",
    "honey",
    "star",
    "tide",
    "pearl",
    "velvet",
    "comet",
    "puddle",
    "sprout"
]);

const SPECIES_FAMILIES = Object.freeze([
    "guppy",
    "tetra",
    "rasbora",
    "minnow",
    "molly",
    "danio",
    "goby",
    "barb",
    "loach"
]);

const SPRITE_NUMBERS = Object.freeze(
    Array.from({ length: 155 }, (_, index) => index + 1)
        .filter((sprite_number) => !MISSING_SPRITE_NUMBERS.has(sprite_number))
);

function create_species(sprite_number, catalog_index) {
    const prefix_index = Math.floor(catalog_index / SPECIES_FAMILIES.length);
    const family_index = catalog_index % SPECIES_FAMILIES.length;
    const padded_number = String(sprite_number).padStart(4, "0");

    return Object.freeze({
        species_id: `fish_${padded_number}`,
        name: `${SPECIES_PREFIXES[prefix_index]}_${SPECIES_FAMILIES[family_index]}`,
        sprite_number,
        sprite: `FishSprites/${SPRITE_PREFIX}_${padded_number}.png`,
        growth_time_ms: 36000 + ((catalog_index % 7) * 6000)
    });
}

export const FISH_SPECIES = Object.freeze(
    SPRITE_NUMBERS.map((sprite_number, catalog_index) => create_species(sprite_number, catalog_index))
);
