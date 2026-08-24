import { FISH_SPECIES } from "./fish_species.js";

const EGG_POOL_COUNT = 5;

const FISH_POOLS = Object.freeze(
    Array.from({ length: EGG_POOL_COUNT }, (_, pool_index) => Object.freeze(
        FISH_SPECIES.filter((_, species_index) => species_index % EGG_POOL_COUNT === pool_index)
    ))
);

function create_egg_type({ id, name, description, egg_color, egg_spot, pool_index }) {
    return Object.freeze({
        id,
        name,
        price: 20,
        description,
        hatch_time_ms: 8000,
        egg_color,
        egg_spot,
        species_pool: FISH_POOLS[pool_index]
    });
}

export const EGG_TYPES = Object.freeze([
    create_egg_type({
        id: "speckled_egg",
        name: "speckled_egg",
        description: "a_pale_speckled_egg_with_its_own_pool_of_possible_species.",
        egg_color: "#f2cf73",
        egg_spot: "#ee8b55",
        pool_index: 0
    }),
    create_egg_type({
        id: "moss_egg",
        name: "moss_egg",
        description: "a_soft_green_egg_with_a_different_pool_of_possible_species.",
        egg_color: "#8ed7bb",
        egg_spot: "#4cae8f",
        pool_index: 1
    }),
    create_egg_type({
        id: "coral_egg",
        name: "coral_egg",
        description: "a_warm_coral_egg_with_its_own_hidden_species_pool.",
        egg_color: "#ef9e8e",
        egg_spot: "#c15f6f",
        pool_index: 2
    }),
    create_egg_type({
        id: "moon_egg",
        name: "moon_egg",
        description: "a_cool_blue_egg_with_another_hidden_group_of_species.",
        egg_color: "#9ab8e8",
        egg_spot: "#6577b8",
        pool_index: 3
    }),
    create_egg_type({
        id: "star_egg",
        name: "star_egg",
        description: "a_violet_egg_with_the_final_hidden_group_of_species.",
        egg_color: "#c7a7df",
        egg_spot: "#8b67ae",
        pool_index: 4
    })
]);

export function roll_fish_for_egg(egg_type) {
    const pool = egg_type.species_pool;
    if (!Array.isArray(pool) || pool.length === 0) {
        throw new Error(`egg_type_${egg_type.id}_has_no_species_pool`);
    }

    const species_index = Math.floor(Math.random() * pool.length);
    return pool[species_index];
}
