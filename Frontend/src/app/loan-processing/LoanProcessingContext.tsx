"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  initialSubmittedDocs, 
  initialAuditLogs, 
  SubmittedDocument, 
  AuditLogEntry 
} from "./MockLoanProcessingData";

import { 
  initialClients, 
  initialApplications, 
  Client, 
  Application 
} from "../broker/MockData";

interface LoanProcessingContextType {
  submittedDocs: SubmittedDocument[];
  setSubmittedDocs: React.Dispatch<React.SetStateAction<SubmittedDocument[]>>;
  auditLogs: AuditLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  notifications: Array<{ type: string; message: string; time: string }>;
  setNotifications: React.Dispatch<React.SetStateAction<Array<{ type: string; message: string; time: string }>>>;
  handleLogAction: (actionText: string) => void;
}

const LoanProcessingContext = createContext<LoanProcessingContextType | undefined>(undefined);

export function LoanProcessingProvider({ children }: { children: React.ReactNode }) {
  const [submittedDocs, setSubmittedDocs] = useState<SubmittedDocument[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("new_registrations");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as SubmittedDocument[];
          return [...initialSubmittedDocs, ...parsed];
        } catch (e) {
          console.error("Failed to parse registrations:", e);
        }
      }
    }
    return initialSubmittedDocs;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(initialAuditLogs);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [applications, setApplications] = useState<Application[]>(initialApplications);

  useEffect(() => {
    const newRegs = submittedDocs.filter(doc => doc.id.startsWith("reg-"));
    localStorage.setItem("new_registrations", JSON.stringify(newRegs));
  }, [submittedDocs]);

  const [notifications, setNotifications] = useState([
    { type: "Audit Alert", message: "System audit complete for Alice Smith's folder.", time: "1 hour ago" },
    { type: "Flagged File", message: "Flagged document: Bank statement missing page 3.", time: "2 hours ago" },
    { type: "New Submission", message: "New application submitted by Emma Wilson.", time: "1 day ago" }
  ]);

  const handleLogAction = (actionText: string) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const formattedTime = `${String(now.getHours() % 12 || 12).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

    const newLog: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      action: actionText,
      date: formattedDate,
      time: formattedTime
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  return (
    <LoanProcessingContext.Provider value={{
      submittedDocs,
      setSubmittedDocs,
      auditLogs,
      setAuditLogs,
      clients,
      setClients,
      applications,
      setApplications,
      notifications,
      setNotifications,
      handleLogAction
    }}>
      {children}
    </LoanProcessingContext.Provider>
  );
}

export function useLoanProcessing() {
  const context = useContext(LoanProcessingContext);
  if (!context) {
    throw new Error("useLoanProcessing must be used within a LoanProcessingProvider");
  }
  return context;
}
