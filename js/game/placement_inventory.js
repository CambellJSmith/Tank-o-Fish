export class PlacementInventory {
    #container;
    #empty_message;
    #items;
    #items_by_id;
    #kind;
    #on_drop;
    #counts = new Map();
    #tools_by_id = new Map();
    #count_elements = new Map();

    constructor({ container, empty_message, items, kind, on_drop }) {
        this.#container = container;
        this.#empty_message = empty_message;
        this.#items = items;
        this.#items_by_id = new Map(items.map((item) => [item.id, item]));
        this.#kind = kind;
        this.#on_drop = on_drop;

        for (const item of items) {
            this.#counts.set(item.id, 0);
        }

        this.#render();
    }

    add(item_id, amount = 1) {
        if (!this.#items_by_id.has(item_id) || amount <= 0) {
            return;
        }

        this.#counts.set(item_id, this.get_count(item_id) + amount);
        this.#sync_item(item_id);
        this.#sync_empty_message();
    }

    get_count(item_id) {
        return this.#counts.get(item_id) ?? 0;
    }

    get_state() {
        return Object.fromEntries(this.#counts);
    }

    restore_state(state) {
        for (const item of this.#items) {
            const saved_count = Number(state?.[item.id]);
            this.#counts.set(item.id, Number.isFinite(saved_count) ? Math.max(0, Math.floor(saved_count)) : 0);
            this.#sync_item(item.id);
        }
        this.#sync_empty_message();
    }

    #render() {
        const fragment = document.createDocumentFragment();

        for (const item of this.#items) {
            const tool = document.createElement("button");
            tool.type = "button";
            tool.className = `placement-tool placement-tool--${this.#kind}`;
            tool.dataset.placement_id = item.id;
            tool.setAttribute("aria-label", `${item.name}; drag into the tank`);

            const icon = document.createElement("span");
            icon.className = `placement-tool__icon placement-tool__icon--${this.#kind} placement-tool__icon--${item.visual}`;
            icon.textContent = item.icon;
            icon.setAttribute("aria-hidden", "true");

            const label = document.createElement("span");
            label.className = "placement-tool__label";
            const name = document.createElement("strong");
            name.textContent = item.name;
            const count = document.createElement("span");
            count.className = "placement-tool__count";
            label.append(name, count);
            tool.append(icon, label);

            tool.addEventListener("pointerdown", (event) => this.#start_drag(event, item, tool));
            this.#tools_by_id.set(item.id, tool);
            this.#count_elements.set(item.id, count);
            fragment.append(tool);
        }

        this.#container.append(fragment);
        for (const item of this.#items) {
            this.#sync_item(item.id);
        }
        this.#sync_empty_message();
    }

    #start_drag(event, item, source) {
        if ((event.pointerType === "mouse" && event.button !== 0) || this.get_count(item.id) <= 0) {
            return;
        }

        event.preventDefault();
        const ghost = document.createElement("div");
        ghost.className = `dragging-placement dragging-placement--${this.#kind} dragging-placement--${item.visual}`;
        ghost.textContent = item.icon;
        ghost.setAttribute("aria-hidden", "true");
        document.body.append(ghost);
        source.classList.add("is-dragging");

        let finished = false;
        const move_ghost = (pointer_event) => {
            ghost.style.left = `${pointer_event.clientX}px`;
            ghost.style.top = `${pointer_event.clientY}px`;
        };
        const cleanup = () => {
            window.removeEventListener("pointermove", move_ghost);
            window.removeEventListener("pointerup", finish_drop);
            window.removeEventListener("pointercancel", cancel_drop);
            source.classList.remove("is-dragging");
            ghost.remove();
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
            cleanup();

            const accepted = this.#on_drop?.(item, pointer_event.clientX, pointer_event.clientY) === true;
            if (!accepted) {
                return;
            }

            this.#counts.set(item.id, Math.max(0, this.get_count(item.id) - 1));
            this.#sync_item(item.id);
            this.#sync_empty_message();
        };

        move_ghost(event);
        window.addEventListener("pointermove", move_ghost);
        window.addEventListener("pointerup", finish_drop);
        window.addEventListener("pointercancel", cancel_drop);
    }

    #sync_item(item_id) {
        const count = this.get_count(item_id);
        const tool = this.#tools_by_id.get(item_id);
        const count_element = this.#count_elements.get(item_id);
        if (tool) {
            tool.hidden = count <= 0;
        }
        if (count_element) {
            count_element.textContent = `owned_${count}`;
        }
    }

    #sync_empty_message() {
        if (!this.#empty_message) {
            return;
        }
        this.#empty_message.hidden = Array.from(this.#counts.values()).some((count) => count > 0);
    }
}
