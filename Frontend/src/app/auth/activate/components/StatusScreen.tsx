/**
 * ==============================================================================
 * COMPONENT: StatusScreen.tsx
 * Path: src/app/auth/activate/components/StatusScreen.tsx
 * Description: Feedback screen component showing success ("Account Activated!")
 *              or error states during the user activation flow.
 *              Features the login-theme background, centered card, full name display,
 *              masked/revealed password container with toggle eye icon, and
 *              "Proceed to Login" CTA button.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

// ==============================================================================
// 1. COMPONENT PROPS INTERFACE
// ==============================================================================
interface StatusScreenProps {
  type: "error" | "success";
  title?: string;
  message?: string;
  fullName?: string;
  password?: string;
  token?: string;
}

export default function StatusScreen({
  type,
  title = "Account Activated!",
  message = "Please review the details below.",
  fullName,
  password,
}: StatusScreenProps) {
  // ============================================================================
  // 2. STATE MANAGEMENT: PASSWORD VISIBILITY TOGGLE
  // ============================================================================
  const [showPassword, setShowPassword] = useState(false);
  const isError = type === "error";

  return (
    <div
      className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
      selection:bg-[#0024A8] selection:text-white antialiased relative overflow-hidden"
    >
      {/* ---------------------------------------------------------------------- */}
      {/* 3. BACKGROUND LAYERS (Matching Login Page Theme)                       */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
        aria-hidden="true"
      >
        {/* Layer 0a: loginImage background blurred */}
        <img
          src="/loginImage.jpeg"
          alt=""
          className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
        />

        {/* Layer 0b: Theme blue layer on top with 65% opacity */}
        <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />

        {/* Layer 0c: Moving blurry glowing golden rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Glowing Golden Ring 1 - Top Left Large Atmospheric Orb */}
          <div className="absolute -top-16 -left-16 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#E4BA37]/35 via-[#F59E0B]/20 to-transparent blur-2xl animate-orb-1" />

          {/* Glowing Golden Ring 2 - Bottom Right Large Glowing Disc */}
          <div className="absolute -bottom-24 -right-24 w-96 h-96 sm:w-[28rem] sm:h-[28rem] rounded-full bg-[#E4BA37]/25 blur-3xl animate-orb-2" />

          {/* Glowing Golden Ring 3 - Center Right Soft Floating Accent Ring */}
          <div className="absolute top-[20%] right-[14%] w-64 h-64 rounded-full bg-gradient-to-br from-[#E4BA37]/25 via-[#F59E0B]/15 to-transparent blur-xl animate-orb-3" />

          {/* Glowing Golden Ring 4 - Bottom Left Floating Glow */}
          <div className="absolute bottom-[18%] left-[10%] w-60 h-60 rounded-full bg-[#E4BA37]/20 blur-xl animate-orb-4" />
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. MAIN REGISTRATION CONTAINER (Centered Card)                         */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl
        p-8 sm:p-10 max-w-lg w-full relative z-10 animate-scaleIn space-y-6 text-center"
      >
        {/* Brand Logo */}
        <div className="flex justify-center pt-1">
          <img
            src="/bai_logo_blue-384.webp"
            alt="BAI Group of Companies"
            width={384}
            height={165}
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* Status Badge Icon */}
        <div className="flex justify-center">
          {isError ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shadow-sm">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* 5. HEADER SECTION: TITLE & SUBTITLE                                  */}
        {/* -------------------------------------------------------------------- */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-[#0024A8] tracking-tight text-center">
            {isError ? title : "Account Activated!"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium text-center">
            {isError ? message : "Please review the details below."}
          </p>
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* 6. CLIENT DETAILS SECTION (FULL NAME & PASSWORD)                     */}
        {/* -------------------------------------------------------------------- */}
        {!isError && (
          <div className="space-y-4 text-left pt-1">
            {/* Full Name Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Full Name:
              </label>
              <div className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold select-all">
                {fullName || "Registered Client"}
              </div>
            </div>

            {/* Password Display with Eye Toggle Icon */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Password:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  readOnly
                  value={password || "••••••••••••"}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-slate-800 font-medium select-all focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* 7. ACTION BUTTON: "PROCEED TO LOGIN"                                 */}
        {/* -------------------------------------------------------------------- */}
        <div className="pt-2">
          {isError ? (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Verification Required
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full py-3.5 px-6 bg-[#0024A8] hover:bg-[#001D85] active:bg-[#00176B] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#0024A8]/20 transition-all cursor-pointer uppercase tracking-wider"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
