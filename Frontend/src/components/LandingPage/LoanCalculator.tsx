"use client";

/**
 * ==============================================================================
 * COMPONENT: LoanCalculator.tsx
 * Section: Monthly Loan Repayment Estimator
 * Location: src/components/LandingPage/LoanCalculator.tsx
 * ==============================================================================
 * Features:
 *  - Styled in Navy Blue (#0B2369)
 *  - Interactive sliders for Loan Amount & Interest Rate
 *  - Radio buttons for Loan Term selection (15, 25, 30 Years)
 *  - Real-time monthly repayment calculation box
 */

import { useState } from "react";
import { Calculator, Calendar } from "lucide-react";
import Link from "next/link";

export default function LoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(650000);
  const [interestRate, setInterestRate] = useState(6.15);
  const [loanTerm, setLoanTerm] = useState(30);

  const calculateMonthlyRepayment = () => {
    const r = interestRate / 100 / 12;
    const n = loanTerm * 12;
    if (r === 0) return (loanAmount / n).toFixed(0);
    const monthly = (loanAmount * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    return Math.round(monthly).toLocaleString();
  };

  return (
    <section id="calculator" className="py-20 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SECTION HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-[#0B2369] rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-slate-200">
            <Calculator className="w-3.5 h-3.5" />
            <span>REPAYMENT ESTIMATOR</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#0B2369] tracking-tight mb-3">
            Estimate your monthly repayments
          </h2>
          <p className="text-slate-600 text-sm">
            Quickly estimate your borrowing options before booking your 1-on-1 consultation with our broker team.
          </p>
        </div>

        {/* CALCULATOR INTERFACE CARD */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-soft-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* CONTROLS */}
          <div className="md:col-span-7 space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Loan Amount
                </label>
                <span className="text-lg font-extrabold text-[#0B2369]">
                  ${loanAmount.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="2000000"
                step="25000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B2369]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                <span>$100k</span>
                <span>$1M</span>
                <span>$2M+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Estimated Interest Rate
                </label>
                <span className="text-lg font-extrabold text-[#0B2369]">
                  {interestRate.toFixed(2)}%
                </span>
              </div>
              <input
                type="range"
                min="4.5"
                max="9.0"
                step="0.05"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B2369]"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                <span>4.5%</span>
                <span>6.5%</span>
                <span>9.0%</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Loan Term (Years)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[15, 25, 30].map((term) => (
                  <button
                    key={term}
                    onClick={() => setLoanTerm(term)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      loanTerm === term
                        ? "bg-[#0B2369] text-white border-[#0B2369] shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {term} Years
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CALCULATION RESULT BOX */}
          <div className="md:col-span-5 bg-[#0B2369] rounded-2xl p-6 text-white text-center flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#163691]/20 rounded-full blur-2xl pointer-events-none" />

            <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1 block">
              Estimated Repayment
            </span>
            
            <div className="my-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                ${calculateMonthlyRepayment()}
              </span>
              <span className="text-xs text-slate-300 block mt-1 font-medium">per month</span>
            </div>

            <p className="text-[11px] text-slate-300 mb-6 leading-normal px-2">
              Based on principal & interest over {loanTerm} years at {interestRate}% p.a.
            </p>

            <Link
              href="#book"
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-[#0B2369] font-bold text-xs flex items-center justify-center gap-2 shadow-md"
            >
              <Calendar className="w-4 h-4" />
              <span>Lock in this rate now</span>
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
