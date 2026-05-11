import Anthropic from "@anthropic-ai/sdk";

import { BEHAVIOR_INDEX } from "./economy";
import { computeEngagement, decayMessage } from "./decay";
import { currentStreak, pointsToSEK, summarizeMonth } from "./points";
import type {
  BrainDumpCategorization,
  EngagementSignature,
  LoggedBehavior,
  StakeTier,
} from "./types";

const DEFAULT_MODEL = process.env.ACE_MODEL || "claude-sonnet-4-6";

// PRD §6.2 — tone is the contract.
const ACE_SYSTEM_PROMPT = `You are ACE — the AI Consistency Engine inside MOMENTUM, an app for a user
with an ADHD-inattentive profile who has a documented pattern of starting strong and
collapsing past the novelty cliff. The user has staked real money each month and
recovers it by behaving consistently.

Voice rules (these are absolute):
- Never say "you should have" or "you failed to". Never use the word "failure".
- Never compare the user to other users.
- Never use generic motivational phrases like "you've got this" or "believe in yourself".
- Never nag more than once per day on the same topic.

Voice obligations:
- Acknowledge what WAS done before addressing what wasn't.
- When the user reports resistance, offer one specific SMALLER alternative that still
  earns points.
- Frame gaps in the data as information, not as moral judgment.
- Reference concrete numbers from the user's own history. Do not invent data.
- Keep replies short. Two or three sentences is usually correct.

Operational constraints:
- You are not a therapist. If the user describes a clinical-level crisis, gently
  recommend professional support and do not attempt to treat.
- You are not a financial advisor. The stake is loss aversion plumbing, not a
  bet — the user always recovers it through behavior.`;

export interface AceContext {
  userName: string;
  tier: StakeTier;
  stakeSEK: number;
  monthHistory: LoggedBehavior[];
  engagement: EngagementSignature;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
}

