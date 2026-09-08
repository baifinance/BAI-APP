"use client";

/**
 * ==============================================================================
 * COMPONENT: Header.tsx
 * Section: Navigation Header Bar (Sticky/Fixed)
 * Location: src/components/LandingPage/Header.tsx
 * ==============================================================================
 * Features:
 *  - Scroll detection hook (window.scrollY > 20)
 *  - Dynamic styling: Turns solid navy blue (#0B2369) with white text when scrolling down
 *  - Desktop navigation & CTA buttons
 *  - Mobile responsive hamburger menu
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Building2 } from "lucide-react";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#0B2369] text-white shadow-lg py-3.5 border-b border-[#081B52]"
          : "bg-white/90 backdrop-blur-md text-slate-800 py-4 border-b border-slate-100/80 shadow-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* LOGO & BRANDING BLOCK */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md ${
                isScrolled
                  ? "bg-white text-[#0B2369]"
                  : "bg-[#0B2369] text-white"
              }`}
            >
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="flex flex-col">
              <span
                className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                  isScrolled ? "text-white" : "text-[#0B2369]"
                }`}
              >
                BAI<span className={isScrolled ? "text-amber-400" : "text-[#0B2369]"}>Finance</span>
              </span>
              <span
                className={`text-[9px] font-semibold uppercase tracking-widest -mt-1 ${
                  isScrolled ? "text-slate-300" : "text-slate-400"
                }`}
              >
                Philippines & Australia
              </span>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="#home"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isScrolled
                  ? "bg-white/15 text-white font-semibold"
                  : "bg-slate-100 text-[#0B2369] font-semibold"
              }`}
            >
              Home
            </Link>

            <Link
              href="#services"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isScrolled
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-slate-600 hover:text-[#0B2369] hover:bg-slate-50"
              }`}
            >
              Services
            </Link>

            <Link
              href="#how-it-works"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isScrolled
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-slate-600 hover:text-[#0B2369] hover:bg-slate-50"
              }`}
            >
              How It Works
            </Link>

            <Link
              href="#portal"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isScrolled
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-slate-600 hover:text-[#0B2369] hover:bg-slate-50"
              }`}
            >
              Client Portal
            </Link>

            <Link
              href="#calculator"
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                isScrolled
                  ? "text-white/80 hover:text-white hover:bg-white/10"
                  : "text-slate-600 hover:text-[#0B2369] hover:bg-slate-50"
              }`}
            >
              Calculator
            </Link>
          </nav>

          {/* DESKTOP HEADER ACTION BUTTONS */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                isScrolled
                  ? "text-white/90 hover:text-white hover:bg-white/10"
                  : "text-slate-700 hover:text-[#0B2369] hover:bg-slate-100/60"
              }`}
            >
              Client Login
            </Link>

            <Link
              href="#book"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-md ${
                isScrolled
                  ? "bg-white text-[#0B2369] hover:bg-slate-100 shadow-black/10"
                  : "bg-[#0B2369] text-white hover:bg-[#071644] shadow-slate-900/10"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Book a consultation</span>
            </Link>
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isScrolled ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100"
            }`}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* MOBILE DROPDOWN MENU */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden mt-3 pt-3 pb-4 px-2 border-t rounded-2xl flex flex-col gap-2 ${
              isScrolled
                ? "border-[#081B52] bg-[#0B2369] text-white"
                : "border-slate-100 bg-white shadow-xl text-slate-800"
            }`}
          >
            <Link
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-[#0B2369]"
            >
              Home
            </Link>
            <Link
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl font-medium"
            >
              Services
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl font-medium"
            >
              How It Works
            </Link>
            <Link
              href="#portal"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl font-medium"
            >
              Client Portal
            </Link>
            <Link
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl font-medium"
            >
              Calculator
            </Link>
            <div className="pt-2 border-t border-slate-100/20 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-center font-medium border border-slate-200/30 w-full block"
              >
                Client Login
              </Link>
              <Link
                href="#book"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-center font-semibold bg-[#0B2369] text-white flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book a consultation
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
