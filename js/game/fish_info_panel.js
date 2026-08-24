export class FishInfoPanel {
    #element;
    #sprite_element;
    #name_element;
    #sprite_number_element;
    #stage_element;
    #growth_meter;
    #growth_value;
    #hunger_meter;
    #hunger_value;
    #health_meter;
    #health_value;
    #condition_element;
    #appetite_element;
    #on_close;

    constructor({ element, on_close }) {
        this.#element = element;
        this.#on_close = on_close;
        this.#sprite_element = element.querySelector("#fish-info-sprite");
        this.#name_element = element.querySelector("#fish-info-name");
        this.#sprite_number_element = element.querySelector("#fish-info-sprite-number");
        this.#stage_element = element.querySelector("#fish-info-stage");
        this.#growth_meter = element.querySelector("#fish-info-growth-meter");
        this.#growth_value = element.querySelector("#fish-info-growth-value");
        this.#hunger_meter = element.querySelector("#fish-info-hunger-meter");
        this.#hunger_value = element.querySelector("#fish-info-hunger-value");
        this.#health_meter = element.querySelector("#fish-info-health-meter");
        this.#health_value = element.querySelector("#fish-info-health-value");
        this.#condition_element = element.querySelector("#fish-info-condition");
        this.#appetite_element = element.querySelector("#fish-info-appetite");

        element.querySelector("#fish-info-close").addEventListener("click", () => this.#on_close());
    }

    show(info) {
        if (!info) {
            this.hide();
            return;
        }

        const growth = Math.round(info.growth_progress);
        const hunger = Math.round(info.hunger);
        const health = Math.round(info.health);
        const appetite = info.hunger_per_minute.toFixed(1);

        this.#sprite_element.src = info.sprite;
        this.#sprite_element.alt = info.name;
        this.#name_element.textContent = info.name;
        this.#sprite_number_element.textContent = `sprite_${String(info.sprite_number).padStart(4, "0")}`;
        this.#stage_element.textContent = info.is_growing ? "growing" : "adult";
        this.#growth_meter.value = growth;
        this.#growth_value.textContent = `${growth}%`;
        this.#hunger_meter.value = hunger;
        this.#hunger_value.textContent = `${hunger}%`;
        this.#health_meter.value = health;
        this.#health_value.textContent = `${health}%`;
        this.#condition_element.textContent = info.is_ill ? "ill · needs_medicine" : "healthy";
        this.#condition_element.classList.toggle("is-ill", info.is_ill);
        this.#appetite_element.textContent = `${appetite}_hunger_per_minute${info.is_growing ? "_while_growing" : ""}`;
        this.#element.hidden = false;
    }

    hide() {
        this.#element.hidden = true;
    }
}
