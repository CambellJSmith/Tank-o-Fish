import { rarity_from_roll } from "./fish_value.js";

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
    const base_hunger_rate = 0.18 + ((catalog_index % 9) * 0.025);
    const growth_hunger_multiplier = 1.6 + ((catalog_index % 5) * 0.12);
    const rarity_roll = ((catalog_index * 37) + 11) % 100;
    const rarity = rarity_from_roll(rarity_roll);
    const base_adult_length_cm = 4.2 + (family_index * 0.72) + ((catalog_index % 4) * 0.22);
    const base_adult_weight_g = 2.4 + (family_index * 1.05) + ((catalog_index % 5) * 0.34);
    const adult_weight_gain_per_minute = 0.12 + ((catalog_index % 7) * 0.025);
    const base_value = 11 + (family_index * 0.7) + ((catalog_index % 6) * 0.55);

    return Object.freeze({
        species_id: `fish_${padded_number}`,
        name: `${SPECIES_PREFIXES[prefix_index]}_${SPECIES_FAMILIES[family_index]}`,
        sprite_number,
        sprite: `FishSprites/${SPRITE_PREFIX}_${padded_number}.png`,
        growth_time_ms: 36000 + ((catalog_index % 7) * 6000),
        base_hunger_rate,
        growth_hunger_multiplier,
        rarity,
        base_adult_length_cm,
        base_adult_weight_g,
        adult_weight_gain_per_minute,
        base_value
    });
}

export const FISH_SPECIES = Object.freeze(
    SPRITE_NUMBERS.map((sprite_number, catalog_index) => create_species(sprite_number, catalog_index))
);
