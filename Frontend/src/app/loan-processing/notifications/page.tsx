"use client";

import React from "react";
import { useLoanProcessing } from "../LoanProcessingContext";
import NotificationsTab from "@/components/NotificationsTab";

export default function LoanProcessingNotificationsPage() {
  const { notifications } = useLoanProcessing();

  return (
    <NotificationsTab
      notifications={notifications}
      variant="loan_processing"
    />
  );
}
