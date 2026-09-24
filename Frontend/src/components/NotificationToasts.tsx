"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useClient } from "@/app/client/ClientContext";
import NotificationTypeIcon, { notificationTone } from "./NotificationTypeIcon";
import { timeAgo } from "@/lib/time";

const TOAST_MS = 6000;

function ToastItem({
  id,
  type,
  title,
  message,
  created_at,
  onDismiss,
  onMarkRead,
  onOpen,
}: {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => Promise<void>;
  onOpen: (id: string) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      role="status"
      className="w-80 bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-4 flex items-start gap-3 cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all animate-fadeIn"
      onClick={() => {
        onMarkRead(id);
        onOpen(id);
        onDismiss(id);
      }}
    >
      <div className={`p-2 rounded-xl ${notificationTone(type)} shrink-0`}>
        <NotificationTypeIcon type={type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-800 leading-snug line-clamp-2">
          {title || message}
        </p>
        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
          {timeAgo(created_at)}
        </p>
      </div>
      <button
        aria-label="Dismiss"
        className="shrink-0 text-slate-300 hover:text-slate-500 cursor-pointer transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NotificationToasts() {
  const { toasts, dismissToast, markNotificationRead } = useClient();
  const router = useRouter();

  const handleOpen = (id: string) => {
    const item = toasts.find((t) => t.id === id);
    if (item && item.type.toLowerCase().includes("loan")) {
      router.push("/client/loan-status");
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          type={t.type}
          title={t.title}
          message={t.message}
          created_at={t.created_at}
          onDismiss={dismissToast}
          onMarkRead={markNotificationRead}
          onOpen={handleOpen}
        />
      ))}
    </div>
  );
}