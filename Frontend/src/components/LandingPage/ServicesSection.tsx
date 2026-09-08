"use client";

/**
 * ==============================================================================
 * COMPONENT: ServicesSection.tsx
 * Section: Core Loan & Brokerage Services Grid with Paginated Dot Navigation
 * Location: src/components/LandingPage/ServicesSection.tsx
 * ==============================================================================
 * Features:
 *  - Styled in Navy Blue (#0B2369)
 *  - Displays service cards horizontally from left to right (3 cards per view)
 *  - Paginated dot navigation (Dot 1, Dot 2, Dot 3, Dot 4 + Prev/Next controls)
 *  - Category filter tabs
 */

import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ServiceItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  category: "HOME LOANS" | "REFINANCING" | "INVESTMENT" | "PERSONAL";
  tabId: "home" | "refinance" | "investment" | "personal";
}

export default function ServicesSection() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(0);

  const CARDS_PER_PAGE = 3;

  const services: ServiceItem[] = [
    {
      id: "first-home-buyer",
      badge: "PURCHASE & DEPOSIT",
      title: "First Home Buyer",
      description:
        "From pre-approval to settlement, we guide first-time buyers through every step, structuring the loan around what you can genuinely afford.",
      category: "HOME LOANS",
      tabId: "home",
    },
    {
      id: "construction-loans",
      badge: "BUILDING & PROGRESS",
      title: "Construction Loans",
      description:
        "Progress payments, staged draws and a lender that understands construction. We make building your home work on paper.",
      category: "HOME LOANS",
      tabId: "home",
    },
    {
      id: "upgraders",
      badge: "MOVE UP",
      title: "Home Loans for Upgraders",
      description:
        "Selling and upgrading? We coordinate the numbers so your next home fits alongside the one you're leaving.",
      category: "HOME LOANS",
      tabId: "home",
    },
    {
      id: "rate-reduction",
      badge: "LOWER PAYMENTS",
      title: "Rate Reduction",
      description:
        "We compare your current rate against the market and switch lenders when it genuinely saves you money.",
      category: "REFINANCING",
      tabId: "refinance",
    },
    {
      id: "equity-release",
      badge: "CASH OUT",
      title: "Equity Release",
      description:
        "Unlock the equity in your home for renovations, investments or debt consolidation, safely and structurally.",
      category: "REFINANCING",
      tabId: "refinance",
    },
    {
      id: "debt-consolidation",
      badge: "SIMPLIFY",
      title: "Debt Consolidation",
      description:
        "Combine multiple debts into one home loan with one payment, planned around your long-term position.",
      category: "REFINANCING",
      tabId: "refinance",
    },
    {
      id: "property-investment",
      badge: "STRUCTURE & GROWTH",
      title: "Property Investment",
      description:
        "Investment-grade structuring with deposits, interest-only options and lenders who understand property investors.",
      category: "INVESTMENT",
      tabId: "investment",
    },
    {
      id: "smsf-business",
      badge: "COMPLEX STRUCTURING",
      title: "SMSF & Business",
      description:
        "SMSF borrowing and business lending that needs a specialist touch and the right lender relationship.",
      category: "INVESTMENT",
      tabId: "investment",
    },
    {
      id: "cross-collateralisation",
      badge: "MULTI-PROPERTY",
      title: "Cross-Collateralisation",
      description:
        "Multiple properties, one strategy. We structure your portfolio so each asset works for the next.",
      category: "INVESTMENT",
      tabId: "investment",
    },
    {
      id: "personal-loans",
      badge: "FLEXIBLE LENDING",
      title: "Personal Loans",
      description:
        "Flexible personal lending for big purchases, planned around what you can genuinely afford to repay.",
      category: "PERSONAL",
      tabId: "personal",
    },
    {
      id: "car-vehicle-loans",
      badge: "DRIVE AWAY",
      title: "Car & Vehicle Loans",
      description:
        "New or used, we compare vehicle finance across lenders to find terms that fit your budget.",
      category: "PERSONAL",
      tabId: "personal",
    },
    {
      id: "guarantor-loans",
      badge: "SHARED SUPPORT",
      title: "Guarantor Loans",
      description:
        "A guarantor structure can get you into the market sooner. We explain exactly what it means for everyone.",
      category: "PERSONAL",
      tabId: "personal",
    },
  ];

  const filteredServices =
    activeTab === "all"
      ? services
      : services.filter((s) => s.tabId === activeTab);

  const totalPages = Math.ceil(filteredServices.length / CARDS_PER_PAGE);

  const displayedServices = filteredServices.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentPage(0);
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev + 1 < totalPages ? prev + 1 : 0));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev - 1 >= 0 ? prev - 1 : totalPages - 1));
  };

  return (
    <section id="services" className="py-24 bg-slate-50/70 border-t border-slate-200/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SUB-SECTION 1: SECTION HEADER & CATEGORY BADGE */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[#0B2369] text-xs font-extrabold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0B2369]" />
            <span>OUR SERVICES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B2369] tracking-tight leading-tight mb-4">
            Services built for{" "}
            <span className="text-amber-500 font-extrabold">Australian & PH</span>{" "}
            borrowers.
          </h2>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Broker-led loan preparation and live tracking tailored around your genuine borrowing needs.
          </p>
        </div>

        {/* SUB-SECTION 2: FILTER TABS BAR */}
        <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-3 mb-12">
          <button
            onClick={() => handleTabChange("all")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === "all"
                ? "bg-[#0B2369] text-white shadow-md shadow-[#0B2369]/20 scale-[1.02]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs"
            }`}
          >
            All Services ({services.length})
          </button>

          <button
            onClick={() => handleTabChange("home")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === "home"
                ? "bg-[#0B2369] text-white shadow-md shadow-[#0B2369]/20 scale-[1.02]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs"
            }`}
          >
            Home Loans
          </button>

          <button
            onClick={() => handleTabChange("refinance")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === "refinance"
                ? "bg-[#0B2369] text-white shadow-md shadow-[#0B2369]/20 scale-[1.02]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs"
            }`}
          >
            Refinancing
          </button>

          <button
            onClick={() => handleTabChange("investment")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === "investment"
                ? "bg-[#0B2369] text-white shadow-md shadow-[#0B2369]/20 scale-[1.02]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs"
            }`}
          >
            Investment
          </button>

          <button
            onClick={() => handleTabChange("personal")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeTab === "personal"
                ? "bg-[#0B2369] text-white shadow-md shadow-[#0B2369]/20 scale-[1.02]"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-xs"
            }`}
          >
            Personal & Vehicle
          </button>
        </div>

        {/* SUB-SECTION 3: HORIZONTAL DISPLAY (3 CARDS AT A TIME FROM LEFT TO RIGHT) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 min-h-[380px]">
          {displayedServices.map((service) => (
            <div
              key={service.id}
              className="group bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 hover:border-[#0B2369]/50 shadow-xs hover:shadow-soft-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200/60 text-amber-900 text-[10px] font-extrabold tracking-wider uppercase">
                    {service.badge}
                  </span>
                  <Link
                    href="#book"
                    className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#0B2369] transition-colors"
                    aria-label={`Inquire about ${service.title}`}
                  >
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <h3 className="text-xl font-bold text-[#0B2369] mb-3 group-hover:text-[#071644] transition-colors">
                  {service.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  {service.category}
                </span>
                <Link
                  href="#book"
                  className="text-xs font-bold text-[#0B2369] hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span>Inquire</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* SUB-SECTION 4: DOT NAVIGATION & CONTROLS */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            <button
              onClick={handlePrevPage}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0B2369] hover:border-[#0B2369]/40 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs"
              aria-label="Previous services page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`transition-all duration-300 ${
                    currentPage === index
                      ? "w-8 h-2.5 bg-[#0B2369] rounded-full shadow-xs"
                      : "w-2.5 h-2.5 bg-slate-300 hover:bg-slate-400 rounded-full"
                  }`}
                  aria-label={`Go to services slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNextPage}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-[#0B2369] hover:border-[#0B2369]/40 hover:bg-slate-50 flex items-center justify-center transition-all shadow-xs"
              aria-label="Next services page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
