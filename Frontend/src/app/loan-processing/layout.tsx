"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import { LoanProcessingProvider } from "./LoanProcessingContext";
import { usePathname } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import Link from "next/link";

const getActiveTab = (pathname: string) => {
  if (pathname.includes("/loan-processing/dashboard")) return "Dashboard";
  if (pathname.includes("/loan-processing/review")) return "Review";
  if (pathname.includes("/loan-processing/application")) return "Application";
  if (pathname.includes("/loan-processing/audit-log")) return "AuditLog";
  if (pathname.includes("/loan-processing/calculator")) return "Calculator";
  if (pathname.includes("/loan-processing/notifications")) return "Notifications";
  return "Dashboard";
};

export default function LoanProcessingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
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
      await fetch("http://localhost:8000/api/auth/logout/", {
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
      case "AuditLog": return "Audit Log";
      case "Review": return "Review Workspace";
      default: return activeTab;
    }
  };

  return (
    <LoanProcessingProvider>
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-[#1429A9] selection:text-white antialiased loan-processing-portal-wrap">
        
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top header bar */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 select-none">
            <div>
              <h1 className="text-sm font-extrabold text-slate-800 tracking-tight">
                Loan Processing Overview — {getHeaderTitle()}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              
              {/* Notifications Shortcut Link */}
              <Link 
                href="/loan-processing/notifications"
                className="p-2 text-slate-500 hover:text-[#1429A9] hover:bg-slate-100/80 rounded-xl transition-all relative"
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
                  title="Loan Processing Officer Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1429A9] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    MC
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/80 shadow-lg p-3.5 z-40 animate-fadeIn rounded-none">
                    {/* Account detail row */}
                    <div className="flex items-center gap-3 pb-3 mb-2.5 border-b border-slate-100 select-none">
                      <div className="w-11 h-11 rounded-full bg-[#1429A9] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        MC
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-slate-800 text-xs leading-none">Marcus Carter</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Loan Processing Profile</span>
                        <span className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">loanprocessing@bai.finance</span>
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
    </LoanProcessingProvider>
  );
}
