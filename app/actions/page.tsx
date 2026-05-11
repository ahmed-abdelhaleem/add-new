import { DEMO_USER_ID, listActionItems } from "@/lib/db";
import ActionsClient from "./ActionsClient";

export const dynamic = "force-dynamic";

export default function ActionsPage() {
  return <ActionsClient initialItems={listActionItems(DEMO_USER_ID)} />;
}
