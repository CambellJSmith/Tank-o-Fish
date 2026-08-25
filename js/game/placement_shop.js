export class PlacementShop {
    #list_element;
    #items;
    #items_by_id;
    #kind;
    #buttons_by_id = new Map();
    #on_purchase;
    #money = 0;

    constructor({ list_element, items, kind, on_purchase }) {
        this.#list_element = list_element;
        this.#items = items;
        this.#items_by_id = new Map(items.map((item) => [item.id, item]));
        this.#kind = kind;
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

        for (const item of this.#items) {
            const card = document.createElement("article");
            card.className = `shop-item shop-item--placement shop-item--${this.#kind}`;

            const preview = document.createElement("div");
            preview.className = `placement-shop-preview placement-shop-preview--${this.#kind} placement-shop-preview--${item.visual}`;
            preview.textContent = item.icon;
            preview.setAttribute("aria-hidden", "true");

            const title = document.createElement("h3");
            title.textContent = item.name;
            const description = document.createElement("p");
            description.textContent = item.description;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "shop-buy-button";
            button.dataset.placement_shop_id = item.id;
            button.textContent = `buy · ${item.price}`;

            this.#buttons_by_id.set(item.id, button);
            card.append(preview, title, description, button);
            fragment.append(card);
        }

        this.#list_element.replaceChildren(fragment);
        this.#refresh_buttons();
    }

    #refresh_buttons() {
        for (const [item_id, button] of this.#buttons_by_id) {
            const item = this.#items_by_id.get(item_id);
            button.disabled = !item || this.#money < item.price;
        }
    }

    #handle_purchase_click(event) {
        const button = event.target.closest("[data-placement_shop_id]");
        if (!button) {
            return;
        }

        const item = this.#items_by_id.get(button.dataset.placement_shop_id);
        if (!item || this.#money < item.price) {
            return;
        }
        this.#on_purchase(item);
    }
}
