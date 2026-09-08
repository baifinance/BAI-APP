/**
 * ==============================================================================
 * COMPONENT: LoanProgressStepper.tsx
 * Path: src/app/client/loan-status/components/LoanProgressStepper.tsx
 * Description: Centered Stepper component for the Loan Status Checklist.
 *              - Successful steps are colored theme blue with white icons.
 *              - Steps currently in process or with problems/actions needed are colored red.
 *              - Upcoming steps are displayed in neutral tones.
 * ==============================================================================
 */

"use client";

import React from "react";
import { Check, AlertTriangle, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";

export interface StepperStep {
  id: number;
  title: string;
  subtitle?: string;
  date?: string;
  status: "completed" | "in_process" | "upcoming";
}

interface LoanProgressStepperProps {
  steps?: StepperStep[];
}

export default function LoanProgressStepper({
  steps = [
    {
      id: 1,
      title: "Submitted",
      subtitle: "Application logged",
      date: "Aug 10, 2026",
      status: "completed"
    },
    {
      id: 2,
      title: "In Review",
      subtitle: "Broker preliminary check",
      date: "Aug 15, 2026",
      status: "completed"
    },
    {
      id: 3,
      title: "Additional Info",
      subtitle: "Action needed on docs",
      date: "Aug 23, 2026",
      status: "in_process"
    },
    {
      id: 4,
      title: "Assessment",
      subtitle: "Formal underwriting",
      date: "Pending",
      status: "upcoming"
    },
    {
      id: 5,
      title: "Approval",
      subtitle: "Conditional approval",
      date: "Pending",
      status: "upcoming"
    },
    {
      id: 6,
      title: "Settled",
      subtitle: "Funds disbursement",
      date: "Pending",
      status: "upcoming"
    }
  ]
}: LoanProgressStepperProps) {
  return (
    /* ------------------------------------------------------------------------ */
    /* 1. STEPPER WRAPPER: Centered container with responsive horizontal flow  */
    /* ------------------------------------------------------------------------ */
    <div className="w-full max-w-5xl mx-auto py-6 px-2 sm:px-4 animate-fadeIn">
      
      {/* Desktop / Tablet Horizontal Stepper */}
      <div className="hidden sm:flex items-start justify-between relative">
        
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isInProcess = step.status === "in_process";
          const isUpcoming = step.status === "upcoming";
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Individual Step Item */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1 px-1">
                
                {/* ------------------------------------------------------------ */}
                {/* 2. STEP CIRCLE ICON: Blue (Completed) / Red (In Process/Alert)*/}
                {/* ------------------------------------------------------------ */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#0024A8] text-white shadow-md shadow-[#0024A8]/30 ring-4 ring-blue-50"
                      : isInProcess
                      ? "bg-red-600 text-white shadow-md shadow-red-600/30 ring-4 ring-red-100 animate-pulse"
                      : "bg-slate-100 text-slate-400 border border-slate-300"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 stroke-[2.5]" />
                  ) : isInProcess ? (
                    <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                  ) : (
                    <span className="text-sm font-black">{step.id}</span>
                  )}
                </div>

                {/* ------------------------------------------------------------ */}
                {/* 3. STEP TEXT LABELS: Title, Subtitle, and Date               */}
                {/* ------------------------------------------------------------ */}
                <div className="mt-3 space-y-0.5">
                  <span
                    className={`block text-xs sm:text-sm font-extrabold ${
                      isCompleted
                        ? "text-[#0024A8]"
                        : isInProcess
                        ? "text-red-600 font-black"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>

                  {step.subtitle && (
                    <span
                      className={`block text-[10px] font-semibold ${
                        isInProcess
                          ? "text-red-500 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {step.subtitle}
                    </span>
                  )}

                  {step.date && (
                    <span
                      className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                        isCompleted
                          ? "bg-blue-50 text-[#0024A8]"
                          : isInProcess
                          ? "bg-red-50 text-red-600 font-extrabold"
                          : "text-slate-400"
                      }`}
                    >
                      {step.date}
                    </span>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------------- */}
              {/* 4. STEP CONNECTOR LINE                                         */}
              {/* -------------------------------------------------------------- */}
              {!isLast && (
                <div className="flex-1 self-start mt-6 -mx-2 h-1 relative">
                  <div
                    className={`h-full w-full rounded-full ${
                      isCompleted && steps[idx + 1].status === "completed"
                        ? "bg-[#0024A8]"
                        : isCompleted && steps[idx + 1].status === "in_process"
                        ? "bg-gradient-to-r from-[#0024A8] to-red-600"
                        : "bg-slate-200"
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Vertical Stepper (< 640px) */}
      <div className="sm:hidden space-y-4 relative pl-8 before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {steps.map((step) => {
          const isCompleted = step.status === "completed";
          const isInProcess = step.status === "in_process";

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Step Circle */}
              <div
                className={`absolute -left-8 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                  isCompleted
                    ? "bg-[#0024A8] text-white shadow-sm"
                    : isInProcess
                    ? "bg-red-600 text-white shadow-sm ring-2 ring-red-200 animate-pulse"
                    : "bg-slate-100 text-slate-400 border border-slate-300"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isInProcess ? (
                  <AlertTriangle className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className="text-xs font-bold">{step.id}</span>
                )}
              </div>

              {/* Step Details */}
              <div className="pt-0.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-extrabold ${
                      isCompleted
                        ? "text-[#0024A8]"
                        : isInProcess
                        ? "text-red-600"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                  {step.date && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({step.date})
                    </span>
                  )}
                </div>
                {step.subtitle && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
