/**
 * ==============================================================================
 * COMPONENT: LoanProgressStepper.tsx
 * Path: src/app/client/loan-status/components/LoanProgressStepper.tsx
 * Description: Vertical 15-stage loan progress stepper.
 *              - Blends seamlessly into the background (no shadow/outline)
 *              - Number in circle replaces with check icon when completed
 *              - Completed cards: Theme blue (#0024A8) background with white text
 *              - Completed status: "Completed At {date}" in a single container
 *              - In Progress cards: "In Progress" badge only without date
 * ==============================================================================
 */

"use client";

import React from "react";
import { Check, Clock } from "lucide-react";

export interface StepperStep {
  id: number;
  title: string;
  subtitle?: string;
  date?: string;
  status: "completed" | "in_process" | "upcoming" | "action_needed";
  description?: string;
}

export const defaultSteps: StepperStep[] = [
  {
    id: 1,
    title: "Pending",
    subtitle: "Application initiated",
    status: "completed",
    description: "Your initial application was received and registered in the BAI Finance system.",
  },
  {
    id: 2,
    title: "Appointment Booked",
    subtitle: "Consultation set",
    status: "completed",
    description: "Mortgage discovery consultation completed with your designated broker.",
  },
  {
    id: 3,
    title: "Under Review",
    subtitle: "Preliminary assessment",
    status: "completed",
    description: "Broker performed initial suitability analysis and credit capability review.",
  },
  {
    id: 4,
    title: "Revisit",
    subtitle: "Strategy refinement",
    status: "completed",
    description: "Loan structuring options revisited and client details clarified.",
  },
  {
    id: 5,
    title: "Proceeding",
    subtitle: "Client confirmed",
    status: "completed",
    description: "Formal agreement to proceed with selected lender and product package.",
  },
  {
    id: 6,
    title: "Collection of Documents",
    subtitle: "Uploading supporting docs",
    status: "in_process",
    description: "Gathering and verifying income proofs, bank statements, identity documents, and property certificates.",
  },
  {
    id: 7,
    title: "Assessment",
    subtitle: "Credit & serviceability",
    status: "upcoming",
    description: "Comprehensive financial modeling and lender serviceability verification.",
  },
  {
    id: 8,
    title: "Docs for Sign",
    subtitle: "Application disclosures",
    status: "upcoming",
    description: "Mortgage application pack generated and sent to client for electronic signing.",
  },
  {
    id: 9,
    title: "For Lodgment",
    subtitle: "Packaging for lender",
    status: "upcoming",
    description: "Quality assurance checks completed and file packaged for official submission.",
  },
  {
    id: 10,
    title: "Submitted",
    subtitle: "Lodged with bank",
    status: "upcoming",
    description: "Application successfully submitted into lender credit underwriting queue.",
  },
  {
    id: 11,
    title: "Conditional Approval",
    subtitle: "Underwriter approvals",
    status: "upcoming",
    description: "Lender satisfies condition requirements and issues formal unconditional loan offer.",
  },
  {
    id: 12,
    title: "Conversion to Unconditional Approval",
    subtitle: "Conditions cleared",
    status: "upcoming",
    description: "All lender conditions are satisfied; file prepares for formal unconditional approval.",
  },
  {
    id: 13,
    title: "Unconditional Approval",
    subtitle: "Formal lender approval",
    status: "upcoming",
    description: "Lender issues the unconditional loan offer; only legal and settlement steps remain.",
  },
  {
    id: 14,
    title: "Settlement",
    subtitle: "Legal & booking phase",
    status: "upcoming",
    description: "Lender, solicitors, and banks coordinate title registration and settlement booking.",
  },
  {
    id: 15,
    title: "Settled",
    subtitle: "Disbursement / Closed",
    status: "upcoming",
    description: "Loan funds successfully disbursed to complete purchase/refinance, or application concluded.",
  },
];

interface LoanProgressStepperProps {
  steps?: StepperStep[];
}

