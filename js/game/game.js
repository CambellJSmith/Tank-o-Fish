import { EGG_TYPES } from "../data/egg_types.js";
import { EggInventory } from "./egg_inventory.js";
import { Shop } from "./shop.js";
import { Tank } from "./tank.js";

export class Game {
    #money = 80;
    #money_element;
    #shop;
    #inventory;
    #tank;
    #toast_element;
    #toast_timer = null;

    constructor() {
        this.#money_element = document.querySelector("#money-value");
        this.#toast_element = document.querySelector("#toast");

        this.#tank = new Tank({
            element: document.querySelector("#tank"),
            entity_layer: document.querySelector("#tank-entities"),
            on_fish_hatched: (fish_type) => this.#announce(`${fish_type.name} hatched!`)
        });

        this.#inventory = new EggInventory({
            container: document.querySelector("#egg-tray"),
            empty_message: document.querySelector("#egg-tray-empty"),
            is_valid_drop: (client_x, client_y) => this.#tank.contains_point(client_x, client_y),
            on_drop: (egg_type, client_x, client_y) => this.#drop_egg(egg_type, client_x, client_y)
        });

        this.#shop = new Shop({
            dialog: document.querySelector("#shop-dialog"),
            list_element: document.querySelector("#shop-list"),
            open_button: document.querySelector("#shop-button"),
            egg_types: EGG_TYPES,
            on_purchase: (egg_type) => this.#purchase_egg(egg_type)
        });

        this.#sync_money();
    }

    #purchase_egg(egg_type) {
        if (this.#money < egg_type.price) {
            this.#announce("not enough coins for that egg yet.");
            return;
        }

        this.#money -= egg_type.price;
        this.#inventory.add_egg(egg_type);
        this.#sync_money();
        this.#announce(`${egg_type.name} added to your tray.`);
    }

    #drop_egg(egg_type, client_x, client_y) {
        this.#tank.drop_egg(egg_type, client_x, client_y);
        this.#announce(`${egg_type.name} is settling into the tank.`);
    }

    #sync_money() {
        this.#money_element.textContent = String(this.#money);
        this.#shop.set_money(this.#money);
    }

    #announce(message) {
        window.clearTimeout(this.#toast_timer);
        this.#toast_element.textContent = message;
        this.#toast_element.classList.add("is-visible");
        this.#toast_timer = window.setTimeout(() => {
            this.#toast_element.classList.remove("is-visible");
        }, 2200);
    }
}
