"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import NotificationsTab, { NotificationItem } from "@/components/NotificationsTab";
import NotificationSettings from "@/components/NotificationSettings";
import { notificationsApi, NotificationApiResponse } from "@/lib/api";

function mapNotification(notification: NotificationApiResponse): NotificationItem {
  return {
    id: notification.id,
    type: notification.notification_type,
    title: notification.title,
    message: notification.message,
    created_at: notification.created_at,
    is_read: notification.is_read,
  };
}

export default function ComplianceNotificationsPage() {
  const queryClient = useQueryClient();
  const queryKey = ["compliance", "notifications"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => notificationsApi.list(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    meta: { persist: false },
  });

  const notifications = (data ?? []).map(mapNotification);

  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    await queryClient.invalidateQueries({ queryKey });
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    await queryClient.invalidateQueries({ queryKey });
  };

  return (
    <div className="space-y-6">
      <NotificationSettings />
      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 text-sm font-semibold text-slate-500">
          Loading notifications...
        </div>
      ) : (
        <NotificationsTab
          notifications={notifications}
          variant="loan_processing"
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </div>
  );
}
