const SAVE_VERSION = 1;
const DEFAULT_SAVE_KEY = "tank_o_fish_save_v1";

export class SaveSystem {
    #storage_key;

    constructor(storage_key = DEFAULT_SAVE_KEY) {
        this.#storage_key = storage_key;
    }

    load() {
        try {
            const raw_save = window.localStorage.getItem(this.#storage_key);
            if (!raw_save) {
                return null;
            }

            const save = JSON.parse(raw_save);
            if (!save || save.version !== SAVE_VERSION || !Number.isFinite(save.saved_at)) {
                return null;
            }
            return save;
        } catch (error) {
            console.warn("tank_o_fish_save_load_failed", error);
            return null;
        }
    }

    save(state) {
        try {
            const snapshot = {
                ...state,
                version: SAVE_VERSION,
                saved_at: Date.now()
            };
            window.localStorage.setItem(this.#storage_key, JSON.stringify(snapshot));
            return snapshot.saved_at;
        } catch (error) {
            console.warn("tank_o_fish_save_write_failed", error);
            return null;
        }
    }
}
