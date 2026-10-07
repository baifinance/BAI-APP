"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useClientNotifications } from "../ClientContext";
import NotificationsTab, { NotificationItem } from "@/components/NotificationsTab";
import { NotificationSkeleton } from "@/components/Skeleton";

export default function ClientNotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    notificationsLoading,
  } = useClientNotifications();

  const handleOpen = (item: NotificationItem) => {
    if (item.type.toLowerCase().includes("loan")) {
      router.push("/client/loan-status");
    }
  };

  if (notificationsLoading) return <NotificationSkeleton />;

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
