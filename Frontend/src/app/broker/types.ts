/**
 * ==============================================================================
 * FILE: types.ts
 * Path: src/app/broker/components/types.ts
 * Description: Expanded Static Mock Data & Type Definitions for the Broker Portal.
 * ==============================================================================
 */

export interface ClientProfile {
  fullLegalName: string;
  dob: string;
  placeOfBirth: string;
  nationality: string;
  civilStatus: "Single" | "Married" | "De Facto" | "Divorced" | "Widowed";
  numberOfDependents: number;
  residentialAddress: string;
  address: string;
  previousAddress: string;
  mobile: string;
  email: string;
  visaSubclass?: string;
  visaExpiry?: string;
  visa?: string;
  source?: string;
  inquiry?: string;
  idType: string;
  idNumber: string;
}

export interface ClientLoan {
  loanType: string;
  requestedAmount: number;
  purpose: string;
  preferredTerm: number; // in years
  preferredMonthlyPayment: number;
  urgency: "Low" | "Medium" | "High" | "Critical";
  currentStatus?: string;
}

export interface ClientEmployment {
  status: "Full-Time" | "Part-Time" | "Self-Employed" | "Contractor" | "Unemployed";
  employerBusiness: string;
  position: string;
  yearsEmployed: number;
  monthlyGrossIncome: number;
  monthlyNetIncome: number;
  otherIncome: number;
}

export interface LiabilityItem {
  liabilityType: string;
  creditor: string;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRate: string;
  loanTerm: string;
  remainingTerm: string;
  paymentStatus: "Current" | "Pending" | "Overdue";
}

export interface ClientObligations {
  hasExistingLoans: "Yes" | "No";
  existingLoanAmount: number;
  monthlyDebtPayments: number;
  numExistingLoans: number;
  items?: LiabilityItem[];
}

export interface ClientCollateral {
  hasCollateral: "Yes" | "No";
  collateralType: string;
  description?: string;
  estimatedValue: number;
  appraisedValue?: number;
  location?: string;
  ownership: string;
  condition?: string;
  existingMortgage: string;
  requiredDocuments?: string[];
}

export interface ClientDocuments {
  governmentId: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  proofOfIncome: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  bankStatement: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  taxDocuments: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  employmentDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded";
  businessDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
  collateralDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
  otherDocs: "Uploaded" | "Verified" | "Pending" | "Not Uploaded" | "Not Required";
}

export interface ClientBrokerDetails {
  assignedBroker: string;
  applicationStatus: "Submitted" | "In review" | "Requested" | "Settled" | "Declined" | "Approved";
  brokerNotes: string;
  lenderMatches: string[];
  submittedLenders: string[];
  approvalStatus: "Pre-Approved" | "Conditionally Approved" | "Fully Approved" | "Declined" | "Pending Assessment";
  commission: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  applicationType: string;
  amount: number;
  documentState: "Submitted" | "In review" | "Requested" | "Settled" | "Declined" | "Approved";
  lastActivity: string;
  dateStarted: string; // YYYY-MM-DD
  progress: number; // Client progress percentage 0-100
  notes?: string;

  // Expanded Deep-Dive Details
  profile: ClientProfile;
  loan: ClientLoan;
  employment: ClientEmployment;
  obligations: ClientObligations;
  collateral: ClientCollateral;
  documents: ClientDocuments;
  brokerDetails: ClientBrokerDetails;
}

export interface Application {
  id: string;
  clientName: string;
  clientId: string;
  type: string;
  amount: number;
  progress: number;
  status:
  | "Submitted"
  | "In review"
  | "Action needed"
  | "Approved"
  | "Settled"
  | "Declined"
  | "Pending"
  | "Appointment Booked"
  | "Under Review"
  | "Revisit"
  | "Proceeding"
  | "Collection of Documents"
  | "Assessment"
  | "Docs for Sign"
  | "For Lodgment"
  | "Conditional Approval"
  | "Conversion to Unconditional Approval"
  | "Unconditional Approval"
  | "Settlement"
  | "Withdraw";
  dateCreated: string;
  lender: string;
  details: string;
}

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  brokerName?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  type: string;
  platform: string;
  notes?: string;
}

export interface Email {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  body: string;
  dateSent: string;
  status: "Sent" | "Delivered";
}

// ------------------------------------------------------------------------------
// STATIC CLIENT DATA (Detailed profile information)
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// STATIC APPLICATION DATA (Stats matching screenshot 2)
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// STATIC BOOKINGS DATA
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// STATIC EMAIL DATA
// ------------------------------------------------------------------------------
