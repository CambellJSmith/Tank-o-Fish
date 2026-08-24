export class Fish {
    #fish_type;
    #parent;
    #element;
    #x;
    #y;
    #target_x;
    #target_y;
    #speed;
    #last_time = performance.now();
    #animation_frame = null;
    #target_timer = 0;

    constructor({ fish_type, parent, start_x, start_y }) {
        this.#fish_type = fish_type;
        this.#parent = parent;
        this.#x = start_x - 35;
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

        requestAnimationFrame(() => {
            const growth = this.#element.querySelector(".fish-growth");
            growth.style.transitionDuration = `${this.#fish_type.growth_time_ms}ms`;
            this.#element.style.setProperty("--growth-scale", "1");
        });

        this.#animation_frame = requestAnimationFrame((time) => this.#update(time));
    }

    #create_element() {
        const element = document.createElement("div");
        element.className = "fish";
        element.style.setProperty("--fish-hue", String(this.#fish_type.hue));
        element.style.setProperty("--fish-accent-hue", String(this.#fish_type.accent_hue));
        element.style.setProperty("--growth-scale", "0.55");
        element.style.setProperty("--facing", "1");
        element.setAttribute("aria-label", `baby ${this.#fish_type.name}`);
        element.innerHTML = `
            <div class="fish-growth">
                <div class="fish-facing">
                    <div class="fish-tail"></div>
                    <div class="fish-body"></div>
                    <div class="fish-fin"></div>
                    <div class="fish-eye"></div>
                </div>
            </div>
        `;
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
        const max_x = Math.max(24, this.#parent.clientWidth - 84);
        const max_y = Math.max(90, this.#parent.clientHeight - 150);
        this.#target_x = 22 + Math.random() * Math.max(1, max_x - 22);
        this.#target_y = 44 + Math.random() * Math.max(1, max_y - 44);
        this.#target_timer = 2.4 + Math.random() * 3.6;
    }

    #set_position() {
        this.#element.style.left = `${this.#x}px`;
        this.#element.style.top = `${this.#y}px`;
    }
}
