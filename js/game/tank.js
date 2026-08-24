import { roll_fish_for_egg } from "../data/egg_types.js";
import { Egg } from "../entities/egg.js";
import { Fish } from "../entities/fish.js";
import { FoodPellet } from "../entities/food_pellet.js";

const DIRT_PER_PATCH = 8;
const SPONGE_RADIUS = 28;
const MEDICINE_RADIUS = 66;

function distance_to_segment(point_x, point_y, start_x, start_y, end_x, end_y) {
    const segment_x = end_x - start_x;
    const segment_y = end_y - start_y;
    const segment_length_squared = (segment_x * segment_x) + (segment_y * segment_y);

    if (segment_length_squared === 0) {
        return Math.hypot(point_x - start_x, point_y - start_y);
    }

    const projection = Math.max(0, Math.min(
        1,
        (((point_x - start_x) * segment_x) + ((point_y - start_y) * segment_y)) / segment_length_squared
    ));
    const closest_x = start_x + (segment_x * projection);
    const closest_y = start_y + (segment_y * projection);
    return Math.hypot(point_x - closest_x, point_y - closest_y);
}

export class Tank {
    #element;
    #entity_layer;
    #on_fish_hatched;
    #on_status_change;
    #on_fish_selected;
    #eggs = new Set();
    #fish = new Set();
    #food = new Set();
    #dirt_patches = new Set();
    #selected_fish = null;
    #dirt_level = 0;
    #care_timer = null;
    #last_care_time = performance.now();
    #last_spray_visual_time = 0;

