export class FoodPellet {
    #parent;
    #element;
    #x;
    #y;
    #nutrition;
    #is_consumed = false;

    constructor({ parent, x, y, nutrition }) {
        this.#parent = parent;
        this.#x = x;
        this.#y = y;
        this.#nutrition = nutrition;
        this.#element = this.#create_element();
    }

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    get nutrition() {
        return this.#nutrition;
    }

    get is_consumed() {
        return this.#is_consumed;
    }

    mount() {
        this.#element.style.left = `${this.#x}px`;
        this.#element.style.top = `${this.#y}px`;
        this.#parent.append(this.#element);
    }

    consume() {
        if (this.#is_consumed) {
            return false;
        }

        this.#is_consumed = true;
        this.#element.classList.add("is-eaten");
        window.setTimeout(() => this.#element.remove(), 160);
        return true;
    }

    #create_element() {
        const element = document.createElement("span");
        element.className = "food-pellet";
        element.setAttribute("aria-hidden", "true");
        return element;
    }
}
