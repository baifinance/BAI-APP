"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function SessionExpiryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    const onSessionExpired = () => {
      if (shownRef.current) return;
      shownRef.current = true;
      setIsOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to log out from backend:", err);
    }
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.replace("/login");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h2
          id="session-expired-title"
          className="mt-4 text-lg font-bold text-slate-900"
        >
          Your session has been expired
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          For your security, you have been signed out. Please log in again to
          continue.
        </p>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors"
        >
          {isLoggingOut ? (
            "Logging out…"
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Log Out
            </>
          )}
        </button>
      </div>
    </div>
  );
}