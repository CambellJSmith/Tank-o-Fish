export const SPONGE_MAX_CLEANS = 25;

export class TankSponge {
    #parent;
    #element;
    #on_scrub;
    #on_exhausted;
    #x;
    #y;
    #uses_remaining;
    #active_pointer_id = null;

    constructor({ parent, x, y, uses_remaining = SPONGE_MAX_CLEANS, on_scrub, on_exhausted }) {
        this.#parent = parent;
        this.#x = x;
        this.#y = y;
        this.#uses_remaining = Number.isFinite(uses_remaining)
            ? Math.max(0, Math.min(SPONGE_MAX_CLEANS, Math.floor(uses_remaining)))
            : SPONGE_MAX_CLEANS;
        this.#on_scrub = on_scrub;
        this.#on_exhausted = on_exhausted;
        this.#element = this.#create_element();
    }

    get uses_remaining() {
        return this.#uses_remaining;
    }

    get_state() {
        return {
            x: this.#x,
            y: this.#y,
            uses_remaining: this.#uses_remaining
        };
    }

    mount() {
        this.#parent.append(this.#element);
        this.#set_position();
        this.#sync_visuals();
    }

    destroy() {
        if (this.#active_pointer_id !== null && this.#element.hasPointerCapture(this.#active_pointer_id)) {
            this.#element.releasePointerCapture(this.#active_pointer_id);
        }
        this.#active_pointer_id = null;
        this.#element.remove();
    }

    #create_element() {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "tank-sponge";
        element.innerHTML = '<span class="tank-sponge__icon" aria-hidden="true">▦</span><span class="tank-sponge__uses"></span>';
        element.addEventListener("pointerdown", (event) => this.#handle_pointer_down(event));
        element.addEventListener("pointermove", (event) => this.#handle_pointer_move(event));
        element.addEventListener("pointerup", (event) => this.#handle_pointer_end(event));
        element.addEventListener("pointercancel", (event) => this.#handle_pointer_end(event));
        return element;
    }

    #handle_pointer_down(event) {
        if (event.button !== 0 || this.#active_pointer_id !== null || this.#uses_remaining <= 0) {
            return;
        }

        event.preventDefault();
        this.#active_pointer_id = event.pointerId;
        this.#element.setPointerCapture(event.pointerId);
        this.#element.classList.add("is-scrubbing");
    }

    #handle_pointer_move(event) {
        if (event.pointerId !== this.#active_pointer_id) {
            return;
        }

        event.preventDefault();
        const bounds = this.#parent.getBoundingClientRect();
        const previous_x = this.#x;
        const previous_y = this.#y;
        this.#x = Math.max(24, Math.min(bounds.width - 24, event.clientX - bounds.left));
        this.#y = Math.max(24, Math.min(bounds.height - 24, event.clientY - bounds.top));
        this.#set_position();

        if (this.#uses_remaining <= 0) {
            return;
        }

        const result = this.#on_scrub?.({
            start_x: previous_x,
            start_y: previous_y,
            end_x: this.#x,
            end_y: this.#y,
            max_patch_completions: this.#uses_remaining
        }) ?? {};

        const cleaned_patches = Math.max(0, Math.min(
            this.#uses_remaining,
            Math.floor(result.cleaned_patches ?? 0)
        ));

        if (cleaned_patches > 0) {
            this.#uses_remaining -= cleaned_patches;
            this.#sync_visuals();
        }
    }

    #handle_pointer_end(event) {
        if (event.pointerId !== this.#active_pointer_id) {
            return;
        }

        event.preventDefault();
        if (this.#element.hasPointerCapture(event.pointerId)) {
            this.#element.releasePointerCapture(event.pointerId);
        }
        this.#active_pointer_id = null;
        this.#element.classList.remove("is-scrubbing");

        if (this.#uses_remaining <= 0) {
            this.#element.classList.add("is-spent");
            window.setTimeout(() => this.#on_exhausted?.(this), 260);
        }
    }

    #set_position() {
        this.#element.style.left = `${this.#x}px`;
        this.#element.style.top = `${this.#y}px`;
    }

    #sync_visuals() {
        const uses = this.#element.querySelector(".tank-sponge__uses");
        uses.textContent = String(this.#uses_remaining);
        this.#element.setAttribute(
            "aria-label",
            `cleaning_sponge_${this.#uses_remaining}_dirt_patches_remaining`
        );
    }
}
