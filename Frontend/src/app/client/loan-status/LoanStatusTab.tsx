/**
 * ==============================================================================
 * COMPONENT: LoanStatusTab.tsx
 * Path: src/app/client/loan-status/LoanStatusTab.tsx
 * Description: Main Loan Status page component for the Client Portal.
 *              - Center of the page features two connected containers with
 *                NO space separating them (gap-0, flush together):
 *                1. Left: Application Category Container (40% thinner, ~260px,
 *                   height dynamically scales with applied categories count).
 *                2. Right: Progress Bar & 15-Stage Stepper Container.
 *              - Preserves full status resolution, active step tracking,
 *                and multiple-application switching functionality.
 * ==============================================================================
 */

"use client";

import React, { useMemo } from "react";
import {
  Ban,
  FileSearch,
  ChevronRight,
  Layers,
  TrendingUp,
} from "lucide-react";
import { ClientData, ClientApplication } from "../types";
import { PIPELINE, resolveLoanStatus, cleanStatusStr } from "../loanStatus";
import ProgressStatus from "./components/ProgressStatus";
import LoanProgressStepper, { StepperStep } from "./components/LoanProgressStepper";

// ------------------------------------------------------------------------------
// TYPES & INTERFACES
// ------------------------------------------------------------------------------
interface LoanStatusTabProps {
  client: ClientData;
  onLogAction?: (msg: string) => void;
  setSelectedApplicationId?: (id: string) => void;
}

interface AppliedCategoryItem {
  id: string;
  categoryName: string;
  taskName?: string | null;
  taskGid?: string | null;
  amount?: number | null;
  status: string;
  isPrimary?: boolean;
}

// ------------------------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------------------------
/** Format a backend ISO timestamp in a fixed locale/timezone to prevent hydration mismatches */
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

