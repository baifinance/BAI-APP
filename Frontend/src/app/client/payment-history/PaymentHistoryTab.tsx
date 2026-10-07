/**
 * ==============================================================================
 * COMPONENT: PaymentHistoryTab.tsx
 * Path: src/app/client/payment-history/PaymentHistoryTab.tsx
 * Description: Client Payment History tab.
 *
 * NOTE: The backend exposes no payment/offset-ledger endpoint yet (the
 * `communications` app is model-only), so this tab renders an explicit empty
 * state instead of placeholder data. When an endpoint lands, fetch it here.
 * ==============================================================================
 */

"use client";

import React from "react";
import { Receipt, ShieldCheck } from "lucide-react";

export default function PaymentHistoryTab() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Payment History</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit offset account ledger statement logs and payments clearings.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0024A8]/5 border border-[#0024A8]/10 px-4 py-2 rounded-2xl self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-[#0024A8]" />
          <span className="text-xs font-bold text-slate-600">
            Total Account Balance: <strong className="text-[#0024A8]">—</strong>
          </span>
        </div>
      </div>

      {/* Empty state — no ledger endpoint available yet */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl p-10 sm:p-14 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1.5">
          No Payment History Yet
        </h3>
        <p className="text-sm font-medium text-slate-500 max-w-md mx-auto">
          Your offset account transactions will appear here once they are available.
        </p>
      </div>
    </div>
  );
}
