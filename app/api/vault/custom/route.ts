import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  deleteVaultCustom,
  insertVaultCustom,
  listVaultCustom,
} from "@/lib/db";
import { isAnthropicCloudEnabled } from "@/lib/integrations";
import { getUserId } from "@/lib/session";

const DEFAULT_MODEL = process.env.ACE_MODEL || "claude-sonnet-4-6";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json({ items: listVaultCustom(userId) });
}

const schema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  category: z.enum(["travel", "experience", "learning", "food", "health", "delivery", "shopping"]),
  rate: z.enum(["A", "B"]).optional(),
  costSEK: z.number().int().min(1).max(50000),
});

interface AiReview {
  approve: boolean;
  reason: string;
  refinedTitle?: string;
  refinedDescription?: string;
  refinedRate?: "A" | "B" | "C";
}

async function moderate(input: z.infer<typeof schema>): Promise<AiReview> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Local fallback heuristic — flag obvious problematic categories.
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase();
  const harmful = /\b(gamble|casino|bet\s|crypto|coke|cocaine|alcohol|booze|liquor|porn|escort|smoke|cigarette|nicotine|vape)\b/.test(text);
  if (!apiKey || !isAnthropicCloudEnabled()) {
    if (harmful) {
      return { approve: false, reason: "Heuristic block: matches a harmful keyword." };
    }
    return {
      approve: true,
      reason: "Local heuristic — production review uses Claude.",
      refinedTitle: input.title,
      refinedDescription: input.description ?? "",
      refinedRate: input.rate ?? (input.category === "delivery" || input.category === "shopping" ? "B" : "A"),
    };
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 600,
    system: `You moderate user-proposed reward items for MOMENTUM, an app that
funds healthy behavior with a points economy. The user has a treated binge-eating
disorder, post-bariatric surgery, and an ADHD assessment underway.

Decision rules:
- APPROVE legitimate experiences (travel, restaurants, books, gym, art, hobbies,
  tickets, learning, wellness, sport gear). Default rate A.
- APPROVE non-essential shopping at rate B (food delivery, online shopping).
- REJECT anything that exploits the user's risk profile: gambling, alcohol top-ups,
  binge food, addictive substances, weight-loss programs, calorie-tracking apps,
  porn / escort services, vaping / nicotine, crypto / casino.
- If borderline, suggest a refined version (e.g. "spa day" instead of "alcohol delivery").

Output strict JSON only, schema:
{"approve": boolean, "reason": string, "refinedTitle": string, "refinedDescription": string, "refinedRate": "A"|"B"|"C"}`,
    messages: [
      {
        role: "user",
        content: `Title: ${input.title}
Category: ${input.category}
Cost: ${input.costSEK} SEK
Rate requested: ${input.rate ?? "auto"}
Description: ${input.description ?? "(none)"}`,
      },
    ],
  });
  const out = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  try {
    const start = out.indexOf("{");
    const end = out.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("no JSON");
    const parsed = JSON.parse(out.slice(start, end + 1)) as AiReview;
    return parsed;
  } catch {
    return { approve: !harmful, reason: "AI returned unparseable output; defaulted." };
  }
}

export async function POST(req: Request) {
  const userId = await getUserId();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const review = await moderate(parsed.data);
  const id = randomUUID();
  insertVaultCustom({
    id,
    userId,
    title: review.refinedTitle ?? parsed.data.title,
    description: review.refinedDescription ?? parsed.data.description ?? null,
    category: parsed.data.category,
    rate: (review.refinedRate ?? parsed.data.rate ?? "A") as "A" | "B" | "C",
    costSEK: parsed.data.costSEK,
    status: review.approve ? "approved" : "rejected",
    aiReview: review.reason,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ id, review });
}

const delSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const userId = await getUserId();
  const parsed = delSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  deleteVaultCustom(parsed.data.id, userId);
  return NextResponse.json({ ok: true });
}
