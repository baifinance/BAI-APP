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
import { ClientData } from "../types";
import { resolveLoanStatus } from "../loanStatus";
import ProgressStatus from "./components/ProgressStatus";
import LoanProgressStepper, { StepperStep } from "./components/LoanProgressStepper";

interface LoanStatusTabProps {
  client: ClientData;
  onLogAction?: (msg: string) => void;
}

/** Format a backend ISO timestamp in a fixed locale/timezone so server and
 *  client renders agree (avoids React hydration mismatches). */
function formatStatusDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function LoanStatusTab({
  client,
}: LoanStatusTabProps) {
  // ----------------------------------------------------------------------------
  // 1. 13-STAGE LOAN STATUS STEPS WORKFLOW
  // ----------------------------------------------------------------------------
  const baseSteps: Omit<StepperStep, "status" | "date">[] = [
    {
      id: 1,
      title: "Pending",
      subtitle: "Application initiated",
      description: "Initial application received and registered in BAI Finance system.",
    },
    {
      id: 2,
      title: "Appointment Booked",
      subtitle: "Consultation scheduled",
      description: "Mortgage discovery session completed with your designated broker.",
    },
    {
      id: 3,
      title: "Under Review",
      subtitle: "Preliminary file check",
      description: "Broker performed initial qualification and credit capacity assessment.",
    },
    {
      id: 4,
      title: "Revisit",
      subtitle: "Strategy refinement",
      description: "Refinancing structure options reviewed and client details clarified.",
    },
    {
      id: 5,
      title: "Proceeding",
      subtitle: "Engagement confirmed",
      description: "Formal agreement to proceed with selected lender and product package.",
    },
    {
      id: 6,
      title: "Collection of Documents",
      subtitle: "Supporting doc uploads",
      description: "Gathering income proofs, bank statements, identity documents, and property deeds.",
    },
    {
      id: 7,
      title: "Assessment",
      subtitle: "Credit & serviceability",
      description: "Comprehensive financial modeling and preliminary lender underwriting check.",
    },
    {
      id: 8,
      title: "Docs for Sign",
      subtitle: "Sign disclosures & forms",
      description: "Formal lender application forms and compliance disclosures prepared for e-signing.",
    },
    {
      id: 9,
      title: "For Lodgment",
      subtitle: "Packaging submission",
      description: "Quality assurance check and packaging for lender portal lodgment.",
    },
    {
      id: 10,
      title: "Submitted",
      subtitle: "Lodged with bank",
      description: "Application successfully submitted into lender credit queue.",
    },
    {
      id: 11,
      title: "Conditional Approval",
      subtitle: "Lender credit approval",
      description: "Lender satisfies condition requirements and issues formal unconditional loan offer.",
    },
    {
      id: 12,
      title: "Settlement",
      subtitle: "Legal & booking phase",
      description: "Lender, solicitors, and incoming/outgoing banks coordinate settlement booking.",
    },
    {
      id: 13,
      title: "Settled",
      subtitle: "Disbursement / Closed",
      description: "Loan funds disbursed and facility active, or application file concluded.",
    },
  ];

  const resolution = resolveLoanStatus(client.loan?.currentStatus);

  // When each status was reached, keyed by the Asana section name (which
  // matches the step title). Steps without a recorded entry show "Pending".
  const historyByStatus = new Map(
    (client.loan?.statusHistory ?? []).map((entry) => [entry.status, entry.changed_at]),
  );

  // stepperSteps: the 13 pipeline steps colored by the real loan status.
  // Withdrawn applications skip the stepper entirely and get a dedicated card.
  const stepperSteps: StepperStep[] = baseSteps.map((step, i) => {
    const changedAt = historyByStatus.get(step.title);
    return {
      ...step,
      date: changedAt ? formatStatusDate(changedAt) : "Pending",
      status: resolution.states[i] ?? ("upcoming" as const),
    };
  });

  return (
    <div className="min-h-full space-y-8 pb-12">

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
