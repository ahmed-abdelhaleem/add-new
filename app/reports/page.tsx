import { DEMO_USER_ID, listMonthlyReports } from "@/lib/db";

import ReportsClient from "./ReportsClient";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return <ReportsClient initialReports={listMonthlyReports(DEMO_USER_ID)} />;
}
