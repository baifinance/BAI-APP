"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationToasts from "@/components/NotificationToasts";
import MobileNavRail from "@/components/MobileNavRail";
import { ClientProvider } from "./ClientContext";
import { usePathname } from "next/navigation";

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
  // Mobile sidebar is open only for the path it was opened on, so navigating closes it
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const mobileNavOpen = mobileNavPath === pathname;
  const closeMobileNav = () => setMobileNavPath(null);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const isLoanStatus = activeTab === "LoanStatus";
  const isCalculator = activeTab === "Calculator";
  const isCommunication = activeTab === "Communication";
  const isFullWidthPage = isLoanStatus || isCalculator || isCommunication;
  const mainPadding = isFullWidthPage
    ? "p-0"
    : "p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto";

  return (
    <div
      className={`bg-[#FAFAFA] flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased client-portal-wrap ${
        isCommunication ? "h-screen h-[100dvh] overflow-hidden" : "min-h-screen"
      }`}
    >

      {/* Desktop sidebar (full, collapsible) */}
      <div className="hidden lg:block shrink-0 mr-5">
        <Sidebar
          activeTab={activeTab}
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
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <button
              type="button"
              onClick={closeMobileNav}
              aria-label="Close navigation menu"
              className="absolute inset-0 bg-slate-900/60 cursor-pointer"
            />
            <div className="absolute inset-y-0 left-8 w-[78vw] max-w-[280px] overflow-y-auto shadow-2xl">
              <Sidebar
                activeTab={activeTab}
                isCollapsed={false}
                onToggle={() => {}}
                compact
              />
            </div>
          </div>
        )}
      </div>

      {/* Content Wrapper (remains stable and still during page transfers) */}
      <div
        className={`flex-1 flex flex-col min-w-0 w-full pl-8 lg:pl-0 ${
          isCommunication ? "h-full min-h-0 overflow-hidden" : ""
        }`}
      >
        {/* Scrollable page body */}
        <main
          className={`flex-1 w-full ${
            isCommunication
              ? "h-full min-h-0 flex flex-col overflow-hidden p-0"
              : `overflow-y-auto ${mainPadding}`
          }`}
        >
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
