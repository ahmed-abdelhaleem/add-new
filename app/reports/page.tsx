import { listMonthlyReports } from "@/lib/db";
import { getUserId } from "@/lib/session";

import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const userId = await getUserId();
  return <ReportsClient initialReports={listMonthlyReports(userId)} />;
}
