import Link from "next/link";

import { signIn, signOut } from "@/auth";
import { googleOAuthEnvReady } from "@/lib/google-oauth-env";
import { isGoogleAuthActive, isIntegrationEnabled } from "@/lib/integrations";
import { getSessionUser } from "@/lib/session";

/**
 * Server-rendered account block so sign-in is reachable from /settings and /more
 * even when the root header is missing (older deploys) or fails to render.
 */
export default async function AccountSection() {
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  let googleOn = false;
  let envReady = false;
  try {
    user = await getSessionUser();
    googleOn = isGoogleAuthActive();
    envReady = googleOAuthEnvReady();
  } catch {
    user = null;
    googleOn = false;
    envReady = googleOAuthEnvReady();
  }

  return (
    <section className="card border-ink-600 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink-200">Account</h2>
        <p className="mt-1 text-xs text-ink-400">
          Sign in with Google keeps your own data. First sign-in creates your profile.
        </p>
      </div>

      {googleOn && user && !user.demo ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-300">
            Signed in as <span className="text-ink-100">{user.email ?? user.name}</span>
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-xs font-medium text-gold underline hover:text-amber">
              Sign out
            </button>
          </form>
        </div>
      ) : googleOn ? (
        <div className="space-y-3">
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
          <p id="create-account" className="text-xs text-ink-400">
            New here? The same button creates your account — there is no separate registration form.
          </p>
        </div>
      ) : !envReady ? (
        <p className="text-sm text-amber">
          Google sign-in is not configured. Set <span className="font-mono text-xs">AUTH_SECRET</span>,{" "}
          <span className="font-mono text-xs">AUTH_GOOGLE_ID</span>, and{" "}
          <span className="font-mono text-xs">AUTH_GOOGLE_SECRET</span> on the host, plus{" "}
          <span className="font-mono text-xs">AUTH_URL</span> in production, then redeploy.
        </p>
      ) : !isIntegrationEnabled("google_oauth") ? (
        <p className="text-sm text-amber">
          Google sign-in is turned off in admin integration flags. Re-enable{" "}
          <span className="font-mono text-xs">google_oauth</span> under{" "}
          <Link className="underline" href="/admin">
            /admin
          </Link>
          .
        </p>
      ) : (
        <p className="text-sm text-ink-400">Sign-in is temporarily unavailable. Try again shortly.</p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink-700 pt-4">
        <Link href="/signin" className="rounded-lg border border-ink-600 px-3 py-2 text-xs font-medium text-ink-200 hover:border-gold hover:text-gold">
          Open sign-in page
        </Link>
        <Link href="/signin#create-account" className="rounded-lg bg-gold/15 px-3 py-2 text-xs font-medium text-gold hover:bg-gold/25">
          Create account (info)
        </Link>
        <Link href="/admin" className="rounded-lg border border-ink-600 px-3 py-2 text-xs font-medium text-ink-400 hover:border-gold hover:text-gold">
          Admin
        </Link>
      </div>
    </section>
  );
}
