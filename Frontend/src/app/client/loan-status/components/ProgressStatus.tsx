/**
 * ==============================================================================
 * COMPONENT: ProgressStatus.tsx
 * Path: src/app/client/loan-status/components/ProgressStatus.tsx
 * Description: Header status component displaying "In Progress" with a large,
 *              centered font styled with a theme blue gradient.
 * ==============================================================================
 */

"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface ProgressStatusProps {
  statusText?: string;
  applicationNumber?: string;
  targetSettlement?: string;
}

export default function ProgressStatus({
  statusText = "In Progress",
  applicationNumber = "LN-2026-8821",
  targetSettlement = "Sep 30, 2026"
}: ProgressStatusProps) {
  return (
    /* ------------------------------------------------------------------------ */
    /* 1. MAIN CONTAINER: Centered alignment with clean spacing                */
    /* ------------------------------------------------------------------------ */
    <div className="flex flex-col items-center justify-center text-center space-y-2.5 animate-fadeIn">
      
      {/* Top pill badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[#0024A8] text-[11px] font-extrabold uppercase tracking-wider shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-[#0024A8]" />
        <span>Application Status</span>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. STATUS TITLE: Big font, centered, blue gradient close to theme      */}
      {/* ---------------------------------------------------------------------- */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-[#001B79] via-[#0024A8] to-[#1E40AF] bg-clip-text text-transparent">
        {statusText}
      </h1>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. METADATA SUBTEXT: Application reference and target settlement date  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-500">
        <span>Application Ref: <strong className="text-slate-700">#{applicationNumber}</strong></span>
        <span className="text-slate-300">•</span>
        <span>Target Settlement: <strong className="text-slate-700">{targetSettlement}</strong></span>
      </div>
    </div>
  );
}
