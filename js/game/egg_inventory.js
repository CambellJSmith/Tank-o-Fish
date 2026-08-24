export class EggInventory {
    #container;
    #empty_message;
    #is_valid_drop;
    #on_drop;
    #items = new Map();

    constructor({ container, empty_message, is_valid_drop, on_drop }) {
        this.#container = container;
        this.#empty_message = empty_message;
        this.#is_valid_drop = is_valid_drop;
        this.#on_drop = on_drop;
    }

    add_egg(egg_type) {
        const inventory_id = crypto.randomUUID();
        const button = document.createElement("button");
        button.type = "button";
        button.className = "inventory-egg";
        button.dataset.inventory_id = inventory_id;
        button.setAttribute("aria-label", `${egg_type.name}; drag into the tank`);
        button.style.setProperty("--egg-color", egg_type.egg_color);
        button.style.setProperty("--egg-spot", egg_type.egg_spot);

        const item = { inventory_id, egg_type, element: button };
        this.#items.set(inventory_id, item);
        button.addEventListener("pointerdown", (event) => this.#start_drag(event, item));
        this.#container.append(button);
        this.#sync_empty_message();
    }

    #start_drag(event, item) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        event.preventDefault();

        const ghost = item.element.cloneNode(true);
        ghost.classList.remove("inventory-egg");
        ghost.classList.add("dragging-egg");
        ghost.removeAttribute("data-inventory_id");
        ghost.removeAttribute("aria-label");
        document.body.append(ghost);
        item.element.classList.add("is-dragging");

        let finished = false;
        const move_ghost = (pointer_event) => {
            ghost.style.left = `${pointer_event.clientX}px`;
            ghost.style.top = `${pointer_event.clientY}px`;
        };

        const cleanup = () => {
            window.removeEventListener("pointermove", move_ghost);
            window.removeEventListener("pointerup", finish_drop);
            window.removeEventListener("pointercancel", cancel_drop);
            ghost.remove();
            item.element.classList.remove("is-dragging");
        };

        const cancel_drop = () => {
            if (finished) {
                return;
            }
            finished = true;
            cleanup();
        };

        const finish_drop = (pointer_event) => {
            if (finished) {
                return;
            }
            finished = true;

            const valid_drop = this.#is_valid_drop(pointer_event.clientX, pointer_event.clientY);
            cleanup();

            if (!valid_drop) {
                return;
            }

            this.#items.delete(item.inventory_id);
            item.element.remove();
            this.#sync_empty_message();
            this.#on_drop(item.egg_type, pointer_event.clientX, pointer_event.clientY);
        };

        move_ghost(event);
        window.addEventListener("pointermove", move_ghost);
        window.addEventListener("pointerup", finish_drop);
        window.addEventListener("pointercancel", cancel_drop);
    }

    #sync_empty_message() {
        this.#empty_message.hidden = this.#items.size > 0;
    }
}
