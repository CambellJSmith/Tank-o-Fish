import { FISH_SPECIES } from "./fish_species.js";

export const EGG_TYPES = Object.freeze([
    Object.freeze({
        id: "sunny_egg",
        name: "sunny_egg",
        price: 15,
        description: "a warm speckled egg with a cheerful sunny fish tucked inside.",
        hatch_time_ms: 7000,
        egg_color: "#f2cf73",
        egg_spot: "#ee8b55",
        fish: FISH_SPECIES[45]
    }),
    Object.freeze({
        id: "mint_egg",
        name: "mint_egg",
        price: 25,
        description: "a cool green egg with a mellow little mint fish waiting to hatch.",
        hatch_time_ms: 9000,
        egg_color: "#8ed7bb",
        egg_spot: "#4cae8f",
        fish: FISH_SPECIES[73]
    }),
    Object.freeze({
        id: "berry_egg",
        name: "berry_egg",
        price: 40,
        description: "a rosy egg with a slightly fancy berry fish growing inside.",
        hatch_time_ms: 11000,
        egg_color: "#ef9eb8",
        egg_spot: "#a65a8e",
        fish: FISH_SPECIES[67]
    })
]);
