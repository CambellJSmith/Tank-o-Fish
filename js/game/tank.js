import { DECORATION_ITEMS } from "../data/decorations.js?v=20260825-3";
import { EGG_TYPES, roll_fish_for_egg } from "../data/egg_types.js";
import { FISH_SPECIES } from "../data/fish_species.js";
import { SUBSTRATE_ITEMS } from "../data/substrates.js?v=20260825-3";
import { Egg } from "../entities/egg.js?v=20260825-3";
import { Fish } from "../entities/fish.js?v=20260825-3";
import { FoodPellet } from "../entities/food_pellet.js?v=20260825-3";
import { TankDecoration } from "../entities/tank_decoration.js?v=20260825-3";
import { TankSponge } from "../entities/tank_sponge.js?v=20260825-3";

const DIRT_PER_PATCH = 8;
const SPONGE_RADIUS = 28;
const MEDICINE_RADIUS = 66;
const MAX_CATCH_UP_STEPS = 10000;
const TARGET_CATCH_UP_STEP_SECONDS = 2;

const EGG_TYPES_BY_ID = new Map(EGG_TYPES.map((egg_type) => [egg_type.id, egg_type]));
const FISH_SPECIES_BY_ID = new Map(FISH_SPECIES.map((fish_type) => [fish_type.species_id, fish_type]));
const DECORATIONS_BY_ID = new Map(DECORATION_ITEMS.map((item) => [item.id, item]));
const SUBSTRATES_BY_ID = new Map(SUBSTRATE_ITEMS.map((item) => [item.id, item]));

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
    #sponges = new Set();
    #decorations = new Set();
    #dirt_patches = new Set();
    #substrate_element = null;
    #substrate_type = null;
    #selected_fish = null;
    #dirt_level = 0;
    #care_timer = null;
    #last_care_time = Date.now();
    #last_spray_visual_time = 0;

    constructor({ element, entity_layer, on_fish_hatched, on_status_change, on_fish_selected }) {
        this.#element = element;
        this.#entity_layer = entity_layer;
        this.#on_fish_hatched = on_fish_hatched;
        this.#on_status_change = on_status_change;
        this.#on_fish_selected = on_fish_selected;
        this.#element.style.setProperty("--tank-substrate-height", "0px");
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

    catch_up() {
        return this.#update_care();
    }

    get_state() {
        return {
            dirt_level: this.#dirt_level,
            substrate_id: this.#substrate_type?.id ?? null,
            eggs: Array.from(this.#eggs, (egg) => egg.get_state()),
            fish: Array.from(this.#fish, (fish) => fish.get_state()),
            food: Array.from(this.#food, (pellet) => pellet.get_state()),
            sponges: Array.from(this.#sponges, (sponge) => sponge.get_state()),
            decorations: Array.from(this.#decorations, (decoration) => decoration.get_state())
        };
    }

    restore_state(state, offline_ms = 0) {
        if (!state || typeof state !== "object") {
            return { offline_seconds: 0, hatched_fish_types: [] };
        }

        const safe_offline_ms = Math.max(0, Number.isFinite(offline_ms) ? offline_ms : 0);
        const saved_dirt_level = Number(state.dirt_level);
        this.#dirt_level = Number.isFinite(saved_dirt_level)
            ? Math.max(0, Math.min(100, saved_dirt_level))
            : 0;

        const substrate_type = SUBSTRATES_BY_ID.get(state.substrate_id);
        if (substrate_type) {
            this.#apply_substrate_type(substrate_type);
        }

        for (const decoration_state of Array.isArray(state.decorations) ? state.decorations : []) {
            const decoration_type = DECORATIONS_BY_ID.get(decoration_state?.decoration_id);
            if (!decoration_type) {
                continue;
            }
            const decoration = new TankDecoration({
                decoration_type,
                parent: this.#element,
                x: Number.isFinite(decoration_state.x) ? decoration_state.x : this.#element.clientWidth * 0.5
            });
            this.#decorations.add(decoration);
            decoration.mount();
        }

        for (const sponge_state of Array.isArray(state.sponges) ? state.sponges : []) {
            if (!Number.isFinite(sponge_state?.uses_remaining) || sponge_state.uses_remaining <= 0) {
                continue;
            }
            const bounds = this.#element.getBoundingClientRect();
            const sponge = new TankSponge({
                parent: this.#element,
                x: Math.max(24, Math.min(bounds.width - 24, Number(sponge_state.x) || 24)),
                y: Math.max(24, Math.min(bounds.height - 24, Number(sponge_state.y) || 24)),
                uses_remaining: sponge_state.uses_remaining,
                on_scrub: (scrub) => this.#scrub_with_sponge(scrub),
                on_exhausted: (spent_sponge) => this.#remove_sponge(spent_sponge)
            });
            this.#sponges.add(sponge);
            sponge.mount();
        }

        for (const fish_state of Array.isArray(state.fish) ? state.fish : []) {
            const fish_type = FISH_SPECIES_BY_ID.get(fish_state?.species_id);
            if (!fish_type) {
                continue;
            }
            this.#add_fish(fish_type, {
                start_x: Number(fish_state.x) || 80,
                start_y: Number(fish_state.y) || 80,
                state: fish_state,
                emit_status: false
            });
        }

        const saved_food = Array.isArray(state.food) ? state.food : [];
        if (safe_offline_ms > 0 && this.#fish.size > 0 && saved_food.length > 0) {
            this.#consume_saved_food(saved_food);
        } else {
            for (const pellet_state of saved_food) {
                if (!Number.isFinite(pellet_state?.x) || !Number.isFinite(pellet_state?.y)) {
                    continue;
                }
                const pellet = new FoodPellet({
                    parent: this.#entity_layer,
                    x: pellet_state.x,
                    y: pellet_state.y,
                    nutrition: Number.isFinite(pellet_state.nutrition) ? pellet_state.nutrition : 15
                });
                this.#food.add(pellet);
                pellet.mount();
            }
        }

        const egg_states = Array.isArray(state.eggs) ? state.eggs : [];
        const hatch_events = [];
        const eggs_still_waiting = [];
        for (const egg_state of egg_states) {
            const egg_type = EGG_TYPES_BY_ID.get(egg_state?.egg_type_id);
            if (!egg_type) {
                continue;
            }
            const remaining_hatch_ms = Number.isFinite(egg_state.remaining_hatch_ms)
                ? Math.max(0, egg_state.remaining_hatch_ms)
                : egg_type.hatch_time_ms;
            const normalized_state = {
                egg_type,
                x: Number.isFinite(egg_state.x) ? egg_state.x : this.#element.clientWidth * 0.5,
                remaining_hatch_ms
            };
            if (remaining_hatch_ms <= safe_offline_ms) {
                hatch_events.push(normalized_state);
            } else {
                eggs_still_waiting.push(normalized_state);
            }
        }

        hatch_events.sort((a, b) => a.remaining_hatch_ms - b.remaining_hatch_ms);
        const hatched_fish_types = [];
        let simulated_until_ms = 0;
        for (const hatch_event of hatch_events) {
            this.#simulate_care((hatch_event.remaining_hatch_ms - simulated_until_ms) / 1000);
            const fish_type = roll_fish_for_egg(hatch_event.egg_type);
            this.#add_fish(fish_type, {
                start_x: hatch_event.x,
                start_y: Math.max(70, this.#entity_layer.clientHeight - this.#substrate_height - 95),
                emit_status: false
            });
            hatched_fish_types.push(fish_type);
            simulated_until_ms = hatch_event.remaining_hatch_ms;
        }
        this.#simulate_care((safe_offline_ms - simulated_until_ms) / 1000);

        for (const waiting_egg of eggs_still_waiting) {
            this.#mount_restored_egg(
                waiting_egg.egg_type,
                waiting_egg.x,
                waiting_egg.remaining_hatch_ms - safe_offline_ms
            );
        }

        this.#ensure_dirt_patches();
        this.#sync_dirt_visuals();
        for (const fish of this.#fish) {
            fish.sync_visuals();
        }
        this.#assign_food_targets();
        this.#last_care_time = Date.now();
        this.#emit_status();

        return {
            offline_seconds: safe_offline_ms / 1000,
            hatched_fish_types
        };
    }

    drop_egg(egg_type, client_x, client_y) {
        const bounds = this.#element.getBoundingClientRect();
        const x = Math.max(24, Math.min(bounds.width - 24, client_x - bounds.left));
        const start_y = Math.max(12, Math.min(bounds.height - 70, client_y - bounds.top - 23));
        const egg = new Egg({
            egg_type,
            parent: this.#entity_layer,
            x,
            start_y,
            bottom_offset: this.#substrate_height,
            on_hatch: (hatched_egg) => this.#hatch_fish(hatched_egg)
        });

        this.#eggs.add(egg);
        egg.mount();
    }

    place_decoration(decoration_type, client_x, client_y) {
        if (!this.contains_point(client_x, client_y)) {
            return false;
        }

        const bounds = this.#element.getBoundingClientRect();
        const x = Math.max(34, Math.min(bounds.width - 34, client_x - bounds.left));
        const decoration = new TankDecoration({ decoration_type, parent: this.#element, x });
        this.#decorations.add(decoration);
        decoration.mount();
        return true;
    }

    set_substrate(substrate_type, client_x, client_y) {
        if (!this.contains_point(client_x, client_y)) {
            return false;
        }

        this.#apply_substrate_type(substrate_type);
        return true;
    }

    drop_food(client_x, client_y) {
        if (this.#fish.size === 0 || !this.contains_point(client_x, client_y)) {
            return 0;
        }

        const bounds = this.#element.getBoundingClientRect();
        const center_x = client_x - bounds.left;
        const center_y = client_y - bounds.top;
        const pellet_count = Math.min(36, Math.max(6, this.#fish.size * 3));
        const max_y = Math.max(18, bounds.height - this.#substrate_height - 20);

        for (let index = 0; index < pellet_count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 34;
            const x = Math.max(12, Math.min(bounds.width - 12, center_x + (Math.cos(angle) * radius)));
            const y = Math.max(18, Math.min(max_y, center_y + (Math.sin(angle) * radius)));
            const pellet = new FoodPellet({ parent: this.#entity_layer, x, y, nutrition: 15 });
            this.#food.add(pellet);
            pellet.mount();
        }

        this.#assign_food_targets();
        return pellet_count;
    }

    drop_sponge(client_x, client_y) {
        if (!this.contains_point(client_x, client_y)) {
            return 0;
        }

        const bounds = this.#element.getBoundingClientRect();
        const x = Math.max(24, Math.min(bounds.width - 24, client_x - bounds.left));
        const y = Math.max(24, Math.min(bounds.height - 24, client_y - bounds.top));
        const sponge = new TankSponge({
            parent: this.#element,
            x,
            y,
            on_scrub: (scrub) => this.#scrub_with_sponge(scrub),
            on_exhausted: (spent_sponge) => this.#remove_sponge(spent_sponge)
        });

        this.#sponges.add(sponge);
        sponge.mount();
        return sponge.uses_remaining;
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

    get #substrate_height() {
        return this.#substrate_type?.height_px ?? 0;
    }

    #apply_substrate_type(substrate_type) {
        this.#substrate_element?.remove();
        const substrate = document.createElement("div");
        substrate.className = `tank-substrate tank-substrate--${substrate_type.visual}`;
        substrate.style.height = `${substrate_type.height_px}px`;
        substrate.setAttribute("aria-label", substrate_type.name);
        substrate.setAttribute("aria-hidden", "true");
        this.#substrate_element = substrate;
        this.#substrate_type = substrate_type;
        this.#element.style.setProperty("--tank-substrate-height", `${substrate_type.height_px}px`);
        this.#element.append(substrate);

        for (const egg of this.#eggs) {
            egg.set_bottom_offset(substrate_type.height_px);
        }
    }

    #mount_restored_egg(egg_type, x, remaining_hatch_ms) {
        const bounds = this.#element.getBoundingClientRect();
        const safe_x = Math.max(24, Math.min(bounds.width - 24, x));
        const settled_y = Math.max(12, bounds.height - this.#substrate_height - 55);
        const egg = new Egg({
            egg_type,
            parent: this.#entity_layer,
            x: safe_x,
            start_y: settled_y,
            bottom_offset: this.#substrate_height,
            remaining_hatch_ms,
            on_hatch: (hatched_egg) => this.#hatch_fish(hatched_egg)
        });
        this.#eggs.add(egg);
        egg.mount();
    }

    #consume_saved_food(food_states) {
        const fish = Array.from(this.#fish);
        if (fish.length === 0) {
            return;
        }

        for (const pellet_state of food_states) {
            const target = fish.reduce((hungriest, candidate) => candidate.hunger > hungriest.hunger ? candidate : hungriest, fish[0]);
            target.feed(Number.isFinite(pellet_state?.nutrition) ? pellet_state.nutrition : 15);
            this.#dirt_level = Math.min(100, this.#dirt_level + 0.18);
        }
    }

    #scrub_with_sponge({ start_x, start_y, end_x, end_y, max_patch_completions }) {
        if (this.#dirt_patches.size === 0 || max_patch_completions <= 0) {
            return { removed_dirt: 0, cleaned_patches: 0 };
        }

        const travel_distance = Math.hypot(end_x - start_x, end_y - start_y);
        const scrub_power = 0.1 + Math.min(0.22, travel_distance / 120);
        let removed_dirt = 0;
        let cleaned_patches = 0;

        for (const patch of Array.from(this.#dirt_patches)) {
            if (cleaned_patches >= max_patch_completions) {
                break;
            }

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
                cleaned_patches += 1;
            }
        }

        if (removed_dirt > 0) {
            this.#dirt_level = Math.max(0, this.#dirt_level - removed_dirt);
            this.#sync_dirt_visuals();
            this.#emit_status();
        }

        return { removed_dirt, cleaned_patches };
    }

    #remove_sponge(sponge) {
        if (!this.#sponges.delete(sponge)) {
            return;
        }
        sponge.destroy();
    }

    #add_fish(fish_type, { start_x, start_y, state = null, emit_status = true }) {
        const fish = new Fish({
            fish_type,
            parent: this.#entity_layer,
            start_x,
            start_y,
            starts_grown: false,
            state,
            on_select: (selected_fish) => this.#select_fish(selected_fish),
            on_food_reached: (feeding_fish, food) => this.#eat_food(feeding_fish, food)
        });
        this.#fish.add(fish);
        fish.mount();
        this.#assign_food_targets();
        if (emit_status) {
            this.#emit_status();
        }
        return fish;
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
            start_y: Math.max(70, this.#entity_layer.clientHeight - this.#substrate_height - 95)
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
        const bottom_margin = Math.min(120, this.#substrate_height + 44);
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

    #simulate_care(total_seconds) {
        const safe_total_seconds = Math.max(0, Number.isFinite(total_seconds) ? total_seconds : 0);
        if (safe_total_seconds <= 0) {
            return;
        }

        const desired_steps = Math.max(1, Math.ceil(safe_total_seconds / TARGET_CATCH_UP_STEP_SECONDS));
        const step_count = Math.min(MAX_CATCH_UP_STEPS, desired_steps);
        const step_seconds = safe_total_seconds / step_count;
        for (let step = 0; step < step_count; step += 1) {
            this.#advance_care_step(step_seconds, false);
        }
    }

    #advance_care_step(delta_seconds, sync_fish_visuals) {
        const fish_count = this.#fish.size;
        if (fish_count > 0) {
            const dirt_rate = 0.035 + (fish_count * 0.035) + (Math.pow(fish_count, 1.3) * 0.012);
            this.#dirt_level = Math.min(100, this.#dirt_level + (dirt_rate * delta_seconds));
        }
        for (const fish of this.#fish) {
            fish.tick_care(delta_seconds, this.#dirt_level, sync_fish_visuals);
        }
    }

    #update_care() {
        const now = Date.now();
        const delta_seconds = Math.max(0, (now - this.#last_care_time) / 1000);
        this.#last_care_time = now;

        if (delta_seconds <= 2) {
            this.#advance_care_step(delta_seconds, true);
        } else {
            this.#simulate_care(delta_seconds);
            for (const fish of this.#fish) {
                fish.sync_visuals();
            }
        }

        this.#ensure_dirt_patches();
        this.#sync_dirt_visuals();
        this.#assign_food_targets();
        this.#emit_status();
        return delta_seconds;
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
