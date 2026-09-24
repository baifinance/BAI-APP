import React from "react";
import {
  Landmark,
  ShieldAlert,
  MessageSquare,
  BellRing,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Bell,
} from "lucide-react";

export function notificationTone(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("loan") || t.includes("settle") || t.includes("approve")) {
    return "text-[#0024A8] bg-[#0024A8]/10";
  }
  if (t.includes("mfa") || t.includes("2fa") || t.includes("security")) {
    return "text-rose-600 bg-rose-50";
  }
  if (t.includes("communication") || t.includes("message")) {
    return "text-emerald-600 bg-emerald-50";
  }
  if (t.includes("alert") || t.includes("warning")) {
    return "text-amber-600 bg-amber-50";
  }
  if (t.includes("upload") || t.includes("file") || t.includes("submission")) {
    return "text-sky-600 bg-sky-50";
  }
  if (t.includes("system")) {
    return "text-slate-600 bg-slate-100";
  }
  return "text-[#0024A8] bg-[#0024A8]/10";
}

export default function NotificationTypeIcon({
  type,
  className = "w-4 h-4",
}: {
  type: string;
  className?: string;
}) {
  const t = (type || "").toLowerCase();
  if (t.includes("loan") || t.includes("settle") || t.includes("approve")) {
    return <Landmark className={className} />;
  }
  if (t.includes("mfa") || t.includes("2fa") || t.includes("security")) {
    return <ShieldAlert className={className} />;
  }
  if (t.includes("communication") || t.includes("message")) {
    return <MessageSquare className={className} />;
  }
  if (t.includes("alert") || t.includes("warning")) {
    return <AlertTriangle className={className} />;
  }
  if (t.includes("upload") || t.includes("file") || t.includes("submission")) {
    return <FileText className={className} />;
  }
  if (t.includes("system")) {
    return <BellRing className={className} />;
  }
  if (t.includes("success") || t.includes("settled")) {
    return <CheckCircle2 className={className} />;
  }
  return <Bell className={className} />;
}