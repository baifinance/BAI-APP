/**
 * ==============================================================================
 * PAGE: /client/profile/settings
 * Path: src/app/client/profile/settings/page.tsx
 * Description: Client Profile Settings Page routing container. Connects the
 *              ProfileSettingsTab component with client context, state, and handlers.
 * ==============================================================================
 */

"use client";

import React from "react";
import { useClient } from "../../ClientContext";
import ProfileSettingsTab from "./ProfileSettingsTab";

export default function ClientProfileSettingsPage() {
  const { client, setClient, handleLogAction } = useClient();

  return (
    <ProfileSettingsTab
      client={client}
      setClient={setClient}
      onLogAction={handleLogAction}
    />
  );
}
