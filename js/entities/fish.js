import { calculate_fish_sale_value } from "../data/fish_value.js";

export class Fish {
    #fish_type;
    #parent;
    #element;
    #starts_grown;
    #on_select;
    #on_food_reached;
    #food_target = null;
    #x;
    #y;
    #target_x;
    #target_y;
    #speed;
    #age_ms;
    #individual_size_factor;
    #reference_adult_weight_g;
    #weight_g;
    #hunger = 10 + (Math.random() * 8);
    #health = 100;
    #illness_risk = 0;
    #illness_count = 0;
    #is_ill = false;
    #last_time = performance.now();
    #animation_frame = null;
    #target_timer = 0;

    constructor({ fish_type, parent, start_x, start_y, starts_grown = false, on_select, on_food_reached }) {
        this.#fish_type = fish_type;
        this.#parent = parent;
        this.#starts_grown = starts_grown;
        this.#on_select = on_select;
        this.#on_food_reached = on_food_reached;
        this.#age_ms = starts_grown ? fish_type.growth_time_ms : 0;
        this.#individual_size_factor = 0.88 + (Math.random() * 0.24);
        const individual_weight_factor = 0.86 + (Math.random() * 0.28);
        this.#reference_adult_weight_g = fish_type.base_adult_weight_g
            * Math.pow(this.#individual_size_factor, 3)
            * individual_weight_factor;
        this.#weight_g = this.#reference_adult_weight_g * (starts_grown ? 1 : 0.28);
        this.#x = Math.max(0, start_x - 41);
        this.#y = Math.max(0, start_y);
        this.#target_x = this.#x;
        this.#target_y = this.#y;
        this.#speed = 24 + Math.random() * 12;
        this.#element = this.#create_element();
    }

    mount() {
        this.#parent.append(this.#element);
        this.#set_position();
        this.#choose_target();

        if (!this.#starts_grown) {
            requestAnimationFrame(() => {
                const growth = this.#element.querySelector(".fish-growth");
                growth.style.transitionDuration = `${this.#fish_type.growth_time_ms}ms`;
                this.#element.style.setProperty("--growth-scale", String(this.#individual_size_factor));
            });
        }

        this.#sync_care_visuals();
        this.#animation_frame = requestAnimationFrame((time) => this.#update(time));
    }

    get fish_type() {
        return this.#fish_type;
    }

    get hunger() {
        return this.#hunger;
    }

    get health() {
        return this.#health;
    }

    get is_growing() {
        return this.#age_ms < this.#fish_type.growth_time_ms;
    }

    get is_ill() {
        return this.#is_ill;
    }

    get food_target() {
        return this.#food_target;
    }

    get center() {
        return {
            x: this.#x + 41,
            y: this.#y + 30
        };
    }

    get_info() {
        const growth_progress = Math.min(100, (this.#age_ms / this.#fish_type.growth_time_ms) * 100);
        const growth_fraction = growth_progress / 100;
        const hunger_multiplier = this.is_growing ? this.#fish_type.growth_hunger_multiplier : 1;
        const current_hunger_rate = this.#fish_type.base_hunger_rate * hunger_multiplier;
        const length_cm = this.#fish_type.base_adult_length_cm
            * this.#individual_size_factor
            * (0.55 + (growth_fraction * 0.45));
        const sale_value = calculate_fish_sale_value({
            base_value: this.#fish_type.base_value,
            rarity_multiplier: this.#fish_type.rarity.multiplier,
            growth_progress,
            health: this.#health,
            illness_count: this.#illness_count,
            size_factor: this.#individual_size_factor,
            weight_g: this.#weight_g,
            reference_adult_weight_g: this.#reference_adult_weight_g
        });

        return {
            species_id: this.#fish_type.species_id,
            name: this.#fish_type.name,
            sprite: this.#fish_type.sprite,
            sprite_number: this.#fish_type.sprite_number,
            rarity: this.#fish_type.rarity.name,
            hunger: this.#hunger,
            health: this.#health,
            is_ill: this.#is_ill,
            illness_count: this.#illness_count,
            is_growing: this.is_growing,
            growth_progress,
            hunger_per_minute: current_hunger_rate * 60,
            size_factor: this.#individual_size_factor,
            size_percent: this.#individual_size_factor * 100,
            length_cm,
            weight_g: this.#weight_g,
            sale_value
        };
    }

    set_selected(is_selected) {
        this.#element.classList.toggle("is-selected", is_selected);
        this.#element.setAttribute("aria-pressed", String(is_selected));
    }

    set_food_target(food_target) {
        if (!food_target || food_target.is_consumed) {
            return;
        }

        this.#food_target = food_target;
        this.#target_x = Math.max(0, food_target.x - 41);
        this.#target_y = Math.max(0, food_target.y - 30);
        this.#target_timer = Number.POSITIVE_INFINITY;
    }

    clear_food_target(food_target = null) {
        if (food_target && this.#food_target !== food_target) {
            return;
        }

        this.#food_target = null;
        this.#target_timer = 0;
    }

    feed(amount) {
        this.#hunger = Math.max(0, this.#hunger - amount);
        this.#sync_care_visuals();
    }

    cure_illness() {
        if (!this.#is_ill) {
            return false;
        }

        this.#is_ill = false;
        this.#illness_risk = 15;
        this.#sync_care_visuals();
        return true;
    }

    destroy() {
        if (this.#animation_frame !== null) {
            cancelAnimationFrame(this.#animation_frame);
            this.#animation_frame = null;
        }

        this.#food_target = null;
        this.#element.remove();
    }

    tick_care(delta_seconds, tank_dirt_level) {
        this.#age_ms += delta_seconds * 1000;
        const growth_progress = Math.min(1, this.#age_ms / this.#fish_type.growth_time_ms);
        const growth_weight_target = this.#reference_adult_weight_g
            * (0.28 + (Math.pow(growth_progress, 1.25) * 0.72));

        if (this.#weight_g < growth_weight_target) {
            this.#weight_g = Math.min(growth_weight_target, this.#weight_g + ((growth_weight_target - this.#weight_g) * 0.35));
        }

        if (!this.is_growing) {
            const mature_condition_multiplier = this.#is_ill
                ? 0.45
                : this.#hunger >= 75
                    ? 0.65
                    : 1;
            const weight_gain_per_second = (this.#fish_type.adult_weight_gain_per_minute / 60)
                * this.#individual_size_factor
                * mature_condition_multiplier;
            this.#weight_g += weight_gain_per_second * delta_seconds;
        }

        const hunger_multiplier = this.is_growing ? this.#fish_type.growth_hunger_multiplier : 1;
        this.#hunger = Math.min(
            100,
            this.#hunger + (this.#fish_type.base_hunger_rate * hunger_multiplier * delta_seconds)
        );

        const underfed_pressure = Math.max(0, (this.#hunger - 65) / 35);
        const dirt_illness_pressure = Math.max(0, (tank_dirt_level - 58) / 42);
        const illness_pressure = (underfed_pressure * 0.75) + (dirt_illness_pressure * 0.9);

        if (!this.#is_ill) {
            if (illness_pressure > 0) {
                this.#illness_risk = Math.min(100, this.#illness_risk + (illness_pressure * delta_seconds));
            } else {
                this.#illness_risk = Math.max(0, this.#illness_risk - (0.18 * delta_seconds));
            }

            if (this.#illness_risk >= 100) {
                this.#is_ill = true;
                this.#illness_count += 1;
            }
        }

        const hunger_damage = Math.max(0, (this.#hunger - 85) / 15) * 0.45;
        const dirt_damage = Math.max(0, (tank_dirt_level - 82) / 18) * 0.35;
        const illness_damage = this.#is_ill ? 0.22 : 0;
        const damage_per_second = hunger_damage + dirt_damage + illness_damage;

        if (damage_per_second > 0) {
            this.#health = Math.max(10, this.#health - (damage_per_second * delta_seconds));
        } else if (!this.#is_ill && this.#hunger < 55 && tank_dirt_level < 60) {
            this.#health = Math.min(100, this.#health + (0.1 * delta_seconds));
        }

        this.#sync_care_visuals();
    }

    #create_element() {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "fish";
        const starting_scale = this.#individual_size_factor * (this.#starts_grown ? 1 : 0.55);
        element.style.setProperty("--growth-scale", String(starting_scale));
        element.style.setProperty("--facing", "1");
        element.setAttribute("aria-label", `inspect_${this.#fish_type.name}`);
        element.setAttribute("aria-pressed", "false");
        element.addEventListener("click", () => this.#on_select?.(this));

        const growth = document.createElement("div");
        growth.className = "fish-growth";

        const facing = document.createElement("div");
        facing.className = "fish-facing";

        const image = document.createElement("img");
        image.className = "fish-sprite";
        image.src = this.#fish_type.sprite;
        image.alt = "";
        image.draggable = false;

        facing.append(image);
        growth.append(facing);
        element.append(growth);
        return element;
    }

    #update(time) {
        const delta_seconds = Math.min((time - this.#last_time) / 1000, 0.05);
        this.#last_time = time;

        if (this.#food_target?.is_consumed) {
            this.clear_food_target(this.#food_target);
        }

        if (!this.#food_target) {
            this.#target_timer -= delta_seconds;
            if (this.#target_timer <= 0) {
                this.#choose_target();
            }
        }

        const delta_x = this.#target_x - this.#x;
        const delta_y = this.#target_y - this.#y;
        const distance = Math.hypot(delta_x, delta_y);

        if (distance > 1) {
            const movement_speed = this.#food_target ? this.#speed * 1.8 : this.#speed;
            const step = Math.min(distance, movement_speed * delta_seconds);
            this.#x += (delta_x / distance) * step;
            this.#y += (delta_y / distance) * step;
            this.#element.style.setProperty("--facing", delta_x < 0 ? "-1" : "1");
            this.#set_position();
        }

        if (this.#food_target && distance <= 9) {
            const reached_food = this.#food_target;
            this.#food_target = null;
            this.#target_timer = 0;
            this.#on_food_reached?.(this, reached_food);
        }

        this.#animation_frame = requestAnimationFrame((next_time) => this.#update(next_time));
    }

    #choose_target() {
        const max_x = Math.max(24, this.#parent.clientWidth - 94);
        const max_y = Math.max(90, this.#parent.clientHeight - 160);
        this.#target_x = 24 + Math.random() * Math.max(1, max_x - 24);
        this.#target_y = 44 + Math.random() * Math.max(1, max_y - 44);
        this.#target_timer = 2.4 + Math.random() * 3.6;
    }

    #set_position() {
        this.#element.style.transform = `translate3d(${this.#x}px, ${this.#y}px, 0)`;
    }

    #sync_care_visuals() {
        const health_opacity = 0.58 + ((this.#health / 100) * 0.42);
        this.#element.style.opacity = String(health_opacity);
        this.#element.classList.toggle("is-hungry", this.#hunger >= 72);
        this.#element.classList.toggle("is-unwell", this.#health < 65);
        this.#element.classList.toggle("is-ill", this.#is_ill);
    }
}
