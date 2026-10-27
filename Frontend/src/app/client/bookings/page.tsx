"use client";

import React from "react";
import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/Skeleton";

const BookingsTab = dynamic(() => import("./BookingsTab"), {
  loading: () => <PageSkeleton rows={5} />,
});

export default function ClientBookingsPage() {
  return <BookingsTab />;
}
