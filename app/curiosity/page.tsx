import { DEMO_USER_ID, listCuriosity } from "@/lib/db";
import CuriosityClient from "./CuriosityClient";

export const dynamic = "force-dynamic";

export default function CuriosityPage() {
  const items = listCuriosity(DEMO_USER_ID);
  return <CuriosityClient initialItems={items} />;
}
