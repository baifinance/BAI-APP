"use client";

import React from "react";
import { useBroker } from "../BrokerContext";
import NotificationsTab from "@/components/NotificationsTab";
import NotificationSettings from "@/components/NotificationSettings";

export default function BrokerNotificationsPage() {
  const { notifications } = useBroker();

  return (
    <div className="space-y-6">
      <NotificationSettings />
      <NotificationsTab
        notifications={notifications}
        variant="broker"
      />
    </div>
  );
}
