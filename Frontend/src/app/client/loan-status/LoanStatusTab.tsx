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
import { Client } from "../../broker/MockData";
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
  const stepperSteps: StepperStep[] = [
    {
      id: 1,
      title: "Pending",
      subtitle: "Application initiated",
      date: "Aug 10, 2026",
      status: "completed",
      description: "Initial application received and registered in BAI Finance system.",
    },
    {
      id: 2,
      title: "Appointment Booked",
      subtitle: "Consultation scheduled",
      date: "Aug 12, 2026",
      status: "completed",
      description: "Mortgage discovery session completed with your designated broker.",
    },
    {
      id: 3,
      title: "Under Review",
      subtitle: "Preliminary file check",
      date: "Aug 15, 2026",
      status: "completed",
      description: "Broker performed initial qualification and credit capacity assessment.",
    },
    {
      id: 4,
      title: "Revisit",
      subtitle: "Strategy refinement",
      date: "Aug 18, 2026",
      status: "completed",
      description: "Refinancing structure options reviewed and client details clarified.",
    },
    {
      id: 5,
      title: "Proceeding",
      subtitle: "Engagement confirmed",
      date: "Aug 20, 2026",
      status: "completed",
      description: "Formal agreement to proceed with selected lender and product package.",
    },
    {
      id: 6,
      title: "Collection of Documents",
      subtitle: "Supporting doc uploads",
      date: "Aug 24, 2026",
      status: "in_process", // Currently active step
      description: "Gathering income proofs, bank statements, identity documents, and property deeds.",
    },
    {
      id: 7,
      title: "Assessment",
      subtitle: "Credit & serviceability",
      date: "Pending",
      status: "upcoming",
      description: "Comprehensive financial modeling and preliminary lender underwriting check.",
    },
    {
      id: 8,
      title: "Docs for Sign",
      subtitle: "Sign disclosures & forms",
      date: "Pending",
      status: "upcoming",
      description: "Formal lender application forms and compliance disclosures prepared for e-signing.",
    },
    {
      id: 9,
      title: "For Lodgment",
      subtitle: "Packaging submission",
      date: "Pending",
      status: "upcoming",
      description: "Quality assurance check and packaging for lender portal lodgment.",
    },
    {
      id: 10,
      title: "Submitted",
      subtitle: "Lodged with bank",
      date: "Pending",
      status: "upcoming",
      description: "Application successfully submitted into lender credit queue.",
    },
    {
      id: 11,
      title: "Conditional Approval",
      subtitle: "Lender credit approval",
      date: "Pending",
      status: "upcoming",
      description: "Lender satisfies condition requirements and issues formal unconditional loan offer.",
    },
    {
      id: 12,
      title: "Settlement",
      subtitle: "Legal & booking phase",
      date: "Pending",
      status: "upcoming",
      description: "Lender, solicitors, and incoming/outgoing banks coordinate settlement booking.",
    },
    {
      id: 13,
      title: "Settled",
      subtitle: "Disbursement / Closed",
      date: "Pending",
      status: "upcoming",
      description: "Loan funds disbursed and facility active, or application file concluded.",
    },
  ];

  const activeStep = stepperSteps.find((s) => s.status === "in_process" || s.status === "action_needed") || stepperSteps[0];

  return (
    <div className="bg-white space-y-8 animate-fadeIn pb-12">

      {/* ---------------------------------------------------------------------- */}
      {/* PART 1: PROGRESS STATUS COMPONENT (Active stage with blue gradient)    */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Progress Status Header">
        <ProgressStatus
          statusText={activeStep.title}
          stepNumber={activeStep.id}
          totalSteps={stepperSteps.length}
        />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* PART 2: 13-STAGE VERTICAL LOAN PROGRESS STEPPER COMPONENT              */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Loan Progress Stepper" className="pt-2 border-t border-slate-100">
        <LoanProgressStepper steps={stepperSteps} />
      </section>

    </div>
  );
}
