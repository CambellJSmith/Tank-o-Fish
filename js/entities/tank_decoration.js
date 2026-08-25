function art_markup(visual) {
    if (visual === "coral" || visual === "seaweed") {
        return '<span></span><span></span><span></span>';
    }
    if (visual === "skull") {
        return '<span class="decoration-detail decoration-detail--eye-left"></span><span class="decoration-detail decoration-detail--eye-right"></span><span class="decoration-detail decoration-detail--jaw"></span>';
    }
    if (visual === "helmet") {
        return '<span class="decoration-detail decoration-detail--window"></span><span class="decoration-detail decoration-detail--grille"></span>';
    }
    if (visual === "chest") {
        return '<span class="decoration-detail decoration-detail--lid"></span><span class="decoration-detail decoration-detail--latch"></span>';
    }
    if (visual === "castle") {
        return '<span class="decoration-detail decoration-detail--tower-left"></span><span class="decoration-detail decoration-detail--tower-right"></span><span class="decoration-detail decoration-detail--door"></span>';
    }
    if (visual === "arch") {
        return '<span class="decoration-detail decoration-detail--arch-cutout"></span>';
    }
    if (visual === "driftwood") {
        return '<span class="decoration-detail decoration-detail--branch-a"></span><span class="decoration-detail decoration-detail--branch-b"></span>';
    }
    if (visual === "anchor") {
        return '<span class="decoration-detail decoration-detail--anchor-ring"></span><span class="decoration-detail decoration-detail--anchor-stem"></span><span class="decoration-detail decoration-detail--anchor-arms"></span>';
    }
    if (visual === "shell") {
        return '<span></span><span></span><span></span><span></span>';
    }
    if (visual === "submarine") {
        return '<span class="decoration-detail decoration-detail--sub-tower"></span><span class="decoration-detail decoration-detail--sub-window-a"></span><span class="decoration-detail decoration-detail--sub-window-b"></span><span class="decoration-detail decoration-detail--sub-prop"></span>';
    }
    return "";
}

export class TankDecoration {
    #decoration_type;
    #parent;
    #element;
    #x;
    #active_pointer_id = null;

    constructor({ decoration_type, parent, x }) {
        this.#decoration_type = decoration_type;
        this.#parent = parent;
        this.#x = x;
        this.#element = this.#create_element();
    }

    mount() {
        this.#parent.append(this.#element);
        this.#sync_position();
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
        element.className = `tank-decoration tank-decoration--${this.#decoration_type.visual}`;
        element.setAttribute("aria-label", `${this.#decoration_type.name}; drag to reposition`);
        element.innerHTML = art_markup(this.#decoration_type.visual);
        element.addEventListener("pointerdown", (event) => this.#handle_pointer_down(event));
        element.addEventListener("pointermove", (event) => this.#handle_pointer_move(event));
        element.addEventListener("pointerup", (event) => this.#handle_pointer_end(event));
        element.addEventListener("pointercancel", (event) => this.#handle_pointer_end(event));
        return element;
    }

    #handle_pointer_down(event) {
        if ((event.pointerType === "mouse" && event.button !== 0) || this.#active_pointer_id !== null) {
            return;
        }

        event.preventDefault();
        this.#active_pointer_id = event.pointerId;
        this.#element.setPointerCapture(event.pointerId);
        this.#element.classList.add("is-moving");
    }

    #handle_pointer_move(event) {
        if (event.pointerId !== this.#active_pointer_id) {
            return;
        }

        event.preventDefault();
        const bounds = this.#parent.getBoundingClientRect();
        this.#x = Math.max(28, Math.min(bounds.width - 28, event.clientX - bounds.left));
        this.#sync_position();
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
        this.#element.classList.remove("is-moving");
    }

    #sync_position() {
        this.#element.style.left = `${this.#x}px`;
    }
}
