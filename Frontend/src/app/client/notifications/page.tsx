"use client";

import React from "react";
import { useClient } from "../ClientContext";
import NotificationsTab from "@/components/NotificationsTab";

export default function ClientNotificationsPage() {
  const { notifications } = useClient();

  return (
    <NotificationsTab
      notifications={notifications}
      variant="client"
    />
  );
}
