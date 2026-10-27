"use client";

import React from "react";
import { useLoanProcessing } from "../LoanProcessingContext";
import NotificationsTab from "@/components/NotificationsTab";
import NotificationSettings from "@/components/NotificationSettings";

export default function LoanProcessingNotificationsPage() {
  const { notifications } = useLoanProcessing();

  return (
    <div className="space-y-6">
      <NotificationSettings />
      <NotificationsTab
        notifications={notifications}
        variant="loan_processing"
      />
    </div>
  );
}
