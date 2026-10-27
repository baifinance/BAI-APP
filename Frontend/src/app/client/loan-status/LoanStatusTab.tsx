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
import { PIPELINE, resolveLoanStatus } from "../loanStatus";
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
    (displayHistory ?? []).map((entry) => [entry.status, entry.changed_at]),
  );

  // Map 15 workflow steps with live status & change timestamps
  const stepperSteps: StepperStep[] = baseSteps.map((step, i) => {
    const changedAt = historyByStatus.get(step.title);
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
          {/* - Flush against right container with no space separating them      */}
          {/* ================================================================== */}
          <div className="w-full lg:w-[260px] xl:w-[270px] shrink-0 self-start h-fit bg-white border border-slate-200/90 rounded-t-2xl lg:rounded-tr-none lg:rounded-br-none lg:rounded-l-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col gap-4 z-10">
            
            {/* Header: Title and Category Count */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-slate-900 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0024A8] flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate">
                    Categories
                  </h2>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                  {appliedCategories.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">
                Click a category to view its progress tracker.
              </p>
            </div>

            {/* List of Applied Categories */}
            <div className="flex flex-col gap-2.5">
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

                  const formattedAmount = formatCurrency(item.amount);

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
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex flex-col gap-2 relative group ${
                        isSelected
                          ? "border-[#0024A8] bg-blue-50/70 shadow-xs ring-1 ring-[#0024A8]/30"
                          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Top Row: Category Name + Selection Indicator */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0024A8] transition-colors truncate block">
                              {item.categoryName}
                            </span>
                            {item.isPrimary && (
                              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1 py-0.2 rounded-sm bg-blue-100 text-[#0024A8]">
                                Primary
                              </span>
                            )}
                          </div>
                          {item.taskName && item.taskName !== item.categoryName && (
                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                              {item.taskName}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center pt-0.5">
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isSelected
                                ? "text-[#0024A8] translate-x-0.5"
                                : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Bottom Row: Amount / Ref + Status Badge */}
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100/80">
                        {formattedAmount ? (
                          <span className="text-[11px] font-semibold text-slate-600 truncate">
                            {formattedAmount}
                          </span>
                        ) : item.taskGid ? (
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            Ref #{item.taskGid.slice(-5)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Standard
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getCategoryStatusBadge(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Scalable Container Footer Note */}
            {appliedCategories.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400 font-medium">
                  {appliedCategories.length} {appliedCategories.length === 1 ? "category" : "categories"} applied
                </span>
              </div>
            )}
          </div>

          {/* ================================================================== */}
          {/* CONTAINER 2 (RIGHT): PROGRESS BAR & STEPPER CONTAINER              */}
          {/* - Connected seamlessly without space (gap-0, -ml-px border merge)  */}
          {/* - Displays horizontal progress bar and 15-step vertical workflow   */}
          {/* - Keeps all tracking functionality and status resolution           */}
          {/* ================================================================== */}
          <div className="flex-1 min-w-0 w-full bg-white border border-slate-200/90 rounded-b-2xl lg:rounded-b-none lg:rounded-tl-none lg:rounded-r-2xl lg:rounded-bl-2xl lg:-ml-px -mt-px lg:mt-0 p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            
            {/* 1. PROGRESS BAR HEADER & SUMMARY */}
            <div className="border-b border-slate-100 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0024A8] bg-blue-50 px-2 py-0.5 rounded-sm">
                      Progress Bar
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      Live Status Tracker
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    {currentCategoryTitle}
                  </h3>
                </div>

                {/* Status indicator tag */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${getCategoryStatusBadge(
                      resolution.header,
                    )}`}
                  >
                    {resolution.header}
                  </span>
                </div>
              </div>

              {/* 2. VISUAL PROGRESS BAR */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0024A8]" />
                    {resolution.withdrawn
                      ? "Application Withdrawn"
                      : activeStepNum > 0
                      ? `Step ${activeStepNum} of ${totalStepNum}`
                      : "Pending Start"}
                  </span>
                  <span className="text-[#0024A8] font-black">{progressPercent}%</span>
                </div>

                {/* Animated Horizontal Progress Bar Track */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0024A8] to-[#2563EB] transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. STEPPER PIPELINE / WORKFLOW DISPLAY */}
            <div>
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
