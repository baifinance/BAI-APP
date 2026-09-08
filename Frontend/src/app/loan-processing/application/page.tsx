"use client";

import React from "react";
import { useLoanProcessing } from "../LoanProcessingContext";
import ApplicationsTab from "@/app/broker/applications/ApplicationsTab";

export default function LoanProcessingApplicationPage() {
  const { clients, applications, setApplications, setClients } = useLoanProcessing();

  return (
    <ApplicationsTab
      clients={clients}
      applications={applications}
      setApplications={setApplications}
      setClients={setClients}
      onSendEmail={() => {
        alert("Loan processing officers are not authorized to compose or send customer emails directly.");
      }}
      variant="loan_processing"
    />
  );
}
