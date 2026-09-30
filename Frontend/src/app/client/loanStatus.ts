/**
 * Shared loan-status resolution for the Client Portal.
 *
 * Maps the backend `loan_status` value (derived from the Asana section)
 * onto the 13-step pipeline shown in the Client profile / loan-status pages.
 */

export type StepState = "completed" | "in_process" | "upcoming";

export interface LoanStatusResolution {
  /** State for each of the 13 pipeline steps (1..13). */
  states: StepState[];
  /** Header text shown as the current progress title. */
  header: string;
  /** 1-based step number currently in progress, null when none. */
  activeStepIndex: number | null;
  /** Total steps rendered (14 when withdrawn, otherwise 13). */
  totalSteps: number;
  /** True when the application has been withdrawn (terminal state). */
  withdrawn: boolean;
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
export const NO_ACTIVE_HEADER = "No Current Application";

export function resolveLoanStatus(
  status?: string | null
): LoanStatusResolution {
  const normalized = status?.trim() ?? "";

  // Terminal state: nothing was achieved, the file is closed.
  if (normalized === "Withdraw" || normalized === WITHDRAWN) {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: WITHDRAWN,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: true,
      hasApplication: true,
    };
  }

  const index = PIPELINE.indexOf(normalized);

  // No match (null / unknown): no application to show progress for.
  if (index < 0) {
    return {
      states: PIPELINE.map(() => "upcoming"),
      header: NO_ACTIVE_HEADER,
      activeStepIndex: null,
      totalSteps: PIPELINE.length,
      withdrawn: false,
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
    hasApplication: true,
  };
}