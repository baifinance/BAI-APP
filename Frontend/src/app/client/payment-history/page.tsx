"use client";

import React from "react";
import { useClientData } from "../ClientContext";
import PaymentHistoryTab from "./PaymentHistoryTab";
import { TableSkeleton } from "@/components/Skeleton";

export default function ClientPaymentHistoryPage() {
  const { loading } = useClientData();

  if (loading) return <TableSkeleton />;

  return <PaymentHistoryTab />;
}
