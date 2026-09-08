"use client";

/**
 * ==============================================================================
 * COMPONENT: HowItWorksSection.tsx
 * Section: "HOW IT WORKS" - Simple, transparent, broker-led process
 * Location: src/components/LandingPage/HowItWorksSection.tsx
 * ==============================================================================
 * Replaces old live tracker with Screenshot 2 design in Navy Blue.
 * Features:
 *  - Solid Navy Blue (#0B2369) background banner
 *  - "HOW IT WORKS" pill badge and transparent invite explanation
 *  - 4 process step cards (Talk to broker, Prepare, Submit, Secure invite)
 */

import { Phone, FileText, Send, Mail } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      stepNumber: "01",
      icon: Phone,
      title: "Talk to a broker",
      description:
        "Call us or book a consultation. We listen to your goals and work out what you can afford.",
    },
    {
      stepNumber: "02",
      icon: FileText,
      title: "We prepare your application",
      description:
        "Your broker gathers your details and builds a complete application for the right lender.",
    },
    {
      stepNumber: "03",
      icon: Send,
      title: "We submit on your behalf",
      description:
        "Your broker submits to the lender. You never apply alone or self-submit.",
    },
    {
      stepNumber: "04",
      icon: Mail,
      title: "You get a secure invite",
      description:
        "Our Loan Processing Team verifies your details and emails you an invite to track your application.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0B2369] text-white relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#163691]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#163691]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ==================================================================== */}
        {/* SUB-SECTION 1: SECTION HEADER & INTRO                                */}
        {/* ==================================================================== */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          {/* Centered Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#071644] border border-[#163691] text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-6">
            <span>HOW IT WORKS</span>
          </div>

          {/* Main Title */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Simple, transparent, broker-led
          </h2>

          {/* Sub-headline */}
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            There is no public sign-up. Your account is created by our Loan Processing Team and you are invited by email.
          </p>
        </div>

        {/* ==================================================================== */}
        {/* SUB-SECTION 2: 4 STEP CARDS GRID                                     */}
        {/* ==================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-[#071644]/80 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-[#163691]/60 flex flex-col justify-between hover:bg-[#071644] hover:border-[#1F4BBF]/50 transition-all duration-300 shadow-lg"
              >
                <div>
                  {/* Card Top Row: Step Number & Circle Icon */}
                  <div className="flex items-center justify-between mb-8">
                    <span className="inline-flex items-center justify-center px-3.5 py-1 rounded-full bg-[#0B2369] text-amber-400 text-sm font-extrabold tracking-wider border border-[#163691]">
                      {step.stepNumber}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-[#0B2369] border border-[#163691] text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Step Title */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
