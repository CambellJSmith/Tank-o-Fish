export class EggShop {
    #list_element;
    #egg_types;
    #egg_types_by_id;
    #buttons_by_id = new Map();
    #on_purchase;
    #money = 0;

    constructor({ list_element, egg_types, on_purchase }) {
        this.#list_element = list_element;
        this.#egg_types = egg_types;
        this.#egg_types_by_id = new Map(egg_types.map((egg_type) => [egg_type.id, egg_type]));
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

        for (const egg_type of this.#egg_types) {
            const item = document.createElement("article");
            item.className = "shop-item shop-item--egg";

            const egg = document.createElement("div");
            egg.className = "shop-item__egg";
            egg.style.setProperty("--egg-color", egg_type.egg_color);
            egg.style.setProperty("--egg-spot", egg_type.egg_spot);
            egg.setAttribute("aria-hidden", "true");

            const title = document.createElement("h3");
            title.textContent = egg_type.name;

            const description = document.createElement("p");
            description.textContent = egg_type.description;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "shop-buy-button";
            button.dataset.egg_id = egg_type.id;
            button.textContent = `buy · ${egg_type.price}`;

            this.#buttons_by_id.set(egg_type.id, button);
            item.append(egg, title, description, button);
            fragment.append(item);
        }

        this.#list_element.replaceChildren(fragment);
        this.#refresh_buttons();
    }

    #refresh_buttons() {
        for (const [egg_id, button] of this.#buttons_by_id) {
            const egg_type = this.#egg_types_by_id.get(egg_id);
            button.disabled = !egg_type || this.#money < egg_type.price;
        }
    }

    #handle_purchase_click(event) {
        const button = event.target.closest("[data-egg_id]");
        if (!button) {
            return;
        }

        const egg_type = this.#egg_types_by_id.get(button.dataset.egg_id);
        if (!egg_type || this.#money < egg_type.price) {
            return;
        }

        this.#on_purchase(egg_type);
    }
}
