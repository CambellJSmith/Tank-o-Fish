export class SupplyInventory {
    #container;
    #items;
    #items_by_id;
    #counts = new Map();
    #count_elements = new Map();
    #tool_elements = new Map();
    #on_interaction;
    #active_drag = null;

    constructor({ container, items, on_interaction }) {
        this.#container = container;
        this.#items = items;
        this.#items_by_id = new Map(items.map((item) => [item.id, item]));
        this.#on_interaction = on_interaction;

        for (const item of items) {
            this.#counts.set(item.id, 0);
        }

        this.#container.addEventListener("pointerdown", (event) => this.#handle_pointer_down(event));
        this.#container.addEventListener("pointermove", (event) => this.#handle_pointer_move(event));
        this.#container.addEventListener("pointerup", (event) => this.#handle_pointer_end(event));
        this.#container.addEventListener("pointercancel", (event) => this.#handle_pointer_end(event));
        this.#render();
    }

    add(item_id, amount = 1) {
        if (!this.#items_by_id.has(item_id) || amount <= 0) {
            return;
        }

        this.#counts.set(item_id, this.get_count(item_id) + amount);
        this.#sync_item(item_id);
    }

    get_count(item_id) {
        return this.#counts.get(item_id) ?? 0;
    }

    #render() {
        const fragment = document.createDocumentFragment();
        this.#count_elements.clear();
        this.#tool_elements.clear();

        for (const item of this.#items) {
            const tool = document.createElement("button");
            tool.type = "button";
            tool.className = `supply-tool supply-tool--${item.id}`;
            tool.dataset.supply_tool_id = item.id;
            tool.setAttribute("aria-label", `${item.name}_${item.interaction_hint}`);

            const icon = document.createElement("span");
            icon.className = `supply-icon supply-icon--${item.id}`;
            icon.textContent = item.icon;
            icon.setAttribute("aria-hidden", "true");

            const text = document.createElement("span");
            text.className = "supply-tool__text";
            const title = document.createElement("strong");
            title.textContent = item.name;
            const hint = document.createElement("span");
            hint.className = "supply-tool__hint";
            hint.textContent = item.interaction_hint;
            const count = document.createElement("span");
            count.className = "supply-count";
            text.append(title, hint, count);

            this.#count_elements.set(item.id, count);
            this.#tool_elements.set(item.id, tool);
            tool.append(icon, text);
            fragment.append(tool);
        }

        this.#container.replaceChildren(fragment);

        for (const item of this.#items) {
            this.#sync_item(item.id);
        }
    }

    #sync_item(item_id) {
        const count = this.get_count(item_id);
        const count_element = this.#count_elements.get(item_id);
        const tool = this.#tool_elements.get(item_id);
        const is_active_tool = this.#active_drag?.item_id === item_id;

        if (count_element) {
            count_element.textContent = `owned_${count}`;
        }
        if (tool) {
            tool.disabled = count <= 0 && !is_active_tool;
        }
    }

    #handle_pointer_down(event) {
        const tool = event.target.closest("[data-supply_tool_id]");
        if (!tool || this.#active_drag || event.button !== 0) {
            return;
        }

        const item_id = tool.dataset.supply_tool_id;
        if (this.get_count(item_id) <= 0) {
            return;
        }

        event.preventDefault();
        tool.setPointerCapture(event.pointerId);

        const item = this.#items_by_id.get(item_id);
        const ghost = document.createElement("div");
        ghost.className = `dragging-supply dragging-supply--${item_id}`;
        ghost.textContent = item.icon;
        ghost.setAttribute("aria-hidden", "true");
        document.body.append(ghost);

        this.#active_drag = {
            pointer_id: event.pointerId,
            item_id,
            source: tool,
            ghost,
            consumed: false,
            had_effect: false,
            effect_count: 0,
            previous_client_x: event.clientX,
            previous_client_y: event.clientY
        };

        tool.classList.add("is-dragging");
        document.body.classList.add("is-dragging-supply");
        this.#position_ghost(event.clientX, event.clientY);
    }

    #handle_pointer_move(event) {
        const drag = this.#active_drag;
        if (!drag || drag.pointer_id !== event.pointerId) {
            return;
        }

        event.preventDefault();
        this.#position_ghost(event.clientX, event.clientY);

        const result = this.#on_interaction?.({
            phase: "move",
            item_id: drag.item_id,
            client_x: event.clientX,
            client_y: event.clientY,
            previous_client_x: drag.previous_client_x,
            previous_client_y: drag.previous_client_y,
            consumed: drag.consumed
        }) ?? {};

        this.#apply_interaction_result(result);
        drag.previous_client_x = event.clientX;
        drag.previous_client_y = event.clientY;
    }

    #handle_pointer_end(event) {
        const drag = this.#active_drag;
        if (!drag || drag.pointer_id !== event.pointerId) {
            return;
        }

        event.preventDefault();
        const completed_item_id = drag.item_id;

        if (event.type !== "pointercancel") {
            const result = this.#on_interaction?.({
                phase: "drop",
                item_id: drag.item_id,
                client_x: event.clientX,
                client_y: event.clientY,
                previous_client_x: drag.previous_client_x,
                previous_client_y: drag.previous_client_y,
                consumed: drag.consumed,
                had_effect: drag.had_effect,
                effect_count: drag.effect_count
            }) ?? {};

            this.#apply_interaction_result(result);
        }

        if (drag.source.hasPointerCapture(event.pointerId)) {
            drag.source.releasePointerCapture(event.pointerId);
        }
        drag.source.classList.remove("is-dragging");
        drag.ghost.remove();
        document.body.classList.remove("is-dragging-supply");
        this.#active_drag = null;
        this.#sync_item(completed_item_id);
    }

    #apply_interaction_result(result) {
        const drag = this.#active_drag;
        if (!drag) {
            return;
        }

        if (result.consume && !drag.consumed) {
            this.#consume_one(drag.item_id);
            drag.consumed = true;
        }

        if (result.had_effect) {
            drag.had_effect = true;
        }

        if (Number.isFinite(result.effect_count) && result.effect_count > 0) {
            drag.effect_count += result.effect_count;
        }
    }

    #consume_one(item_id) {
        const current_count = this.get_count(item_id);
        if (current_count <= 0) {
            return;
        }

        this.#counts.set(item_id, current_count - 1);
        this.#sync_item(item_id);
    }

    #position_ghost(client_x, client_y) {
        if (!this.#active_drag) {
            return;
        }

        this.#active_drag.ghost.style.transform = `translate3d(${client_x}px, ${client_y}px, 0)`;
    }
}
