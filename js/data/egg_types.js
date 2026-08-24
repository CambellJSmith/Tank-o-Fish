export const EGG_TYPES = Object.freeze([
    Object.freeze({
        id: "sunny_egg",
        name: "sunny egg",
        price: 15,
        description: "a warm speckled egg that hatches into a cheerful sunny guppy.",
        hatch_time_ms: 7000,
        egg_color: "#f2cf73",
        egg_spot: "#ee8b55",
        fish: Object.freeze({
            species_id: "sunny_guppy",
            name: "sunny guppy",
            hue: 43,
            accent_hue: 20,
            growth_time_ms: 30000
        })
    }),
    Object.freeze({
        id: "mint_egg",
        name: "mint egg",
        price: 25,
        description: "a cool green egg with a mellow little mint tetra tucked inside.",
        hatch_time_ms: 9000,
        egg_color: "#8ed7bb",
        egg_spot: "#4cae8f",
        fish: Object.freeze({
            species_id: "mint_tetra",
            name: "mint tetra",
            hue: 158,
            accent_hue: 181,
            growth_time_ms: 36000
        })
    }),
    Object.freeze({
        id: "berry_egg",
        name: "berry egg",
        price: 40,
        description: "a rosy egg that hatches into a slightly fancy berry moonfin.",
        hatch_time_ms: 11000,
        egg_color: "#ef9eb8",
        egg_spot: "#a65a8e",
        fish: Object.freeze({
            species_id: "berry_moonfin",
            name: "berry moonfin",
            hue: 329,
            accent_hue: 281,
            growth_time_ms: 42000
        })
    })
]);
