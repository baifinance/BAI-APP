"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/Skeleton";

const CalculatorsTab = dynamic(() => import("@/components/CalculatorsTab"), {
  loading: () => <PageSkeleton rows={5} />,
});

export default function ClientCalculatorPage() {
  return <CalculatorsTab variant="client" />;
}
