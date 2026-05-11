import Anthropic from "@anthropic-ai/sdk";

import { BEHAVIOR_INDEX } from "./economy";
import { computeEngagement } from "./decay";
import { currentStreak, pointsToSEK, summarizeMonth } from "./points";
import type { LoggedBehavior, MedicationLog, MonthlyReport, MoodLog } from "./types";

const DEFAULT_MODEL = process.env.ACE_MODEL || "claude-sonnet-4-6";

interface ReportInputs {
  userName: string;
  monthKey: string;
  history: LoggedBehavior[];
  mood: MoodLog[];
  medication: MedicationLog[];
}

/**
 * PRD §5 Feature 9 — Pattern Insight Report. Behavioral summary in plain
 * language, generated monthly. Not a diagnosis.
 */
export async function generateMonthlyReport(input: ReportInputs): Promise<MonthlyReport> {
  const summary = summarizeMonth(input.history);
  const streak = currentStreak(input.history);
  const engagement = computeEngagement(input.history);
  const recovered = pointsToSEK(summary.total).toFixed(0);

  // Aggregate top + bottom behaviors.
  const counts: Record<string, number> = {};
  for (const h of input.history) counts[h.behavior] = (counts[h.behavior] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topBehaviors = sorted.slice(0, 3).map(([k, c]) => `${BEHAVIOR_INDEX[k as keyof typeof BEHAVIOR_INDEX]?.label ?? k} ×${c}`);
  const bottomBehaviors = sorted.slice(-3).map(([k, c]) => `${BEHAVIOR_INDEX[k as keyof typeof BEHAVIOR_INDEX]?.label ?? k} ×${c}`);

  const avgMood = input.mood.length
    ? (input.mood.reduce((s, m) => s + m.mood, 0) / input.mood.length).toFixed(2)
    : "n/a";

  const onMedDays = input.medication.filter((m) => m.taken).length;

  const factBlock = `Month: ${input.monthKey}
Total points: ${summary.total} (${recovered} SEK recovered)
By domain: physical ${summary.byDomain.physical}, mental ${summary.byDomain.mental}, social ${summary.byDomain.social}, regulation ${summary.byDomain.regulation}
Current streak: ${streak} days
Engagement signature: baseline ${engagement.baselineEventsPerDay.toFixed(2)}/day, last 7d ${engagement.last7DaysEventsPerDay.toFixed(2)}/day
Most-logged: ${topBehaviors.join("; ") || "n/a"}
Least-logged: ${bottomBehaviors.join("; ") || "n/a"}
Average mood: ${avgMood}/5 across ${input.mood.length} logs
Medication days: ${onMedDays}/${input.medication.length || 0}`;

  const generatedAt = new Date().toISOString();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const fallback = `**${input.monthKey} — pattern report**

This month you recovered ${recovered} SEK of your stake. Your strongest pattern was ${topBehaviors[0] ?? "n/a"}; the quietest was ${bottomBehaviors[0] ?? "n/a"}.

The data isn't a verdict — just what showed up. Mood averaged ${avgMood}/5 across ${input.mood.length} entries${onMedDays > 0 ? `, with ${onMedDays} medication days` : ""}.

One thing to try next month: pick the domain that was lowest and add one weekly anchor. Don't redesign the system.`;
    return { monthKey: input.monthKey, content: fallback, generatedAt };
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 800,
    system: `You write monthly Pattern Insight Reports for MOMENTUM users.
Constraints (PRD §5 Feature 9 + §6.2):
- Plain language, never clinical.
- No diagnoses, no medical claims, no shame language.
- Acknowledge what was done before naming what wasn't.
- Frame gaps as data, not failure.
- End with one specific, small suggestion for the next month — not a redesign.
- 4–6 short paragraphs, Markdown allowed.`,
    messages: [
      {
        role: "user",
        content: `Write the report for ${input.userName}, addressing them in the second person.\n\nFacts:\n${factBlock}`,
      },
    ],
  });
  const content =
    response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim() || "Report generation returned empty.";
  return { monthKey: input.monthKey, content, generatedAt };
}
