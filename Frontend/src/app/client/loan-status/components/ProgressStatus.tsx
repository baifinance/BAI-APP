/**
 * ==============================================================================
 * COMPONENT: ProgressStatus.tsx
 * Path: src/app/client/loan-status/components/ProgressStatus.tsx
 * Description: Top header for Client Loan Status page.
 *              - Bold centered current progress title
 *              - Centered container under title: "You are currently on Step X out of 13"
 * ==============================================================================
 */

"use client";

import React from "react";

interface ProgressStatusProps {
  statusText?: string;
  stepNumber?: number;
  totalSteps?: number;
}

export default function ProgressStatus({
  statusText = "Collection of Documents",
  stepNumber = 6,
  totalSteps = 13,
}: ProgressStatusProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-3.5 py-2 animate-fadeIn">
      
      {/* ---------------------------------------------------------------------- */}
      {/* 1. CURRENT PROGRESS TITLE: Bold text, centered                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="space-y-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0024A8] block">
          Current Progress
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight max-w-4xl leading-tight">
          {statusText}
        </h1>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. STEP CONTAINER: "You are currently on Step X out of 13"             */}
      {/* ---------------------------------------------------------------------- */}
      <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-blue-50/90 border border-blue-200/90 text-[#0024A8] shadow-2xs">
        <span className="text-xs sm:text-sm font-extrabold tracking-wide">
          You are currently on Step {stepNumber} out of {totalSteps}
        </span>
      </div>

    </div>
  );
}
