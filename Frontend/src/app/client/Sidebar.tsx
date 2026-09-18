/**
 * ==============================================================================
 * COMPONENT: Sidebar.tsx
 * Path: src/app/client/Sidebar.tsx
 * Description: Client Portal Navigation Sidebar styled with custom brand blue
 *              (#0024A8) background color. Supports collapsible mode — clicking
 *              the right-edge toggle button shrinks to icon-only view with
 *              hover tooltips. Features client profile and log out in bottom area.
 * ==============================================================================
 */

"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  Landmark,
  MessageSquare,
  Percent,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useClient } from "./ClientContext";

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
  clientName?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeTab, clientName, isCollapsed, onToggle }: SidebarProps) {
  const { client } = useClient();

  const menuItems = [
    { id: "Profile"        as ClientTabType, label: "Profile",         icon: User,          href: "/client/profile"         },
    { id: "LoanStatus"     as ClientTabType, label: "Loan Status",     icon: Landmark,      href: "/client/loan-status"     },
    { id: "Communication"  as ClientTabType, label: "Communication",   icon: MessageSquare, href: "/client/communication"   },
    { id: "Calculator"     as ClientTabType, label: "Calculator",      icon: Percent,       href: "/client/calculator"      },
    { id: "Notifications"  as ClientTabType, label: "Notifications",   icon: Bell,          href: "/client/notifications"   },
  ];

  const handleLogout = async () => {
    try {
      await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/auth/logout/", {
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

  const displayName = client?.name || clientName || "Emma Wilson";
  const displayEmail = client?.email || `${displayName.toLowerCase().replace(/\s+/g, ".")}@email.com`;
  const initials = displayName
    ? displayName.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "EW";

  return (
    <aside
      className={`sticky top-0 h-screen bg-[#0A2881] text-white border-r border-[#001D85] flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 select-none shadow-xl ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Brand Header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`p-4 border-b border-white/10 flex items-center gap-3 overflow-hidden ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-[#E4BA37] flex items-center justify-center text-[#0A2881] font-black text-sm tracking-tighter shrink-0 shadow-md">
          BAI
        </div>
        {!isCollapsed && (
          <div>
            <span className="font-extrabold text-white text-sm tracking-tight block">
              BAI FINANCE
            </span>
            <span className="text-[10px] text-[#E4BA37] font-bold uppercase tracking-wider block">
              Client Hub
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation Menu                                                    */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group">
              <Link
                href={item.href}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left text-sm font-extrabold transition-all relative ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-[#E4BA37] text-[#0A2881] shadow-lg shadow-[#E4BA37]/20"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                    isActive ? "text-[#0A2881]" : "text-white/80 group-hover:text-white"
                  }`}
                />

                {!isCollapsed && <span>{item.label}</span>}
              </Link>

              {/* Tooltip — visible in collapsed mode on hover */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#001859] text-white text-xs font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-xl border border-white/10">
                  {item.label}
                  {/* Tooltip arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#001859]" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* User Profile & Log Out Section (Bottom of Sidebar)                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto border-t border-white/10 bg-[#071E63]">
        {!isCollapsed ? (
          <div className="p-3.5 space-y-2.5">
            {/* Profile Row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E4BA37] text-[#0A2881] flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col min-w-0 text-left overflow-hidden">
                <span className="font-extrabold text-white text-xs leading-snug truncate">
                  {displayName}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#E4BA37]">
                  CLIENT PROFILE
                </span>
                <span className="text-[11px] font-medium text-white/70 truncate">
                  {displayEmail}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Logout Button */}
            <div className="flex justify-end">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/30 rounded-lg transition-colors cursor-pointer group"
                title="Log Out"
              >
                <span>Log Out</span>
                <LogOut className="w-4 h-4 text-rose-300 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-full bg-[#E4BA37] text-[#0A2881] flex items-center justify-center font-bold text-xs shadow-sm cursor-default"
              title={`${displayName} (${displayEmail})`}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-300 hover:text-white hover:bg-rose-600/30 transition-colors cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FULL-HEIGHT SQUARE COLLAPSE BUTTON STRIP                           */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-0 bottom-0 -right-5 w-5 z-30 flex items-center justify-center bg-[#071E63] hover:bg-[#E4BA37] text-white/70 hover:text-[#0A2881] border-r border-[#001D85] transition-all cursor-pointer group focus:outline-none rounded-none shadow-2xs"
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
