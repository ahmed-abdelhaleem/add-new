import { DEMO_USER_ID, getNotificationPrefs, listNotifications } from "@/lib/db";

import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <NotificationsClient
      initialPrefs={getNotificationPrefs(DEMO_USER_ID)}
      initialHistory={listNotifications(DEMO_USER_ID, 40)}
    />
  );
}
