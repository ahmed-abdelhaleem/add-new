import { listCuriosity } from "@/lib/db";
import { getUserId } from "@/lib/session";
import CuriosityClient from "./CuriosityClient";

export const dynamic = "force-dynamic";

export default async function CuriosityPage() {
  const userId = await getUserId();
  const items = listCuriosity(userId);
  return <CuriosityClient initialItems={items} />;
}
