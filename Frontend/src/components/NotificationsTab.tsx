/**
 * ==============================================================================
 * COMPONENT: NotificationsTab.tsx
 * Description: Reworked Notifications Center for Client, Broker, and
 *              Loan Processing portals.
 *              Features:
 *              - Clean single-card container (outer banner removed)
 *              - "Notifications" header title (renamed from Alerts Logs)
 *              - Right-aligned Type Filter & "Mark as read" button inside container
 *              - 3-column card row:
 *                * Left: Unread indicator (red circle on very left, removed when read) + text/title
 *                * Center: Notification type badge (e.g. MFA, Loan, etc.)
 *                * Right: Formatted timestamp/date
 * ==============================================================================
 */

"use client";

import React, { useState, useMemo } from "react";
import { CheckCheck, ChevronDown } from "lucide-react";
import { useTimeAgo } from "@/lib/time";

// ==============================================================================
// 1. DATA TYPES & INTERFACES
// ==============================================================================
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

// ==============================================================================
// 2. MAIN COMPONENT DEFINITION
// ==============================================================================
function TimeText({ createdAt, fallback }: { createdAt?: string; fallback?: string }) {
  const label = useTimeAgo(createdAt, fallback);
  return <span suppressHydrationWarning>{label}</span>;
}

export default function NotificationsTab({
  notifications,
  variant = "broker",
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationsTabProps) {
  // ----------------------------------------------------------------------------
  // 3. STATE MANAGEMENT: FILTERING & READ TRACKING
  // ----------------------------------------------------------------------------
  // Filter state for notification types (defaults to "ALL")
  const [selectedType, setSelectedType] = useState<string>("ALL");

  // Local set of read notification identifiers for instantaneous UI feedback
  const [readItemIds, setReadItemIds] = useState<Set<string>>(new Set());

  // ----------------------------------------------------------------------------
  // 4. HELPERS & COMPUTED PROPERTIES
  // ----------------------------------------------------------------------------
  // Extract all distinct notification types dynamically from the list
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    notifications.forEach((item) => {
      if (item.type && item.type.trim()) {
        types.add(item.type.trim());
      }
    });
    return Array.from(types).sort();
  }, [notifications]);

  // Determine whether an individual notification is currently unread
  const checkIsUnread = (item: NotificationItem, idx: number): boolean => {
    const key = item.id || `notif-${idx}`;
    if (readItemIds.has(key)) return false;
    if (typeof item.is_read === "boolean") return !item.is_read;
    return false;
  };

  // Filter notifications by selected notification type
  const filteredNotifications = useMemo(() => {
    if (selectedType === "ALL") return notifications;
    return notifications.filter(
      (item) => item.type?.trim().toLowerCase() === selectedType.toLowerCase()
    );
  }, [notifications, selectedType]);

  // Count unread notifications dynamically
  const computedUnreadCount = useMemo(() => {
    return notifications.filter((item, idx) => checkIsUnread(item, idx)).length;
  }, [notifications, readItemIds]);


  // ----------------------------------------------------------------------------
  // 5. ACTION HANDLERS
  // ----------------------------------------------------------------------------
  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    const nextReadSet = new Set(readItemIds);
    notifications.forEach((item, idx) => {
      nextReadSet.add(item.id || `notif-${idx}`);
    });
    setReadItemIds(nextReadSet);

    if (onMarkAllRead) {
      await onMarkAllRead();
    }
  };

  // Handle single notification item click (marks as read and opens related resource)
  const handleItemClick = (item: NotificationItem, idx: number) => {
    const key = item.id || `notif-${idx}`;
    setReadItemIds((prev) => new Set(prev).add(key));

    if (item.id && onMarkRead) {
      onMarkRead(item.id);
    }
    if (onOpen) {
      onOpen(item);
    }
  };

  // ----------------------------------------------------------------------------
  // 6. JSX UI RENDERING
  // ----------------------------------------------------------------------------
  return (
    <div className="w-full animate-fadeIn">
      {/* ==================================================================== */}
      {/* NOTIFICATIONS CONTAINER CARD                                         */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-soft-xl space-y-4">
        
        {/* ================================================================== */}
        {/* CONTAINER HEADER: TITLE (LEFT), FILTER & MARK AS READ (RIGHT)     */}
        {/* ================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          
          {/* Title on the Left: "Notifications" */}
          <div className="flex items-center gap-2.5">
            <h2 className="font-extrabold text-slate-800 text-lg sm:text-xl tracking-tight">
              Notifications
            </h2>
            {computedUnreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-xs">
                {computedUnreadCount}
              </span>
            )}
          </div>

          {/* Controls on the Right: Type Filter & Mark as Read Button */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            
            {/* Filter Dropdown: Select specific notification type */}
            <div className="relative">
              <select
                id="notification-type-filter"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs font-bold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0024A8]/20 focus:border-[#0024A8]"
                aria-label="Filter by notification type"
              >
                <option value="ALL">All Types</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Mark as Read Action Button */}
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#0024A8] hover:text-white text-slate-700 text-xs font-bold transition-all duration-150 cursor-pointer border border-transparent shadow-xs active:scale-[0.98]"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Mark as read</span>
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* NOTIFICATIONS LIST                                                 */}
        {/* ================================================================== */}
        <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs font-semibold">
              {selectedType === "ALL"
                ? "No notifications found."
                : `No notifications found for type "${selectedType}".`}
            </div>
          ) : (
            filteredNotifications.map((notif, idx) => {
              const unread = checkIsUnread(notif, idx);

              return (
                <div
                  key={notif.id || idx}
                  onClick={() => handleItemClick(notif, idx)}
                  className={`py-4 px-3 sm:px-4 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    onOpen || onMarkRead ? "cursor-pointer" : ""
                  } ${
                    unread
                      ? "bg-slate-50/80 hover:bg-slate-100/70"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* -------------------------------------------------------- */}
                  {/* LEFT SIDE: RED CIRCLE (IF UNREAD) + NOTIFICATION TEXT/TITLE*/}
                  {/* -------------------------------------------------------- */}
                  <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                    {/* Unread Red Circle Icon: shown on very left when unread, removed when read */}
                    {unread ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 ring-4 ring-red-100"
                        title="Unread notification"
                        aria-label="Unread"
                      />
                    ) : (
                      /* Placeholder spacer keeps text neatly aligned across read & unread items */
                      <span className="w-2.5 shrink-0 hidden sm:inline-block" aria-hidden="true" />
                    )}

                    {/* Notification Title / Text */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm leading-snug truncate ${
                          unread
                            ? "font-extrabold text-slate-900"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {notif.title || notif.message}
                      </p>
                      {notif.title && notif.message && notif.title !== notif.message && (
                        <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                          {notif.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* CENTER: TYPE OF NOTIFICATION (MFA, ETC)                  */}
                  {/* -------------------------------------------------------- */}
                  <div className="shrink-0 sm:px-4 flex sm:justify-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50/90 text-[#0024A8] border border-blue-100 uppercase tracking-wider">
                      {notif.type}
                    </span>
                  </div>

                  {/* -------------------------------------------------------- */}
                  {/* RIGHT SIDE: TIME OR DATE                                 */}
                  {/* -------------------------------------------------------- */}
                  <div className="shrink-0 text-left sm:text-right sm:min-w-[100px]">
                    <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
                      <TimeText createdAt={notif.created_at} fallback={notif.time} />
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