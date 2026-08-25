import { DECORATION_ITEMS } from "../data/decorations.js?v=20260825-2";
import { EGG_TYPES } from "../data/egg_types.js";
import { SUBSTRATE_ITEMS } from "../data/substrates.js?v=20260825-2";
import { SUPPLY_ITEMS } from "../data/supply_items.js";
import { EggInventory } from "./egg_inventory.js";
import { EggShop } from "./egg_shop.js";
import { FishInfoPanel } from "./fish_info_panel.js";
import { PlacementInventory } from "./placement_inventory.js?v=20260825-2";
import { PlacementShop } from "./placement_shop.js?v=20260825-2";
import { Shop } from "./shop.js";
import { SupplyInventory } from "./supply_inventory.js";
import { SupplyShop } from "./supply_shop.js";
import { Tank } from "./tank.js?v=20260825-2";

export class Game {
    #money = 80;
    #money_element;
    #shop;
    #egg_shop;
    #supply_shop;
    #decoration_shop;
    #substrate_shop;
    #inventory;
    #supply_inventory;
    #decoration_inventory;
    #substrate_inventory;
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
            on_close: () => this.#tank.clear_selection(),
            on_sell: () => this.#sell_selected_fish()
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
            on_interaction: (interaction) => this.#handle_supply_interaction(interaction)
        });

        this.#decoration_inventory = new PlacementInventory({
            container: document.querySelector("#decoration-inventory"),
            empty_message: document.querySelector("#decoration-inventory-empty"),
            items: DECORATION_ITEMS,
            kind: "decoration",
            on_drop: (item, client_x, client_y) => this.#place_decoration(item, client_x, client_y)
        });

        this.#substrate_inventory = new PlacementInventory({
            container: document.querySelector("#substrate-inventory"),
            empty_message: document.querySelector("#substrate-inventory-empty"),
            items: SUBSTRATE_ITEMS,
            kind: "substrate",
            on_drop: (item, client_x, client_y) => this.#apply_substrate(item, client_x, client_y)
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

        this.#decoration_shop = new PlacementShop({
            list_element: document.querySelector("#decoration-shop-list"),
            items: DECORATION_ITEMS,
            kind: "decoration",
            on_purchase: (item) => this.#purchase_decoration(item)
        });

        this.#substrate_shop = new PlacementShop({
            list_element: document.querySelector("#substrate-shop-list"),
            items: SUBSTRATE_ITEMS,
            kind: "substrate",
            on_purchase: (item) => this.#purchase_substrate(item)
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

    #purchase_decoration(item) {
        if (this.#money < item.price) {
            this.#announce(`not_enough_coins_for_${item.name}.`);
            return;
        }

        this.#money -= item.price;
        this.#decoration_inventory.add(item.id);
        this.#sync_money();
        this.#announce(`${item.name}_added_to_decoration_inventory.`);
    }

    #purchase_substrate(item) {
        if (this.#money < item.price) {
            this.#announce(`not_enough_coins_for_${item.name}.`);
            return;
        }

        this.#money -= item.price;
        this.#substrate_inventory.add(item.id);
        this.#sync_money();
        this.#announce(`${item.name}_bag_added_to_inventory.`);
    }

    #drop_egg(egg_type, client_x, client_y) {
        this.#tank.drop_egg(egg_type, client_x, client_y);
        this.#announce(`${egg_type.name}_is_settling_into_the_tank.`);
    }

    #place_decoration(item, client_x, client_y) {
        if (!this.#tank.place_decoration(item, client_x, client_y)) {
            this.#announce("drop_the_decoration_inside_the_tank.");
            return false;
        }
        this.#announce(`${item.name}_placed._drag_it_again_any_time_to_reposition_it.`);
        return true;
    }

    #apply_substrate(item, client_x, client_y) {
        if (!this.#tank.set_substrate(item, client_x, client_y)) {
            this.#announce("drop_the_substrate_bag_inside_the_tank.");
            return false;
        }
        this.#announce(`${item.name}_installed_as_the_tank_bottom.`);
        return true;
    }

    #sell_selected_fish() {
        const sold_fish = this.#tank.sell_selected_fish();
        if (!sold_fish) {
            return;
        }

        this.#money += sold_fish.sale_value;
        this.#sync_money();
        this.#announce(`${sold_fish.name}_sold_for_${sold_fish.sale_value}_coins.`);
    }

    #handle_supply_interaction(interaction) {
        if (interaction.item_id === "food") {
            return this.#handle_food_interaction(interaction);
        }
        if (interaction.item_id === "sponge") {
            return this.#handle_sponge_interaction(interaction);
        }
        if (interaction.item_id === "medicine") {
            return this.#handle_medicine_interaction(interaction);
        }
        return {};
    }

    #handle_food_interaction(interaction) {
        if (interaction.phase !== "drop") {
            return {};
        }

        const pellet_count = this.#tank.drop_food(interaction.client_x, interaction.client_y);
        if (pellet_count === 0) {
            this.#announce("drop_the_food_into_a_tank_with_fish_in_it.");
            return {};
        }

        this.#announce(`food_dropped._${pellet_count}_pellets_scattered.`);
        return { consume: true, had_effect: true };
    }

    #handle_sponge_interaction(interaction) {
        if (interaction.phase !== "drop") {
            return {};
        }

        const uses_remaining = this.#tank.drop_sponge(interaction.client_x, interaction.client_y);
        if (uses_remaining === 0) {
            this.#announce("drop_the_sponge_into_the_tank_to_store_it_there.");
            return {};
        }

        this.#announce(`sponge_placed._${uses_remaining}_dirt_patches_remaining.`);
        return { consume: true, had_effect: true };
    }

    #handle_medicine_interaction(interaction) {
        if (interaction.phase === "move") {
            const result = this.#tank.spray_medicine_at(
                interaction.client_x,
                interaction.client_y,
                interaction.previous_client_x,
                interaction.previous_client_y
            );
            if (!result.sprayed) {
                return {};
            }

            return {
                consume: true,
                had_effect: result.cured_count > 0,
                effect_count: result.cured_count
            };
        }

        if (interaction.phase === "drop" && interaction.consumed) {
            if (interaction.effect_count > 0) {
                this.#announce(`medicine_spray_cured_${interaction.effect_count}_fish.`);
            } else {
                this.#announce("medicine_was_sprayed_but_no_ill_fish_were_hit.");
            }
        }
        return {};
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
        this.#decoration_shop.set_money(this.#money);
        this.#substrate_shop.set_money(this.#money);
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
