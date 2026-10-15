/**
 * ==============================================================================
 * COMPONENT: CommunicationTab.tsx
 * Path: src/app/client/communication/CommunicationTab.tsx
 * Description: Client Communication Chat Space UI for "BAI-SUPPORT".
 *              Features:
 *              - Top-left header: "BAI-SUPPORT"
 *              - Empty chat state with transparent centered text
 *              - Rounded container for pregenerated questions:
 *                "How to Start" and "What are the needed Documents."
 *              - Bottom question input space
 *              - Blue and white theme (non-functional UI only)
 * ==============================================================================
 */

"use client";

import React from "react";
import { Headphones, Send, Sparkles, MessageSquare } from "lucide-react";

export default function CommunicationTab() {
  return (
    <div className="w-full flex flex-col h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)] min-h-[580px] max-h-[880px] bg-white border border-blue-100 rounded-3xl shadow-soft-xl overflow-hidden">
      {/* ==================================================================== */}
      {/* 1. HEADER SECTION: Top-left text "BAI-SUPPORT"                       */}
      {/* ==================================================================== */}
      <header className="px-6 py-4 bg-white border-b border-blue-100/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Support Brand Icon */}
          <div className="w-10 h-10 rounded-2xl bg-[#0024A8] text-white flex items-center justify-center shadow-sm shadow-[#0024A8]/20">
            <Headphones className="w-5 h-5" />
          </div>

          {/* Header Title on Top Left */}
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-[#0024A8] tracking-tight">
              BAI-SUPPORT
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Customer Support</span>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. CHAT SPACE: Message area with transparent empty state placeholder */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-gradient-to-b from-white via-white to-blue-50/20 overflow-y-auto">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          {/* Subtle Chat Placeholder Icon */}
          <div className="w-16 h-16 rounded-3xl bg-blue-50/60 border border-blue-100/80 flex items-center justify-center mb-4 text-[#0024A8]/30">
            <MessageSquare className="w-8 h-8" />
          </div>

          {/* Transparent Centered Large Text */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-400/40 tracking-tight leading-tight">
            No chat available
          </h2>

          {/* Transparent Centered Small Text */}
          <p className="mt-2 text-xs sm:text-sm font-medium text-slate-400/60 leading-relaxed">
            Please select a question or ask one yourself to start.
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. PREGENERATED QUESTIONS: Rounded-edge container above chat input   */}
      {/* ==================================================================== */}
      <div className="px-4 sm:px-6 py-3 shrink-0">
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex flex-wrap items-center gap-2.5">
          {/* Suggested Label */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0024A8]/70 px-2 py-1">
            <Sparkles className="w-3.5 h-3.5 text-[#0024A8]" />
            <span>Suggested:</span>
          </div>

          {/* Pregenerated Question 1 */}
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white border border-blue-200/80 text-xs sm:text-sm font-semibold text-[#0024A8] hover:bg-blue-50 hover:border-[#0024A8]/40 shadow-xs transition-all duration-150 cursor-pointer"
          >
            How to Start
          </button>

          {/* Pregenerated Question 2 */}
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-white border border-blue-200/80 text-xs sm:text-sm font-semibold text-[#0024A8] hover:bg-blue-50 hover:border-[#0024A8]/40 shadow-xs transition-all duration-150 cursor-pointer"
          >
            What are the needed Documents.
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. CHAT INPUT SPACE: Bottom interactive UI for asking questions      */}
      {/* ==================================================================== */}
      <footer className="p-4 sm:p-6 bg-white border-t border-blue-100 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 bg-white border border-blue-200/90 rounded-2xl p-2 sm:p-2.5 shadow-xs focus-within:border-[#0024A8] focus-within:ring-2 focus-within:ring-[#0024A8]/20 transition-all">
          {/* Question Text Input */}
          <input
            type="text"
            placeholder="Type your question or message here..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
            readOnly
          />

          {/* Send Action Button */}
          <button
            type="button"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#0024A8] hover:bg-[#0A2881] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-150 gap-2 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}