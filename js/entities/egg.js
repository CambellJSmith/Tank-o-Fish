export class Egg {
    #egg_type;
    #parent;
    #element;
    #x;
    #start_y;
    #bottom_offset;
    #on_hatch;
    #hatch_timer = null;
    #wiggle_timer = null;

    constructor({ egg_type, parent, x, start_y, bottom_offset = 0, on_hatch }) {
        this.#egg_type = egg_type;
        this.#parent = parent;
        this.#x = x;
        this.#start_y = start_y;
        this.#bottom_offset = bottom_offset;
        this.#on_hatch = on_hatch;
        this.#element = this.#create_element();
    }

    mount() {
        this.#element.style.left = `${this.#x}px`;
        this.#element.style.top = `${this.#start_y}px`;
        this.#parent.append(this.#element);

        requestAnimationFrame(() => {
            this.#sync_settled_position();
        });

        window.setTimeout(() => this.#element.classList.add("is-settled"), 680);

        const wiggle_delay = Math.max(0, this.#egg_type.hatch_time_ms - 1800);
        this.#wiggle_timer = window.setTimeout(() => this.#element.classList.add("is-hatching"), wiggle_delay);
        this.#hatch_timer = window.setTimeout(() => this.#hatch(), this.#egg_type.hatch_time_ms);
    }

    get x() {
        return this.#x;
    }

    get egg_type() {
        return this.#egg_type;
    }

    set_bottom_offset(bottom_offset) {
        this.#bottom_offset = Math.max(0, bottom_offset);
        if (this.#element.isConnected) {
            this.#sync_settled_position();
        }
    }

    #create_element() {
        const element = document.createElement("div");
        element.className = "tank-egg";
        element.style.setProperty("--egg-color", this.#egg_type.egg_color);
        element.style.setProperty("--egg-spot", this.#egg_type.egg_spot);
        element.setAttribute("aria-label", `${this.#egg_type.name} waiting to hatch`);
        return element;
    }

    #sync_settled_position() {
        const egg_height = this.#element.offsetHeight || 44;
        const settled_y = Math.max(0, this.#parent.clientHeight - this.#bottom_offset - egg_height - 4);
        this.#element.style.top = `${settled_y}px`;
    }

    #hatch() {
        window.clearTimeout(this.#wiggle_timer);
        window.clearTimeout(this.#hatch_timer);
        this.#element.classList.remove("is-hatching");
        this.#element.classList.add("is-hatched");

        window.setTimeout(() => {
            this.#element.remove();
            this.#on_hatch(this);
        }, 320);
    }
}
