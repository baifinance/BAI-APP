"use client";

/**
 * ==============================================================================
 * COMPONENT: LenderTicker.tsx
 * Section: Partner Lenders Marquee / Logo Bar
 * Location: src/components/LandingPage/LenderTicker.tsx
 * ==============================================================================
 * Features:
 *  - Displays major partner banks (ANZ, CommBank, Westpac, NAB, etc.)
 *  - Styled with Navy Blue accents (#0B2369)
 */

export default function LenderTicker() {
  const lenders = [
    { name: "ANZ", label: "Australia & New Zealand Bank" },
    { name: "CommBank", label: "Commonwealth Bank" },
    { name: "Westpac", label: "Westpac Banking Corporation" },
    { name: "NAB", label: "National Australia Bank" },
    { name: "AMP Bank", label: "AMP Australia" },
    { name: "Macquarie", label: "Macquarie Bank" },
    { name: "Suncorp", label: "Suncorp Bank" },
    { name: "St.George", label: "St.George Bank" },
  ];

  return (
    <div className="bg-white border-y border-slate-200/80 py-6 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          
          <div className="shrink-0 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#0B2369]" />
            <span>WE WORK WITH LEADING LENDERS</span>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar w-full">
            <div className="flex items-center justify-between md:justify-around gap-8 min-w-max">
              {lenders.map((lender, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 group cursor-default"
                >
                  <span className="text-base sm:text-lg font-extrabold text-slate-400 group-hover:text-[#0B2369] transition-colors tracking-tight">
                    {lender.name}
                  </span>
                </div>
              ))}
              <span className="text-xs font-semibold text-[#0B2369] bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                and 30+ more lenders
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
