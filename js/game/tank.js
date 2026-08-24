import { roll_fish_for_egg } from "../data/egg_types.js";
import { Egg } from "../entities/egg.js";
import { Fish } from "../entities/fish.js";

export class Tank {
    #element;
    #entity_layer;
    #on_fish_hatched;
    #on_status_change;
    #eggs = new Set();
    #fish = new Set();
    #dirt_level = 0;
    #care_timer = null;
    #last_care_time = performance.now();

    constructor({ element, entity_layer, on_fish_hatched, on_status_change }) {
        this.#element = element;
        this.#entity_layer = entity_layer;
        this.#on_fish_hatched = on_fish_hatched;
        this.#on_status_change = on_status_change;
        this.#care_timer = window.setInterval(() => this.#update_care(), 500);
        this.#emit_status();
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

    feed() {
        if (this.#fish.size === 0) {
            return 0;
        }

        for (const fish of this.#fish) {
            fish.feed(46);
        }

        this.#dirt_level = Math.min(100, this.#dirt_level + (this.#fish.size * 0.45));
        this.#emit_status();
        return this.#fish.size;
    }

    clean() {
        const removed_dirt = this.#dirt_level;
        if (removed_dirt < 1) {
            return 0;
        }

        this.#dirt_level = 0;
        this.#emit_status();
        return removed_dirt;
    }

    medicate() {
        let target_fish = null;

        for (const fish of this.#fish) {
            if (!target_fish || fish.health < target_fish.health) {
                target_fish = fish;
            }
        }

        if (!target_fish || target_fish.health >= 95) {
            return null;
        }

        target_fish.heal(45);
        this.#emit_status();
        return target_fish.fish_type;
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
        this.#emit_status();
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

    #update_care() {
        const now = performance.now();
        const delta_seconds = Math.min((now - this.#last_care_time) / 1000, 2);
        this.#last_care_time = now;
        const fish_count = this.#fish.size;

        if (fish_count > 0) {
            const dirt_rate = 0.035
                + (fish_count * 0.035)
                + (Math.pow(fish_count, 1.3) * 0.012);
            this.#dirt_level = Math.min(100, this.#dirt_level + (dirt_rate * delta_seconds));
        }

        for (const fish of this.#fish) {
            fish.tick_care(delta_seconds, this.#dirt_level);
        }

        this.#emit_status();
    }

    #emit_status() {
        const fish_count = this.#fish.size;
        let total_hunger = 0;
        let total_health = 0;
        let growing_count = 0;

        for (const fish of this.#fish) {
            total_hunger += fish.hunger;
            total_health += fish.health;
            if (fish.is_growing) {
                growing_count += 1;
            }
        }

        const average_hunger = fish_count > 0 ? total_hunger / fish_count : 0;
        const average_health = fish_count > 0 ? total_health / fish_count : 100;
        const cleanliness = 100 - this.#dirt_level;
        this.#element.style.setProperty("--tank-dirt-opacity", String((this.#dirt_level / 100) * 0.68));

        this.#on_status_change({
            fish_count,
            growing_count,
            average_hunger,
            average_health,
            cleanliness,
            dirt_level: this.#dirt_level
        });
    }
}
