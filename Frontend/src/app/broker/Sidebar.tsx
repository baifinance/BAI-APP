/**
 * ==============================================================================
 * COMPONENT: Sidebar.tsx
 * Path: src/app/broker/Sidebar.tsx
 * Description: Collapsible sidebar navigation component for the Broker Portal zone.
 *              Supports collapsing to icon-only mode with active tab highlights.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Home, Users, ClipboardList, Calendar, MessageSquare, Percent, ChevronLeft, ChevronRight } from "lucide-react";

export type TabType = "Dashboard" | "Clients" | "Applications" | "Bookings" | "Communication" | "Calculators" | "Notifications";

interface SidebarProps {
  activeTab: TabType;
}

export default function Sidebar({ activeTab }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Navigation tabs definition
  const menuItems = [
    { id: "Dashboard" as TabType, label: "Dashboard", icon: Home, href: "/broker/dashboard" },
    { id: "Clients" as TabType, label: "Clients", icon: Users, href: "/broker/clients" },
    { id: "Applications" as TabType, label: "Applications", icon: ClipboardList, href: "/broker/applications" },
    { id: "Bookings" as TabType, label: "Bookings", icon: Calendar, href: "/broker/bookings" },
    { id: "Communication" as TabType, label: "Communication", icon: MessageSquare, href: "/broker/communication" },
    { id: "Calculators" as TabType, label: "Calculators", icon: Percent, href: "/broker/calculator" },
  ];

  return (
    <aside
      className={`bg-white text-[#0038A8] border-r border-[#0038A8]/20 min-h-screen flex flex-col shrink-0 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header & Collapse Toggle */}
      <div
        className={`p-4 border-b border-[#0038A8]/20 flex items-center justify-between min-h-[73px] select-none ${
          isCollapsed ? "flex-col gap-2 py-4 justify-center" : "px-6"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-[5px] bg-[#0038A8] flex items-center justify-center text-white font-extrabold text-sm tracking-tighter shrink-0">
            BAI
          </div>
          {!isCollapsed && (
            <div className="animate-fadeIn">
              <span className="font-extrabold text-[#0038A8] text-sm tracking-tight block whitespace-nowrap">
                BAI FINANCE
              </span>
              <span className="text-[10px] text-[#0038A8]/80 font-bold uppercase tracking-wider block whitespace-nowrap">
                Broker Portal
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-[5px] bg-slate-100 hover:bg-[#0038A8]/10 text-[#0038A8] transition-colors cursor-pointer shrink-0 border border-[#0038A8]/20"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#0038A8]" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-[#0038A8]" />
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3.5 py-3 rounded-[5px] text-sm font-semibold transition-all relative ${
                isCollapsed ? "justify-center px-0" : "px-4"
              } ${
                isActive
                  ? "bg-[#0038A8] text-white shadow-xs"
                  : "text-[#0038A8] hover:bg-[#0038A8]/10"
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-[#0038A8]"
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

