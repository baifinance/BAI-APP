"use client";

import React from "react";
import { useLoanProcessing } from "../LoanProcessingContext";
import AuditLogTab from "./AuditLogTab";

export default function LoanProcessingAuditLogPage() {
  const { auditLogs } = useLoanProcessing();

  return <AuditLogTab auditLogs={auditLogs} />;
}
