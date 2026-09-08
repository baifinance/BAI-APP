"use client";

import React from "react";
import { useBroker } from "../BrokerContext";
import CommunicationTab from "./CommunicationTab";

export default function BrokerCommunicationPage() {
  const { clients, emails, setEmails, autoCompose, setAutoCompose } = useBroker();

  return (
    <CommunicationTab
      clients={clients}
      emails={emails}
      setEmails={setEmails}
      autoCompose={autoCompose}
      clearAutoCompose={() => setAutoCompose(false)}
    />
  );
}
