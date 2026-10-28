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
import Image from "next/image";
import {
  User,
  Landmark,
  MessageSquare,
  Percent,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useClientData, useClientNotifications } from "./ClientContext";
import { authApi } from "@/lib/api";

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
  compact?: boolean;
}

export default function Sidebar({ activeTab, clientName, isCollapsed, onToggle, compact = false }: SidebarProps) {
  const { client } = useClientData();
  const { unreadCount } = useClientNotifications();

  const menuItems = [
    { id: "Profile" as ClientTabType, label: "Profile", icon: User, href: "/client/profile" },
    { id: "LoanStatus" as ClientTabType, label: "Loan Status", icon: Landmark, href: "/client/loan-status" },
    { id: "Communication" as ClientTabType, label: "Chat Bot", icon: MessageSquare, href: "/client/communication" },
    { id: "Calculator" as ClientTabType, label: "Calculator", icon: Percent, href: "/client/calculator" },
    { id: "Notifications" as ClientTabType, label: "Notifications", icon: Bell, href: "/client/notifications" },
  ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Failed to log out from backend:", err);
    }
    // Auth cookies are HttpOnly and cleared by the backend logout endpoint.
    window.location.href = "/login";
  };

  const displayName = client?.name || clientName || "Client";
  const displayEmail = client?.email || "";
  const initials = displayName
    ? displayName.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "C";

  const pathname = usePathname();
  const isSettingsActive = pathname?.startsWith("/client/profile/settings");

  return (
    <aside
      className={`sticky top-0 h-screen sidebar-duotone-bg text-white border-r border-[#001D85]/80 flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40 select-none shadow-xl ${
        compact ? "w-full" : isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* 1. Brand Header                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`${compact ? "p-3 min-h-14" : "p-4 min-h-[69px]"} border-b border-white/[0.08] flex items-center overflow-hidden bg-transparent ${
          isCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        {isCollapsed ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-start shrink-0" title="BAI Group of Companies">
            <Image
              src="/bai_logo_white.png"
              alt="BAI"
              width={3383}
              height={1454}
              className="h-8 w-auto max-w-none object-left"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <Image
              src="/bai_logo_white.png"
              alt="BAI Group of Companies"
              width={3383}
              height={1454}
              className="h-8 w-auto object-contain"
            />
            <span className="text-[10px] text-[#E4BA37] font-bold uppercase tracking-wider block pl-0.5">
              Client Hub
            </span>
          </div>
        )}
      </div>

      <nav
        className={`flex-1 space-y-1.5 sidebar-nav-scroll ${
          compact ? "py-3 px-2" : "py-4 px-2"
        } ${isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"}`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative group">
              <Link
                href={item.href}
                data-active={isActive ? "true" : "false"}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  compact ? "gap-3 px-2.5 py-2.5 text-[13px]" : "gap-3.5 px-3 py-3 text-sm"
                } rounded-xl text-left font-extrabold transition-all relative sidebar-swipe-btn ${
                  isCollapsed && !compact ? "justify-center px-2 py-3" : ""
                } ${
                  isActive
                    ? "bg-[#E4BA37] text-[#0A2881] shadow-lg shadow-[#E4BA37]/25"
                    : "text-white/85 hover:text-white"
                }`}
              >
                {/* Icon wrapper: hover scale, rotation, and closed-state diagonal swipe highlight */}
                <div
                  data-active={isActive ? "true" : "false"}
                  className="sidebar-icon-container shrink-0 z-10"
                >
                  <Icon
                    className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                      isActive ? "text-[#0A2881]" : "text-white/85 group-hover:text-white"
                    }`}
                  />
                </div>

                {!isCollapsed && (
                  <span className="relative z-10 truncate transition-transform duration-300 group-hover:translate-x-0.5">
                    {item.label}
                  </span>
                )}

                {item.id === "Notifications" && unreadCount > 0 && (
                  <span
                    className={`relative z-10 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse ${
                      isCollapsed
                        ? "absolute right-1 top-1 min-w-4 h-4 text-[9px]"
                        : "ml-auto"
                    }`}
                    title={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Tooltip — visible in collapsed mode on hover */}
              {isCollapsed && (
                <div className="hidden group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#001859] text-white text-xs font-bold rounded-lg whitespace-nowrap z-50 shadow-xl border border-white/10 items-center pointer-events-none transition-opacity duration-150">
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
      {/* 3. User Profile & Log Out Section with Diagonal Swipe Buttons      */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-auto border-t border-white/[0.08] bg-black/15 backdrop-blur-xs">
        {!isCollapsed ? (
          <div className={`${compact ? "p-3 space-y-2" : "p-3.5 space-y-2.5"}`}>
            {/* Profile Row with Settings Icon on the Top Right */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
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
                  {!compact && (
                    <span className="text-[11px] font-medium text-white/70 truncate">
                      {displayEmail}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings Icon on Top Right of Profile Card with Diagonal Swipe */}
              <Link
                href="/client/profile/settings"
                className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer sidebar-swipe-btn group ${
                  isSettingsActive
                    ? "text-[#E4BA37] bg-white/20 ring-1 ring-[#E4BA37]/40 shadow-xs"
                    : "text-white/70 hover:text-white"
                }`}
                title="Profile Settings"
                aria-label="Profile Settings"
              >
                <div className="sidebar-icon-container">
                  <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
                </div>
              </Link>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Logout Button with Diagonal Swipe */}
            <div className="flex justify-end">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer group sidebar-swipe-btn"
                title="Log Out"
              >
                <span className="relative z-10">Log Out</span>
                <div className="sidebar-icon-container z-10">
                  <LogOut className="w-4 h-4 text-rose-300 group-hover:text-white transition-transform" />
                </div>
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

            {/* Settings Icon (Collapsed Sidebar Mode) with Diagonal Swipe */}
            <Link
              href="/client/profile/settings"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer sidebar-swipe-btn group ${
                isSettingsActive
                  ? "text-[#E4BA37] bg-white/20 ring-1 ring-[#E4BA37]/40"
                  : "text-white/70 hover:text-white"
              }`}
              title="Profile Settings"
              aria-label="Profile Settings"
            >
              <div className="sidebar-icon-container">
                <Settings className="w-4 h-4" />
              </div>
            </Link>

            {/* Log Out Button (Collapsed Sidebar Mode) with Diagonal Swipe */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-300 hover:text-white transition-colors cursor-pointer sidebar-swipe-btn group"
              title="Log Out"
            >
              <div className="sidebar-icon-container">
                <LogOut className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Full-Height Collapse Toggle Strip (Entire Side)                 */}
      {/* ------------------------------------------------------------------ */}
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-0 bottom-0 -right-5 w-5 z-30 hidden lg:flex items-center justify-center bg-[#071E63] hover:bg-[#E4BA37] text-white/70 hover:text-[#0A2881] border-r border-[#001D85] transition-all cursor-pointer group focus:outline-none rounded-none shadow-2xs"
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
