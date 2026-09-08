"use client";

import React from "react";
import { useClient } from "../ClientContext";
import PaymentHistoryTab from "./PaymentHistoryTab";

export default function ClientPaymentHistoryPage() {
  const { transactions } = useClient();

  return <PaymentHistoryTab transactions={transactions} />;
}
