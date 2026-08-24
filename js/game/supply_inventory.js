export class SupplyInventory {
    #container;
    #items;
    #items_by_id;
    #counts = new Map();
    #count_elements = new Map();
    #use_buttons = new Map();
    #on_use;

    constructor({ container, items, on_use }) {
        this.#container = container;
        this.#items = items;
        this.#items_by_id = new Map(items.map((item) => [item.id, item]));
        this.#on_use = on_use;

        for (const item of items) {
            this.#counts.set(item.id, 0);
        }

        this.#container.addEventListener("click", (event) => this.#handle_use_click(event));
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
        this.#use_buttons.clear();

        for (const item of this.#items) {
            const card = document.createElement("article");
            card.className = "supply-inventory-item";

            const icon = document.createElement("div");
            icon.className = `supply-icon supply-icon--${item.id}`;
            icon.textContent = item.icon;
            icon.setAttribute("aria-hidden", "true");

            const text = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = item.name;
            const count = document.createElement("span");
            count.className = "supply-count";
            text.append(title, count);

            const button = document.createElement("button");
            button.type = "button";
            button.className = "supply-use-button";
            button.dataset.use_supply_id = item.id;
            button.textContent = "use";

            this.#count_elements.set(item.id, count);
            this.#use_buttons.set(item.id, button);
            card.append(icon, text, button);
            fragment.append(card);
        }

        this.#container.replaceChildren(fragment);

        for (const item of this.#items) {
            this.#sync_item(item.id);
        }
    }

    #sync_item(item_id) {
        const count = this.get_count(item_id);
        const count_element = this.#count_elements.get(item_id);
        const button = this.#use_buttons.get(item_id);

        if (count_element) {
            count_element.textContent = `owned_${count}`;
        }
        if (button) {
            button.disabled = count <= 0;
        }
    }

    #handle_use_click(event) {
        const button = event.target.closest("[data-use_supply_id]");
        if (!button) {
            return;
        }

        const item_id = button.dataset.use_supply_id;
        if (this.get_count(item_id) <= 0) {
            return;
        }

        const used = this.#on_use(item_id);
        if (!used) {
            return;
        }

        this.#counts.set(item_id, this.get_count(item_id) - 1);
        this.#sync_item(item_id);
    }
}
