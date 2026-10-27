"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useClientData } from "../../ClientContext";
import { PageSkeleton } from "@/components/Skeleton";

const ProfileSettingsTab = dynamic(() => import("./ProfileSettingsTab"), {
  loading: () => <PageSkeleton rows={2} />,
});

export default function ClientProfileSettingsPage() {
  const { client, handleLogAction, loading } = useClientData();

  if (loading) return <PageSkeleton rows={2} />;

  return (
    <ProfileSettingsTab
      client={client}
      onLogAction={handleLogAction}
    />
  );
}
