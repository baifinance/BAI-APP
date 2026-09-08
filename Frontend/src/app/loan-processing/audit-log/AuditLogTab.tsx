/**
 * ==============================================================================
 * COMPONENT: AuditLogTab.tsx
 * Path: src/app/loan-processing/audit-log/AuditLogTab.tsx
 * Description: Audit Log tab listing loan processing actions logged
 *              by Marcus Carter, Loan Processing Officer.
 * ==============================================================================
 */

import React, { useState } from "react";
import { Search, ShieldAlert, History } from "lucide-react";
import { AuditLogEntry } from "../MockLoanProcessingData";

interface AuditLogTabProps {
  auditLogs: AuditLogEntry[];
}

export default function AuditLogTab({ auditLogs }: AuditLogTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logs by search query
  const filteredLogs = auditLogs.filter(log => 
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.date.includes(searchQuery) ||
    log.time.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Loan Processing Audit Trail</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Immutable system logs documenting document reviews, approvals, and queries.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/50 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          <History className="w-4 h-4 text-[#1429A9]" />
          <span className="text-xs font-bold text-slate-600">
            Total Log Entries: <strong className="text-[#1429A9]">{auditLogs.length}</strong>
          </span>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by client name, action keyword, date or time..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#1429A9]/30 text-xs font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">Action Done</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-slate-400 font-medium">
                    No matching audit entries found in history logs.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/20 transition-colors">
                    {/* Action Done */}
                    <td className="py-4 px-6 font-bold text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-[#1429A9] shrink-0" />
                        <span>{log.action}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {log.date}
                    </td>

                    {/* Time */}
                    <td className="py-4 px-6 text-right text-slate-600 font-bold">
                      {log.time}
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
