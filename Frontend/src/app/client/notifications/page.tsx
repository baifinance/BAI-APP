"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useClientNotifications } from "../ClientContext";
import NotificationsTab, { NotificationItem } from "@/components/NotificationsTab";
import NotificationSettings from "@/components/NotificationSettings";
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
    } else if (item.type.toLowerCase().includes("booking")) {
      router.push("/client/bookings");
    }
  };

  if (notificationsLoading) return <NotificationSkeleton />;

  return (
    <div className="space-y-6">
      <NotificationSettings />
      <NotificationsTab
        notifications={notifications}
        variant="client"
        unreadCount={unreadCount}
        onMarkRead={markNotificationRead}
        onMarkAllRead={markAllNotificationsRead}
        onOpen={handleOpen}
      />
    </div>
  );
}
