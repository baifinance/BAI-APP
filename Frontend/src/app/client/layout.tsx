"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import { ClientProvider, useClient } from "./ClientContext";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import Link from "next/link";

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
  const { client } = useClient();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
      case "Profile":        return "Client Page - Profile";
      case "LoanStatus":     return "Customer Hub \u2014 Loan Status";
      case "PaymentHistory": return "Customer Hub \u2014 Payment History";
      case "Communication":  return "Customer Hub \u2014 Communication";
      case "Bookings":       return "Customer Hub \u2014 Bookings";
      case "Calculator":     return "Customer Hub \u2014 Calculator";
      case "Notifications":  return "Customer Hub \u2014 Notifications";
      default:               return activeTab;
    }
  };

  const initials = client.name
    ? client.name.split(" ").map((w) => w[0]).join("")
    : "CU";

  const isWhiteBg = activeTab === "LoanStatus";

  return (
    <div className={`min-h-screen ${isWhiteBg ? "bg-white" : "bg-[#F2F2F2]"} flex font-sans text-slate-900 selection:bg-[#0024A8] selection:text-white antialiased client-portal-wrap`}>
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        clientName={client.name}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top header bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 select-none">
          <div>
            <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">
              {getHeaderTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Notifications Shortcut Link */}
            <Link 
              href="/client/notifications"
              className="p-2 text-slate-500 hover:text-[#0024A8] hover:bg-slate-100/80 rounded-xl transition-all relative"
              title="View Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 border border-white rounded-full animate-pulse" />
            </Link>

            {/* Profile Dropdown Component */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="p-1 hover:bg-slate-100/80 rounded-full transition-all cursor-pointer outline-hidden"
                title={`${client.name} Profile`}
              >
                <div className="w-8 h-8 rounded-full bg-[#0024A8] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {initials}
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/80 shadow-lg p-3.5 z-40 animate-fadeIn rounded-none">
                  {/* Account detail row */}
                  <div className="flex items-center gap-3 pb-3 mb-2.5 border-b border-slate-100 select-none">
                    <div className="w-11 h-11 rounded-full bg-[#0024A8] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                      {initials}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-extrabold text-slate-800 text-xs leading-none">{client.name}</span>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Client Profile</span>
                      <span className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{client.email || `${client.name.toLowerCase().replace(" ", ".")}@baifinance.com.au`}</span>
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="space-y-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-end gap-2 px-3 py-2 text-right text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer rounded-none"
                    >
                      <span>Log Out</span>
                      <LogOut className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-8 max-w-[1600px] w-full mx-auto">
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