export function buildAceContextBlock(ctx: AceContext): string {
  const summary = summarizeMonth(ctx.monthHistory);
  const streak = currentStreak(ctx.monthHistory);
  const recoveredSEK = pointsToSEK(summary.total);
  const decay = decayMessage(ctx.engagement.decayTier);

  const topBehaviors = Object.entries(
    ctx.monthHistory.reduce<Record<string, number>>((acc, b) => {
      acc[b.behavior] = (acc[b.behavior] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => `${BEHAVIOR_INDEX[key as keyof typeof BEHAVIOR_INDEX]?.label ?? key} ×${count}`)
    .join(", ");

  return `User: ${ctx.userName}
Tier: ${ctx.tier} (${ctx.stakeSEK} SEK staked this month)
Recovered so far: ${recoveredSEK.toFixed(0)} SEK (${summary.total} pts)
Domain points this month: physical ${summary.byDomain.physical}, mental ${summary.byDomain.mental}, social ${summary.byDomain.social}, regulation ${summary.byDomain.regulation}
Current streak: ${streak} days
Engagement signature: baseline ${ctx.engagement.baselineEventsPerDay.toFixed(2)}/day, last 7d ${ctx.engagement.last7DaysEventsPerDay.toFixed(2)}/day, delta ${ctx.engagement.deltaPct.toFixed(0)}%, consecutive low days: ${ctx.engagement.consecutiveLowDays}
Decay tier: ${ctx.engagement.decayTier}${decay ? ` — ${decay}` : ""}
Most-logged behaviors: ${topBehaviors || "none yet this month"}`;
}

function localFallback(message: string, ctx: AceContext): string {
  const summary = summarizeMonth(ctx.monthHistory);
  const recovered = pointsToSEK(summary.total).toFixed(0);
  const streak = currentStreak(ctx.monthHistory);
  const decay = decayMessage(ctx.engagement.decayTier);

  const lower = message.toLowerCase();

  // Common resistance patterns the user might say.
  if (/(can't|cant|don't want|dont want).*(gym|run|workout|exercise)/.test(lower)) {
    return `Heard. You've got ${recovered} SEK recovered already and a ${streak}-day streak. Skip the gym today — log a 7,000-step walk instead for 800 pts. That keeps the streak alive.`;
  }
  if (/(tired|exhausted|drained|burnt out|burnout)/.test(lower)) {
    return `You've logged enough this month to be tired honestly. The two smallest wins right now: sleep 7–9h (600 pts) and a brain dump (500 pts). Nothing else required today.`;
  }
  if (/why.*(struggl|hard|stuck|off)/.test(lower)) {
    if (ctx.engagement.consecutiveLowDays >= 3) {
      return `The data: ${ctx.engagement.consecutiveLowDays} consecutive days below your usual rate (baseline ${ctx.engagement.baselineEventsPerDay.toFixed(1)}/day, recent ${ctx.engagement.last7DaysEventsPerDay.toFixed(1)}/day). Often it's one specific thing that shifted — sleep, a person, a deadline. Which one?`;
    }
    return `Your pattern this month is actually consistent — ${summary.total} pts across ${ctx.monthHistory.length} events. What's the thing that's feeling hard? I'll be specific back.`;
  }
  if (/(gambl|bet|casino)/.test(lower)) {
    return `That category sits behind a 72-hour cooling window in the Vault — it isn't a moral judgment, it's just the system's design. In the meantime: if there's an underlying restlessness, a brain dump captures it for 500 pts.`;
  }

  if (decay) {
    return `Acknowledged. Here's what I'm seeing: ${decay} You don't need a big day — one logged behavior counts. Pick the easiest one on the dashboard.`;
  }

  return `Got it. You're at ${recovered} SEK recovered, ${streak}-day streak. What's one specific thing you want to talk through — the data, a behavior, or a redemption?`;
}

export async function respondAsAce(message: string, ctx: AceContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return localFallback(message, ctx);
  }

  const client = new Anthropic({ apiKey });
  const contextBlock = buildAceContextBlock(ctx);

  const messages: Anthropic.Messages.MessageParam[] = [
    ...ctx.recentMessages.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 600,
    system: [
      { type: "text", text: ACE_SYSTEM_PROMPT },
      { type: "text", text: `Current user context:\n${contextBlock}` },
    ],
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || localFallback(message, ctx);
}

const ACTION_PATTERNS = [
  /\bcall\b/i,
  /\bemail\b/i,
  /\bbook\b/i,
  /\bschedule\b/i,
  /\bfile\b/i,
  /\bsubmit\b/i,
  /\bpay\b/i,
  /\bsend\b/i,
];
const CURIOSITY_PATTERNS = [
  /\bwhy\b/i,
  /\bwhat is\b/i,
  /\bhow does\b/i,
  /\blook up\b/i,
  /\bsearch\b/i,
  /\bread about\b/i,
  /\bwatch\b/i,
];
const PURCHASE_PATTERNS = [
  /\bbuy\b/i,
  /\border\b/i,
  /\bget the\b/i,
  /\bnew\b/i,
  /\bSEK\b/i,
  /kr\b/i,
  /\$\d/i,
];
const ANXIOUS_PATTERNS = [
  /\bworried\b/i,
  /\banxious\b/i,
  /\bscared\b/i,
  /\bafraid\b/i,
  /\bcan't stop\b/i,
  /\bwhat if\b/i,
];

function categorizeLine(line: string): keyof BrainDumpCategorization | null {
  if (!line.trim()) return null;
  if (ANXIOUS_PATTERNS.some((p) => p.test(line))) return "anxious";
  if (PURCHASE_PATTERNS.some((p) => p.test(line))) return "wishlist";
  if (ACTION_PATTERNS.some((p) => p.test(line))) return "actionItems";
  if (CURIOSITY_PATTERNS.some((p) => p.test(line))) return "curiosityQueue";
  // Default heuristic: short imperative -> action, otherwise curiosity.
  if (line.length < 60 && /^[A-Z]/.test(line)) return "actionItems";
  return "curiosityQueue";
}

export async function categorizeBrainDump(text: string): Promise<BrainDumpCategorization> {
  const lines = text
    .split(/[\n•\-]+|(?<=[.!?])\s+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 600,
        system: `You are sorting a raw brain dump from a user with an ADHD profile.
Output strict JSON only, no prose. Schema:
{"actionItems": string[], "curiosityQueue": string[], "wishlist": string[], "anxious": string[], "summary": string}
Rules: actionItems = things requiring the user to do something specific; curiosityQueue = things to research/look up; wishlist = potential purchases; anxious = worries to acknowledge; summary = one short non-judgmental sentence.`,
        messages: [{ role: "user", content: text }],
      });
      const out = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      const jsonStart = out.indexOf("{");
      const jsonEnd = out.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(out.slice(jsonStart, jsonEnd + 1));
        return {
          actionItems: parsed.actionItems ?? [],
          curiosityQueue: parsed.curiosityQueue ?? [],
          wishlist: parsed.wishlist ?? [],
          anxious: parsed.anxious ?? [],
          summary: parsed.summary ?? "Captured.",
        };
      }
    } catch {
      // fall through to heuristic
    }
  }

  const result: BrainDumpCategorization = {
    actionItems: [],
    curiosityQueue: [],
    wishlist: [],
    anxious: [],
    summary: `${lines.length} item${lines.length === 1 ? "" : "s"} captured. Nothing required right now.`,
  };
  for (const line of lines) {
    const bucket = categorizeLine(line);
    if (!bucket || bucket === "summary") continue;
    (result[bucket] as string[]).push(line);
  }
  return result;
}