/** Format currency numbers into clean AUD currency string */
function formatCurrency(amount?: number | null): string | null {
  if (amount == null || Number.isNaN(amount) || amount <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Get appropriate pill styling for application status */
function getCategoryStatusBadge(status?: string | null) {
  const norm = (status || "").toLowerCase().trim();
  if (norm === "settled") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (norm === "withdrawn" || norm === "withdraw") {
    return "bg-slate-100 text-slate-600 border-slate-200";
  }
  return "bg-blue-50 text-[#0024A8] border-blue-200";
}

export default function LoanStatusTab({
  client,
  onLogAction,
  setSelectedApplicationId,
}: LoanStatusTabProps) {
  // ----------------------------------------------------------------------------
  // 1. 15-STAGE LOAN STATUS STEPS WORKFLOW DEFINITION
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

  // ----------------------------------------------------------------------------
  // 2. APPLICATIONS & CATEGORIES RESOLUTION
  // ----------------------------------------------------------------------------
  const applications: ClientApplication[] = client.applications ?? [];

  // Determine currently active selected application
  const selectedApplication = useMemo(() => {
    return (
      applications.find((a) => a.id === client.selectedApplicationId) ??
      applications[0] ??
      null
    );
  }, [applications, client.selectedApplicationId]);

  // Transform applications into category items list (scaling left container)
  const appliedCategories: AppliedCategoryItem[] = useMemo(() => {
    if (applications.length > 0) {
      return applications.map((app) => ({
        id: app.id,
        categoryName:
          app.asanaProjectName ||
          app.asanaTaskName ||
          (app.asanaProjectGid ? `Project ${app.asanaProjectGid}` : "Loan Application"),
        taskName: app.asanaTaskName,
        taskGid: app.asanaTaskGid,
        amount: app.amount,
        status: app.asanaStatus || "Pending",
        isPrimary: app.isPrimary,
      }));
    }

    // Fallback if client has legacy loan object without applications array
    if (client.loan?.purpose || client.loan?.requestedAmount || client.loan?.currentStatus) {
      return [
        {
          id: "primary-loan",
          categoryName: client.loan.purpose || "Loan Application",
          amount: client.loan.requestedAmount,
          status: client.loan.currentStatus || "Pending",
          isPrimary: true,
        },
      ];
    }

    return [];
  }, [applications, client.loan]);

  // Status and history resolution for the selected application
  const displayStatus =
    selectedApplication?.asanaStatus ?? client.loan?.currentStatus;
  const displayHistory =
    selectedApplication?.asanaStatusHistory ?? client.loan?.statusHistory ?? [];

  const resolution = resolveLoanStatus(displayStatus);

  const historyByStatus = new Map(
    (displayHistory ?? []).map((entry) => [
      cleanStatusStr(entry.status),
      entry.changed_at,
    ]),
  );

  // Map 15 workflow steps with live status & change timestamps
  const stepperSteps: StepperStep[] = baseSteps.map((step, i) => {
    const changedAt = historyByStatus.get(cleanStatusStr(step.title));
    return {
      ...step,
      date: changedAt ? formatStatusDate(changedAt) : "Pending",
      status: resolution.states[i] ?? ("upcoming" as const),
    };
  });

  // Calculate overall progress percentage (0 - 100%)
  const activeStepNum = resolution.activeStepIndex ?? 0;
  const totalStepNum = resolution.totalSteps || 15;
  const progressPercent = resolution.withdrawn
    ? 0
    : Math.min(100, Math.round((activeStepNum / totalStepNum) * 100));

  // Current active category title for right container header
  const currentCategoryTitle =
    selectedApplication?.asanaProjectName ||
    selectedApplication?.asanaTaskName ||
    client.loan?.purpose ||
    "Loan Application";

  return (
    <div className="min-h-full space-y-8 pb-12">
      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 1: TOP PROGRESS BANNER                                         */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Progress Status Banner" className="w-full">
        <ProgressStatus
          statusText={resolution.header}
          stepNumber={resolution.activeStepIndex ?? 0}
          totalSteps={resolution.totalSteps}
          tone={resolution.withdrawn ? "neutral" : "blue"}
        />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 2: CENTER WORKSPACE (CONNECTED SIDE-BY-SIDE CONTAINERS)        */}
      {/* Both containers are flush together without space separating them.      */}
      {/* Left container is resized 40% thinner and scales with category count. */}
      {/* ---------------------------------------------------------------------- */}
      <section
        aria-label="Loan Application Categories and Progress Stepper"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2"
      >
        <div className="flex flex-col lg:flex-row items-start gap-0">
          
          {/* ================================================================== */}
          {/* CONTAINER 1 (LEFT): APPLICATION CATEGORY CONTAINER                 */}
          {/* - Resized 40% thinner (~260px wide on desktop)                     */}
          {/* - Container size dynamically scales with amount of categories      */}
          {/* - White background with theme blue header (#0024A8)                */}
          {/* - Top right header says "Categories"                               */}
          {/* ================================================================== */}
          <div className="w-full lg:w-[260px] xl:w-[270px] shrink-0 self-start h-fit bg-white border border-slate-200/90 rounded-t-2xl lg:rounded-tr-none lg:rounded-br-none lg:rounded-l-2xl shadow-sm transition-all flex flex-col z-10 overflow-hidden">
            
            {/* Header: Blue background similar to theme with Left-Aligned Title */}
            <div className="bg-[#0024A8] border-b border-[#001D85] p-4 sm:p-5 text-white">
              <div className="flex items-center justify-start mb-1">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white text-left">
                  Categories
                </h2>
              </div>
              <p className="text-[11px] text-blue-100/70 font-medium leading-tight text-left">
                Click a category to view its progress tracker.
              </p>
            </div>

            {/* Body: White background with Category Cards closer to edges */}
            <div className="p-2 sm:p-2.5 flex flex-col gap-2 bg-white">
              {appliedCategories.length === 0 ? (
                /* Empty state when no application categories exist */
                <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <FileSearch className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">No Categories</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    No active loan categories applied yet.
                  </p>
                </div>
              ) : (
                /* Render each applied category item */
                appliedCategories.map((item, index) => {
                  const isSelected = selectedApplication
                    ? item.id === selectedApplication.id
                    : index === 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (setSelectedApplicationId && item.id !== "primary-loan") {
                          setSelectedApplicationId(item.id);
                          onLogAction?.(`Selected category: ${item.categoryName}`);
                        }
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-[#E4BA37] border-[#E4BA37] text-[#0024A8] shadow-sm font-black ring-2 ring-[#0024A8]/15"
                          : "bg-[#0024A8] border-[#001D85] hover:bg-[#001D85] text-white font-bold"
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-inherit truncate block">
                        {item.categoryName}
                      </span>
                    </button>
                  );
                })
              )}

              {/* Scalable Container Footer Note */}
              {appliedCategories.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {appliedCategories.length} {appliedCategories.length === 1 ? "category" : "categories"} applied
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================== */}
          {/* CONTAINER 2 (RIGHT): PROGRESS BAR & STEPPER CONTAINER              */}
          {/* - Connected seamlessly without space (gap-0, -ml-px border merge)  */}
          {/* - Theme blue header with "Loan Progress", gold gradient bar        */}
          {/* - White body with vertical 15-stage workflow stepper               */}
          {/* ================================================================== */}
          <div className="flex-1 min-w-0 w-full bg-white border border-slate-200/90 rounded-b-2xl lg:rounded-b-none lg:rounded-tl-none lg:rounded-r-2xl lg:rounded-bl-2xl lg:-ml-px -mt-px lg:mt-0 shadow-sm flex flex-col overflow-hidden">
            
            {/* 1. PROGRESS BAR HEADER & SUMMARY (THEME BLUE BACKGROUND) */}
            <div className="bg-[#0024A8] border-b border-[#001D85] p-6 sm:p-8 text-white flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Loan Progress
                  </h3>
                  {currentCategoryTitle && (
                    <p className="text-xs sm:text-sm font-semibold text-blue-100/80 mt-0.5">
                      {currentCategoryTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* 2. VISUAL PROGRESS BAR */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                  {/* On the top left of the status bar: gold text saying "Step X of X" */}
                  <span className="flex items-center gap-1.5 text-[#E4BA37] font-extrabold">
                    <TrendingUp className="w-4 h-4 text-[#E4BA37]" />
                    {resolution.withdrawn
                      ? "Application Withdrawn"
                      : activeStepNum > 0
                      ? `Step ${activeStepNum} of ${totalStepNum}`
                      : "Pending Start"}
                  </span>

                  {/* To the right of the status bar: percentage */}
                  <span className="text-[#E4BA37] font-black">{progressPercent}%</span>
                </div>

                {/* Animated Horizontal Progress Bar Track (#E4BA37) */}
                <div className="w-full bg-[#001D85] rounded-full h-3 overflow-hidden border border-white/10">
                  <div
                    className="h-full rounded-full bg-[#E4BA37] transition-all duration-500 ease-out shadow-xs"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. STEPPER PIPELINE / WORKFLOW DISPLAY */}
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              {resolution.withdrawn ? (
                /* Withdrawn Notice Card */
                <div className="border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
                    <Ban className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1.5">
                    Application Withdrawn
                  </h4>
                  <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
                    This application category has been withdrawn and the file is now closed.
                    Contact your broker if you would like to discuss a new application.
                  </p>
                </div>
              ) : resolution.hasApplication ? (
                /* Full 15-Stage Progress Stepper */
                <LoanProgressStepper steps={stepperSteps} />
              ) : (
                /* No Application Notice Card */
                <div className="border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center bg-slate-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0024A8] flex items-center justify-center mx-auto mb-4">
                    <FileSearch className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-1.5">
                    No Current Application
                  </h4>
                  <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
                    You do not have an active loan application yet. Once the loan processing team
                    creates one, your progress will appear here.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
