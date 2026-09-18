"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
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

  const isWhiteBg = activeTab === "LoanStatus";
  const isLoanStatus = activeTab === "LoanStatus";

  return (
    <div className={`min-h-screen ${isWhiteBg ? "bg-white" : "bg-[#F2F2F2]"} flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased client-portal-wrap`}>
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Scrollable page body */}
        <main className={`flex-1 overflow-y-auto ${isLoanStatus ? "p-0" : "p-8 max-w-[1600px] w-full mx-auto"}`}>
          {children}
        </main>
      </div>
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

