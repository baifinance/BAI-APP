"use client";

import React from "react";
import dynamic from "next/dynamic";

const CalculatorsTab = dynamic(() => import("@/components/CalculatorsTab"));

export default function BrokerCalculatorPage() {
  return <CalculatorsTab variant="broker" />;
}
