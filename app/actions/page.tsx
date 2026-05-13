import { listActionItems } from "@/lib/db";
import { getUserId } from "@/lib/session";
import ActionsClient from "./ActionsClient";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const userId = await getUserId();
  return <ActionsClient initialItems={listActionItems(userId)} />;
}