    constructor({ element, entity_layer, on_fish_hatched, on_status_change, on_fish_selected }) {
        this.#element = element;
        this.#entity_layer = entity_layer;
        this.#on_fish_hatched = on_fish_hatched;
        this.#on_status_change = on_status_change;
        this.#on_fish_selected = on_fish_selected;
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

    drop_food(client_x, client_y) {
        if (this.#fish.size === 0 || !this.contains_point(client_x, client_y)) {
            return 0;
        }

        const bounds = this.#element.getBoundingClientRect();
        const center_x = client_x - bounds.left;
        const center_y = client_y - bounds.top;
        const pellet_count = Math.min(36, Math.max(6, this.#fish.size * 3));

        for (let index = 0; index < pellet_count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 34;
            const x = Math.max(12, Math.min(bounds.width - 12, center_x + (Math.cos(angle) * radius)));
            const y = Math.max(18, Math.min(bounds.height - 82, center_y + (Math.sin(angle) * radius)));
            const pellet = new FoodPellet({ parent: this.#entity_layer, x, y, nutrition: 15 });
            this.#food.add(pellet);
            pellet.mount();
        }

        this.#assign_food_targets();
        return pellet_count;
    }

    scrub_at(client_x, client_y, previous_client_x, previous_client_y) {
        if (!this.contains_point(client_x, client_y) || this.#dirt_patches.size === 0) {
            return 0;
        }

        const bounds = this.#element.getBoundingClientRect();
        const end_x = client_x - bounds.left;
        const end_y = client_y - bounds.top;
        const previous_is_inside = this.contains_point(previous_client_x, previous_client_y);
        const start_x = previous_is_inside ? previous_client_x - bounds.left : end_x;
        const start_y = previous_is_inside ? previous_client_y - bounds.top : end_y;
        const travel_distance = Math.hypot(end_x - start_x, end_y - start_y);
        const scrub_power = 0.1 + Math.min(0.22, travel_distance / 120);
        let removed_dirt = 0;

        for (const patch of Array.from(this.#dirt_patches)) {
            const hit_distance = distance_to_segment(patch.x, patch.y, start_x, start_y, end_x, end_y);
            if (hit_distance > (patch.size * 0.5) + SPONGE_RADIUS) {
                continue;
            }

            const previous_strength = patch.strength;
            patch.strength = Math.max(0, patch.strength - scrub_power);
            removed_dirt += (previous_strength - patch.strength) * DIRT_PER_PATCH;
            patch.element.style.setProperty("--patch-strength", String(patch.strength));

            if (patch.strength <= 0) {
                patch.element.remove();
                this.#dirt_patches.delete(patch);
            }
        }

        if (removed_dirt > 0) {
            this.#dirt_level = Math.max(0, this.#dirt_level - removed_dirt);
            this.#sync_dirt_visuals();
            this.#emit_status();
        }

        return removed_dirt;
    }

    spray_medicine_at(client_x, client_y, previous_client_x, previous_client_y) {
        if (!this.contains_point(client_x, client_y)) {
            return { sprayed: false, cured_count: 0 };
        }

        const bounds = this.#element.getBoundingClientRect();
        const end_x = client_x - bounds.left;
        const end_y = client_y - bounds.top;
        const previous_is_inside = this.contains_point(previous_client_x, previous_client_y);
        const start_x = previous_is_inside ? previous_client_x - bounds.left : end_x;
        const start_y = previous_is_inside ? previous_client_y - bounds.top : end_y;
        const now = performance.now();

        if (now - this.#last_spray_visual_time >= 45) {
            this.#last_spray_visual_time = now;
            this.#create_medicine_spray(end_x, end_y);
        }

        let cured_count = 0;
        for (const fish of this.#fish) {
            if (!fish.is_ill) {
                continue;
            }
            const center = fish.center;
            const hit_distance = distance_to_segment(center.x, center.y, start_x, start_y, end_x, end_y);
            if (hit_distance <= MEDICINE_RADIUS && fish.cure_illness()) {
                cured_count += 1;
            }
        }

        if (cured_count > 0) {
            this.#emit_status();
        }
        return { sprayed: true, cured_count };
    }

    clear_selection() {
        if (!this.#selected_fish) {
            return;
        }
        this.#selected_fish.set_selected(false);
        this.#selected_fish = null;
        this.#on_fish_selected(null);
    }

    sell_selected_fish() {
        if (!this.#selected_fish) {
            return null;
        }

        const sold_fish = this.#selected_fish;
        const sold_info = sold_fish.get_info();
        this.#selected_fish = null;
        this.#fish.delete(sold_fish);
        sold_fish.destroy();
        this.#on_fish_selected(null);
        this.#assign_food_targets();
        this.#emit_status();
        return sold_info;
    }

    #add_fish(fish_type, { start_x, start_y }) {
        const fish = new Fish({
            fish_type,
            parent: this.#entity_layer,
            start_x,
            start_y,
            starts_grown: false,
            on_select: (selected_fish) => this.#select_fish(selected_fish),
            on_food_reached: (feeding_fish, food) => this.#eat_food(feeding_fish, food)
        });
        this.#fish.add(fish);
        fish.mount();
        this.#assign_food_targets();
        this.#emit_status();
    }

    #select_fish(fish) {
        if (this.#selected_fish === fish) {
            this.#on_fish_selected(fish.get_info());
            return;
        }
        this.#selected_fish?.set_selected(false);
        this.#selected_fish = fish;
        this.#selected_fish.set_selected(true);
        this.#on_fish_selected(this.#selected_fish.get_info());
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

    #eat_food(fish, pellet) {
        if (!this.#food.has(pellet) || !pellet.consume()) {
            this.#assign_food_targets();
            return;
        }
        this.#food.delete(pellet);
        fish.feed(pellet.nutrition);
        this.#add_dirt(0.18);
        for (const other_fish of this.#fish) {
            if (other_fish.food_target === pellet) {
                other_fish.clear_food_target(pellet);
            }
        }
        this.#assign_food_targets();
        this.#emit_status();
    }

    #assign_food_targets() {
        const pellets = Array.from(this.#food).filter((pellet) => !pellet.is_consumed);
        if (pellets.length === 0) {
            for (const fish of this.#fish) {
                fish.clear_food_target();
            }
            return;
        }

        const already_targeted = new Set();
        for (const fish of this.#fish) {
            if (fish.food_target && !fish.food_target.is_consumed) {
                already_targeted.add(fish.food_target);
            }
        }
        const free_pellets = pellets.filter((pellet) => !already_targeted.has(pellet));
        let shared_index = 0;
        for (const fish of this.#fish) {
            if (fish.food_target && !fish.food_target.is_consumed) {
                continue;
            }
            const target = free_pellets.shift() ?? pellets[shared_index % pellets.length];
            shared_index += 1;
            fish.set_food_target(target);
        }
    }

    #add_dirt(amount) {
        this.#dirt_level = Math.min(100, this.#dirt_level + amount);
        this.#ensure_dirt_patches();
        this.#sync_dirt_visuals();
    }

    #ensure_dirt_patches() {
        const desired_count = this.#dirt_level < 2 ? 0 : Math.min(12, Math.ceil(this.#dirt_level / DIRT_PER_PATCH));
        while (this.#dirt_patches.size < desired_count) {
            this.#create_dirt_patch();
        }
    }

    #create_dirt_patch() {
        const width = Math.max(1, this.#element.clientWidth);
        const height = Math.max(1, this.#element.clientHeight);
        const horizontal_margin = Math.min(36, width * 0.14);
        const top_margin = Math.min(48, height * 0.14);
        const bottom_margin = Math.min(102, height * 0.22);
        const size = Math.min(74, Math.max(38, width * (0.12 + (Math.random() * 0.08))));
        const x = horizontal_margin + (Math.random() * Math.max(1, width - (horizontal_margin * 2)));
        const y = top_margin + (Math.random() * Math.max(1, height - top_margin - bottom_margin));
        const element = document.createElement("span");
        const patch = { element, x, y, size, strength: 1 };
        element.className = "tank-dirt-patch";
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        element.style.width = `${size}px`;
        element.style.height = `${size * (0.58 + (Math.random() * 0.28))}px`;
        element.style.setProperty("--patch-strength", "1");
        element.style.setProperty("--patch-rotation", `${-22 + (Math.random() * 44)}deg`);
        element.setAttribute("aria-hidden", "true");
        this.#dirt_patches.add(patch);
        this.#element.append(element);
    }

    #create_medicine_spray(local_x, local_y) {
        const spray = document.createElement("span");
        spray.className = "medicine-spray";
        spray.style.left = `${local_x}px`;
        spray.style.top = `${local_y}px`;
        spray.setAttribute("aria-hidden", "true");
        this.#element.append(spray);
        window.setTimeout(() => spray.remove(), 480);
    }

    #update_care() {
        const now = performance.now();
        const delta_seconds = Math.min((now - this.#last_care_time) / 1000, 2);
        this.#last_care_time = now;
        const fish_count = this.#fish.size;
        if (fish_count > 0) {
            const dirt_rate = 0.035 + (fish_count * 0.035) + (Math.pow(fish_count, 1.3) * 0.012);
            this.#add_dirt(dirt_rate * delta_seconds);
        }
        for (const fish of this.#fish) {
            fish.tick_care(delta_seconds, this.#dirt_level);
        }
        this.#assign_food_targets();
        this.#emit_status();
    }

    #sync_dirt_visuals() {
        this.#element.style.setProperty("--tank-dirt-opacity", String((this.#dirt_level / 100) * 0.68));
    }

    #emit_status() {
        const fish_count = this.#fish.size;
        let total_hunger = 0;
        let total_health = 0;
        let growing_count = 0;
        let ill_count = 0;
        for (const fish of this.#fish) {
            total_hunger += fish.hunger;
            total_health += fish.health;
            if (fish.is_growing) {
                growing_count += 1;
            }
            if (fish.is_ill) {
                ill_count += 1;
            }
        }
        const average_hunger = fish_count > 0 ? total_hunger / fish_count : 0;
        const average_health = fish_count > 0 ? total_health / fish_count : 100;
        const cleanliness = 100 - this.#dirt_level;
        this.#sync_dirt_visuals();
        this.#on_status_change({ fish_count, growing_count, ill_count, average_hunger, average_health, cleanliness, dirt_level: this.#dirt_level });
        if (this.#selected_fish) {
            this.#on_fish_selected(this.#selected_fish.get_info());
        }
    }
}
