"use client";

import React from "react";
import { useBroker } from "../BrokerContext";
import { useRouter } from "next/navigation";
import ApplicationsTab from "./ApplicationsTab";

export default function BrokerApplicationsPage() {
  const { clients, applications, setApplications, setClients, setAutoCompose } = useBroker();
  const router = useRouter();

  return (
    <ApplicationsTab
      clients={clients}
      applications={applications}
      setApplications={setApplications}
      setClients={setClients}
      onSendEmail={() => {
        setAutoCompose(true);
        router.push("/broker/communication");
      }}
      variant="broker"
    />
  );
}
