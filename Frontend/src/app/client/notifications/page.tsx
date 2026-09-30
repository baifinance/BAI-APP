"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useClient } from "../ClientContext";
import NotificationsTab, { NotificationItem } from "@/components/NotificationsTab";
import { BellRing, BellOff } from "lucide-react";

type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export default function ClientNotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useClient();

  const [permission, setPermission] = useState<NotificationPermissionState>(
    () =>
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported"
  );

  const handleEnable = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const handleOpen = (item: NotificationItem) => {
    if (item.type.toLowerCase().includes("loan")) {
      router.push("/client/loan-status");
    }
  };

  return (
    <div className="space-y-6">
      {permission !== "granted" && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-soft-xl flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-2xl p-2 ${
                permission === "denied"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-[#0024A8]/10 text-[#0024A8]"
              }`}
            >
              {permission === "denied" ? (
                <BellOff className="w-5 h-5" />
              ) : (
                <BellRing className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Desktop alerts</h3>
              {permission === "denied" ? (
                <p className="text-xs text-slate-500 mt-0.5">
                  Notifications are blocked by your browser. Allow them for this
                  site to get loan-status alerts on your desktop.
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  Get a desktop pop-up when your broker updates your loan — even
                  while this tab isn&apos;t open.
                </p>
              )}
            </div>
          </div>
          {permission === "default" && (
            <button
              onClick={handleEnable}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0024A8] hover:bg-[#0024A8]/90 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <BellRing className="w-4 h-4" />
              Enable
            </button>
          )}
        </div>
      )}

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