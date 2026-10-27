/**
 * ==============================================================================
 * ROUTE PAGE: /compliance
 * Path: src/app/compliance/page.tsx
 * Description: Main page for the Compliance portal.
 *              Displays the Users Tab containing the registered users table
 *              and the top-right "Invite User" popup action.
 * ==============================================================================
 */

"use client";

import React from "react";
import UsersTab from "./components/UsersTab";

export default function CompliancePage() {
  return <UsersTab />;
}
