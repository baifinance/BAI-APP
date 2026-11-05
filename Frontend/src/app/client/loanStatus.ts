/**
 * Shared loan-status resolution for the Client Portal.
 *
 * Maps the backend `loan_status` value (derived from the Asana section)
 * onto the 15-step pipeline shown in the Client profile / loan-status pages.
 */

export type StepState = "completed" | "in_process" | "upcoming";

export interface LoanStatusResolution {
  /** State for each of the 15 pipeline steps (1..15). */
  states: StepState[];
  /** Header text shown as the current progress title. */
  header: string;
  /** 1-based step number currently in progress, null when none. */
  activeStepIndex: number | null;
  /** Total active pipeline steps rendered (always 15). */
  totalSteps: number;
  /** True when the application has been withdrawn (terminal state). */
  withdrawn: boolean;
  /** True when the loan has reached Settlement / Settled (terminal complete state). */
  completed: boolean;
  /** False when there is no current application to show progress for. */
  hasApplication: boolean;
}

export const PIPELINE = [
  "Pending",
  "Appointment Booked",
  "Under Review",
  "Revisit",
  "Proceeding",
  "Collection of Documents",
  "Assessment",
  "Docs for Sign",
  "For Lodgment",
  "Submitted",
  "Conditional Approval",
  "Conversion to Unconditional Approval",
  "Unconditional Approval",
  "Settlement",
  "Settled",
];

export const WITHDRAWN = "Withdrawn";
export const COMPLETE = "Complete";
export const NO_ACTIVE_HEADER = "No Current Application";

/** Raw Asana section names that differ from canonical PIPELINE entries. */
const STATUS_ALIASES: Record<string, string> = {
  "for lodgement": "For Lodgment",
  "withdrawn": "Withdraw",
  "settlements": "Settlement",
  "unconditionally approved": "Unconditional Approval",
  "final assessment": "Assessment",
};

export function cleanStatusStr(s: string): string {
  return s.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

export function normalizeLoanStatus(status?: string | null): string | null {
  if (!status) return null;
  const clean = cleanStatusStr(status);
  if (clean === "withdraw" || clean === "withdrawn") return WITHDRAWN;
  const alias = STATUS_ALIASES[clean];
  if (alias) return alias;
  const match = PIPELINE.find((step) => cleanStatusStr(step) === clean);
  return match ?? status.trim();
}

export function extractLoanStatusFromText(text?: string | null): string | null {
  if (!text) return null;
  const clean = cleanStatusStr(text);
  if (clean.includes("withdraw")) return WITHDRAWN;
  // Check each pipeline step, prioritizing longer names first to avoid partial matches
  const sortedSteps = [...PIPELINE].sort((a, b) => b.length - a.length);
  for (const step of sortedSteps) {
    if (clean.includes(cleanStatusStr(step))) {
      return step;
    }
  }
  return null;
}

export function resolveLoanStatus(
  status?: string | null
): LoanStatusResolution {
  if (!status) {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: NO_ACTIVE_HEADER,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: false,
      completed: false,
      hasApplication: false,
    };
  }

  const normalized = normalizeLoanStatus(status);
  if (!normalized) {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: NO_ACTIVE_HEADER,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: false,
      completed: false,
      hasApplication: false,
    };
  }

  const clean = cleanStatusStr(normalized);

  // Terminal state: nothing was achieved, the file is closed.
  if (clean === "withdraw" || clean === "withdrawn") {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: WITHDRAWN,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: true,
      completed: false,
      hasApplication: true,
    };
  }

  // Terminal state: loan fully settled, all pipeline steps complete.
  if (clean === "settled") {
    return {
      states: PIPELINE.map(() => "completed"),
      header: COMPLETE,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: false,
      completed: true,
      hasApplication: true,
    };
  }

  const index = PIPELINE.findIndex((step) => cleanStatusStr(step) === clean);

  // No match (null / unknown): no application to show progress for.
  if (index < 0) {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: status.trim() || NO_ACTIVE_HEADER,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: false,
      completed: false,
      hasApplication: false,
    };
  }

  return {
    states: PIPELINE.map((_, i) =>
      i < index ? "completed" : i === index ? "in_process" : "upcoming"
    ),
    header: PIPELINE[index],
    activeStepIndex: index + 1,
    totalSteps: PIPELINE.length,
    withdrawn: false,
    completed: false,
    hasApplication: true,
  };
}