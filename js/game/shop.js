export class Shop {
    #dialog;
    #tab_buttons;
    #panels;
    #active_tab = "eggs";

    constructor({ dialog, open_button }) {
        this.#dialog = dialog;
        this.#tab_buttons = Array.from(this.#dialog.querySelectorAll("[data-shop-tab]"));
        this.#panels = new Map(
            Array.from(this.#dialog.querySelectorAll("[data-shop-panel]"))
                .map((panel) => [panel.dataset.shop_panel, panel])
        );

        open_button.addEventListener("click", () => this.open());

        for (const button of this.#tab_buttons) {
            button.addEventListener("click", () => this.#set_active_tab(button.dataset.shop_tab));
        }

        this.#set_active_tab(this.#active_tab);
    }

    open(tab = this.#active_tab) {
        this.#set_active_tab(tab);

        if (!this.#dialog.open) {
            this.#dialog.showModal();
        }
    }

    #set_active_tab(tab) {
        if (!this.#panels.has(tab)) {
            return;
        }

        this.#active_tab = tab;

        for (const button of this.#tab_buttons) {
            const is_active = button.dataset.shop_tab === tab;
            button.classList.toggle("is-active", is_active);
            button.setAttribute("aria-selected", String(is_active));
            button.tabIndex = is_active ? 0 : -1;
        }

        for (const [panel_id, panel] of this.#panels) {
            panel.hidden = panel_id !== tab;
        }
    }
}
