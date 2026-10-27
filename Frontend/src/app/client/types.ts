/**
 * Shared client-portal types.
 *
 * These replace the previous mock models (`MockClientData.ts` and the broker
 * portal's `Client`). All values are resolved from the backend:
 *   - identity/profile  -> usersApi.getProfile() (in-memory React Query cache)
 *   - loan status       -> loansApi.getCurrentStatus()
 *   - bookings/slots    -> bookingsApi / slotsApi
 */

export interface ClientProfileFields {
  fullLegalName: string;
  dob: string;
  email: string;
  mobile: string;
  address: string;
  residentialAddress: string;
  visaSubclass: string;
  visaExpiry: string;
  visa: string;
  source: string;
  inquiry: string;
  nationality: string;
}

export interface LoanStatusHistoryEntry {
  status: string;
  changed_at: string;
}

export interface ClientApplication {
  id: string;
  asanaProjectGid?: string | null;
  asanaProjectName?: string | null;
  asanaTaskGid?: string | null;
  asanaTaskName?: string | null;
  amount?: number | null;
  status?: string;
  asanaStatus?: string | null;
  asanaStatusHistory?: LoanStatusHistoryEntry[];
  asanaCreatedAt?: string | null;
  asanaSyncedAt?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientLoanFields {
  requestedAmount?: number;
  purpose: string;
  currentStatus?: string;
  statusHistory?: LoanStatusHistoryEntry[];
}

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  profile: ClientProfileFields;
  loan: ClientLoanFields;
  applications: ClientApplication[];
  selectedApplicationId: string | null;
}

export function emptyClient(): ClientData {
  return {
    id: "",
    name: "",
    email: "",
    phone: "",
    profile: {
      fullLegalName: "",
      dob: "",
      email: "",
      mobile: "",
      address: "",
      residentialAddress: "",
      visaSubclass: "",
      visaExpiry: "",
      visa: "",
      source: "",
      inquiry: "",
      nationality: "",
    },
    loan: {
      requestedAmount: undefined,
      purpose: "",
      currentStatus: undefined,
      statusHistory: [],
    },
    applications: [],
    selectedApplicationId: null,
  };
}

/** Raw Asana task description fields surfaced at login. */
export interface AsanaProfile {
  fullname?: string;
  dob?: string;
  email?: string;
  address?: string;
  mobile?: string;
  visa_subclass?: string;
  visa_expiry?: string;
  visa?: string;
  loan_amount?: string;
  goal?: string;
  source?: string;
  inquiry?: string;
  loan_status?: string;
}

/** A broker email shown in the client communication inbox. */
export interface BrokerEmail {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  date: string;
  time: string;
  body: string;
  snippet: string;
}

/** A booking as rendered by the client portal. */
export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  brokerName: string;
  date: string;
  time: string;
  type: string;
  platform: string;
  notes?: string;
}
