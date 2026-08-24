export class SupplyShop {
    #list_element;
    #supply_items;
    #supply_items_by_id;
    #buttons_by_id = new Map();
    #on_purchase;
    #money = 0;

    constructor({ list_element, supply_items, on_purchase }) {
        this.#list_element = list_element;
        this.#supply_items = supply_items;
        this.#supply_items_by_id = new Map(supply_items.map((item) => [item.id, item]));
        this.#on_purchase = on_purchase;

        this.#list_element.addEventListener("click", (event) => this.#handle_purchase_click(event));
        this.#render();
    }

    set_money(money) {
        this.#money = money;
        this.#refresh_buttons();
    }

    #render() {
        const fragment = document.createDocumentFragment();
        this.#buttons_by_id.clear();

        for (const item of this.#supply_items) {
            const card = document.createElement("article");
            card.className = "shop-item shop-item--supply";

            const icon = document.createElement("div");
            icon.className = `supply-icon supply-icon--${item.id}`;
            icon.textContent = item.icon;
            icon.setAttribute("aria-hidden", "true");

            const title = document.createElement("h3");
            title.textContent = item.name;

            const description = document.createElement("p");
            description.textContent = item.description;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "shop-buy-button";
            button.dataset.supply_id = item.id;
            button.textContent = `buy · ${item.price}`;

            this.#buttons_by_id.set(item.id, button);
            card.append(icon, title, description, button);
            fragment.append(card);
        }

        this.#list_element.replaceChildren(fragment);
        this.#refresh_buttons();
    }

    #refresh_buttons() {
        for (const [item_id, button] of this.#buttons_by_id) {
            const item = this.#supply_items_by_id.get(item_id);
            button.disabled = !item || this.#money < item.price;
        }
    }

    #handle_purchase_click(event) {
        const button = event.target.closest("[data-supply_id]");
        if (!button) {
            return;
        }

        const item = this.#supply_items_by_id.get(button.dataset.supply_id);
        if (!item || this.#money < item.price) {
            return;
        }

        this.#on_purchase(item);
    }
}
