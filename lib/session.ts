import { auth, authEnabled } from "@/auth";

import { DEMO_USER_ID, getUser } from "./db";

/**
 * Resolve the active user id.
 *
 * - When NextAuth + Google is configured (AUTH_* env vars set) AND the
 *   caller is signed in, returns their internal user id.
 * - Otherwise falls back to the seeded demo user. This keeps the app
 *   usable in development and on Railway before Google credentials are
 *   wired.
 */
export async function getUserId(): Promise<string> {
  if (!authEnabled) return DEMO_USER_ID;
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (id) return id;
  return DEMO_USER_ID;
}

export async function requireUserId(): Promise<string> {
  if (!authEnabled) return DEMO_USER_ID;
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function getSessionUser() {
  if (!authEnabled) {
    const u = getUser(DEMO_USER_ID);
    return u ? { id: u.id, name: u.name, email: u.email ?? null, image: u.image ?? null, demo: true } : null;
  }
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const u = getUser(id);
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email ?? null, image: u.image ?? null, demo: false };
}
