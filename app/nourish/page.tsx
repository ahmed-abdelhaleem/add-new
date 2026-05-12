import {
  DEMO_USER_ID,
  getMealPlanForDate,
  getShoppingListForPlan,
  listMealLogs,
  listPantry,
} from "@/lib/db";
import { MEAL_OPTION_INDEX, WEEKLY_DEALS, mealStreak, suggestOptions } from "@/lib/nourish";
import { dayKey } from "@/lib/time";

import NourishClient from "./NourishClient";

export const dynamic = "force-dynamic";

export default function NourishPage() {
  const today = dayKey();
  const plan = getMealPlanForDate(DEMO_USER_ID, today);
  const shop = plan ? getShoppingListForPlan(plan.id) : null;
  const pantry = listPantry(DEMO_USER_ID);
  const logs = listMealLogs(DEMO_USER_ID);
  const streak = mealStreak(logs);

  // Default suggestion set for medium energy if no plan exists.
  const suggestions = {
    breakfast: suggestOptions("breakfast", "medium"),
    lunch: suggestOptions("lunch", "medium"),
    dinner: suggestOptions("dinner", "medium"),
  };

  const planLabels = plan
    ? {
        breakfast: MEAL_OPTION_INDEX[plan.breakfastId],
        lunch: MEAL_OPTION_INDEX[plan.lunchId],
        dinner: MEAL_OPTION_INDEX[plan.dinnerId],
      }
    : null;

  return (
    <NourishClient
      today={today}
      plan={plan ?? null}
      planLabels={planLabels}
      shop={shop ?? null}
      pantry={pantry}
      logs={logs.slice(0, 50)}
      streak={streak}
      suggestions={suggestions}
      deals={WEEKLY_DEALS}
    />
  );
}
