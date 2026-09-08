"use client";

import React from "react";
import { useClient } from "../ClientContext";
import ProfileTab from "./ProfileTab";

export default function ClientProfilePage() {
  const { client, setClient, handleLogAction } = useClient();

  return (
    <ProfileTab
      client={client}
      setClient={setClient}
      onLogAction={handleLogAction}
    />
  );
}
