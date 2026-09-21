/**
 * ==============================================================================
 * COMPONENT: LoanStatusTab.tsx
 * Path: src/app/client/loan-status/LoanStatusTab.tsx
 * Description: Main Loan Status page component for the Client Portal.
 *              - Main container background: White
 *              - Top: ProgressStatus component (Centered bold title + Step container)
 *              - Center: LoanProgressStepper component (Vertical 13-step Stepper)
 * ==============================================================================
 */

"use client";

import React from "react";
import { Ban, FileSearch } from "lucide-react";
import { Client } from "../../broker/MockData";
import { resolveLoanStatus } from "../loanStatus";
import ProgressStatus from "./components/ProgressStatus";
import LoanProgressStepper, { StepperStep } from "./components/LoanProgressStepper";

interface LoanStatusTabProps {
  client: Client;
  onLogAction?: (msg: string) => void;
}

export default function LoanStatusTab({
  client,
  onLogAction
}: LoanStatusTabProps) {
  // ----------------------------------------------------------------------------
  // 1. 13-STAGE LOAN STATUS STEPS WORKFLOW
  // ----------------------------------------------------------------------------
  const baseSteps: Omit<StepperStep, "status">[] = [
    {
      id: 1,
      title: "Pending",
      subtitle: "Application initiated",
      date: "Aug 10, 2026",
      description: "Initial application received and registered in BAI Finance system.",
    },
    {
      id: 2,
      title: "Appointment Booked",
      subtitle: "Consultation scheduled",
      date: "Aug 12, 2026",
      description: "Mortgage discovery session completed with your designated broker.",
    },
    {
      id: 3,
      title: "Under Review",
      subtitle: "Preliminary file check",
      date: "Aug 15, 2026",
      description: "Broker performed initial qualification and credit capacity assessment.",
    },
    {
      id: 4,
      title: "Revisit",
      subtitle: "Strategy refinement",
      date: "Aug 18, 2026",
      description: "Refinancing structure options reviewed and client details clarified.",
    },
    {
      id: 5,
      title: "Proceeding",
      subtitle: "Engagement confirmed",
      date: "Aug 20, 2026",
      description: "Formal agreement to proceed with selected lender and product package.",
    },
    {
      id: 6,
      title: "Collection of Documents",
      subtitle: "Supporting doc uploads",
      date: "Aug 24, 2026",
      description: "Gathering income proofs, bank statements, identity documents, and property deeds.",
    },
    {
      id: 7,
      title: "Assessment",
      subtitle: "Credit & serviceability",
      date: "Pending",
      description: "Comprehensive financial modeling and preliminary lender underwriting check.",
    },
    {
      id: 8,
      title: "Docs for Sign",
      subtitle: "Sign disclosures & forms",
      date: "Pending",
      description: "Formal lender application forms and compliance disclosures prepared for e-signing.",
    },
    {
      id: 9,
      title: "For Lodgment",
      subtitle: "Packaging submission",
      date: "Pending",
      description: "Quality assurance check and packaging for lender portal lodgment.",
    },
    {
      id: 10,
      title: "Submitted",
      subtitle: "Lodged with bank",
      date: "Pending",
      description: "Application successfully submitted into lender credit queue.",
    },
    {
      id: 11,
      title: "Conditional Approval",
      subtitle: "Lender credit approval",
      date: "Pending",
      description: "Lender satisfies condition requirements and issues formal unconditional loan offer.",
    },
    {
      id: 12,
      title: "Settlement",
      subtitle: "Legal & booking phase",
      date: "Pending",
      description: "Lender, solicitors, and incoming/outgoing banks coordinate settlement booking.",
    },
    {
      id: 13,
      title: "Settled",
      subtitle: "Disbursement / Closed",
      date: "Pending",
      description: "Loan funds disbursed and facility active, or application file concluded.",
    },
  ];

  const resolution = resolveLoanStatus(client.loan?.currentStatus);

  // stepperSteps: the 13 pipeline steps colored by the real loan status.
  // Withdrawn applications skip the stepper entirely and get a dedicated card.
  const stepperSteps: StepperStep[] = baseSteps.map((step, i) => ({
    ...step,
    status: resolution.states[i] ?? ("upcoming" as const),
  }));

  return (
    <div className="min-h-full bg-white space-y-8 animate-fadeIn pb-12">

      {/* ---------------------------------------------------------------------- */}
      {/* PART 1: PROGRESS STATUS COMPONENT (Active stage with blue header)      */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Progress Status Header" className="w-full">
        <ProgressStatus
          statusText={resolution.header}
          stepNumber={resolution.activeStepIndex ?? 0}
          totalSteps={resolution.totalSteps}
          tone={resolution.withdrawn ? "neutral" : "blue"}
        />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* PART 2: 13-STAGE VERTICAL LOAN PROGRESS STEPPER COMPONENT              */}
      {/* OR a Withdrawn / empty-state screen for terminal and no-app cases.     */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Loan Progress Stepper" className="max-w-5xl mx-auto px-6 sm:px-8 pt-2">
        {resolution.withdrawn ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 sm:p-14 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1.5">
              Application Withdrawn
            </h3>
            <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
              This application has been withdrawn and the file is now closed.
              Contact your broker if you&apos;d like to discuss a new application.
            </p>
          </div>
        ) : resolution.hasApplication ? (
          <LoanProgressStepper steps={stepperSteps} />
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 sm:p-14 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0024A8] flex items-center justify-center mx-auto mb-4">
              <FileSearch className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1.5">
              No Current Application
            </h3>
            <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
              You don&apos;t have an active loan application yet. Once the loan processing team
              creates one, your progress will appear here.
            </p>
          </div>
        )}
      </section>

    </div>
  );
}
