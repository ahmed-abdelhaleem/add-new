import { getMealPlanForDate, getShoppingListForPlan, listMealLogs, listPantry } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { MEAL_OPTION_INDEX, WEEKLY_DEALS, mealStreak, suggestOptions } from "@/lib/nourish";
import { dayKey } from "@/lib/time";

import NourishClient from "./NourishClient";

export const dynamic = "force-dynamic";

export default async function NourishPage() {
  const userId = await getUserId();
  const today = dayKey();
  const plan = getMealPlanForDate(userId, today);
  const shop = plan ? getShoppingListForPlan(plan.id) : null;
  const pantry = listPantry(userId);
  const logs = listMealLogs(userId);
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
