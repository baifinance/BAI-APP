/**
 * ==============================================================================
 * LAYOUT: /compliance
 * Path: src/app/compliance/layout.tsx
 * Description: Dedicated Layout for the Compliance Portal.
 *              - Renders ComplianceSidebar (collapsible, brand styled).
 *              - Enforces strict role restriction: Accessible only if user
 *                has the 'compliance' role.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { usePathname } from "next/navigation";
import MobileNavRail from "@/components/MobileNavRail";
import { useCurrentUser } from "@/lib/useCurrentUser";
import ComplianceSidebar from "./components/ComplianceSidebar";

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  // Mobile sidebar is open only for the path it was opened on, so navigating closes it
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const mobileNavOpen = mobileNavPath === pathname;

  // Server-backed role check (reinforces proxy.ts middleware). Falls back to the
  // hook's loading state while the profile request is in flight.
  const { role, isLoading: checkingRole } = useCurrentUser();

  // Display loading skeleton while checking credentials
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0024A8]/20 border-t-[#0024A8] rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Verifying Compliance Permissions...
          </span>
        </div>
      </div>
    );
  }

  // Access restriction: Page can be accessed ONLY if user has the compliance role
  const isCompliance = role === "compliance";

  if (!isCompliance) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-slate-900">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Access Restricted
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              The Compliance portal is strictly restricted to authorized compliance personnel.
              Your current account role does not have permission to access this area.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-[#0A2881] hover:bg-[#071D60] text-white rounded-xl text-sm font-bold shadow-md shadow-[#0A2881]/20 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased">
      {/* Desktop sidebar (full, collapsible) */}
      <div className="hidden lg:block shrink-0">
        <ComplianceSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile: fixed out-of-flow rail + overlay panel (no layout impact) */}
      <div className="lg:hidden">
        <MobileNavRail
          open={mobileNavOpen}
          onToggle={() => setMobileNavPath((prev) => (prev === pathname ? null : pathname))}
          className="bg-[#0A2881] border-[#001D85] text-white hover:bg-[#071D60]"
        />
        {mobileNavOpen && (
          <div className="fixed inset-y-0 left-8 z-40 w-64 overflow-y-auto">
            <ComplianceSidebar isCollapsed={false} onToggle={() => {}} />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full pl-8 lg:pl-0">
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
