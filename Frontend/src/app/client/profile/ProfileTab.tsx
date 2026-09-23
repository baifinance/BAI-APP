/**
 * ==============================================================================
 * COMPONENT: ProfileTab.tsx
 * Path: src/app/client/profile/ProfileTab.tsx
 * Description: Client Profile page featuring Hero cover banner, Personal Information
 *              details, and updated 6-step preview of the active and next 5 loan workflow
 *              milestones.
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, Clock, ArrowRight, Pen, Mail, Phone, User, FileSearch, Ban, Settings, ShieldCheck, ShieldAlert, KeyRound, Timer, RotateCcw, X } from "lucide-react";
import { Client } from "../../broker/MockData";
import { usersApi, loansApi, authApi } from "@/lib/api";
import { resolveLoanStatus } from "../loanStatus";

interface ProfileTabProps {
  client: Client;
  setClient?: React.Dispatch<React.SetStateAction<Client>>;
  onLogAction?: (actionText: string) => void;
}

/**
 * ==============================================================================
 * SUB-COMPONENT: CountryFlag
 * Description: Renders a high-resolution SVG flag graphic for crisp visual presentation.
 * ==============================================================================
 */
function CountryFlag({ isPhilippines }: { isPhilippines: boolean }) {
  if (isPhilippines) {
    return (
      <svg
        className="w-5 h-3.5 rounded-[2px] shadow-2xs inline-block shrink-0 border border-slate-200/50"
        viewBox="0 0 600 300"
        aria-label="Flag of Philippines"
      >
        <rect width="600" height="150" fill="#0038A8" />
        <rect y="150" width="600" height="150" fill="#CE1126" />
        <polygon points="0,0 260,150 0,300" fill="#FFFFFF" />
        <circle cx="85" cy="150" r="28" fill="#FCD116" />
        <polygon points="215,150 205,153 210,145" fill="#FCD116" />
        <polygon points="45,45 55,50 48,40" fill="#FCD116" />
        <polygon points="45,255 55,250 48,260" fill="#FCD116" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-3.5 rounded-[2px] shadow-2xs inline-block shrink-0 border border-slate-200/50"
      viewBox="0 0 1200 600"
      aria-label="Flag of Australia"
    >
      <rect width="1200" height="600" fill="#00008B" />
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFFFFF" strokeWidth="60" />
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#CC0000" strokeWidth="40" />
      <path d="M300,0 V300 M0,150 H600" stroke="#FFFFFF" strokeWidth="100" />
      <path d="M300,0 V300 M0,150 H600" stroke="#CC0000" strokeWidth="60" />
    </svg>
  );
}

export default function ProfileTab({ client, setClient }: ProfileTabProps) {
  // ------------------------------------------------------------------------------
  // 1. STATE DEFINITIONS
  // ------------------------------------------------------------------------------

  // Profile cover banner theme switcher ("blue" or "gold")
  const [bannerTheme, setBannerTheme] = useState<"blue" | "gold">("blue");

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaSending, setMfaSending] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaOtpCode, setMfaOtpCode] = useState("");
  const [mfaCountdown, setMfaCountdown] = useState(0);
  const [mfaError, setMfaError] = useState("");
  const [showMfaEnable, setShowMfaEnable] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showPostEnable, setShowPostEnable] = useState(false);
  const [mfaActionLoading, setMfaActionLoading] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------------------
  // 2. COMPLETE 13-STAGE WORKFLOW STEPS (statuses driven by the real loan status)
  // ------------------------------------------------------------------------------
  const baseLoanWorkflowSteps = [
    { id: 1, title: "Pending", date: "Aug 10, 2026" },
    { id: 2, title: "Appointment Booked", date: "Aug 12, 2026" },
    { id: 3, title: "Under Review", date: "Aug 15, 2026" },
    { id: 4, title: "Revisit", date: "Aug 18, 2026" },
    { id: 5, title: "Proceeding", date: "Aug 20, 2026" },
    { id: 6, title: "Collection of Documents", date: "Aug 24, 2026" },
    { id: 7, title: "Assessment", date: "Pending" },
    { id: 8, title: "Docs for Sign", date: "Pending" },
    { id: 9, title: "For Lodgment", date: "Pending" },
    { id: 10, title: "Submitted", date: "Pending" },
    { id: 11, title: "Conditional Approval", date: "Pending" },
    { id: 12, title: "Settlement", date: "Pending" },
    { id: 13, title: "Settled", date: "Pending" },
  ];

  const resolution = resolveLoanStatus(client.loan?.currentStatus);
  const allLoanWorkflowSteps = baseLoanWorkflowSteps.map((step, i) => ({
    ...step,
    status: resolution.states[i] ?? ("upcoming" as const),
  }));

  // ------------------------------------------------------------------------------
  // 3. PREVIEW WINDOW (6-STEP SLIDING WINDOW):
  //    Displays 6 steps at a time.
  //    When steps are completed, completed steps are hidden from the top and
  //    replaced with the next steps after the 6th.
  //    (e.g., 0 completed -> Steps 1-6; 1 completed -> Steps 2-7; 2 completed -> Steps 3-8).
  // ------------------------------------------------------------------------------
  const activeIndex = resolution.activeStepIndex !== null
    ? resolution.activeStepIndex - 1
    : -1;
  const activeStep = activeIndex >= 0 ? allLoanWorkflowSteps[activeIndex] : null;

  const completedCount = allLoanWorkflowSteps.filter((s) => s.status === "completed").length;
  const maxStartIndex = Math.max(0, allLoanWorkflowSteps.length - 6);
  const startIndex = Math.min(completedCount, maxStartIndex);
  const displayedSteps = allLoanWorkflowSteps.slice(startIndex, startIndex + 6);

  // ------------------------------------------------------------------------------
  // 4. FETCH BACKEND PROFILE & LIVE LOAN STATUS ENDPOINTS
  // ------------------------------------------------------------------------------
  useEffect(() => {
    if (!setClient) return;

    // Fetch user profile from backend
    usersApi.getProfile()
      .then((profile) => {
        if (profile && (profile.full_name || profile.first_name || profile.last_name)) {
          const resolvedFullName = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          setClient(prev => ({
            ...prev,
            name: resolvedFullName || prev.name,
            email: profile.email || prev.email,
            profile: {
              ...prev.profile,
              fullLegalName: resolvedFullName || prev.profile?.fullLegalName || prev.name,
              email: profile.email || prev.profile?.email || prev.email,
            }
          }));
        }
      })
      .catch((err) => {
        console.debug("Note: Could not reach /api/users/profile/ or unauthorized, using current client context:", err);
      });

    // Fetch MFA status
    authApi.me()
      .then((user) => {
        setMfaEnabled(!!user?.mfa_enabled);
      })
      .catch((err) => {
        console.debug("Note: Could not fetch MFA status:", err);
        setMfaEnabled(false);
      });

    // Fetch live loan status from backend / Asana
    loansApi.getCurrentStatus()
      .then((res) => {
        if (res?.loan_status) {
          setClient(prev => {
            if (prev.loan?.currentStatus === res.loan_status) return prev;
            return {
              ...prev,
              loan: {
                ...prev.loan,
                currentStatus: res.loan_status || undefined,
              },
            };
          });
        }
      })
      .catch((err) => {
        console.debug("Note: Could not reach /api/loans/current-status/ or unauthorized:", err);
      });
  }, [setClient]);

  // MFA countdown
  useEffect(() => {
    if (!showMfaEnable || mfaCountdown <= 0) return;
    const id = setInterval(() => {
      setMfaCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [showMfaEnable, mfaCountdown]);

  // Focus OTP input when enable panel opens
  useEffect(() => {
    if (showMfaEnable && mfaInputRef.current) {
      setTimeout(() => mfaInputRef.current?.focus(), 100);
    }
  }, [showMfaEnable]);

  const handleMfaEnableSend = async () => {
    setMfaError("");
    setMfaActionLoading(true);
    try {
      await usersApi.mfaEnableSend();
      setShowMfaEnable(true);
      setMfaCountdown(180);
      setMfaOtpCode("");
    } catch (err: any) {
      setMfaError(err?.message || "Failed to send verification code");
    } finally {
      setMfaActionLoading(false);
    }
  };

  const handleMfaEnableVerify = async (code?: string) => {
    const target = code ?? mfaOtpCode;
    if (!target || target.length !== 6) return;
    setMfaVerifying(true);
    setMfaError("");
    try {
      const res = await usersApi.mfaEnableVerify(target);
      setMfaEnabled(res.mfa_enabled);
      setShowMfaEnable(false);
      setShowPostEnable(true);
      setMfaOtpCode("");
      setMfaCountdown(0);
    } catch (err: any) {
      setMfaError(err?.message || "Invalid or expired code");
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleMfaDisable = async () => {
    if (!disablePassword) return;
    setMfaActionLoading(true);
    setMfaError("");
    try {
      const res = await usersApi.mfaDisable(disablePassword);
      setMfaEnabled(!res.mfa_enabled);
      setShowDisableModal(false);
      setDisablePassword("");
    } catch (err: any) {
      setMfaError(err?.message || "Failed to disable MFA");
    } finally {
      setMfaActionLoading(false);
    }
  };

  const toggleBannerTheme = () => {
    setBannerTheme(prev => (prev === "blue" ? "gold" : "blue"));
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ==================================================================== */}
      {/* SECTION 1: CLIENT PROFILE HERO CARD                                  */}
      {/* ==================================================================== */}
      {(() => {
        const displayName = client.profile?.fullLegalName || client.name;
        const displayAddress = client.profile?.residentialAddress || client.profile?.address || "Block 15 Lot 4, Park Place, Alabang, Muntinlupa, Philippines";
        const displayMobile = client.profile?.mobile || client.phone;
        const displayEmail = client.profile?.email || client.email;
        const isPhilippines = displayAddress.toLowerCase().includes("philippines") || client.profile?.nationality?.toLowerCase().includes("filipino");

        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">

            {/* Banner with Theme Toggle */}
            <div
              className={`relative h-36 sm:h-44 w-full transition-all duration-500 overflow-hidden ${bannerTheme === "blue"
                ? "bg-gradient-to-r from-[#001B79] via-[#0024A8] to-[#1E40AF]"
                : "bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#FBBF24]"
                }`}
            >
              <div className="absolute top-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              <button
                type="button"
                onClick={toggleBannerTheme}
                title={`Switch banner to ${bannerTheme === "blue" ? "Gold" : "Blue"} theme`}
                className="absolute top-4 right-4 z-10 p-2 sm:px-3 sm:py-1.5 rounded-full bg-black/25 hover:bg-black/45 text-white backdrop-blur-md border border-white/25 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer group"
                aria-label="Switch banner theme between Blue and Gold"
              >
                <Pen className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                <span className="hidden sm:inline text-[11px] font-medium text-white/90">
                  {bannerTheme === "blue" ? "Gold Theme" : "Blue Theme"}
                </span>
              </button>
            </div>

            {/* Avatar & Info Row */}
            <div className="relative z-10 px-6 sm:px-8 pb-6">
              <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-3">
                <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-[#0024A8] to-[#0B2369] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 select-none">
                  {displayName.split(" ").map((w) => w[0]).join("")}
                </div>
              </div>

              {/* Client Information */}
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {displayName}
                </h2>

                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400">
                  <CountryFlag isPhilippines={isPhilippines} />
                  <span>{displayAddress}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600 font-semibold pt-2 mt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{displayEmail}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{displayMobile}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* SECTION 2: MAIN PROFILE CONTENT GRID                                 */}
      {/* Left: Personal Information | Right: 6-Step Loan Status Preview       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: PERSONAL INFORMATION DETAILS */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Header with blue background and white text */}
            <div className="bg-[#0A2881] px-6 py-4 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-base font-extrabold text-white">
                Personal Information
              </h3>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block mb-0.5">Full Legal Name</span>
                  <span className="text-slate-800 font-bold">{client.profile?.fullLegalName || client.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                  <span className="text-slate-800">{client.profile?.dob || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Place of Birth</span>
                  <span className="text-slate-800">{client.profile?.placeOfBirth || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nationality</span>
                  <span className="text-slate-800">{client.profile?.nationality || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Civil Status</span>
                  <span className="text-slate-800">{client.profile?.civilStatus || "Single"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Number of Dependents</span>
                  <span className="text-slate-800">{client.profile?.numberOfDependents ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Mobile Number</span>
                  <span className="text-slate-800">{client.profile?.mobile || client.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Email Address</span>
                  <span className="text-slate-800 truncate block">{client.profile?.email || client.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Visa Subclass</span>
                  <span className="text-slate-800">{client.profile?.visaSubclass || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Visa Expiry</span>
                  <span className="text-slate-800">{client.profile?.visaExpiry || "N/A"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Residential Address</span>
                  <span className="text-slate-800 block">{client.profile?.residentialAddress || client.profile?.address || "N/A"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Current / Previous Address</span>
                  <span className="text-slate-800 block">{client.profile?.previousAddress || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Requested Loan Amount</span>
                  <span className="text-slate-800">{client.loan?.requestedAmount ? `$${client.loan.requestedAmount}` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Loan Purpose</span>
                  <span className="text-slate-800">{client.loan?.purpose || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6-STEP LOAN STATUS PROGRESS PREVIEW */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Header with blue background, gold subtitle, and gold button */}
            <div className="bg-[#0A2881] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Loan Status Progress
                </h3>
                <span className="text-[11px] font-bold text-[#E4BA37] block mt-0.5">
                  {resolution.withdrawn
                    ? "Status: Withdrawn"
                    : activeStep
                      ? `Current Step: ${activeStep.id} of ${allLoanWorkflowSteps.length}`
                      : resolution.hasApplication
                        ? "Current Step: Settled (13 of 13)"
                        : "Current Step: No Current Application"}
                </span>
              </div>
              <Link
                href="/client/loan-status"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E4BA37] hover:bg-[#d4ac30] text-[11px] font-black text-[#0A2881] shadow-xs transition-colors cursor-pointer"
              >
                <span>View Full Stepper</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0A2881]" />
              </Link>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {/* Stepper Vertical Progress List (6-Step sliding window) */}
            {resolution.withdrawn ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                  <Ban className="w-5 h-5" />
                </div>
                <p className="text-sm font-black text-slate-700">
                  Application Withdrawn
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs mx-auto">
                  This application has been withdrawn and the file is closed.
                  Contact your broker to start a new application.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 relative pl-3 before:absolute before:left-6.5 before:top-3.5 before:bottom-3.5 before:w-0.5 before:bg-slate-200">
                {displayedSteps.map((step) => {
                  const isCurrent = step.status === "in_process" || (activeStep ? step.id === activeStep.id : step.id === 1);
                  const isCompleted = step.status === "completed";

                  return (
                    <div key={step.id} className="relative flex items-center gap-3.5 z-10">

                      {/* Stepper Node Circle */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2 transition-all ${isCurrent
                            ? "bg-[#0024A8] text-white border-[#0024A8] shadow-md ring-4 ring-blue-100 animate-pulse"
                            : isCompleted
                              ? "bg-[#0024A8] text-white border-[#0024A8] shadow-xs"
                              : "bg-white text-slate-400 border-slate-300"
                          }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </div>

                      {/* Step Box / Card */}
                      <div
                        className={`flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${isCurrent
                            ? "bg-blue-50/90 text-[#0024A8] border-[#0024A8] ring-1 ring-[#0024A8]/20 shadow-xs"
                            : isCompleted
                              ? "bg-[#0024A8] text-white border-[#0024A8]"
                              : "bg-slate-50/60 text-slate-600 border-slate-200/80"
                          }`}
                      >
                        <span className="truncate">
                          {step.id}. {step.title}
                        </span>

                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shrink-0">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            In Progress
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[10px] font-extrabold bg-white/20 text-white px-2 py-0.5 rounded-md shrink-0">
                            Completed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            Upcoming
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            </div>
          </div>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* SECTION 3: SECURITY - MFA MANAGEMENT */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-[#0A2881] px-6 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
            {mfaEnabled ? <ShieldCheck className="w-4 h-4 text-white" /> : <ShieldAlert className="w-4 h-4 text-white" />}
          </div>
          <h3 className="text-base font-extrabold text-white">Security</h3>
          <span className={`ml-auto text-[11px] font-bold px-2.5 py-1 rounded-full ${mfaEnabled ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-100"}`}>
            {mfaEnabled ? "MFA Active" : "MFA Off"}
          </span>
        </div>

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">Multi-Factor Authentication</h4>
              <p className="text-xs text-slate-500 mt-1">
                {mfaEnabled
                  ? "Your account is protected with 2-step verification. You'll receive a code by email on every login."
                  : "Add an extra layer of security. When enabled, you'll need a code sent to your email to sign in."}
              </p>
            </div>
            <div className="flex gap-2">
              {!mfaEnabled ? (
                <button
                  onClick={handleMfaEnableSend}
                  disabled={mfaActionLoading}
                  className="px-4 py-2 bg-[#0024A8] hover:bg-[#001D85] text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {mfaActionLoading ? "Sending..." : "Enable MFA"}
                </button>
              ) : (
                <button
                  onClick={() => setShowDisableModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Disable MFA
                </button>
              )}
            </div>
          </div>

          {mfaError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {mfaError}
            </div>
          )}
        </div>
      </div>

      {/* Enable MFA modal */}
      {showMfaEnable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-[#0024A8] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Enable Multi-Factor Authentication</h3>
                  <p className="text-xs text-slate-500">Verify with email code</p>
                </div>
              </div>
              <button onClick={() => { setShowMfaEnable(false); setMfaOtpCode(""); setMfaError(""); }} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {mfaError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {mfaError}
              </div>
            )}
            <p className="text-sm text-slate-600 mb-4">
              We sent a 6-digit code to your email. Enter it below to enable MFA.
            </p>
            <input
              ref={mfaInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={mfaOtpCode}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0,6);
                setMfaOtpCode(v);
                if (v.length === 6) handleMfaEnableVerify(v);
              }}
              placeholder="••••••"
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-bold tracking-[0.5em] text-xl"
              disabled={mfaVerifying}
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                Expires in {Math.floor(mfaCountdown/60)}:{String(mfaCountdown%60).padStart(2,'0')}
              </span>
              <button
                onClick={handleMfaEnableSend}
                disabled={mfaCountdown>0 || mfaActionLoading}
                className="text-xs font-bold text-[#0024A8] hover:underline disabled:opacity-40 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Resend
              </button>
            </div>
            {mfaVerifying && <p className="text-xs text-slate-500 mt-3 text-center">Verifying...</p>}
            <button
              onClick={() => { setShowMfaEnable(false); setMfaOtpCode(""); setMfaError(""); }}
              className="mt-6 w-full py-2.5 bg-slate-100 rounded-xl text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Post-enable guidance modal */}
      {showPostEnable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 text-center">MFA Enabled</h3>
            <p className="text-sm text-slate-600 text-center mt-2">
              Your account is now protected with Multi-Factor Authentication. From now on, you’ll receive a 6-digit code by email each time you sign in. Keep your email accessible and do not share your codes.
            </p>
            <button
              onClick={() => setShowPostEnable(false)}
              className="mt-6 w-full py-3 bg-[#0024A8] hover:bg-[#001D85] text-white rounded-xl font-bold text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Disable MFA password modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Disable MFA</h3>
              <button onClick={() => setShowDisableModal(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Enter your current password to confirm you want to disable Multi-Factor Authentication.
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e)=>setDisablePassword(e.target.value)}
              placeholder="Current password"
              className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
            {mfaError && <div className="mt-2 text-xs text-rose-600">{mfaError}</div>}
            <div className="flex gap-2 mt-6">
              <button
                onClick={()=>{ setShowDisableModal(false); setDisablePassword(""); setMfaError(""); }}
                className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleMfaDisable}
                disabled={mfaActionLoading || !disablePassword}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {mfaActionLoading ? "Disabling..." : "Disable MFA"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
