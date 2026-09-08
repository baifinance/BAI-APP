/**
 * ==============================================================================
 * MAIN ROUTE PAGE: /client
 * Path: src/app/client/page.tsx
 * Description: Redirects root portal access to the profile page.
 * ==============================================================================
 */

import { redirect } from "next/navigation";

export default function ClientPortalPage() {
  redirect("/client/profile");
}