export default function LoanProgressStepper({
  steps = defaultSteps,
}: LoanProgressStepperProps) {
  return (
    /* ------------------------------------------------------------------------ */
    /* CONTAINER: Blends with background without shadow and outline             */
    /* ------------------------------------------------------------------------ */
    <div className="w-full max-w-5xl mx-auto bg-transparent border-0 shadow-none p-0 space-y-6">
      
      {/* ---------------------------------------------------------------------- */}
      {/* VERTICAL STEPPER LAYOUT                                                */}
      {/* ---------------------------------------------------------------------- */}
      <div className="relative space-y-5">
        
        {steps.map((step, idx) => {
          const isCompleted = step.status === "completed";
          const isInProcess = step.status === "in_process";
          const isActionNeeded = step.status === "action_needed";
          const isUpcoming = step.status === "upcoming";
          const isLast = idx === steps.length - 1;
          const isConnectorActive =
            isCompleted &&
            !isLast &&
            (steps[idx + 1].status === "completed" ||
              steps[idx + 1].status === "in_process");

          return (
            <div key={step.id} className="relative flex items-start gap-4 sm:gap-6 group">
              
              {/* Vertical Connector Line spanning continuously to the next step circle */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={`absolute left-5 sm:left-[22px] -translate-x-1/2 top-10 sm:top-11 -bottom-5 w-0.5 transition-colors duration-300 z-0 ${
                    isConnectorActive ? "bg-[#0024A8]" : "bg-slate-200"
                  }`}
                />
              )}

              {/* -------------------------------------------------------------- */}
              {/* 1. STEPPER NODE (Check icon when completed, or step number)    */}
              {/* -------------------------------------------------------------- */}
              <div className="relative flex flex-col items-center shrink-0">
                
                {/* Stepper Circle */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-sm sm:text-base z-10 transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#0024A8] text-white shadow-md shadow-[#0024A8]/20 ring-4 ring-blue-50"
                      : isInProcess
                      ? "bg-[#0024A8] text-white shadow-lg shadow-[#0024A8]/30 animate-pulse-ring"
                      : isActionNeeded
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-4 ring-rose-100"
                      : "bg-slate-100 text-slate-400 border-2 border-slate-300"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3] text-white" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------------- */}
              {/* 2. VISIBLE BOXED CONTAINER (Aligned to left with pulse ring)   */}
              {/* -------------------------------------------------------------- */}
              <div
                className={`relative flex-1 min-w-0 rounded-2xl p-4 sm:p-5 transition-all text-left border ${
                  isCompleted
                    ? "bg-[#0024A8] border-[#0024A8] text-white shadow-sm shadow-[#0024A8]/10"
                    : isInProcess
                    ? "bg-blue-50/50 border-[#0024A8] ring-1 ring-[#0024A8]/30 animate-pulse-ring"
                    : "bg-slate-50/60 border-slate-200/80"
                }`}
              >
                {/* Header row inside boxed container */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  
                  {/* Step Title in a larger font (Left-aligned) */}
                  <h3
                    className={`text-base sm:text-lg font-black tracking-tight text-left min-w-0 break-words ${
                      isCompleted
                        ? "text-white"
                        : isInProcess
                        ? "text-[#0024A8]"
                        : "text-slate-800"
                    }`}
                  >
                    {step.title}
                  </h3>

                  {/* Status Badge in one single container */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-white/20 text-white px-3 py-1 rounded-lg backdrop-blur-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Completed {step.date && step.date !== "Pending" ? `At ${step.date}` : ""}
                      </span>
                    )}

                    {isInProcess && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                        In Progress
                      </span>
                    )}

                    {isUpcoming && (
                      <span className="text-[11px] font-extrabold uppercase tracking-wider bg-slate-200/70 text-slate-500 px-2.5 py-1 rounded-lg">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>

                {/* Step Description under the title (Left-aligned) */}
                <p
                  className={`relative z-10 text-xs sm:text-sm font-medium leading-relaxed text-left ${
                    isCompleted
                      ? "text-white/90"
                      : isInProcess
                      ? "text-slate-700"
                      : "text-slate-500"
                  }`}
                >
                  {step.description || step.subtitle}
                </p>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
