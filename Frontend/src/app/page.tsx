/**
 * ==============================================================================
 * MAIN LANDING PAGE COMPONENT
 * Location: src/app/page.tsx
 * ==============================================================================
 * All primary landing page section components are housed cleanly inside:
 * @/components/LandingPage/
 */

import Header from "@/components/LandingPage/Header";
import Hero from "@/components/LandingPage/Hero";
import LenderTicker from "@/components/LandingPage/LenderTicker";
import ServicesSection from "@/components/LandingPage/ServicesSection";
import HowItWorksSection from "@/components/LandingPage/HowItWorksSection";
import ClientPortalSection from "@/components/LandingPage/ClientPortalSection";
import LoanCalculator from "@/components/LandingPage/LoanCalculator";
import Footer from "@/components/LandingPage/Footer";
import AIChatWidget from "@/components/LandingPage/AIChatWidget";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-600 selection:text-white">
      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 1: DYNAMIC STICKY HEADER (TURNS SOLID BLUE ON SCROLL)           */}
      {/* ---------------------------------------------------------------------- */}
      <Header />

      {/* MAIN BODY CONTENT WRAPPER */}
      <main className="flex-grow">
        {/* -------------------------------------------------------------------- */}
        {/* SECTION 2: HERO BANNER & SINGULAR PHOTO CONTAINER PLACEHOLDER        */}
        {/* -------------------------------------------------------------------- */}
        <Hero />

        {/* -------------------------------------------------------------------- */}
        {/* SECTION 3: 12 BROKER LOAN SERVICES (HORIZONTAL PAGINATED GRID)       */}
        {/* -------------------------------------------------------------------- */}
        <ServicesSection />

        {/* -------------------------------------------------------------------- */}
        {/* SECTION 4: HOW IT WORKS (REPLACES OLD TRACKER BASED ON SCREENSHOT 2)  */}
        {/* -------------------------------------------------------------------- */}
        <HowItWorksSection />

        {/* -------------------------------------------------------------------- */}
        {/* SECTION 5: CLIENT PORTAL ADVANTAGES (ADDED BASED ON SCREENSHOT 3)    */}
        {/* -------------------------------------------------------------------- */}
        <ClientPortalSection />

        {/* -------------------------------------------------------------------- */}
        {/* SECTION 6: REPAYMENT CALCULATOR ESTIMATOR                            */}
        {/* -------------------------------------------------------------------- */}
        <LoanCalculator />
      </main>

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 7: REWORKED FOOTER & CALLOUT BANNER (BASED ON SCREENSHOT 5)    */}
      {/* ---------------------------------------------------------------------- */}
      <Footer />

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 8: LEADING LENDERS TICKER MARQUEE BAR (BELOW FOOTER)           */}
      {/* ---------------------------------------------------------------------- */}
      <LenderTicker />

      {/* ---------------------------------------------------------------------- */}
      {/* SECTION 9: FLOATING A.I CHAT CONVERSATION WIDGET (BOTTOM-RIGHT)       */}
      {/* ---------------------------------------------------------------------- */}
      <AIChatWidget />
    </div>
  );
}
