import { BEHAVIORS } from "@/lib/economy";
import LogClient from "./LogClient";

export const dynamic = "force-dynamic";

export default function LogPage() {
  return <LogClient behaviors={BEHAVIORS} />;
}
