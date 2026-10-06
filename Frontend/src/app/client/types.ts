/**
 * ==============================================================================
 * FILE: types.ts
 * Path: src/app/client/components/types.ts
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
// ------------------------------------------------------------------------------
// INITIAL BROKER-CLIENT DISCUSSION THREADS
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// INITIAL BROKER EMAILS (Communication and Loan Status feeds)
// ------------------------------------------------------------------------------
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
