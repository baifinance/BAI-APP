"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useClientData } from "../ClientContext";
import { PageSkeleton } from "@/components/Skeleton";

const LoanStatusTab = dynamic(() => import("./LoanStatusTab"), {
  loading: () => <PageSkeleton rows={6} />,
});

export default function ClientLoanStatusPage() {
  const { client, handleLogAction, loading } = useClientData();

  if (loading) return <PageSkeleton rows={6} />;

  return <LoanStatusTab client={client} onLogAction={handleLogAction} />;
}
