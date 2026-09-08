/**
 * ==============================================================================
 * MAIN ROUTE PAGE: /broker
 * Path: src/app/broker/page.tsx
 * Description: Redirects root portal access to the dashboard page.
 * ==============================================================================
 */

import { redirect } from "next/navigation";

export default function BrokerPortalPage() {
  redirect("/broker/dashboard");
}
