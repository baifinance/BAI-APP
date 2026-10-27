"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  SubmittedDocument, 
  AuditLogEntry 
} from "./types";

import { 
  Client, 
  Application 
} from "../broker/types";
import { notificationsApi, NotificationApiResponse } from "@/lib/api";

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
  handleLogAction: (actionText: string) => void;
}

const LoanProcessingContext = createContext<LoanProcessingContextType | undefined>(undefined);

type PortalNotification = {
  type: string;
  message: string;
  time: string;
};

function mapNotification(notification: NotificationApiResponse): PortalNotification {
  return {
    type: notification.notification_type,
    message: notification.message,
    time: new Date(notification.created_at).toLocaleString(),
  };
}

export function LoanProcessingProvider({ children }: { children: React.ReactNode }) {
  // Kept in memory only: client PII must not be persisted to localStorage.
  const [submittedDocs, setSubmittedDocs] = useState<SubmittedDocument[]>([]);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  const { data: notifData } = useQuery({
    queryKey: ["loan-processing", "notifications"],
    queryFn: () => notificationsApi.list(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    meta: { persist: false },
  });

  const notifications = useMemo<PortalNotification[]>(
    () => notifData?.map(mapNotification) ?? [],
    [notifData],
  );

  const handleLogAction = useCallback((actionText: string) => {
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
  }, []);

  const contextValue = useMemo<LoanProcessingContextType>(() => ({
    submittedDocs,
    setSubmittedDocs,
    auditLogs,
    setAuditLogs,
    clients,
    setClients,
    applications,
    setApplications,
    notifications,
    handleLogAction,
  }), [
    submittedDocs,
    auditLogs,
    clients,
    applications,
    notifications,
    handleLogAction,
  ]);

  return (
    <LoanProcessingContext.Provider value={contextValue}>
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
