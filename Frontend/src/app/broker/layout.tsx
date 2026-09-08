"use client";

import React, { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import { BrokerProvider } from "./BrokerContext";
import { usePathname } from "next/navigation";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";

const getActiveTab = (pathname: string) => {
  if (pathname.includes("/broker/dashboard")) return "Dashboard";
  if (pathname.includes("/broker/clients")) return "Clients";
  if (pathname.includes("/broker/applications")) return "Applications";
  if (pathname.includes("/broker/bookings")) return "Bookings";
  if (pathname.includes("/broker/communication")) return "Communication";
  if (pathname.includes("/broker/calculator")) return "Calculators";
  if (pathname.includes("/broker/notifications")) return "Notifications";
  return "Dashboard";
};

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  
  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // API Call & Cookie Clear Logout Handler
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
    // Clear security cookies
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to landing page
    window.location.href = "/";
  };

  return (
    <BrokerProvider>
      {/* Wrapper with solid #F2F2F2 background */}
      <div className="min-h-screen bg-[#F2F2F2] flex font-sans text-slate-900 selection:bg-blue-600 selection:text-white antialiased">
        
        {/* Sidebar Navigation */}
        <Sidebar activeTab={activeTab} />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Portal Top Header with Account Section & Notifications */}
          <header className="h-16 bg-white/70 backdrop-blur-md border-b border-slate-200/80 px-8 flex justify-between items-center z-30 select-none shrink-0">
            
            {/* Left side: Dynamic Title */}
            <div className="flex items-center">
              <h1 className="font-extrabold text-slate-800 tracking-tight text-lg">
                {activeTab === "Dashboard" ? "Broker Dashboard" : activeTab}
              </h1>
            </div>

            {/* Right side: Tools & Profile Menu */}
            <div className="flex items-center gap-4">
              
              {/* Notification icon linking to notifications page */}
              <Link 
                href="/broker/notifications"
                className="p-2 text-slate-500 hover:text-[#1429A9] hover:bg-slate-100/80 rounded-xl transition-all relative"
                title="View Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 border border-white rounded-full animate-pulse" />
              </Link>

               {/* Circle Account Profile section */}
              <div className="relative" ref={dropdownRef}>
                {/* Profile button (ONLY profile icon trigger) */}
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="p-1 hover:bg-slate-100/80 rounded-full transition-all cursor-pointer outline-hidden"
                  title="Sarah Jenkins Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1429A9] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    SJ
                  </div>
                </button>

                {/* Dropdown container with profile information on the left side */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200/80 shadow-lg p-3.5 z-40 animate-fadeIn rounded-none">
                    {/* Profile Information Block: Avatar on left, Details on right */}
                    <div className="flex items-center gap-3 pb-3 mb-2.5 border-b border-slate-100 select-none">
                      {/* Avatar on the left */}
                      <div className="w-11 h-11 rounded-full bg-[#1429A9] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        SJ
                      </div>
                      {/* Detailed info on the right */}
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-slate-800 text-xs leading-none">Sarah Jenkins</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-1">Broker Profile</span>
                        <span className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">sarah.jenkins@baifinance.com.au</span>
                      </div>
                    </div>

                    {/* Action controls list */}
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

          {/* Page body content */}
          <main className="flex-1 overflow-y-auto p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>

        </div>
      </div>
    </BrokerProvider>
  );
}
