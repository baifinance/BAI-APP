/**
 * ==============================================================================
 * COMPONENT: PaymentHistoryTab.tsx
 * Path: src/app/client/payment-history/PaymentHistoryTab.tsx
 * Description: Client Payment History log listing offset account activity ledger.
 * ==============================================================================
 */

import React, { useState } from "react";
import { Search, DollarSign, ArrowUpRight, ArrowDownLeft, ShieldCheck } from "lucide-react";
import { Transaction } from "../MockClientData";

interface PaymentHistoryTabProps {
  transactions: Transaction[];
}

export default function PaymentHistoryTab({ transactions }: PaymentHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logs
  const filteredTx = transactions.filter(tx =>
    tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tx.date.includes(searchQuery)
  );

  // Format currency helper
  const formatCurrency = (val: number) => {
    return `A$ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Payment History</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Audit offset account ledger statement logs and payments clearings.
          </p>
        </div>

        {/* Total balance info */}
        <div className="flex items-center gap-2 bg-[#0024A8]/5 border border-[#0024A8]/10 px-4 py-2 rounded-2xl self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-[#0024A8]" />
          <span className="text-xs font-bold text-slate-600">
            Total Account Balance: <strong className="text-[#0024A8]">{formatCurrency(500000)}</strong>
          </span>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment history by keyword or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 text-xs font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Balance</th>
                <th className="py-4 px-6 text-right">Cleared Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-semibold">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No payment history logs found.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/20 transition-colors">
                    {/* Description with In/Out arrow */}
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.amount >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                        }`}>
                          {tx.amount >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                        </div>
                        <span>{tx.description}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {tx.date}
                    </td>

                    {/* Amount */}
                    <td className={`py-4 px-6 font-extrabold ${tx.amount >= 0 ? "text-emerald-600" : "text-slate-800"}`}>
                      {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                    </td>

                    {/* Running balance */}
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {formatCurrency(tx.balance)}
                    </td>

                    {/* Cleared status */}
                    <td className="py-4 px-6 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        tx.status === "Cleared"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
