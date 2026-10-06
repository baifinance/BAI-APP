/**
 * ==============================================================================
 * FILE: types.ts
 * Path: src/app/loan-processing/types.ts
 * Description: Mock Data & Type Definitions for the Loan Processing Portal.
 * ==============================================================================
 */

export interface SubmittedDocument {
  id: string;
  clientName: string;
  loanType: string;
  documentName: string;
  dateSubmitted: string; // YYYY-MM-DD
  status: "To Be Reviewed" | "Additional Request" | "Approved" | "Decline";
  fileSize?: string;
  fileType?: string;
  brokerId?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
}

// ------------------------------------------------------------------------------
// INITIAL SUBMITTED DOCUMENTS FOR REVIEW
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// INITIAL AUDIT LOG HISTORY
// ------------------------------------------------------------------------------
