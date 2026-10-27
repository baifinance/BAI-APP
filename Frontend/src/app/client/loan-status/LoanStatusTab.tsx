/**
 * ==============================================================================
 * COMPONENT: LoanStatusTab.tsx
 * Path: src/app/client/loan-status/LoanStatusTab.tsx
 * Description: Main Loan Status page component for the Client Portal.
 *              - Shows a right-side application chooser when the client has
 *                multiple loan applications (keyed by Asana project GID).
 *              - Renders the 15-step loan status stepper for the selected
 *                application.
 * ==============================================================================
 */

"use client";

import React from "react";
import { Ban, FileSearch, ChevronRight } from "lucide-react";
import { ClientData } from "../types";
import { PIPELINE, resolveLoanStatus } from "../loanStatus";
import ProgressStatus from "./components/ProgressStatus";
import LoanProgressStepper, { StepperStep } from "./components/LoanProgressStepper";

interface LoanStatusTabProps {
  client: ClientData;
  onLogAction?: (msg: string) => void;
  setSelectedApplicationId?: (id: string) => void;
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
  onLogAction,
  setSelectedApplicationId,
}: LoanStatusTabProps) {
  // ----------------------------------------------------------------------------
  // 1. 15-STAGE LOAN STATUS STEPS WORKFLOW
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
      title: "Conversion to Unconditional Approval",
      subtitle: "Conditions cleared",
      description: "All lender conditions are satisfied and the file is prepared for formal unconditional approval.",
    },
    {
      id: 13,
      title: "Unconditional Approval",
      subtitle: "Formal lender approval",
      description: "Lender issues the unconditional loan offer; only legal and settlement steps remain.",
    },
    {
      id: 14,
      title: "Settlement",
      subtitle: "Legal & booking phase",
      description: "Lender, solicitors, and incoming/outgoing banks coordinate settlement booking.",
    },
    {
      id: 15,
      title: "Settled",
      subtitle: "Disbursement / Closed",
      description: "Loan funds disbursed and facility active, or application file concluded.",
    },
  ];

  if (process.env.NODE_ENV !== "production" && baseSteps.length !== PIPELINE.length) {
    console.warn(
      `LoanStatusTab renders ${baseSteps.length} steps but PIPELINE defines ${PIPELINE.length}.`,
    );
  }

  const applications = client.applications ?? [];

  // Prefer the selected app; fall back to the legacy profile status when none exist.
  const selectedApplication =
    applications.find((a) => a.id === client.selectedApplicationId) ?? null;

  const hasMultipleApplications = applications.length > 1;

  const displayStatus = selectedApplication?.asanaStatus ?? client.loan?.currentStatus;
  const displayHistory = selectedApplication?.asanaStatusHistory ?? client.loan?.statusHistory ?? [];

  const resolution = resolveLoanStatus(displayStatus);

  const historyByStatus = new Map(
    (displayHistory ?? []).map((entry) => [entry.status, entry.changed_at]),
  );

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
      {/* PART 2: APPLICATION CHOOSER (right) + LOAN STEPPER (main)              */}
      {/* ---------------------------------------------------------------------- */}
      <section
        aria-label="Loan application selection and progress"
        className="max-w-6xl mx-auto px-6 sm:px-8 pt-2"
      >
        <div className={hasMultipleApplications ? "grid grid-cols-1 lg:grid-cols-12 gap-8" : ""}>
          {/* Main stepper area */}
          <div className={hasMultipleApplications ? "lg:col-span-8" : "col-span-full"}>
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
          </div>

          {/* Right-side application chooser (only when multiple exist) */}
          {hasMultipleApplications && setSelectedApplicationId && (
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">
                  Choose application
                </h3>
                <div className="space-y-3">
                  {applications.map((app) => {
                    const isSelected = app.id === client.selectedApplicationId;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedApplicationId(app.id)}
                        className={
                          "w-full flex flex-row items-center justify-between gap-3 p-3 rounded-xl border transition " +
                          (isSelected
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-slate-200 hover:border-slate-400 hover:bg-slate-50")
                        }
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {app.asanaProjectName || `Project ${app.asanaProjectGid}`}
                          </div>
                          {app.asanaTaskName && (
                            <p className="text-xs text-slate-500 truncate">
                              {app.asanaTaskName}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            {app.asanaTaskGid}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${
                              app.asanaStatus === "Settled"
                                ? "bg-green-100 text-green-700"
                              : app.asanaStatus === "Withdrawn"
                                ? "bg-slate-100 text-slate-600"
                              : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {app.asanaStatus || "—"}
                          </span>
                          {isSelected && (
                            <ChevronRight className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Select an application to view its loan status stepper.
              </p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
