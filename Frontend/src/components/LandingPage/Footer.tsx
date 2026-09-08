"use client";

/**
 * ==============================================================================
 * COMPONENT: Footer.tsx
 * Section: Top CTA Banner & Main Footer Bar (Navy Blue Design)
 * Location: src/components/LandingPage/Footer.tsx
 * ==============================================================================
 * Reworked footer strictly in Navy Blue (#0B2369 / #071644).
 * Features:
 *  - Top Callout Banner: "Ready to talk? Let's find your friend in finance."
 *  - Main Footer: Logo, description, contact details (phone, email, locations)
 *  - Service links, Company links, copyright & security tags
 */

import Link from "next/link";
import { Calendar, Mail, Phone, MapPin, Building2 } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full">
      
      {/* ==================================================================== */}
      {/* PART 1: TOP CALLOUT BANNER (Navy Blue #0B2369)                      */}
      {/* ==================================================================== */}
      <div className="bg-[#0B2369] text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Banner Heading with Underlined "friend" */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-2xl text-center md:text-left">
            Ready to talk? Let's find your{" "}
            <span className="underline decoration-amber-400 decoration-4 underline-offset-4">
              friend
            </span>{" "}
            in finance.
          </h2>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
            {/* White CTA Button */}
            <Link
              href="#book"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-[#0B2369] bg-white hover:bg-slate-100 shadow-lg transition-all duration-200"
            >
              <Calendar className="w-4 h-4" />
              <span>Book a consultation</span>
            </Link>

            {/* Outline CTA Button */}
            <Link
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white border border-white/40 hover:bg-white/10 transition-all duration-200"
            >
              <Mail className="w-4 h-4" />
              <span>Contact us</span>
            </Link>
          </div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* PART 2: MAIN FOOTER CONTENT BAR (Deep Navy Blue #071644)            */}
      {/* ==================================================================== */}
      <div className="bg-[#071644] text-white pt-16 pb-10 px-4 sm:px-6 lg:px-8 border-t border-[#0B2369]">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-14 border-b border-[#0B2369]">
            
            {/* Column 1: Brand Info & Contact Lines */}
            <div className="md:col-span-6 space-y-5">
              {/* Logo Emblem */}
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-[#0B2369] flex items-center justify-center font-bold shadow-md">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">
                  BAI<span className="text-amber-400">Finance</span>
                </span>
              </Link>

              {/* Description Paragraph */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                A loan brokerage that prepares your application properly and lets you track every step securely, from submission to settlement.
              </p>

              {/* Direct Contact Details */}
              <div className="space-y-2.5 text-xs text-slate-300 font-medium pt-2">
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>+61 0468 884 003</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>info@baifinance.com.au</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Lyndhurst VIC · Cebu City</span>
                </div>
              </div>
            </div>

            {/* Column 2: SERVICES Links */}
            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                SERVICES
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li>
                  <Link href="#services" className="hover:text-white transition-colors">
                    Home Loans
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-white transition-colors">
                    Refinancing
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-white transition-colors">
                    Investment Loans
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-white transition-colors">
                    Personal & Car Loans
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: COMPANY Links */}
            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                COMPANY
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
                <li>
                  <Link href="#about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#services" className="hover:text-white transition-colors">
                    Our Services
                  </Link>
                </li>
                <li>
                  <Link href="#book" className="hover:text-white transition-colors">
                    Book a consultation
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          {/* Copyright & Security Footer Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>
              © 2026 BAI Finance. All rights reserved.
            </div>

            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-white transition-colors">
                Client Portal
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Trust & Security
              </Link>
            </div>
          </div>

        </div>
      </div>

    </footer>
  );
}
