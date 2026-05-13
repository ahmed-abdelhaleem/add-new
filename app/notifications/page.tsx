import { getNotificationPrefs, listNotifications } from "@/lib/db";
import { getUserId } from "@/lib/session";

import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const userId = await getUserId();
  return (
    <NotificationsClient
      initialPrefs={getNotificationPrefs(userId)}
      initialHistory={listNotifications(userId, 40)}
    />
  );
}
