import Link from "next/link";

import { signOut } from "@/auth";
import { isGoogleAuthActive } from "@/lib/integrations";
import { getSessionUser } from "@/lib/session";

export default async function AuthWidget() {
  const user = await getSessionUser();
  const googleOn = isGoogleAuthActive();

  if (!googleOn) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-[11px] uppercase tracking-wide text-ink-500">demo</span>
        <Link href="/signin" className="rounded-lg border border-ink-600 px-2.5 py-1 text-xs font-medium text-ink-200 hover:border-gold hover:text-gold">
          Log in
        </Link>
        <Link href="/signin#create-account" className="rounded-lg bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold/25">
          Create account
        </Link>
      </div>
    );
  }

  if (!user || user.demo) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/signin"
          className="rounded-lg border border-ink-600 px-2.5 py-1 text-xs font-medium text-ink-200 hover:border-gold hover:text-gold"
        >
          Log in
        </Link>
        <Link
          href="/signin#create-account"
          className="rounded-lg bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold/25"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
      className="flex items-center gap-2"
    >
      <span className="max-w-[140px] truncate text-xs text-ink-300" title={user.email ?? undefined}>
        {user.name}
      </span>
      <button type="submit" className="text-xs font-medium text-gold underline hover:text-amber">
        Sign out
      </button>
    </form>
  );
}
