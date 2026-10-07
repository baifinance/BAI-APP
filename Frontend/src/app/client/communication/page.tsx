"use client";

import React from "react";
import dynamic from "next/dynamic";
import { InboxSkeleton } from "@/components/Skeleton";

const CommunicationTab = dynamic(() => import("./CommunicationTab"), {
  loading: () => <InboxSkeleton />,
});

export default function ClientCommunicationPage() {
  return <CommunicationTab />;
}
