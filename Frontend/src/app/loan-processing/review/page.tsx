"use client";

import React from "react";
import { useLoanProcessing } from "../LoanProcessingContext";
import ReviewTab from "./ReviewTab";

export default function LoanProcessingReviewPage() {
  const { submittedDocs, setSubmittedDocs, handleLogAction } = useLoanProcessing();

  return (
    <ReviewTab
      submittedDocs={submittedDocs}
      setSubmittedDocs={setSubmittedDocs}
      onLogAction={handleLogAction}
    />
  );
}
