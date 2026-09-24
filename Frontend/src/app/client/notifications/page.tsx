"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useClient } from "../ClientContext";
import NotificationsTab, { NotificationItem } from "@/components/NotificationsTab";

export default function ClientNotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useClient();

  const handleOpen = (item: NotificationItem) => {
    if (item.type.toLowerCase().includes("loan")) {
      router.push("/client/loan-status");
    }
  };

  return (
    <NotificationsTab
      notifications={notifications}
      variant="client"
      unreadCount={unreadCount}
      onMarkRead={markNotificationRead}
      onMarkAllRead={markAllNotificationsRead}
      onOpen={handleOpen}
    />
  );
}