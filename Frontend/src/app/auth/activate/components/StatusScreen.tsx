/**
 * ==============================================================================
 * COMPONENT: StatusScreen.tsx
 * Path: src/app/auth/activate/components/StatusScreen.tsx
 * Description: Feedback screen components showing success or error states
 *              during the user activation/registration flow.
 * ==============================================================================
 */

import React from "react";
import { AlertCircle, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface StatusScreenProps {
  type: "error" | "success";
  title: string;
  message: string;
  token?: string;
}

export default function StatusScreen({ type, title, message, token }: StatusScreenProps) {
  const isError = type === "error";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white font-sans text-slate-800 relative">
      
      {/* ---------------------------------------------------------------------- */}
      {/* MAIN CONTAINER CARD                                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 shadow-xl rounded-[24px] p-8 max-w-md w-full text-center space-y-6 relative z-10 animate-scaleIn">
        
        {/* Header Icon */}
        <div className="flex justify-center">
          {isError ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#071644] tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Button/Links */}
        <div className="pt-2">
          {isError ? (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Verification Required
            </div>
          ) : (
            <div className="space-y-4">
              {/* Proceed to Loan Processing button */}
              <Link
                href="/loan-processing"
                className="w-full py-3 px-4 bg-[#071644] hover:bg-[#163691] active:bg-[#071644] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Proceed to Loan Processing Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sent for Auditing</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
