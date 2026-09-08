"use client";

/**
 * ==============================================================================
 * COMPONENT: Hero.tsx
 * Section: Main Hero Banner & Visual Showcase
 * Location: src/components/LandingPage/Hero.tsx
 * ==============================================================================
 * Features:
 *  - Left Column: Country badges, main headline, subtitle, CTAs, 3 feature pills
 *  - Right Column: Singular photo container placeholder + 4 floating card overlays
 *  - Color Palette: Styled strictly in Navy Blue (#0B2369)
 */

import Link from "next/link";
import {
  Calendar,
  Lock,
  CheckCircle2,
  Users,
  ShieldCheck,
  Activity,
  ArrowRight,
  Building2,
  Award,
  Image as ImageIcon
} from "lucide-react";

export default function Hero() {
  return (
    <section id="home" className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-slate-50">
      
      {/* BACKGROUND DECORATIVE GLOWS & RINGS */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-radial-glow pointer-events-none opacity-80" />
      <div className="absolute top-10 right-[-100px] w-[500px] h-[500px] rounded-full border border-slate-200/60 pointer-events-none" />
      <div className="absolute top-28 right-[-50px] w-[350px] h-[350px] rounded-full border border-slate-200/40 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: HERO CONTENT & TYPOGRAPHY */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            
            {/* Country Badges */}
            <div className="inline-flex items-center gap-2 p-1.5 pr-4 bg-white rounded-full shadow-xs border border-slate-200/80 mb-6">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-[#0B2369] rounded-full text-xs font-bold tracking-wide uppercase">
                <span className="text-sm">🇦🇺</span>
                <span>AUSTRALIA</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-[#0B2369] rounded-full text-xs font-bold tracking-wide uppercase">
                <span className="text-sm">🇵🇭</span>
                <span>PHILIPPINES</span>
              </div>
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block">
                LOAN BROKERAGE
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B2369] tracking-tight leading-[1.12] mb-6">
              A friend in finance, from first home to{" "}
              <span className="relative inline-block text-[#0B2369]">
                settled
                <span className="absolute bottom-1 left-0 w-full h-[6px] bg-amber-400 rounded-full" />
              </span>
              .
            </h1>

            {/* Subtitle Description */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed mb-8 max-w-xl">
              We prepare your loan application properly and let you track every step, from submission to settlement.
            </p>

            {/* Call To Action (CTA) Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-10">
              <Link
                href="#book"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-white bg-[#0B2369] hover:bg-[#071644] shadow-lg shadow-[#0B2369]/20 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Calendar className="w-5 h-5" />
                <span>Book a consultation</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                href="#portal"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold text-[#0B2369] bg-white hover:bg-slate-100 border-2 border-[#0B2369]/20 shadow-xs transition-all duration-200 hover:-translate-y-0.5"
              >
                <Lock className="w-5 h-5 text-[#0B2369]" />
                <span>Track your application</span>
              </Link>
            </div>

            {/* 3 Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-slate-200/70 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Broker-led, not DIY</h4>
                  <p className="text-[11px] text-slate-500">Built on trust</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-slate-200/70 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">No public sign-up</h4>
                  <p className="text-[11px] text-slate-500">Secure client access</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 border border-slate-200/70 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#0B2369] flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Tracked live in portal</h4>
                  <p className="text-[11px] text-slate-500">Real-time status</p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: VISUAL CONTAINER & FLOATING CARDS STACK */}
          <div className="lg:col-span-6 relative flex justify-center items-center py-6">
            
            <div className="relative w-full max-w-[540px] aspect-[4/3.8] sm:aspect-[4/3.4]">
              
              {/* SINGULAR PHOTO CONTAINER PLACEHOLDER */}
              <div className="w-full h-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/80 border-2 border-dashed border-[#0B2369]/30 shadow-soft-xl relative flex flex-col items-center justify-center p-8 transition-all duration-300">
                <div className="absolute inset-0 bg-grid-pattern opacity-40" />

                <div className="relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-white/80 backdrop-blur-xs border border-white/80 max-w-xs shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 text-[#0B2369] flex items-center justify-center mb-3 shadow-inner">
                    <ImageIcon className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <span className="text-xs font-bold tracking-wider text-[#0B2369] uppercase mb-1">
                    Singular Photo Container
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-normal">
                    Reserved container for primary hero showcase image.
                  </p>
                </div>
              </div>

              {/* FLOATING CARD 1: Top Floating Badge */}
              <div className="absolute -top-4 left-6 sm:left-10 z-20 animate-float">
                <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg text-slate-800">
                  <div className="w-7 h-7 rounded-full bg-[#0B2369] text-white flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#0B2369]">Bai means friend</span>
                </div>
              </div>

              {/* FLOATING CARD 2: Overlay Dark Navy Blue Card */}
              <div className="absolute top-12 -right-3 sm:-right-6 z-20 w-[240px] sm:w-[270px] bg-[#071644]/95 backdrop-blur-md rounded-2xl p-4 text-white shadow-2xl border border-[#0B2369]/60 animate-float-delayed">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700/80 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                    WE HANDLE. YOU FOCUS.
                  </h3>
                  <div className="flex gap-1 text-xs">
                    <span>🇦🇺</span>
                    <span>🇵🇭</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs">
                  <li className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Home Loans</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Refinancing</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Investment Loans</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Personal & Car Loans</span>
                  </li>
                </ul>
              </div>

              {/* FLOATING CARD 3: Portal Status Card */}
              <div className="absolute -bottom-6 left-2 sm:-left-6 z-20 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xl w-[250px] sm:w-[280px]">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B2369] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      HOME LOAN · SUBMITTED
                    </span>
                    <span className="text-xl font-extrabold text-[#0B2369] tracking-tight">
                      $640,000
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-[#0B2369] text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0B2369] animate-pulse" />
                    Approved
                  </span>
                  <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0B2369]" />
                    Tracked live
                  </span>
                </div>
              </div>

              {/* FLOATING CARD 4: Bottom Floating Badge */}
              <div className="absolute -bottom-4 right-4 sm:right-8 z-20">
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-400 text-[#0B2369] font-bold text-xs shadow-md border border-amber-300">
                  <Award className="w-4 h-4 text-[#0B2369]" />
                  <span>Australian & PH Expertise</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
