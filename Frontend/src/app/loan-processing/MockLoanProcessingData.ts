/**
 * ==============================================================================
 * FILE: MockLoanProcessingData.ts
 * Path: src/app/loan-processing/MockLoanProcessingData.ts
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
export const initialSubmittedDocs: SubmittedDocument[] = [
  {
    id: "doc-1",
    clientName: "Alice Smith",
    loanType: "Refinance Loan",
    documentName: "Government ID (Driver License)",
    dateSubmitted: "2026-08-24",
    status: "To Be Reviewed",
    fileSize: "1.2 MB",
    fileType: "PDF"
  },
  {
    id: "doc-2",
    clientName: "Michael Brown",
    loanType: "Investment Property Loan",
    documentName: "Tax Documents (2025 Returns)",
    dateSubmitted: "2026-08-24",
    status: "To Be Reviewed",
    fileSize: "2.8 MB",
    fileType: "PDF"
  },
  {
    id: "doc-3",
    clientName: "Emma Wilson",
    loanType: "Construction Loan",
    documentName: "Bank Statement (Westpac Savings)",
    dateSubmitted: "2026-08-23",
    status: "Additional Request",
    fileSize: "4.1 MB",
    fileType: "PDF"
  },
  {
    id: "doc-4",
    clientName: "Sophia Martinez",
    loanType: "Land Only Loan",
    documentName: "Proof of Income (Payslips)",
    dateSubmitted: "2026-08-22",
    status: "Decline",
    fileSize: "950 KB",
    fileType: "PDF"
  },
  {
    id: "doc-5",
    clientName: "David Lee",
    loanType: "First Home Buyer Loan",
    documentName: "Employment Documents (LOE)",
    dateSubmitted: "2026-08-21",
    status: "Approved",
    fileSize: "550 KB",
    fileType: "PDF"
  },
  {
    id: "doc-6",
    clientName: "Alice Smith",
    loanType: "Refinance Loan",
    documentName: "Bank Statement (ANZ Savings)",
    dateSubmitted: "2026-08-24",
    status: "Approved",
    fileSize: "3.4 MB",
    fileType: "PDF"
  }
];

// ------------------------------------------------------------------------------
// INITIAL AUDIT LOG HISTORY
// ------------------------------------------------------------------------------
export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-1",
    action: "Approved Bank Statement (ANZ Savings) for Alice Smith",
    date: "2026-08-24",
    time: "10:30 AM"
  },
  {
    id: "audit-2",
    action: "Declined Proof of Income (Payslips) for Sophia Martinez (expired document)",
    date: "2026-08-23",
    time: "02:15 PM"
  },
  {
    id: "audit-3",
    action: "Requested Additional Info (Westpac Statement) for Emma Wilson",
    date: "2026-08-23",
    time: "11:00 AM"
  },
  {
    id: "audit-4",
    action: "Approved Employment Documents (LOE) for David Lee",
    date: "2026-08-21",
    time: "03:45 PM"
  }
];
