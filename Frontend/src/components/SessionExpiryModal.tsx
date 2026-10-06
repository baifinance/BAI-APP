"use client";

/**
 * ==============================================================================
 * COMPONENT: SessionExpiryModal
 * Path: src/components/SessionExpiryModal.tsx
 * Description: Global session expiration notification modal.
 *              Triggers when user's session token expires, displaying a clean
 *              branded dialog with a prominent blue warning icon, clear notice,
 *              and a "Continue" action that cleanly resets cookies and routes
 *              to the login page.
 * ==============================================================================
 */

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";

// Base API URL for backend session termination
import { API_BASE } from "@/lib/api";

export default function SessionExpiryModal() {
  // ----------------------------------------------------------------------------
  // 1. STATE & REFS
  // ----------------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownRef = useRef(false);

  // ----------------------------------------------------------------------------
  // 2. EVENT LISTENER: LISTEN FOR SESSION EXPIRY DISPATCH
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const onSessionExpired = () => {
      // Prevent duplicate modal displays if multiple 401s occur in quick succession
      if (shownRef.current) return;
      shownRef.current = true;
      setIsOpen(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, []);

  // ----------------------------------------------------------------------------
  // 3. ACTION HANDLER: CLEANUP CREDENTIALS & REDIRECT TO LOGIN
  // ----------------------------------------------------------------------------
  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Attempt backend logout with a timeout fallback so UI never hangs
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      await fetch(`${API_BASE}/api/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
      }).catch((err) => {
        console.warn("Backend logout notification skipped or timed out:", err);
      });

      clearTimeout(timeoutId);
    } catch (err) {
      console.error("Failed to notify backend of logout:", err);
    }

    // Explicitly invalidate client-side authentication cookies
    document.cookie = "jwt-access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user-role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Clear session storage if present
    try {
      sessionStorage.clear();
    } catch {
      // Ignore if storage access is restricted
    }

    // Redirect the user back to the login page cleanly
    window.location.replace("/login");
  };

  // Do not render anything when session is valid
  if (!isOpen) return null;

  // ----------------------------------------------------------------------------
  // 4. MODAL UI RENDERING
  // ----------------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-desc"
    >
      {/* Modal Dialog Card Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 text-center overflow-hidden transform transition-all duration-300">
        {/* Subtle decorative top background gradient glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* ==================================================================== */}
        {/* TOP CENTERED: BLUE WARNING ICON                                       */}
        {/* ==================================================================== */}
        <div className="relative mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-blue-50/90 border border-blue-100 ring-8 ring-blue-50/50 text-[#0038A8] shadow-sm shadow-blue-500/10 transition-transform">
          <AlertTriangle
            className="w-10 h-10 stroke-[2.25]"
            aria-hidden="true"
          />
        </div>

        {/* ==================================================================== */}
        {/* TITLE: BOLD & BIGGER FONT CENTERED                                   */}
        {/* ==================================================================== */}
        <h2
          id="session-expired-title"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center"
        >
          Session Expired
        </h2>

        {/* ==================================================================== */}
        {/* SUBTEXT: SMALLER DESCRIPTIVE NOTICE                                  */}
        {/* ==================================================================== */}
        <p
          id="session-expired-desc"
          className="mt-3 text-sm sm:text-base text-slate-500 text-center leading-relaxed max-w-sm mx-auto"
        >
          You have been signed out. Please log in again to continue.
        </p>

        {/* ==================================================================== */}
        {/* ACTION BUTTON: CONTINUE (REDIRECTS BACK TO LOGIN)                    */}
        {/* ==================================================================== */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
          className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-[#0038A8] hover:bg-[#002b82] active:bg-[#002066] shadow-md shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-900/30 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-base group"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Continuing…</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>
    </div>
  );
}