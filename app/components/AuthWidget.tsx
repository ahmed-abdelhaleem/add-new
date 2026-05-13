import Link from "next/link";

import { authEnabled, signOut } from "@/auth";
import { getSessionUser } from "@/lib/session";

export default async function AuthWidget() {
  const user = await getSessionUser();

  if (!authEnabled) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <span>demo</span>
        <Link href="/signin" className="text-gold underline">
          sign in
        </Link>
      </div>
    );
  }

  if (!user || user.demo) {
    return (
      <Link
        href="/signin"
        className="text-xs text-gold underline hover:text-amber"
      >
        Sign in
      </Link>
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
      <span className="text-xs text-ink-300">{user.name}</span>
      <button type="submit" className="text-xs text-gold underline hover:text-amber">
        sign out
      </button>
    </form>
  );
}
