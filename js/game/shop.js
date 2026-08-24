export class Shop {
    #dialog;

    constructor({ dialog, open_button }) {
        this.#dialog = dialog;
        open_button.addEventListener("click", () => this.open());
    }

    open() {
        if (!this.#dialog.open) {
            this.#dialog.showModal();
        }
    }
}
