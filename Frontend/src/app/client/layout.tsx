"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationToasts from "@/components/NotificationToasts";
import { ClientProvider } from "./ClientContext";
import { usePathname } from "next/navigation";
import logoWhite from "@/assets/brand/bai_logo_white.png";

const getActiveTab = (pathname: string) => {
  if (pathname.includes("/client/profile")) return "Profile";
  if (pathname.includes("/client/loan-status")) return "LoanStatus";
  if (pathname.includes("/client/payment-history")) return "PaymentHistory";
  if (pathname.includes("/client/communication")) return "Communication";
  if (pathname.includes("/client/bookings")) return "Bookings";
  if (pathname.includes("/client/calculator")) return "Calculator";
  if (pathname.includes("/client/notifications")) return "Notifications";
  return "Profile";
};

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isLoanStatus = activeTab === "LoanStatus";
  const isCalculator = activeTab === "Calculator";
  const isFullWidthPage = isLoanStatus || isCalculator;

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased client-portal-wrap">

      {/* Sidebar Navigation (desktop rail, mobile drawer) */}
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        isMobileOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
      />

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Content Wrapper (remains stable and still during page transfers) */}
      <div className="flex-1 flex flex-col min-w-0 w-full">

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-[#0A2881] text-white flex items-center gap-3 px-4 shadow-md select-none">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open navigation"
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Image
            src={logoWhite}
            alt="BAI Group of Companies"
            priority
            className="h-7 w-auto object-contain"
          />
        </header>

        {/* Scrollable page body */}
        <main className={`flex-1 overflow-y-auto w-full ${isFullWidthPage ? "p-0" : "p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto"}`}>
          {children}
        </main>
      </div>

      {/* Facebook-style live notification toasts */}
      <NotificationToasts />
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </ClientProvider>
  );
}
