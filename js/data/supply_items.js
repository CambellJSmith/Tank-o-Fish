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
        interaction_hint: "drop_into_the_tank_then_scrub_when_needed",
        description: "drop_the_sponge_into_the_tank_and_leave_it_there._each_sponge_can_fully_clean_25_dirt_patches_across_as_many_scrub_sessions_as_you_like."
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
