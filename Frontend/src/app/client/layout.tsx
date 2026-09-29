"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import NotificationToasts from "@/components/NotificationToasts";
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

  const isLoanStatus = activeTab === "LoanStatus";
  const isCalculator = activeTab === "Calculator";
  const isFullWidthPage = isLoanStatus || isCalculator;

  return (
    <div className="min-h-screen bg-white flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased client-portal-wrap">

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-all duration-300 ease-in-out">
        {/* Scrollable page body */}
        <main className={`flex-1 overflow-y-auto w-full transition-all duration-300 ease-in-out ${isFullWidthPage ? "p-0" : "p-8 max-w-[1600px] mx-auto"}`}>
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

