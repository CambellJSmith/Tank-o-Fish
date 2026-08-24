export class Fish {
    #fish_type;
    #parent;
    #element;
    #starts_grown;
    #x;
    #y;
    #target_x;
    #target_y;
    #speed;
    #age_ms;
    #hunger = 10 + (Math.random() * 8);
    #health = 100;
    #last_time = performance.now();
    #animation_frame = null;
    #target_timer = 0;

    constructor({ fish_type, parent, start_x, start_y, starts_grown = false }) {
        this.#fish_type = fish_type;
        this.#parent = parent;
        this.#starts_grown = starts_grown;
        this.#age_ms = starts_grown ? fish_type.growth_time_ms : 0;
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
                this.#element.style.setProperty("--growth-scale", "1");
            });
        }

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

    feed(amount) {
        this.#hunger = Math.max(0, this.#hunger - amount);
        this.#sync_care_visuals();
    }

    heal(amount) {
        this.#health = Math.min(100, this.#health + amount);
        this.#sync_care_visuals();
    }

    tick_care(delta_seconds, tank_dirt_level) {
        this.#age_ms += delta_seconds * 1000;

        const hunger_multiplier = this.is_growing ? this.#fish_type.growth_hunger_multiplier : 1;
        this.#hunger = Math.min(
            100,
            this.#hunger + (this.#fish_type.base_hunger_rate * hunger_multiplier * delta_seconds)
        );

        const hunger_pressure = Math.max(0, (this.#hunger - 78) / 22);
        const dirt_pressure = Math.max(0, (tank_dirt_level - 72) / 28);
        const damage_per_second = (hunger_pressure * 0.8) + (dirt_pressure * 0.65);

        if (damage_per_second > 0) {
            this.#health = Math.max(10, this.#health - (damage_per_second * delta_seconds));
        } else if (this.#hunger < 55 && tank_dirt_level < 60) {
            this.#health = Math.min(100, this.#health + (0.12 * delta_seconds));
        }

        this.#sync_care_visuals();
    }

    #create_element() {
        const element = document.createElement("div");
        element.className = "fish";
        element.style.setProperty("--growth-scale", this.#starts_grown ? "1" : "0.55");
        element.style.setProperty("--facing", "1");
        element.setAttribute("aria-label", this.#starts_grown ? this.#fish_type.name : `baby_${this.#fish_type.name}`);

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
        this.#target_timer -= delta_seconds;

        if (this.#target_timer <= 0) {
            this.#choose_target();
        }

        const delta_x = this.#target_x - this.#x;
        const delta_y = this.#target_y - this.#y;
        const distance = Math.hypot(delta_x, delta_y);

        if (distance > 1) {
            const step = Math.min(distance, this.#speed * delta_seconds);
            this.#x += (delta_x / distance) * step;
            this.#y += (delta_y / distance) * step;
            this.#element.style.setProperty("--facing", delta_x < 0 ? "-1" : "1");
            this.#set_position();
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
    }
}
