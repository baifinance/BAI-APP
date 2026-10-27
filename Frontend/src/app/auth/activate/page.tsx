/**
 * ==============================================================================
 * ROUTE PAGE: /auth/activate
 * Path: src/app/auth/activate/page.tsx
 * Description: Main endpoint handler page for client activations. Requires
 *              a token query parameter from an invite link.
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RegistrationForm from "./components/RegistrationForm";
import StatusScreen from "./components/StatusScreen";

function ActivatePageContent() {
  // ------------------------------------------------------------------------------
  // TOKEN PARSING
  // Primary: URL fragment (/auth/activate#token=xxx) — never sent to servers.
  // Fallback: legacy query param (?token=xxx) for already-emailed links.
  // ------------------------------------------------------------------------------
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("token");
    if (fromQuery) {
      setToken(fromQuery);
      setResolved(true);
      return;
    }
    const hash = window.location.hash.replace(/^#/, "");
    setToken(new URLSearchParams(hash).get("token"));
    setResolved(true);
  }, [searchParams]);

  // Registration feedback state managers
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrantName, setRegistrantName] = useState("");
  const [registrantPassword, setRegistrantPassword] = useState("");

  // ------------------------------------------------------------------------------
  // EVENT HANDLER: SUCCESSFUL SIGNUP
  // ------------------------------------------------------------------------------
  const handleRegistrationSuccess = (name: string, role: string, password?: string) => {
    setRegistrantName(name);
    setRegistrantPassword(password || "");
    setIsRegistered(true);
  };

  // ------------------------------------------------------------------------------
  // CONDITIONAL RENDERING OR ROUTING
  // ------------------------------------------------------------------------------
  if (!resolved) {
    return (
      <div className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none select-none z-0">
          <img
            src="/loginImage.jpeg"
            alt=""
            className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
          />
          <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-xs font-semibold text-white/90 tracking-wide">
            Loading Activation Portal...
          </span>
        </div>
      </div>
    );
  }

  // Case A: Missing token / Clicked invalid link
  if (!token) {
    return (
      <StatusScreen
        type="error"
        title="Invalid Invitation Link"
        message="The activation token is missing or expired. Please contact your mortgage broker to receive a valid invite."
      />
    );
  }

  // Case B: Registration complete — account is active, go log in.
  if (isRegistered) {
    return (
      <StatusScreen
        type="success"
        fullName={registrantName}
        password={registrantPassword}
      />
    );
  }

  // Case C: Render the standard registration form card container
  return (
    <RegistrationForm 
      token={token} 
      onSuccess={handleRegistrationSuccess} 
    />
  );
}

// ------------------------------------------------------------------------------
// MAIN EXPORT (Suspense wrapper to satisfy Next.js static compilation requirements)
// ------------------------------------------------------------------------------
export default function ActivatePage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 relative overflow-hidden">
          <div className="fixed inset-0 pointer-events-none select-none z-0">
            <img
              src="/loginImage.jpeg"
              alt=""
              className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
            />
            <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-semibold text-white/90 tracking-wide">
              Loading Activation Portal...
            </span>
          </div>
        </div>
      }
    >
      <ActivatePageContent />
    </Suspense>
  );
}
