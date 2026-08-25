export class Egg {
    #egg_type;
    #parent;
    #element;
    #x;
    #start_y;
    #bottom_offset;
    #remaining_hatch_ms;
    #hatch_at_ms = null;
    #on_hatch;
    #hatch_timer = null;
    #wiggle_timer = null;
    #settle_timer = null;
    #finish_hatch_timer = null;
    #is_cancelled = false;

    constructor({ egg_type, parent, x, start_y, bottom_offset = 0, remaining_hatch_ms = null, on_hatch }) {
        this.#egg_type = egg_type;
        this.#parent = parent;
        this.#x = x;
        this.#start_y = start_y;
        this.#bottom_offset = bottom_offset;
        this.#remaining_hatch_ms = Number.isFinite(remaining_hatch_ms)
            ? Math.max(0, remaining_hatch_ms)
            : egg_type.hatch_time_ms;
        this.#on_hatch = on_hatch;
        this.#element = this.#create_element();
    }

    mount() {
        this.#element.style.left = `${this.#x}px`;
        this.#element.style.top = `${this.#start_y}px`;
        this.#parent.append(this.#element);
        this.#hatch_at_ms = Date.now() + this.#remaining_hatch_ms;

        requestAnimationFrame(() => {
            if (!this.#is_cancelled) {
                this.#sync_settled_position();
            }
        });

        this.#settle_timer = window.setTimeout(
            () => this.#element.classList.add("is-settled"),
            Math.min(680, this.#remaining_hatch_ms)
        );

        const wiggle_delay = Math.max(0, this.#remaining_hatch_ms - 1800);
        this.#wiggle_timer = window.setTimeout(() => this.#element.classList.add("is-hatching"), wiggle_delay);
        this.#hatch_timer = window.setTimeout(() => this.#hatch(), this.#remaining_hatch_ms);
    }

    get x() {
        return this.#x;
    }

    get egg_type() {
        return this.#egg_type;
    }

    get hatch_at_ms() {
        return this.#hatch_at_ms;
    }

    get_state() {
        const remaining_hatch_ms = this.#hatch_at_ms === null
            ? this.#remaining_hatch_ms
            : Math.max(0, this.#hatch_at_ms - Date.now());
        return {
            egg_type_id: this.#egg_type.id,
            x: this.#x,
            remaining_hatch_ms
        };
    }

    cancel() {
        this.#is_cancelled = true;
        window.clearTimeout(this.#settle_timer);
        window.clearTimeout(this.#wiggle_timer);
        window.clearTimeout(this.#hatch_timer);
        window.clearTimeout(this.#finish_hatch_timer);
        this.#element.remove();
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
        if (this.#is_cancelled) {
            return;
        }

        window.clearTimeout(this.#wiggle_timer);
        window.clearTimeout(this.#hatch_timer);
        this.#element.classList.remove("is-hatching");
        this.#element.classList.add("is-hatched");

        this.#finish_hatch_timer = window.setTimeout(() => {
            if (this.#is_cancelled) {
                return;
            }
            this.#element.remove();
            this.#on_hatch(this);
        }, 320);
    }
}
