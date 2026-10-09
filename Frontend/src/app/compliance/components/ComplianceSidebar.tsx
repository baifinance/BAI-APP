/**
 * ==============================================================================
 * COMPONENT: ComplianceSidebar.tsx
 * Path: src/app/compliance/components/ComplianceSidebar.tsx
 * Description: Dedicated navigation sidebar for the Compliance Portal.
 *              Styled consistently with the Client Portal sidebar (#0A2881
 *              brand blue), supports collapsible states, displays the "Users"
 *              tab as the single active navigation item, and features user
 *              profile & logout controls.
 * ==============================================================================
 */

"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface ComplianceSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function ComplianceSidebar({
  isCollapsed,
  onToggle,
}: ComplianceSidebarProps) {
  const handleLogout = async () => {
    try {
      await fetch(
        (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") +
          "/api/auth/logout/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
    } catch (err) {
      console.error("Failed to log out from backend:", err);
    }
    document.cookie =
      "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/";
  };

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
        className={`p-4 border-b border-white/10 flex items-center min-h-[69px] overflow-hidden ${
          isCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        {isCollapsed ? (
          <div
            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-start shrink-0"
            title="BAI Compliance Hub"
          >
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
              Compliance Hub
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation Menu: Only Tab is the "Users" Tab                      */}
      {/* ------------------------------------------------------------------ */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="relative group">
          <Link
            href="/compliance"
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 cursor-pointer bg-[#E4BA37] text-[#0A2881] font-bold shadow-md shadow-[#E4BA37]/20"
          >
            <Users className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <span className="text-sm tracking-wide">Users</span>
            )}
          </Link>

          {/* Collapsed Tooltip */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
              Users Tab
            </div>
          )}
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar Collapse / Expand Toggle Button                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 border-t border-white/10 flex justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="w-full py-2 flex items-center justify-center gap-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xs font-semibold"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom User Area & Logout                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-3 border-t border-white/10 bg-[#071D60]">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#E4BA37] to-[#F59E0B] text-[#0A2881] font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                CO
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                  Compliance Officer
                </p>
                <div className="flex items-center gap-1 text-[10px] text-amber-300 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#E4BA37]" />
                  <span>compliance@bai.finance</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E4BA37] to-[#F59E0B] text-[#0A2881] font-black text-[11px] flex items-center justify-center shadow-sm"
              title="Compliance Officer (compliance@bai.finance)"
            >
              CO
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
