/**
 * ==============================================================================
 * COMPONENT: Sidebar.tsx
 * Path: src/app/client/Sidebar.tsx
 * Description: Client Portal Navigation Sidebar styled with custom brand blue
 *              (#0024A8) background color. Supports collapsible mode — clicking
 *              the right-edge toggle button shrinks to icon-only view with
 *              hover tooltips. Collapse state is lifted to layout.tsx.
 * ==============================================================================
 */

"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  Landmark,
  History,
  MessageSquare,
  Percent,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type ClientTabType =
  | "Profile"
  | "LoanStatus"
  | "PaymentHistory"
  | "Communication"
  | "Bookings"
  | "Calculator"
  | "Notifications";

interface SidebarProps {
  activeTab: ClientTabType;
  clientName: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeTab, isCollapsed, onToggle }: SidebarProps) {
  const menuItems = [
    { id: "Profile"        as ClientTabType, label: "Profile",         icon: User,          href: "/client/profile"         },
    { id: "LoanStatus"     as ClientTabType, label: "Loan Status",     icon: Landmark,      href: "/client/loan-status"     },
    { id: "PaymentHistory" as ClientTabType, label: "Payment History", icon: History,       href: "/client/payment-history" },
    { id: "Communication"  as ClientTabType, label: "Communication",   icon: MessageSquare, href: "/client/communication"   },
    { id: "Bookings"       as ClientTabType, label: "Bookings",        icon: Calendar,      href: "/client/bookings"        },
    { id: "Calculator"     as ClientTabType, label: "Calculator",      icon: Percent,       href: "/client/calculator"      },
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
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

  return (
    <aside
      className={`sticky top-0 h-screen bg-white text-slate-800 border-r border-slate-200/80 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Brand Header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`p-4 border-b border-slate-100 flex items-center gap-3 overflow-hidden ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-[#0024A8] flex items-center justify-center text-white font-black text-sm tracking-tighter shrink-0 shadow-sm">
          BAI
        </div>
        {!isCollapsed && (
          <div>
            <span className="font-extrabold text-[#0024A8] text-sm tracking-tight block">
              BAI FINANCE
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Client Hub
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation Menu                                                      */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-1 py-6 space-y-1.5 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          // Icon color: white if active tab; blue (#0024A8) when sidebar is collapsed; theme blue on hover when expanded
          const iconColor = isActive
            ? "text-white"
            : isCollapsed
            ? "text-[#0024A8]"
            : "text-[#0024A8]/70 group-hover:text-[#0024A8]";

          return (
            <div key={item.id} className="relative group">
              <Link
                href={item.href}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left text-sm font-extrabold transition-all relative ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-[#0024A8] text-white shadow-md shadow-[#0024A8]/15"
                    : "text-slate-600 hover:text-[#0024A8] hover:bg-slate-100/80"
                }`}
              >
                {/* Left active highlight indicator bar */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-amber-400 rounded-r-md" />
                )}

                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-colors ${iconColor}`}
                />

                {!isCollapsed && <span>{item.label}</span>}
              </Link>

              {/* Tooltip — visible in collapsed mode on hover */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                  {item.label}
                  {/* Tooltip arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* FULL-HEIGHT SQUARE COLLAPSE BUTTON STRIP                           */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-0 bottom-0 -right-5 w-5 z-30 flex items-center justify-center bg-slate-100/80 hover:bg-[#0024A8] text-slate-500 hover:text-white border-r border-slate-200 transition-all cursor-pointer group focus:outline-none rounded-none shadow-2xs"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <div className="sticky top-1/2 -translate-y-1/2 flex items-center justify-center w-full group-hover:scale-125 transition-all">
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </div>
      </button>
    </aside>
  );
}
