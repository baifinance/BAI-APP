"use client";

/**
 * ==============================================================================
 * COMPONENT: ClientPortalSection.tsx
 * Section: "CLIENT PORTAL" - Know where your application stands
 * Location: src/components/LandingPage/ClientPortalSection.tsx
 * ==============================================================================
 * Added directly below "How It Works" based on Screenshot 3 in Navy Blue (#0B2369).
 * Features:
 *  - Left Column: Title, description, 4 key security/status feature checkmarks, CTAs
 *  - Right Column: Live application status dashboard card (#BAI-2026-0148)
 */

import Link from "next/link";
import { Lock, Check, FolderInput, Calendar } from "lucide-react";

export default function ClientPortalSection() {
  return (
    <section id="portal" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* ================================================================== */}
          {/* LEFT COLUMN: CLIENT PORTAL INTRO & CHECKLIST                       */}
          {/* ================================================================== */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-[#0B2369] border border-slate-200 text-xs font-extrabold uppercase tracking-widest mb-6">
              <span>CLIENT PORTAL</span>
            </div>

            {/* Main Headline */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2369] tracking-tight leading-tight mb-6">
              Know where your application stands
            </h2>

            {/* Description Subtitle */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
              Once you are invited, log in to your secure client portal to see live status, respond to document requests, and review your application history.
            </p>

            {/* Checklist items */}
            <ul className="space-y-4 mb-10 w-full">
              <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>
                  <strong className="text-slate-900">Live status:</strong> Submitted, In Review, Approved, Settled
                </span>
              </li>

              <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Upload documents only when we request them</span>
              </li>

              <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Read-only communication log with your broker</span>
              </li>

              <li className="flex items-center gap-3 text-sm text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Multi-factor authentication and encrypted sessions</span>
              </li>
            </ul>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-[#0B2369] hover:bg-[#071644] shadow-md shadow-[#0B2369]/20 transition-all duration-200"
              >
                <Lock className="w-4 h-4" />
                <span>Track your application</span>
              </Link>

              <Link
                href="#book"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-[#0B2369] bg-white hover:bg-slate-100 border-2 border-[#0B2369]/30 shadow-xs transition-all duration-200"
              >
                <Calendar className="w-4 h-4" />
                <span>Book a consultation</span>
              </Link>
            </div>

          </div>

          {/* ================================================================== */}
          {/* RIGHT COLUMN: APPLICATION STATUS CARD MOCKUP                       */}
          {/* ================================================================== */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft-xl relative">
              
              {/* Header Row: Application ID & Action Needed Pill */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    APPLICATION
                  </span>
                  <span className="text-lg font-extrabold text-[#0B2369]">
                    #BAI-2026-0148
                  </span>
                </div>
                
                {/* Red Action Needed Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Action needed</span>
                </div>
              </div>

              {/* Amount Row */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#0B2369] tracking-tight">
                    $640,000
                  </span>
                  <span className="text-sm font-medium text-slate-500">Home Loan</span>
                </div>
              </div>

              {/* Vertical Step Timeline */}
              <div className="space-y-4">
                
                {/* Step 1: Submitted (Completed) */}
                <div className="flex items-center gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#0B2369] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-700">Submitted</span>
                </div>

                {/* Step 2: In Review (Completed) */}
                <div className="flex items-center gap-3.5">
                  <div className="w-6 h-6 rounded-full bg-[#0B2369] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-700">In Review</span>
                </div>

                {/* Step 3: Additional Info Requested (Action Needed) */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FolderInput className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-amber-900">
                      Additional Info Requested
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                    Action needed
                  </span>
                </div>

                {/* Step 4: Approved (Pending) */}
                <div className="flex items-center gap-3.5 opacity-50">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-400">Approved</span>
                </div>

                {/* Step 5: Settled (Pending) */}
                <div className="flex items-center gap-3.5 opacity-50">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-400">Settled</span>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
