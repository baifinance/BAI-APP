/**
 * ==============================================================================
 * COMPONENT: NotificationsTab.tsx
 * Path: src/app/broker/components/NotificationsTab.tsx
 * Description: Unified notifications logging display component supporting
 *              theme variants dynamically for Client, Broker, and Compliance portals.
 * ==============================================================================
 */

import React from "react";
import { Bell, AlertTriangle, FileText, CheckCircle2, ShieldAlert } from "lucide-react";

export interface NotificationItem {
  type: string;
  message: string;
  time: string;
}

interface NotificationsTabProps {
  notifications: NotificationItem[];
  variant?: "client" | "broker" | "loan_processing";
}

export default function NotificationsTab({ notifications, variant = "broker" }: NotificationsTabProps) {
  const isClient = variant === "client";
  const isLoanProcessing = variant === "loan_processing";
  
  const primaryText = isClient ? "text-[#0024A8]" : isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";
  const primaryBg = isClient ? "bg-[#0024A8]/10" : isLoanProcessing ? "bg-[#1429A9]/10" : "bg-[#0B2369]/10";
  const accentText = isClient ? "text-[#0024A8]" : isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";
  const dotColor = isClient ? "bg-[#0024A8]" : isLoanProcessing ? "bg-[#1429A9]" : "bg-[#0B2369]";

  const getIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("alert") || t.includes("outstanding") || t.includes("warning")) {
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
    if (t.includes("upload") || t.includes("submission") || t.includes("file")) {
      return <FileText className={`w-4 h-4 ${accentText}`} />;
    }
    if (t.includes("approve") || t.includes("success") || t.includes("settle")) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (t.includes("audit") || t.includes("flagged") || t.includes("system")) {
      return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    }
    return <Bell className={`w-4 h-4 ${accentText}`} />;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">System Notifications</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          View all real-time alerts, dossier uploads, and automated messages.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Bell className={`w-4.5 h-4.5 ${primaryText}`} />
            <span className="font-extrabold text-slate-800 text-sm">Alerts Log ({notifications.length})</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
          {notifications.length === 0 ? (
            <p className="py-12 text-center text-slate-400 text-xs font-semibold">
              No recent notifications found.
            </p>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className="py-4 flex gap-4 items-start hover:bg-slate-50/20 px-3 rounded-2xl transition-colors">
                <div className={`p-2 rounded-xl ${primaryBg} shrink-0`}>
                  {getIcon(notif.type)}
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-400">
                    {notif.type}
                  </span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="text-[9px] text-slate-400 font-bold block">
                    {notif.time}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0 mt-3`} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
