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

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Clock, ArrowRight, Pen, Mail, Phone, User } from "lucide-react";
import { Client } from "../../broker/MockData";
import { usersApi } from "@/lib/api";

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

  // ------------------------------------------------------------------------------
  // 2. COMPLETE 13-STAGE WORKFLOW STEPS
  // ------------------------------------------------------------------------------
  const allLoanWorkflowSteps = [
    { id: 1, title: "Pending", status: "completed", date: "Aug 10, 2026" },
    { id: 2, title: "Appointment Booked", status: "completed", date: "Aug 12, 2026" },
    { id: 3, title: "Under Review", status: "completed", date: "Aug 15, 2026" },
    { id: 4, title: "Revisit", status: "completed", date: "Aug 18, 2026" },
    { id: 5, title: "Proceeding", status: "completed", date: "Aug 20, 2026" },
    { id: 6, title: "Collection of Documents", status: "in_process", date: "Aug 24, 2026" }, // Current active step
    { id: 7, title: "Assessment", status: "upcoming", date: "Pending" },
    { id: 8, title: "Docs for Sign", status: "upcoming", date: "Pending" },
    { id: 9, title: "For Lodgment", status: "upcoming", date: "Pending" },
    { id: 10, title: "Submitted", status: "upcoming", date: "Pending" },
    { id: 11, title: "Conditional Approval", status: "upcoming", date: "Pending" },
    { id: 12, title: "Settlement", status: "upcoming", date: "Pending" },
    { id: 13, title: "Settled", status: "upcoming", date: "Pending" },
  ];

  // ------------------------------------------------------------------------------
  // 3. 6-STEP PREVIEW: Top is always current step, followed by next 5 steps
  // ------------------------------------------------------------------------------
  const currentStepIndex = allLoanWorkflowSteps.findIndex(
    (s) => s.status === "in_process" || s.status === "action_needed"
  );
  const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const activeStep = allLoanWorkflowSteps[activeIndex] || allLoanWorkflowSteps[0];
  const displayed6Steps = allLoanWorkflowSteps.slice(activeIndex, activeIndex + 6);

  // ------------------------------------------------------------------------------
  // 4. FETCH BACKEND PROFILE ENDPOINT (/api/users/profile/)
  // ------------------------------------------------------------------------------
  useEffect(() => {
    if (!setClient) return;
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
  }, [setClient]);

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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0024A8] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Personal Information
              </h3>
            </div>

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
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Residential Address</span>
                <span className="text-slate-800 block">{client.profile?.residentialAddress || client.profile?.address || "N/A"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Current / Previous Address</span>
                <span className="text-slate-800 block">{client.profile?.previousAddress || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6-STEP LOAN STATUS PROGRESS PREVIEW */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm">
            
            {/* Header with link to full Loan Status page */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Loan Status Progress
                </h3>
                <span className="text-[11px] font-bold text-slate-400 block">
                  Current Step: {activeStep.id} of {allLoanWorkflowSteps.length}
                </span>
              </div>
              <Link
                href="/client/loan-status"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[11px] font-extrabold text-[#0024A8] transition-colors"
              >
                <span>View Full Stepper</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Stepper Vertical Progress List (Showing Current Step + Next 5 Steps = 6 total) */}
            <div className="space-y-3.5 relative pl-3 before:absolute before:left-6.5 before:top-3.5 before:bottom-3.5 before:w-0.5 before:bg-slate-200">
              {displayed6Steps.map((step) => {
                const isCurrent = step.id === activeStep.id;
                const isCompleted = step.status === "completed";

                return (
                  <div key={step.id} className="relative flex items-center gap-3.5 z-10">
                    
                    {/* Stepper Node Circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2 transition-all ${
                        isCurrent
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
                      className={`flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        isCurrent
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

          </div>
        </div>

      </div>

    </div>
  );
}
