export const FISH_RARITIES = Object.freeze({
    common: Object.freeze({ name: "common", multiplier: 1 }),
    uncommon: Object.freeze({ name: "uncommon", multiplier: 1.35 }),
    rare: Object.freeze({ name: "rare", multiplier: 1.8 }),
    epic: Object.freeze({ name: "epic", multiplier: 2.5 }),
    legendary: Object.freeze({ name: "legendary", multiplier: 3.5 })
});

export function rarity_from_roll(roll) {
    if (roll < 5) {
        return FISH_RARITIES.legendary;
    }
    if (roll < 15) {
        return FISH_RARITIES.epic;
    }
    if (roll < 35) {
        return FISH_RARITIES.rare;
    }
    if (roll < 65) {
        return FISH_RARITIES.uncommon;
    }
    return FISH_RARITIES.common;
}

export function calculate_fish_sale_value({
    base_value,
    rarity_multiplier,
    growth_progress,
    health,
    illness_count,
    size_factor,
    weight_g,
    reference_adult_weight_g
}) {
    const normalized_growth = Math.max(0, Math.min(1, growth_progress / 100));
    const normalized_health = Math.max(0, Math.min(1, health / 100));
    const normalized_size = Math.max(0.75, Math.min(1.35, size_factor));
    const weight_ratio = Math.max(0, weight_g / Math.max(0.01, reference_adult_weight_g));

    const growth_multiplier = 0.45 + (normalized_growth * 0.55);
    const health_multiplier = 0.55 + (normalized_health * 0.45);
    const illness_history_multiplier = 1 + Math.min(0.25, Math.max(0, illness_count) * 0.04);
    const size_multiplier = 0.72 + (normalized_size * 0.28);
    const weight_multiplier = 0.72 + (Math.min(2.8, weight_ratio) * 0.28);
    const calculated_value = Math.round(
        base_value
        * rarity_multiplier
        * growth_multiplier
        * health_multiplier
        * illness_history_multiplier
        * size_multiplier
        * weight_multiplier
    );
    const minimum_value = normalized_growth >= 1 && normalized_health >= 1 ? 20 : 1;

    return Math.max(minimum_value, calculated_value);
}
