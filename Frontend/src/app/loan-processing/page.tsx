/**
 * ==============================================================================
 * MAIN ROUTE PAGE: /loan-processing
 * Path: src/app/loan-processing/page.tsx
 * Description: Redirects root loan processing portal access to the dashboard.
 * ==============================================================================
 */

import { redirect } from "next/navigation";

export default function LoanProcessingPortalPage() {
  redirect("/loan-processing/dashboard");
}
