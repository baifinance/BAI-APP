/**
 * ==============================================================================
 * COMPONENT: NotificationsTab.tsx
 * Description: Notification center supporting Client, Broker, and Compliance
 *              portals. Renders full notification items (id/title/is_read) when
 *              provided, and degrades gracefully for legacy mock items.
 * ==============================================================================
 */

import React from "react";
import { Bell, CheckCheck } from "lucide-react";
import NotificationTypeIcon, { notificationTone } from "./NotificationTypeIcon";
import { timeAgo } from "@/lib/time";

export interface NotificationItem {
  id?: string;
  type: string;
  title?: string;
  message: string;
  time?: string;
  created_at?: string;
  is_read?: boolean;
}

interface NotificationsTabProps {
  notifications: NotificationItem[];
  variant?: "client" | "broker" | "loan_processing";
  unreadCount?: number;
  onMarkRead?: (id: string) => Promise<void> | void;
  onMarkAllRead?: () => Promise<void> | void;
  onOpen?: (item: NotificationItem) => void;
}

export default function NotificationsTab({
  notifications,
  variant = "broker",
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationsTabProps) {
  const isClient = variant === "client";
  const isLoanProcessing = variant === "loan_processing";

  const primaryText = isClient ? "text-[#0024A8]" : isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";

  const displayTime = (item: NotificationItem): string => {
    if (item.created_at) return timeAgo(item.created_at);
    return item.time || "";
  };

  const handleClick = (item: NotificationItem) => {
    if (item.id && onMarkRead) onMarkRead(item.id);
    if (onOpen) onOpen(item);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">System Notifications</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Every loan-status update, security change, and automated alert lands here in real time.
          </p>
        </div>
        {unreadCount > 0 && onMarkAllRead && (
          <button
            onClick={() => onMarkAllRead()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0024A8] hover:text-white text-slate-600 text-xs font-bold transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Bell className={`w-4.5 h-4.5 ${primaryText}`} />
            <span className="font-extrabold text-slate-800 text-sm">
              Alerts Log ({notifications.length})
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="py-12 text-center text-slate-400 text-xs font-semibold">
              No recent notifications found.
            </p>
          ) : (
            notifications.map((notif, idx) => {
              const unread = notif.is_read === false;
              return (
                <div
                  key={notif.id || idx}
                  onClick={() => handleClick(notif)}
                  className={`py-4 flex gap-4 items-start px-3 rounded-2xl transition-colors ${
                    onOpen || (notif.id && onMarkRead)
                      ? "cursor-pointer hover:bg-slate-50"
                      : ""
                  } ${unread ? "bg-[#0024A8]/[0.03]" : ""}`}
                >
                  <div className={`p-2 rounded-xl ${notificationTone(notif.type)} shrink-0`}>
                    <NotificationTypeIcon type={notif.type} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-400">
                      {notif.type}
                      {unread && (
                        <span className="ml-2 inline-block align-middle w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </span>
                    <p
                      className={`text-xs leading-relaxed ${
                        unread ? "text-slate-900 font-extrabold" : "text-slate-600 font-semibold"
                      }`}
                    >
                      {notif.title || notif.message}
                    </p>
                    <span className="text-[9px] text-slate-400 font-bold block">
                      {displayTime(notif)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}