export const SUPPLY_ITEMS = Object.freeze([
    Object.freeze({
        id: "food",
        name: "fish_food",
        price: 6,
        icon: "●",
        interaction_hint: "drag_into_the_tank_and_release",
        description: "drag_a_portion_into_the_tank_to_drop_food._the_fish_will_swarm_over_and_eat_the_pellets."
    }),
    Object.freeze({
        id: "sponge",
        name: "cleaning_sponge",
        price: 10,
        icon: "▦",
        interaction_hint: "hold_and_scrub_dirt_patches",
        description: "hold_the_sponge_and_move_it_back_and_forth_over_visible_dirt_patches_to_scrub_them_away."
    }),
    Object.freeze({
        id: "medicine",
        name: "fish_medicine",
        price: 14,
        icon: "+",
        interaction_hint: "hold_and_spray_through_the_water",
        description: "hold_the_medicine_over_the_tank_and_move_the_spray_through_ill_fish_to_cure_every_fish_it_hits."
    })
]);
