"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useClientData } from "../ClientContext";
import { ProfileSkeleton } from "@/components/Skeleton";

const ProfileTab = dynamic(() => import("./ProfileTab"), {
  loading: () => <ProfileSkeleton />,
});

export default function ClientProfilePage() {
  const { client, handleLogAction, loading } = useClientData();

  if (loading) return <ProfileSkeleton />;

  return (
    <ProfileTab
      client={client}
      onLogAction={handleLogAction}
    />
  );
}
