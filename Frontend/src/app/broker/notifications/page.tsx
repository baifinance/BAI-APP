"use client";

import React from "react";
import { useBroker } from "../BrokerContext";
import NotificationsTab from "@/components/NotificationsTab";

export default function BrokerNotificationsPage() {
  const { notifications } = useBroker();

  return (
    <NotificationsTab
      notifications={notifications}
      variant="broker"
    />
  );
}
