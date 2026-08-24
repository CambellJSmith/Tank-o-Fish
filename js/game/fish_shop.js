export class FishShop {
    #list_element;
    #fish_species;
    #fish_species_by_id;
    #buttons_by_id = new Map();
    #on_purchase;
    #money = 0;

    constructor({ list_element, fish_species, on_purchase }) {
        this.#list_element = list_element;
        this.#fish_species = fish_species;
        this.#fish_species_by_id = new Map(fish_species.map((fish_type) => [fish_type.species_id, fish_type]));
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

        for (const fish_type of this.#fish_species) {
            const item = document.createElement("article");
            item.className = "shop-item shop-item--fish";

            const preview = document.createElement("div");
            preview.className = "shop-fish-preview";
            preview.setAttribute("aria-hidden", "true");

            const image = document.createElement("img");
            image.src = fish_type.sprite;
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.draggable = false;
            preview.append(image);

            const title = document.createElement("h3");
            title.textContent = fish_type.name;

            const sprite_label = document.createElement("p");
            sprite_label.className = "shop-fish-sprite-label";
            sprite_label.textContent = `sprite_${String(fish_type.sprite_number).padStart(4, "0")}`;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "shop-buy-button";
            button.dataset.fish_id = fish_type.species_id;
            button.textContent = `buy · ${fish_type.price}`;

            this.#buttons_by_id.set(fish_type.species_id, button);
            item.append(preview, title, sprite_label, button);
            fragment.append(item);
        }

        this.#list_element.replaceChildren(fragment);
        this.#refresh_buttons();
    }

    #refresh_buttons() {
        for (const [fish_id, button] of this.#buttons_by_id) {
            const fish_type = this.#fish_species_by_id.get(fish_id);
            button.disabled = !fish_type || this.#money < fish_type.price;
        }
    }

    #handle_purchase_click(event) {
        const button = event.target.closest("[data-fish_id]");
        if (!button) {
            return;
        }

        const fish_type = this.#fish_species_by_id.get(button.dataset.fish_id);
        if (!fish_type || this.#money < fish_type.price) {
            return;
        }

        this.#on_purchase(fish_type);
    }
}
