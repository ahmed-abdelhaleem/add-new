import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { isAdminEmail, ADMIN_EMAIL } from "@/lib/admin";
import { listIntegrationFlags } from "@/lib/db";
import { INTEGRATION_CATALOG, type IntegrationKey } from "@/lib/integrations";

import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (!isAdminEmail(session.user.email)) {
    return (
      <div className="card border-flame/40 bg-flame/5">
        <h1 className="text-lg font-semibold text-flame">Access denied</h1>
        <p className="mt-2 text-sm text-ink-300">
          This dashboard is restricted to <span className="font-mono text-ink-200">{ADMIN_EMAIL}</span>. You are
          signed in as <span className="font-mono text-ink-200">{session.user.email ?? "unknown"}</span>.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/" className="text-gold underline">
            ← Home
          </Link>
        </p>
      </div>
    );
  }

  const rows = listIntegrationFlags();
  const map = {} as Record<IntegrationKey, boolean>;
  for (const k of INTEGRATION_CATALOG) {
    map[k.key] = true;
  }
  for (const r of rows) {
    if (r.key in map) map[r.key as IntegrationKey] = r.enabled;
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-500">
        Signed in as <span className="text-ink-300">{session.user.email}</span> ·{" "}
        <Link href="/" className="text-gold underline">
          Home
        </Link>
      </p>
      <AdminDashboard initialFlags={map} catalog={INTEGRATION_CATALOG} />
    </div>
  );
}
