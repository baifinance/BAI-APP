"use client";

import React from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const CalculatorsTab = dynamic(() => import("@/components/CalculatorsTab"), { loading: () => <LoadingSkeleton /> });

export default function BrokerCalculatorPage() {
  return <CalculatorsTab variant="broker" />;
}
