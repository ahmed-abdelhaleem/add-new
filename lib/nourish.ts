import type { EnergyForecast, MealLog, MealOption, ShoppingListItem, WeeklyDeal } from "./types";

/**
 * PRD §5 Feature 11 — NourishPlan.
 *
 * Eliminates decision fatigue and the discount-rabbit-hole risk by
 * automating both meal selection and deal sourcing. Portions are
 * post-bariatric-aware (smaller quantities, simple recipes).
 *
 * TODO(integration:deals): production scrapes weekly deals from ICA,
 * Coop, Lidl, Willys APIs (or scraper pipeline). For now we seed
 * a static set so the Plan flow demonstrates the deal-tag UX.
 *
 * TODO(integration:delivery): SHOP tab one-tap send to Mathem, ICA, Coop
 * carts. Their APIs require partner agreements.
 */

export const MEAL_OPTIONS: MealOption[] = [
  // Breakfast — low
  {
    id: "b_yogurt_berries",
    name: "Greek yogurt + frozen berries + seeds",
    slot: "breakfast",
    prepMinutes: 3,
    ingredientCount: 3,
    energyRequired: "low",
    ingredients: ["greek yogurt", "frozen berries", "pumpkin seeds"],
    section: "dairy",
  },
  {
    id: "b_oats_banana",
    name: "Quick oats + banana + cinnamon",
    slot: "breakfast",
    prepMinutes: 5,
    ingredientCount: 3,
    energyRequired: "low",
    ingredients: ["rolled oats", "banana", "cinnamon"],
    section: "drygoods",
  },
  // Breakfast — medium
  {
    id: "b_eggs_avocado",
    name: "2 eggs + half avocado on rye",
    slot: "breakfast",
    prepMinutes: 10,
    ingredientCount: 4,
    energyRequired: "medium",
    ingredients: ["eggs", "avocado", "rye bread", "salt"],
    section: "produce",
  },
  // Breakfast — high
  {
    id: "b_shakshuka",
    name: "Mini shakshuka",
    slot: "breakfast",
    prepMinutes: 20,
    ingredientCount: 6,
    energyRequired: "high",
    ingredients: ["eggs", "tomato sauce", "onion", "garlic", "feta", "parsley"],
    section: "produce",
    dealTag: "ICA — tomatoes 30% off",
  },

  // Lunch — low
  {
    id: "l_tuna_wrap",
    name: "Tuna wrap with cucumber",
    slot: "lunch",
    prepMinutes: 5,
    ingredientCount: 4,
    energyRequired: "low",
    ingredients: ["tuna", "tortilla", "cucumber", "yogurt"],
    section: "drygoods",
  },
  {
    id: "l_leftover_chicken",
    name: "Yesterday's chicken + greens",
    slot: "lunch",
    prepMinutes: 3,
    ingredientCount: 2,
    energyRequired: "low",
    ingredients: ["leftover chicken", "rocket"],
  },
  // Lunch — medium
  {
    id: "l_grain_bowl",
    name: "Quinoa bowl with feta + roasted veg",
    slot: "lunch",
    prepMinutes: 15,
    ingredientCount: 5,
    energyRequired: "medium",
    ingredients: ["quinoa", "feta", "zucchini", "bell pepper", "olive oil"],
    section: "produce",
  },
  // Lunch — high
  {
    id: "l_salmon_rice",
    name: "Pan-seared salmon + rice",
    slot: "lunch",
    prepMinutes: 20,
    ingredientCount: 4,
    energyRequired: "high",
    ingredients: ["salmon fillet", "jasmine rice", "soy sauce", "spring onion"],
    section: "meat",
    dealTag: "ICA — salmon expires tomorrow",
  },

  // Dinner — low
  {
    id: "d_omelette",
    name: "3-egg omelette with cheese",
    slot: "dinner",
    prepMinutes: 8,
    ingredientCount: 3,
    energyRequired: "low",
    ingredients: ["eggs", "cheese", "chives"],
    section: "dairy",
  },
  {
    id: "d_pasta_butter",
    name: "Cacio e pepe",
    slot: "dinner",
    prepMinutes: 12,
    ingredientCount: 4,
    energyRequired: "low",
    ingredients: ["spaghetti", "parmesan", "black pepper", "butter"],
    section: "drygoods",
    dealTag: "Coop — pasta 25% off",
  },
  // Dinner — medium
  {
    id: "d_chicken_roast",
    name: "Sheet-pan chicken thighs + potatoes",
    slot: "dinner",
    prepMinutes: 30,
    ingredientCount: 5,
    energyRequired: "medium",
    ingredients: ["chicken thighs", "potatoes", "rosemary", "olive oil", "garlic"],
    section: "meat",
    dealTag: "ICA — chicken 35% off",
  },
  // Dinner — high
  {
    id: "d_arabic_kofta",
    name: "Arabic kofta with rice + yogurt sauce",
    slot: "dinner",
    prepMinutes: 35,
    ingredientCount: 8,
    energyRequired: "high",
    ingredients: ["ground lamb", "onion", "parsley", "cumin", "yogurt", "garlic", "rice", "mint"],
    section: "meat",
  },
];

