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
    #last_time = performance.now();
    #animation_frame = null;
    #target_timer = 0;

    constructor({ fish_type, parent, start_x, start_y, starts_grown = false }) {
        this.#fish_type = fish_type;
        this.#parent = parent;
        this.#starts_grown = starts_grown;
        this.#x = start_x - 41;
        this.#y = start_y;
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
}
