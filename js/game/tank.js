import { roll_fish_for_egg } from "../data/egg_types.js";
import { Egg } from "../entities/egg.js";
import { Fish } from "../entities/fish.js";

export class Tank {
    #element;
    #entity_layer;
    #on_fish_hatched;
    #eggs = new Set();
    #fish = new Set();

    constructor({ element, entity_layer, on_fish_hatched }) {
        this.#element = element;
        this.#entity_layer = entity_layer;
        this.#on_fish_hatched = on_fish_hatched;
    }

    contains_point(client_x, client_y) {
        const bounds = this.#element.getBoundingClientRect();
        return client_x >= bounds.left
            && client_x <= bounds.right
            && client_y >= bounds.top
            && client_y <= bounds.bottom;
    }

    drop_egg(egg_type, client_x, client_y) {
        const bounds = this.#element.getBoundingClientRect();
        const x = Math.max(24, Math.min(bounds.width - 24, client_x - bounds.left));
        const start_y = Math.max(12, Math.min(bounds.height - 120, client_y - bounds.top - 23));

        const egg = new Egg({
            egg_type,
            parent: this.#entity_layer,
            x,
            start_y,
            on_hatch: (hatched_egg) => this.#hatch_fish(hatched_egg)
        });

        this.#eggs.add(egg);
        egg.mount();
    }

    #add_fish(fish_type, { start_x, start_y }) {
        const fish = new Fish({
            fish_type,
            parent: this.#entity_layer,
            start_x,
            start_y,
            starts_grown: false
        });

        this.#fish.add(fish);
        fish.mount();
    }

    #hatch_fish(egg) {
        this.#eggs.delete(egg);

        const fish_type = roll_fish_for_egg(egg.egg_type);
        this.#add_fish(fish_type, {
            start_x: egg.x,
            start_y: Math.max(70, this.#entity_layer.clientHeight - 155)
        });

        this.#on_fish_hatched(fish_type);
    }
}