export const WEEKLY_DEALS: WeeklyDeal[] = [
  { store: "ica", item: "chicken thighs", priceSEK: 49, weekKey: "current" },
  { store: "ica", item: "salmon fillet", priceSEK: 89, weekKey: "current" },
  { store: "ica", item: "tomatoes", priceSEK: 19, weekKey: "current" },
  { store: "coop", item: "spaghetti", priceSEK: 14, weekKey: "current" },
  { store: "coop", item: "yogurt 1kg", priceSEK: 25, weekKey: "current" },
  { store: "lidl", item: "frozen berries", priceSEK: 28, weekKey: "current" },
  { store: "willys", item: "eggs 12-pack", priceSEK: 32, weekKey: "current" },
];

export const MEAL_OPTION_INDEX: Record<string, MealOption> = Object.fromEntries(
  MEAL_OPTIONS.map((m) => [m.id, m])
);

/**
 * Returns three options per slot, filtered by energy forecast and biased
 * toward this week's deals.
 */
export function suggestOptions(slot: MealOption["slot"], energy: EnergyForecast): MealOption[] {
  // Energy hierarchy: low picks from low; medium picks low+medium; high any.
  const eligible = MEAL_OPTIONS.filter((m) => {
    if (m.slot !== slot) return false;
    if (energy === "low") return m.energyRequired === "low";
    if (energy === "medium") return m.energyRequired !== "high";
    return true;
  });
  // Sort: dealTag first.
  const sorted = [...eligible].sort((a, b) => (b.dealTag ? 1 : 0) - (a.dealTag ? 1 : 0));
  // Return first 3 (or all if < 3).
  return sorted.slice(0, 3);
}

export function buildShoppingList(opts: {
  options: MealOption[];
  pantry: string[];
}): ShoppingListItem[] {
  const pantrySet = new Set(opts.pantry.map((p) => p.toLowerCase()));
  const dedup = new Map<string, ShoppingListItem>();
  for (const m of opts.options) {
    for (const ing of m.ingredients) {
      const k = ing.toLowerCase();
      if (pantrySet.has(k)) continue;
      if (dedup.has(k)) continue;
      dedup.set(k, { name: ing, section: m.section ?? "drygoods", checked: false });
    }
  }
  // Group output by section: produce → meat → dairy → frozen → bakery → drygoods.
  const order = ["produce", "meat", "dairy", "frozen", "bakery", "drygoods"];
  return [...dedup.values()].sort(
    (a, b) => order.indexOf(a.section) - order.indexOf(b.section)
  );
}

/**
 * Computes the current meal streak — consecutive days back from `today`
 * where the user logged "ate as planned" for at least 2 of 3 slots.
 *
 * PRD §11.2 — meal streak is decoupled from the main streak.
 */
export function mealStreak(logs: MealLog[], today: Date = new Date()): number {
  const byDate: Record<string, { yes: number; no: number; partial: number }> = {};
  for (const l of logs) {
    if (!byDate[l.date]) byDate[l.date] = { yes: 0, no: 0, partial: 0 };
    if (l.ateAsPlanned === true) byDate[l.date].yes += 1;
    else if (l.ateAsPlanned === false) byDate[l.date].no += 1;
    else byDate[l.date].partial += 1;
  }
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const k = cursor.toISOString().slice(0, 10);
    const v = byDate[k];
    if (!v) break;
    if (v.yes >= 2) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return streak;
}

/**
 * Returns true if this streak length triggers a milestone bonus that hasn't
 * already been awarded.
 *
 *   3-day → meal_streak_3 (+1,500)
 *   7-day → meal_streak_7 (+4,000)
 */
export function mealStreakBonusDue(streak: number): "meal_streak_3" | "meal_streak_7" | null {
  if (streak === 7) return "meal_streak_7";
  if (streak === 3) return "meal_streak_3";
  return null;
}

/**
 * Computes the user's plan-vs-delivery ratio for the recent window.
 * Surfaced by ACE in the monthly Honest Accounting.
 */
export function planVsDeliveryRatio(logs: MealLog[]): {
  plannedDays: number;
  deliveryDays: number;
  correlation: "positive" | "negative" | "none";
} {
  const byDate: Record<string, { planned: boolean; delivery: boolean }> = {};
  for (const l of logs) {
    if (!byDate[l.date]) byDate[l.date] = { planned: false, delivery: false };
    if (l.ateAsPlanned !== null && l.ateAsPlanned !== undefined) byDate[l.date].planned = true;
    if (l.deliveryOrdered) byDate[l.date].delivery = true;
  }
  let plannedDays = 0;
  let deliveryDays = 0;
  let bothPlanned = 0;
  let plannedNoDelivery = 0;
  for (const v of Object.values(byDate)) {
    if (v.planned) plannedDays += 1;
    if (v.delivery) deliveryDays += 1;
    if (v.planned && v.delivery) bothPlanned += 1;
    if (v.planned && !v.delivery) plannedNoDelivery += 1;
  }
  const corr: "positive" | "negative" | "none" =
    plannedDays === 0
      ? "none"
      : plannedNoDelivery / plannedDays > 0.7
        ? "negative"
        : bothPlanned / Math.max(1, deliveryDays) > 0.7
          ? "positive"
          : "none";
  return { plannedDays, deliveryDays, correlation: corr };
}
