/**
 * ==============================================================================
 * FILE: MockClientData.ts
 * Path: src/app/client/components/MockClientData.ts
 * Description: Mock Data & Type Definitions for the Client Portal.
 * ==============================================================================
 */

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  balance: number;
  status: "Cleared" | "Pending";
}

export interface ClientMessage {
  id: string;
  sender: "client" | "broker";
  senderName: string;
  text: string;
  timestamp: string; // e.g. "10:15 AM", "Yesterday"
}

// ------------------------------------------------------------------------------
// INITIAL OFFSET ACCOUNT TRANSACTIONS
// ------------------------------------------------------------------------------
export const initialTransactions: Transaction[] = [
  {
    id: "tx-1",
    date: "2026-08-15",
    description: "Monthly Mortgage Interest Charge",
    amount: -3750.00,
    balance: 496250.00,
    status: "Cleared"
  },
  {
    id: "tx-2",
    date: "2026-08-15",
    description: "Mortgage Offset Deposit (Salary credit)",
    amount: 8500.00,
    balance: 500000.00,
    status: "Cleared"
  },
  {
    id: "tx-3",
    date: "2026-08-01",
    description: "Macquarie Bank Offset Fee",
    amount: -15.00,
    balance: 491500.00,
    status: "Cleared"
  },
  {
    id: "tx-4",
    date: "2026-07-28",
    description: "Brokerage Valuation Service Fee Ref",
    amount: -250.00,
    balance: 491515.00,
    status: "Cleared"
  },
  {
    id: "tx-5",
    date: "2026-07-15",
    description: "Monthly Mortgage Interest Charge",
    amount: -3750.00,
    balance: 491765.00,
    status: "Cleared"
  },
  {
    id: "tx-6",
    date: "2026-07-15",
    description: "Mortgage Offset Deposit (Salary credit)",
    amount: 8500.00,
    balance: 495515.00,
    status: "Cleared"
  }
];

// ------------------------------------------------------------------------------
// INITIAL BROKER-CLIENT DISCUSSION THREADS
// ------------------------------------------------------------------------------
export const initialMessages: ClientMessage[] = [
  {
    id: "msg-1",
    sender: "broker",
    senderName: "Sarah Jenkins",
    text: "Hi Emma, I've received your updated bank statement, but page 3 is missing. Could you please upload the full statement so I can forward it to the bank assessors?",
    timestamp: "1 day ago"
  },
  {
    id: "msg-2",
    sender: "client",
    senderName: "Emma Wilson",
    text: "Hi Sarah, my apologies! I will scan and upload the complete PDF of my bank statement right away.",
    timestamp: "Yesterday"
  },
  {
    id: "msg-3",
    sender: "broker",
    senderName: "Sarah Jenkins",
    text: "Perfect! Once that's verified, we will trigger the formal valuation check.",
    timestamp: "Yesterday"
  },
  {
    id: "msg-4",
    sender: "client",
    senderName: "Emma Wilson",
    text: "I also uploaded the certified copy of my ID card. Let me know if that works.",
    timestamp: "2 hours ago"
  }
];

// ------------------------------------------------------------------------------
// INITIAL BROKER EMAILS (Communication and Loan Status feeds)
// ------------------------------------------------------------------------------
export interface BrokerEmail {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  date: string;
  body: string;
  snippet: string;
}

export const initialBrokerEmails: BrokerEmail[] = [
  {
    id: "email-1",
    sender: "Sarah Jenkins",
    senderEmail: "sarah.jenkins@baifinance.com.au",
    subject: "Westpac Statement Page 3 Missing",
    date: "2026-08-23",
    snippet: "Hi Emma, thanks for sending your documents. Upon reviewing your Westpac statement...",
    body: "Hi Emma,\n\nThanks for sending over your mortgage documents. Upon reviewing your Westpac savings statement, it appears that page 3 is missing from the scanned copy. Could you please scan and upload the complete PDF through your client hub under the Bank Statement checklist category?\n\nOnce received, I will attach it to the file and submit it straight to the Macquarie Bank assessors. Let me know if you have any trouble uploading it.\n\nRegards,\nSarah Jenkins\nSenior Mortgage Broker\nBAI Finance"
  },
  {
    id: "email-2",
    sender: "Sarah Jenkins",
    senderEmail: "sarah.jenkins@baifinance.com.au",
    subject: "Initial Assessment Completed - Conditional LVR Approved",
    date: "2026-08-21",
    snippet: "Dear Emma, I have completed the initial assessment of your construction mortgage...",
    body: "Dear Emma,\n\nI have completed the initial assessment of your construction mortgage application. Based on your deposit contribution of A$500,000 and strong salary stream, you qualify for a conditional LVR of 60.00% at an assumed interest rate of 5.85% p.a.\n\nPlease review the checklist in your client hub and upload your primary Government ID and Tax Documents so we can proceed with the formal valuation check.\n\nBest regards,\nSarah Jenkins\nSenior Mortgage Broker\nBAI Finance"
  },
  {
    id: "email-3",
    sender: "Sarah Jenkins",
    senderEmail: "sarah.jenkins@baifinance.com.au",
    subject: "Welcome to BAI Finance - Client Portal Activated",
    date: "2026-08-19",
    snippet: "Hi Emma, welcome to BAI Finance! My name is Sarah Jenkins, and I will be...",
    body: "Hi Emma,\n\nWelcome to BAI Finance! My name is Sarah Jenkins, and I will be your designated mortgage broker. I will guide you step-by-step through your construction loan pre-approval process.\n\nYour secure client portal has now been activated. Please log in to complete your profile checklist and upload the requested initial files. Let me know if you have any questions.\n\nRegards,\nSarah Jenkins\nSenior Mortgage Broker\nBAI Finance"
  }
];
