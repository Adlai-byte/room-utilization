import crypto from "crypto";
import { Notification } from "./types";
import { getNotifications, writeNotifications } from "./data";

export async function createNotification(params: {
  userId: string;
  type: Notification["type"];
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const notifications = getNotifications();
  const notification: Notification = {
    id: `notif_${crypto.randomUUID().slice(0, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...params,
  };
  notifications.push(notification);
  await writeNotifications(notifications);
}
