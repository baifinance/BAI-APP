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
import { createPortal } from "react-dom";
import logoWhite from "@/assets/brand/bai_logo_white.png";
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
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeTab, clientName, isCollapsed: isCollapsedProp, onToggle, isMobileOpen = false, onClose }: SidebarProps) {
  // Collapse only applies to the desktop rail; the mobile drawer always shows full labels.
  const isCollapsed = isCollapsedProp && !isMobileOpen;
  const { client } = useClientData();
  const { unreadCount } = useClientNotifications();

  const menuItems = [
    { id: "Profile" as ClientTabType, label: "Profile", icon: User, href: "/client/profile" },
    { id: "LoanStatus" as ClientTabType, label: "Loan Status", icon: Landmark, href: "/client/loan-status" },
    { id: "Communication" as ClientTabType, label: "Communication", icon: MessageSquare, href: "/client/communication" },
    { id: "Calculator" as ClientTabType, label: "Calculator", icon: Percent, href: "/client/calculator" },
    { id: "Notifications" as ClientTabType, label: "Notifications", icon: Bell, href: "/client/notifications" },
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

  const displayName = client?.name || clientName || "Client";
  const displayEmail = client?.email || "";
  const initials = displayName
    ? displayName.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "CL";

  const pathname = usePathname();
  const isSettingsActive = pathname?.startsWith("/client/profile/settings");

  // Collapsed-mode hover tooltip rendered via portal (outside the nav scroll container)
  const [tip, setTip] = React.useState<{ x: number; y: number; label: string } | null>(null);

  const showTip = (label: string, el: HTMLElement) => {
    if (!isCollapsed) return;
    const rect = el.getBoundingClientRect();
    setTip({ x: rect.right + 10, y: rect.top + rect.height / 2, label });
  };

  const hideTip = () => setTip(null);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 h-full w-64 bg-[#0A2881] text-white border-r border-[#001D85] flex flex-col shrink-0 transition-all duration-300 ease-in-out select-none shadow-xl lg:sticky lg:top-0 lg:h-screen lg:z-40 lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-16" : "lg:w-64"}`}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Brand Header                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`p-4 border-b border-white/10 flex items-center min-h-[69px] overflow-hidden ${isCollapsed ? "justify-center" : "gap-3"
          }`}
      >
        {isCollapsed ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-start shrink-0" title="BAI Group of Companies">
            <Image
              src={logoWhite}
              alt="BAI"
              className="h-8 w-auto max-w-none object-left"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0">
            <Image
              src={logoWhite}
              alt="BAI Group of Companies"
              className="h-8 w-auto object-contain"
            />
            <span className="text-[10px] text-[#E4BA37] font-bold uppercase tracking-wider block pl-0.5">
              Client Hub
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation Menu                                                    */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto overflow-x-clip" onScroll={hideTip}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              className="relative group"
              onMouseEnter={(e) => showTip(item.label, e.currentTarget)}
              onMouseLeave={hideTip}
              onFocus={(e) => showTip(item.label, e.currentTarget)}
              onBlur={hideTip}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left text-sm font-extrabold transition-all relative ${isCollapsed ? "lg:justify-center" : ""
                  } ${isActive
                    ? "bg-[#E4BA37] text-[#0A2881] shadow-lg shadow-[#E4BA37]/20"
                    : "text-white/85 hover:text-white hover:bg-white/10"
                  }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? "text-[#0A2881]" : "text-white/80 group-hover:text-white"
                    }`}
                />

                {!isCollapsed && <span>{item.label}</span>}

                {item.id === "Notifications" && unreadCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse ${
                      isCollapsed
                        ? "absolute right-1.5 top-1.5 min-w-4 h-4 text-[9px]"
                        : "ml-auto"
                    }`}
                    title={`${unreadCount} unread`}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
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
                  <span className="text-[11px] font-medium text-white/70 truncate">
                    {displayEmail}
                  </span>
                </div>
              </div>

              {/* Settings Icon on Top Right of Profile Card */}
              <Link
                href="/client/profile/settings"
                className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                  isSettingsActive
                    ? "text-[#E4BA37] bg-white/20 ring-1 ring-[#E4BA37]/40 shadow-xs"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title="Profile Settings"
                aria-label="Profile Settings"
              >
                <Settings className="w-4 h-4 transition-transform hover:rotate-45" />
              </Link>
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

            {/* Settings Icon (Collapsed Sidebar Mode) */}
            <Link
              href="/client/profile/settings"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                isSettingsActive
                  ? "text-[#E4BA37] bg-white/20 ring-1 ring-[#E4BA37]/40"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              title="Profile Settings"
              aria-label="Profile Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* Log Out Button */}
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

      {/* Portaled collapsed-mode hover tooltip (rendered on document.body so it
          stays out of the nav scroll container — no horizontal scrollbar) */}
      {isCollapsed && tip && typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
            className="fixed z-[100] -translate-y-1/2 pointer-events-none px-2.5 py-1.5 bg-[#001859] text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-xl border border-white/10 animate-fadeIn"
          >
            {tip.label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#001859]" />
          </div>,
          document.body
        )}
    </aside>
  );
}
