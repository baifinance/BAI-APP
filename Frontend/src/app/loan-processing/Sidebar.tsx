/**
 * ==============================================================================
 * COMPONENT: Sidebar.tsx
 * Path: src/app/loan-processing/Sidebar.tsx
 * Description: Sidebar component styled indicating the dedicated Loan Processing Portal zone.
 *              Uses Next.js Links.
 * ==============================================================================
 */

"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, CheckSquare, ClipboardList, ShieldAlert, Percent, Bell, LogOut } from "lucide-react";

export type LoanProcessingTabType = "Dashboard" | "Review" | "Application" | "AuditLog" | "Calculator" | "Notifications";

interface SidebarProps {
  activeTab: LoanProcessingTabType;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  // Menu items for Loan Processing portal
  const menuItems = [
    { id: "Dashboard" as LoanProcessingTabType, label: "Dashboard", icon: LayoutDashboard, href: "/loan-processing/dashboard" },
    { id: "Review" as LoanProcessingTabType, label: "Review Tab", icon: CheckSquare, href: "/loan-processing/review" },
    { id: "Application" as LoanProcessingTabType, label: "Application", icon: ClipboardList, href: "/loan-processing/application" },
    { id: "AuditLog" as LoanProcessingTabType, label: "Audit Log", icon: ShieldAlert, href: "/loan-processing/audit-log" },
    { id: "Calculator" as LoanProcessingTabType, label: "Calculator", icon: Percent, href: "/loan-processing/calculator" },
  ];

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to log out from backend:", err);
    }
    // Clear cookies
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to landing page
    window.location.href = "/";
  };

  return (
    <aside className="w-64 bg-[#1429A9] text-white border-r border-black/10 min-h-screen flex flex-col shrink-0">
      
      {/* Brand Header (Contrast logo on blue background) */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1429A9] font-black text-sm tracking-tighter">
          BAI
        </div>
        <div>
          <span className="font-extrabold text-white text-sm tracking-tight block">
            BAI FINANCE
          </span>
          <span className="text-[10px] text-slate-100/70 font-bold uppercase tracking-wider block">
            Loan Processing Portal
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-sm font-extrabold transition-all relative ${
                isActive
                  ? "bg-white/15 text-white shadow-xs"
                  : "text-slate-100/75 hover:text-white hover:bg-white/10"
              }`}
            >
              {/* Golden active indicator on the left */}
              {isActive && (
                <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-amber-400 rounded-r-md" />
              )}
              
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-slate-100/60"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
