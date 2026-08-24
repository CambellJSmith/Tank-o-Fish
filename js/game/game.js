import { EGG_TYPES } from "../data/egg_types.js";
import { EggInventory } from "./egg_inventory.js";
import { EggShop } from "./egg_shop.js";
import { Shop } from "./shop.js";
import { Tank } from "./tank.js";

export class Game {
    #money = 80;
    #money_element;
    #shop;
    #egg_shop;
    #inventory;
    #tank;
    #encountered_species_ids = new Set();
    #toast_element;
    #toast_timer = null;

    constructor() {
        this.#money_element = document.querySelector("#money-value");
        this.#toast_element = document.querySelector("#toast");

        this.#tank = new Tank({
            element: document.querySelector("#tank"),
            entity_layer: document.querySelector("#tank-entities"),
            on_fish_hatched: (fish_type) => this.#handle_fish_hatched(fish_type)
        });

        this.#inventory = new EggInventory({
            container: document.querySelector("#egg-tray"),
            empty_message: document.querySelector("#egg-tray-empty"),
            is_valid_drop: (client_x, client_y) => this.#tank.contains_point(client_x, client_y),
            on_drop: (egg_type, client_x, client_y) => this.#drop_egg(egg_type, client_x, client_y)
        });

        this.#shop = new Shop({
            dialog: document.querySelector("#shop-dialog"),
            open_button: document.querySelector("#shop-button")
        });

        this.#egg_shop = new EggShop({
            list_element: document.querySelector("#egg-shop-list"),
            egg_types: EGG_TYPES,
            on_purchase: (egg_type) => this.#purchase_egg(egg_type)
        });

        this.#sync_money();
    }

    #purchase_egg(egg_type) {
        if (this.#money < egg_type.price) {
            this.#announce("not_enough_coins_for_that_egg_yet.");
            return;
        }

        this.#money -= egg_type.price;
        this.#inventory.add_egg(egg_type);
        this.#sync_money();
        this.#announce(`${egg_type.name}_added_to_your_tray.`);
    }

    #drop_egg(egg_type, client_x, client_y) {
        this.#tank.drop_egg(egg_type, client_x, client_y);
        this.#announce(`${egg_type.name}_is_settling_into_the_tank.`);
    }

    #handle_fish_hatched(fish_type) {
        const is_new_species = !this.#encountered_species_ids.has(fish_type.species_id);
        this.#encountered_species_ids.add(fish_type.species_id);

        if (is_new_species) {
            this.#announce(`new_species_discovered!_${fish_type.name}`);
            return;
        }

        this.#announce(`${fish_type.name}_hatched_again.`);
    }

    #sync_money() {
        this.#money_element.textContent = String(this.#money);
        this.#egg_shop.set_money(this.#money);
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
