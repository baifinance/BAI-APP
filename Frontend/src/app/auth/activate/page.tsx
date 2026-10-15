/**
 * ==============================================================================
 * ROUTE PAGE: /auth/activate
 * Path: src/app/auth/activate/page.tsx
 * Description: Main endpoint handler page for client activations. Requires
 *              a token query parameter from an invite link.
 * ==============================================================================
 */

"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RegistrationForm from "./components/RegistrationForm";
import StatusScreen from "./components/StatusScreen";

function ActivatePageContent() {
  // ------------------------------------------------------------------------------
  // QUERY PARAMETERS PARSING (Reads token from /auth/activate?token=xxx)
  // ------------------------------------------------------------------------------
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Registration feedback state managers
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrantName, setRegistrantName] = useState("");

  // ------------------------------------------------------------------------------
  // EVENT HANDLER: SUCCESSFUL SIGNUP
  // ------------------------------------------------------------------------------
  const handleRegistrationSuccess = (name: string, role: string) => {
    setRegistrantName(name);
    setIsRegistered(true);
  };

  // ------------------------------------------------------------------------------
  // CONDITIONAL RENDERING OR ROUTING
  // ------------------------------------------------------------------------------
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
        title="Account Activated"
        message={`Thank you ${registrantName}. Your account is ready — please log in to continue.`}
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
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-slate-600 font-semibold text-sm">
          Loading Activation Portal...
        </div>
      }
    >
      <ActivatePageContent />
    </Suspense>
  );
}
