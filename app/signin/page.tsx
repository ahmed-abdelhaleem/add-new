import Link from "next/link";

import { signIn } from "@/auth";
import { authEnabled } from "@/auth";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-300">
          MOMENTUM works against the demo user without sign-in. Sign in with
          Google to get your own account.
        </p>
      </header>

      {authEnabled ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn-primary w-full" type="submit">
            Continue with Google
          </button>
        </form>
      ) : (
        <div className="card border-amber/40 bg-amber/5 text-sm text-amber">
          <p>
            Google sign-in isn&apos;t configured for this deployment. Set
            <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">AUTH_SECRET</code>,
            <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">AUTH_GOOGLE_ID</code>,
            <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">AUTH_GOOGLE_SECRET</code>
            in Railway → Variables and add the callback URL
            <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">
              {`/api/auth/callback/google`}
            </code>
            in your Google Cloud OAuth client.
          </p>
          <p className="mt-3">
            In the meantime, the app continues to work as the seeded demo user.
          </p>
        </div>
      )}

      <Link href="/" className="text-sm text-gold underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
