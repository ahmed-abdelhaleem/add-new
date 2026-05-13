import Link from "next/link";

import { signIn } from "@/auth";
import { googleOAuthEnvReady } from "@/lib/google-oauth-env";
import { isGoogleAuthActive, isIntegrationEnabled } from "@/lib/integrations";

export const dynamic = "force-dynamic";

function safeRedirect(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const envReady = googleOAuthEnvReady();
  const googleOn = isGoogleAuthActive();
  const flagOff = envReady && !isIntegrationEnabled("google_oauth");
  const redirectTo = safeRedirect(searchParams.callbackUrl);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-300">
          MOMENTUM works as the demo user until you sign in. Use the same Google button to log in or create
          a new account the first time.
        </p>
      </header>

      {googleOn ? (
        <div className="space-y-4">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button className="btn-primary w-full" type="submit">
              Continue with Google
            </button>
          </form>
          <p id="create-account" className="text-xs text-ink-400">
            New here? That same sign-in creates your MOMENTUM profile automatically — there is no separate
            registration form.
          </p>
        </div>
      ) : flagOff ? (
        <div className="card border-amber/40 bg-amber/5 text-sm text-amber">
          <p>
            Google sign-in is turned off for this deployment in the admin integration settings. Ask an
            administrator to enable <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">google_oauth</code>{" "}
            or open <Link className="underline" href="/admin">/admin</Link> if you have access.
          </p>
        </div>
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
            in your Google Cloud OAuth client. In production also set{" "}
            <code className="mx-1 rounded bg-ink-700 px-1 py-0.5 text-xs">AUTH_URL</code> to your public https base.
          </p>
          <p className="mt-3">
            In the meantime, the app continues to work as the seeded demo user. You can still use{" "}
            <span className="font-medium text-ink-200">Log in</span> / <span className="font-medium text-ink-200">Create account</span>{" "}
            in the header to reach this page.
          </p>
        </div>
      )}

      <Link href="/" className="text-sm text-gold underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}
