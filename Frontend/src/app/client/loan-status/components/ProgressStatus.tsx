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
  tone?: "blue" | "neutral";
}

export default function ProgressStatus({
  statusText = "Collection of Documents",
  stepNumber = 6,
  totalSteps = 13,
  tone = "blue",
}: ProgressStatusProps) {
  return (
    <div className={`w-full py-10 sm:py-12 px-6 sm:px-8 text-center text-white shadow-md flex flex-col items-center justify-center space-y-4 animate-fadeIn ${
      tone === "neutral" ? "bg-slate-700" : "bg-[#0A2881]"
    }`}>
      
      {/* ---------------------------------------------------------------------- */}
      {/* 1. CURRENT PROGRESS TITLE                                              */}
      {/* ---------------------------------------------------------------------- */}
      <div className="space-y-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/80 block">
          Current Progress
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight max-w-4xl leading-tight">
          {statusText}
        </h1>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. STEP CONTAINER: #E4BA37 background, #0A2881 text                    */}
      {/* Only rendered when a pipeline step is actually in progress.            */}
      {/* ---------------------------------------------------------------------- */}
      {stepNumber > 0 && (
        <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-[#E4BA37] text-[#0A2881] shadow-xs">
          <span className="text-xs sm:text-sm font-extrabold tracking-wide">
            You are currently on Step {stepNumber} out of {totalSteps}
          </span>
        </div>
      )}

    </div>
  );
}
