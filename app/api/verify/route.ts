import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyFoodPhoto, verifyGymSession } from "@/lib/verification";

const gymSchema = z.object({
  kind: z.literal("gym"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  durationMinutes: z.number().optional(),
  attested: z.boolean().optional(),
});

const foodSchema = z.object({
  kind: z.literal("food_photo"),
  filename: z.string().optional(),
});

const schema = z.union([gymSchema, foodSchema]);

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.kind === "gym") {
    return NextResponse.json({ result: verifyGymSession(parsed.data) });
  }
  return NextResponse.json({ result: verifyFoodPhoto(parsed.data.filename) });
}
