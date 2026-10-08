/**
 * ==============================================================================
 * COMPONENT: ProgressStatus.tsx
 * Path: src/app/client/loan-status/components/ProgressStatus.tsx
 * Description: Top header for Client Loan Status page.
 *              - officeImage2 background with blue overlay and blurry golden
 *                orbs (shared BannerBackground, same as the Calculator banner)
 *              - Bold centered current progress title
 *              - Centered container under title: "You are currently on Step X out of 13"
 * ==============================================================================
 */

"use client";

import React from "react";
import BannerBackground from "@/components/BannerBackground";

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
    <div
      className={`relative overflow-hidden w-full py-12 sm:py-16 md:py-20 px-6 sm:px-8 text-center text-white shadow-md flex flex-col items-center justify-center ${
        tone === "neutral" ? "bg-slate-700" : "bg-[#0A2881]"
      }`}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* 0. BANNER BACKGROUND: officeImage2 + 65% overlay + blurry golden orbs  */}
      {/* ---------------------------------------------------------------------- */}
      <BannerBackground
        image="/officeImage2.jpg"
        overlayClassName={tone === "neutral" ? "bg-slate-700/65" : "bg-[#0A2881]/65"}
        imagePosition="object-[center_35%]"
      />

      {/* ---------------------------------------------------------------------- */}
      {/* 1. CONTENT CONTAINER: Title + Step badge (isolated z-20 flex column)   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="relative z-20 flex flex-col items-center justify-center space-y-4 max-w-4xl mx-auto">
        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90 block drop-shadow-xs">
            Current Progress
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight max-w-4xl leading-tight drop-shadow-sm">
            {statusText}
          </h1>
        </div>

        {/* 2. STEP CONTAINER: #E4BA37 background, #0A2881 text */}
        {stepNumber > 0 && (
          <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-[#E4BA37] text-[#0A2881] shadow-xs">
            <span className="text-xs sm:text-sm font-extrabold tracking-wide">
              You are currently on Step {stepNumber} out of {totalSteps}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
