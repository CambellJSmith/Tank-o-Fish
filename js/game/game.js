import { EGG_TYPES } from "../data/egg_types.js";
import { SUPPLY_ITEMS } from "../data/supply_items.js";
import { EggInventory } from "./egg_inventory.js";
import { EggShop } from "./egg_shop.js";
import { FishInfoPanel } from "./fish_info_panel.js";
import { Shop } from "./shop.js";
import { SupplyInventory } from "./supply_inventory.js";
import { SupplyShop } from "./supply_shop.js";
import { Tank } from "./tank.js";

export class Game {
    #money = 80;
    #money_element;
    #shop;
    #egg_shop;
    #supply_shop;
    #inventory;
    #supply_inventory;
    #fish_info_panel;
    #tank;
    #encountered_species_ids = new Set();
    #cleanliness_meter;
    #cleanliness_value;
    #hunger_meter;
    #hunger_value;
    #health_meter;
    #health_value;
    #fish_count_element;
    #growing_count_element;
    #ill_count_element;
    #toast_element;
    #toast_timer = null;

    constructor() {
        this.#money_element = document.querySelector("#money-value");
        this.#cleanliness_meter = document.querySelector("#cleanliness-meter");
        this.#cleanliness_value = document.querySelector("#cleanliness-value");
        this.#hunger_meter = document.querySelector("#hunger-meter");
        this.#hunger_value = document.querySelector("#hunger-value");
        this.#health_meter = document.querySelector("#health-meter");
        this.#health_value = document.querySelector("#health-value");
        this.#fish_count_element = document.querySelector("#fish-count");
        this.#growing_count_element = document.querySelector("#growing-count");
        this.#ill_count_element = document.querySelector("#ill-count");
        this.#toast_element = document.querySelector("#toast");

        this.#fish_info_panel = new FishInfoPanel({
            element: document.querySelector("#fish-info-panel"),
            on_close: () => this.#tank.clear_selection()
        });

        this.#tank = new Tank({
            element: document.querySelector("#tank"),
            entity_layer: document.querySelector("#tank-entities"),
            on_fish_hatched: (fish_type) => this.#handle_fish_hatched(fish_type),
            on_status_change: (status) => this.#sync_tank_status(status),
            on_fish_selected: (fish_info) => this.#fish_info_panel.show(fish_info)
        });

        this.#inventory = new EggInventory({
            container: document.querySelector("#egg-tray"),
            empty_message: document.querySelector("#egg-tray-empty"),
            is_valid_drop: (client_x, client_y) => this.#tank.contains_point(client_x, client_y),
            on_drop: (egg_type, client_x, client_y) => this.#drop_egg(egg_type, client_x, client_y)
        });

        this.#supply_inventory = new SupplyInventory({
            container: document.querySelector("#supply-inventory"),
            items: SUPPLY_ITEMS,
            on_use: (item_id) => this.#use_supply(item_id)
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

        this.#supply_shop = new SupplyShop({
            list_element: document.querySelector("#supply-shop-list"),
            supply_items: SUPPLY_ITEMS,
            on_purchase: (item) => this.#purchase_supply(item)
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

    #purchase_supply(item) {
        if (this.#money < item.price) {
            this.#announce(`not_enough_coins_for_${item.name}.`);
            return;
        }

        this.#money -= item.price;
        this.#supply_inventory.add(item.id);
        this.#sync_money();
        this.#announce(`${item.name}_added_to_your_supplies.`);
    }

    #drop_egg(egg_type, client_x, client_y) {
        this.#tank.drop_egg(egg_type, client_x, client_y);
        this.#announce(`${egg_type.name}_is_settling_into_the_tank.`);
    }

    #use_supply(item_id) {
        if (item_id === "food") {
            const fed_count = this.#tank.feed();
            if (fed_count === 0) {
                this.#announce("there_are_no_fish_to_feed_yet.");
                return false;
            }
            this.#announce(`fed_${fed_count}_fish.`);
            return true;
        }

        if (item_id === "sponge") {
            const removed_dirt = this.#tank.clean();
            if (removed_dirt === 0) {
                this.#announce("the_tank_is_already_clean.");
                return false;
            }
            this.#announce("the_tank_is_sparkling_clean_again.");
            return true;
        }

        if (item_id === "medicine") {
            const treated_fish = this.#tank.medicate();
            if (!treated_fish) {
                this.#announce("none_of_your_fish_are_ill_right_now.");
                return false;
            }
            this.#announce(`${treated_fish.name}_was_cured._health_can_now_recover.`);
            return true;
        }

        return false;
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
        this.#supply_shop.set_money(this.#money);
    }

    #sync_tank_status(status) {
        const cleanliness = Math.round(status.cleanliness);
        const hunger = Math.round(status.average_hunger);
        const health = Math.round(status.average_health);

        this.#cleanliness_meter.value = cleanliness;
        this.#cleanliness_value.textContent = `${cleanliness}%`;
        this.#hunger_meter.value = hunger;
        this.#hunger_value.textContent = `${hunger}%`;
        this.#health_meter.value = health;
        this.#health_value.textContent = `${health}%`;
        this.#fish_count_element.textContent = String(status.fish_count);
        this.#growing_count_element.textContent = String(status.growing_count);
        this.#ill_count_element.textContent = String(status.ill_count);
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
