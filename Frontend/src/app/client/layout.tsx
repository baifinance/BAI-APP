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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    // Clear cookies
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Redirect to landing page
    window.location.href = "/";
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case "Profile": return "Client Page - Profile";
      case "LoanStatus": return "Customer Hub \u2014 Loan Status";
      case "PaymentHistory": return "Customer Hub \u2014 Payment History";
      case "Communication": return "Customer Hub \u2014 Communication";
      case "Bookings": return "Customer Hub \u2014 Bookings";
      case "Calculator": return "Customer Hub \u2014 Calculator";
      case "Notifications": return "Customer Hub \u2014 Notifications";
      default: return activeTab;
    }
  };

  const initials = client.name
    ? client.name.split(" ").map((w) => w[0]).join("")
    : "CU";

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

