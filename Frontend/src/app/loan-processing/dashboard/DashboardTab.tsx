/**
 * ==============================================================================
 * COMPONENT: DashboardTab.tsx
 * Path: src/app/loan-processing/dashboard/DashboardTab.tsx
 * Description: Loan Processing Dashboard displaying document analytics cards,
 *              recently submitted files list table, calendar range filter,
 *              and date-grouped audit logs with collapse controls.
 * ==============================================================================
 */

import React, { useState, useEffect } from "react";
import { FileSearch, CheckCircle, FileWarning, HelpCircle, ChevronLeft, ChevronRight, Bell, CalendarClock, AlertTriangle } from "lucide-react";
import { SubmittedDocument, AuditLogEntry } from "../MockLoanProcessingData";
import { useLoanProcessing } from "../LoanProcessingContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardTab() {
  const { submittedDocs, auditLogs } = useLoanProcessing();
  const router = useRouter();

  // ------------------------------------------------------------------------------
  // STATE DEFINITIONS
  // ------------------------------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<"All" | "To Be Reviewed" | "Additional Request" | "Approved" | "Decline">("All");
  
  // Calendar & Range Picker States
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [startDate, setStartDate] = useState<string | null>(null); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string | null>(null); // YYYY-MM-DD
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);

  const [brokers, setBrokers] = useState<{id: string; name: string; email: string}[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  // Range inputs
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Minimized state for grouped activity logs
  const [minimizedDates, setMinimizedDates] = useState<{ [date: string]: boolean }>({});

  // Month navigation (Defaults to August 2026 to match mock dataset)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 7, 1));
  const currentDateStr = "2026-08-24";

  // Helper values for calendar layout
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // ------------------------------------------------------------------------------
  // DYNAMIC FILTERING LOGIC
  // ------------------------------------------------------------------------------
  const getFilteredDocs = () => {
    return submittedDocs.filter((doc) => {
      // Calendar timeframes
      if (selectedDate) {
        return doc.dateSubmitted === selectedDate;
      }
      if (isRangeActive && startDate && endDate) {
        return doc.dateSubmitted >= startDate && doc.dateSubmitted <= endDate;
      }
      return true;
    });
  };

  const getFilteredAuditLogs = () => {
    return auditLogs.filter((log) => {
      if (selectedDate) {
        return log.date === selectedDate;
      }
      if (isRangeActive && startDate && endDate) {
        return log.date >= startDate && log.date <= endDate;
      }
      return true;
    });
  };

  const filteredDocs = getFilteredDocs();
  const filteredAuditLogs = getFilteredAuditLogs();

  // Sort document logs descending by date
  const sortedDocs = [...filteredDocs].sort((a, b) => 
    b.dateSubmitted.localeCompare(a.dateSubmitted)
  );

  // Compute stats on filtered list

  // Compute stats on filtered list
  const toBeReviewedCount = filteredDocs.filter(doc => doc.status === "To Be Reviewed").length;
  const additionalRequestCount = filteredDocs.filter(doc => doc.status === "Additional Request").length;
  const approvedCount = filteredDocs.filter(doc => doc.status === "Approved").length;
  const declineCount = filteredDocs.filter(doc => doc.status === "Decline").length;

  // Fetch brokers from API on mount
  useEffect(() => {
    fetch("/api/brokers/", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch brokers");
        return res.json();
      })
      .then((data) => {
        // Transform API response to dropdown options
        const options = data.map((b: any) => ({
          id: b.id || b.user_id,
          name: b.name || b.user?.first_name + " " + (b.user?.last_name || ""),
          email: b.email || b.user?.email,
        }));
        setBrokers(options);
        // Select first broker by default if available
        if (options.length > 0 && !selectedBrokerId) {
          setSelectedBrokerId(options[0].id);
        }
      })
      .catch((err) => {
        console.error("Error fetching brokers:", err);
      });
  }, []);

  // Filter based on selected stats card state
  const statusFilteredDocs = sortedDocs.filter(doc => {
    if (statusFilter === "All") return true;
    return doc.status === statusFilter;
  });

  // Apply broker filter (if a broker is selected and docs have broker affiliation)
  const brokerFilteredDocs = selectedBrokerId
    ? statusFilteredDocs.filter((doc) => doc.brokerId === selectedBrokerId)
    : statusFilteredDocs;

  const recentDocs = brokerFilteredDocs.slice(0, 6);

  // Group filtered audit logs by date (Today 24, Yesterday 23, Day before 22)
  const groupedLogs: { [date: string]: AuditLogEntry[] } = {};
  filteredAuditLogs.forEach((log) => {
    if (!groupedLogs[log.date]) {
      groupedLogs[log.date] = [];
    }
    groupedLogs[log.date].push(log);
  });
  const sortedLogDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 12-Column Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        
        {/* LEFT COLUMN: STATS CARDS & RECENT SUBMISSIONS TABLE */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Active Filter Bar */}
          {(selectedDate || (isRangeActive && startDate && endDate)) && (
            <div className="bg-[#1429A9]/5 border border-[#1429A9]/20 p-4 flex justify-between items-center text-xs text-slate-700 font-bold select-none rounded-none">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#1429A9] rounded-full" />
                <span>
                  Filtering audit data for: <strong className="text-[#1429A9]">{selectedDate ? `Date: ${selectedDate}` : `Range: ${startDate} to ${endDate}`}</strong>
                </span>
              </div>
              <button 
                onClick={() => {
                  setSelectedDate(null);
                  setIsRangeActive(false);
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="text-[#1429A9] hover:underline"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* SECTION 1: ANALYTICS FOR DOCUMENTS (BLUE AND WHITE TRANSITION ON SELECTION) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* To Be Reviewed Card */}
            <div 
              onClick={() => setStatusFilter(statusFilter === "To Be Reviewed" ? "All" : "To Be Reviewed")}
              className={`relative rounded-none p-6 border shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${
                statusFilter === "To Be Reviewed" 
                  ? "bg-[#1429A9] border-[#1429A9] text-white animate-scaleIn" 
                  : "bg-white border-slate-200/80 text-[#1429A9]"
              }`}
            >
              <div className={`text-4xl font-extrabold tracking-tight block mb-1 ${statusFilter === "To Be Reviewed" ? "text-white" : "text-[#1429A9]"}`}>
                {toBeReviewedCount}
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === "To Be Reviewed" ? "text-white/80" : "text-slate-500"}`}>
                To Be Reviewed
              </span>
              <div className={`absolute bottom-6 right-6 ${statusFilter === "To Be Reviewed" ? "text-white/20" : "text-[#1429A9]/20"}`}>
                <FileSearch className="w-8 h-8" />
              </div>
            </div>

            {/* Additional Request Card */}
            <div 
              onClick={() => setStatusFilter(statusFilter === "Additional Request" ? "All" : "Additional Request")}
              className={`relative rounded-none p-6 border shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${
                statusFilter === "Additional Request" 
                  ? "bg-[#1429A9] border-[#1429A9] text-white animate-scaleIn" 
                  : "bg-white border-slate-200/80 text-amber-600"
              }`}
            >
              <div className={`text-4xl font-extrabold tracking-tight block mb-1 ${statusFilter === "Additional Request" ? "text-white" : "text-amber-600"}`}>
                {additionalRequestCount}
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === "Additional Request" ? "text-white/80" : "text-slate-500"}`}>
                Additional Request
              </span>
              <div className={`absolute bottom-6 right-6 ${statusFilter === "Additional Request" ? "text-white/20" : "text-amber-600/20"}`}>
                <HelpCircle className="w-8 h-8" />
              </div>
            </div>

            {/* Approved Card */}
            <div 
              onClick={() => setStatusFilter(statusFilter === "Approved" ? "All" : "Approved")}
              className={`relative rounded-none p-6 border shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${
                statusFilter === "Approved" 
                  ? "bg-[#1429A9] border-[#1429A9] text-white animate-scaleIn" 
                  : "bg-white border-slate-200/80 text-emerald-600"
              }`}
            >
              <div className={`text-4xl font-extrabold tracking-tight block mb-1 ${statusFilter === "Approved" ? "text-white" : "text-emerald-600"}`}>
                {approvedCount}
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === "Approved" ? "text-white/80" : "text-slate-500"}`}>
                Approved
              </span>
              <div className={`absolute bottom-6 right-6 ${statusFilter === "Approved" ? "text-white/20" : "text-emerald-600/20"}`}>
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>

            {/* Decline Card */}
            <div 
              onClick={() => setStatusFilter(statusFilter === "Decline" ? "All" : "Decline")}
              className={`relative rounded-none p-6 border shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${
                statusFilter === "Decline" 
                  ? "bg-[#1429A9] border-[#1429A9] text-white animate-scaleIn" 
                  : "bg-white border-slate-200/80 text-rose-600"
              }`}
            >
              <div className={`text-4xl font-extrabold tracking-tight block mb-1 ${statusFilter === "Decline" ? "text-white" : "text-rose-600"}`}>
                {declineCount}
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${statusFilter === "Decline" ? "text-white/80" : "text-slate-500"}`}>
                Decline
              </span>
              <div className={`absolute bottom-6 right-6 ${statusFilter === "Decline" ? "text-white/20" : "text-rose-600/20"}`}>
                <FileWarning className="w-8 h-8" />
              </div>
            </div>

          </div>

          {/* Broker Filter */}
          <div className="bg-white border border-slate-200/80 rounded-md p-4 mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm mb-2">Broker</h3>
            <select
              value={selectedBrokerId ? brokers.find(b => b.id === selectedBrokerId)?.name || "" : ""}
              onChange={(e) => {
                const brokerOption = brokers.find(b => b.id === e.target.value);
                setSelectedBrokerId(brokerOption ? brokerOption.id : null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#1429A9]/30 text-xs font-semibold text-slate-700"
            >
              <option value="">All Brokers</option>
              {brokers.map((broker) => (
                <option key={broker.id} value={broker.id}>
                  {broker.name}
                </option>
              ))}
            </select>
          </div>

          {/* SECTION 2: SUBMITTED DOCUMENTS (TABLE SHARP EDGES override) */}
          <div className="bg-white rounded-none border border-slate-200/80 shadow-soft-xl overflow-hidden h-[482px] flex flex-col justify-between">
            
            {/* Header bar */}
            <div className="p-5 bg-gradient-to-r from-[#0d1b6b] to-[#1429A9] border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-amber-400 text-sm">
                  Recently Submitted Documents {statusFilter !== "All" && <span className="text-amber-300">({statusFilter})</span>}
                </h3>
                <p className="text-[10px] text-slate-300 font-medium">
                  {statusFilter !== "All" 
                    ? `Showing documents in "${statusFilter}" state. Click card again to reset.` 
                    : "Real-time audit checklist of client folder submissions"}
                </p>
              </div>
              <button 
                onClick={() => router.push("/loan-processing/review")}
                className="text-[9px] font-bold text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-none border border-amber-400/30 transition-all select-none"
              >
                Go to Review Audits
              </button>
            </div>

            {/* Table layout */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-5">Client Name</th>
                    <th className="py-3 px-5">Loan Type</th>
                    <th className="py-3 px-5">Document Name Submitted</th>
                    <th className="py-3 px-5">Date Submitted</th>
                    <th className="py-3 px-5 text-right">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {recentDocs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                        No submitted files logs for selected filter.
                      </td>
                    </tr>
                  ) : (
                    recentDocs.map((doc, index) => (
                      <tr 
                        key={doc.id} 
                        className={`hover:bg-slate-50/30 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="py-3.5 px-5 font-bold text-slate-800">
                          {doc.clientName}
                        </td>
                        <td className="py-3.5 px-5 font-medium text-slate-500">
                          {doc.loanType}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-700">
                          {doc.documentName}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 font-medium">
                          {doc.dateSubmitted}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                            doc.status === "Approved"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : doc.status === "Decline"
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : doc.status === "Additional Request"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                            {doc.status === "Decline" ? "Declined" : doc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* BOTTOM LEFT PAGE COUNTER */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Showing {recentDocs.length > 0 ? 1 : 0} to {recentDocs.length} of {recentDocs.length} entries</span>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: CALENDAR FILTER & AUDIT LOGS */}
        <div className="xl:col-span-4 space-y-4">
          
          {/* Calendar Box Container */}
          <div className="bg-white border border-slate-200/80 p-3.5 shadow-soft-xl rounded-none">
            
            {/* Header month & Navigation */}
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-100 select-none min-h-[32px]">
              {showRangeModal ? (
                /* Inline Picker range selector */
                <div className="flex items-center justify-between w-full gap-2 animate-fadeIn">
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={rangeStart} 
                      onChange={(e) => setRangeStart(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 text-xs px-2 py-1 rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#1429A9] w-[105px]"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">→</span>
                    <input 
                      type="date" 
                      value={rangeEnd} 
                      onChange={(e) => setRangeEnd(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 text-xs px-2 py-1 rounded-none font-bold text-slate-800 focus:outline-none focus:border-[#1429A9] w-[105px]"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      if (rangeStart && rangeEnd) {
                        setStartDate(rangeStart);
                        setEndDate(rangeEnd);
                        setIsRangeActive(true);
                        setSelectedDate(null);
                        setShowRangeModal(false);
                      } else {
                        setShowRangeModal(false);
                      }
                    }}
                    className="bg-[#1429A9] text-amber-400 hover:bg-[#1b32cc] font-extrabold text-[10px] px-3 py-1.5 rounded-none transition-all uppercase tracking-wider border border-[#1429A9] shrink-0"
                  >
                    Accept
                  </button>
                </div>
              ) : (
                /* Static view navigation */
                <>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 hover:bg-slate-100 rounded-none text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                      {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 hover:bg-slate-100 rounded-none text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowRangeModal(true)}
                    className="bg-[#1429A9] text-amber-400 hover:bg-[#1b32cc] font-extrabold text-[10px] px-3.5 py-1.5 rounded-none transition-all uppercase tracking-wider"
                  >
                    Filter
                  </button>
                </>
              )}
            </div>

            {/* Days label row */}
            <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase mb-2 select-none">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days grid slots */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1.5 select-none" />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                
                const isSelected = dateStr === selectedDate;
                const isInRange = isRangeActive && startDate && endDate && dateStr >= startDate && dateStr <= endDate;
                const isCurrentDate = dateStr === currentDateStr;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(dateStr);
                        setIsRangeActive(false);
                        setStartDate(null);
                        setEndDate(null);
                      }
                    }}
                    className={`p-1.5 font-bold transition-all text-center rounded-none select-none cursor-pointer ${
                      isSelected || isInRange
                        ? "bg-[#1429A9] text-white"
                        : isCurrentDate
                        ? "bg-[#1429A9]/10 text-[#1429A9] ring-1 ring-[#1429A9]/40"
                        : "text-slate-700 hover:bg-[#1429A9]/10 hover:text-[#1429A9]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Grouped Compliance Audit logs */}
          <div className="bg-white border border-slate-200/80 p-3.5 shadow-soft-xl rounded-none flex flex-col h-[482px]">
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2.5 pb-2 border-b border-slate-100 flex justify-between items-center select-none shrink-0">
              <span>Audit Log</span>
              <span className="text-[10px] text-slate-400 font-bold font-mono">({filteredAuditLogs.length} entries)</span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {sortedLogDates.length === 0 ? (
                <p className="text-slate-400 text-center text-xs py-8 font-medium">No audits logged for selected timeframe.</p>
              ) : (
                sortedLogDates.map((date) => {
                  const isMinimized = !!minimizedDates[date];
                  const logsForDate = groupedLogs[date];
                  return (
                    <div key={date} className="space-y-2 border-b border-slate-100 pb-2 last:border-none">
                      {/* Accordion header slot */}
                      <div className="flex justify-between items-center select-none bg-slate-50 px-2 py-1 rounded-none border border-slate-100">
                        <span className="text-[9px] font-black text-slate-500 tracking-wider">
                          {date === currentDateStr ? "Today" : date === "2026-08-23" ? "Yesterday" : "Previous"} ({date})
                        </span>
                        <button
                          onClick={() => setMinimizedDates({ ...minimizedDates, [date]: !isMinimized })}
                          className="text-[9px] font-extrabold text-[#1429A9] uppercase hover:underline"
                        >
                          {isMinimized ? "Expand" : "Minimize"}
                        </button>
                      </div>

                      {/* Details segment */}
                      {!isMinimized && (
                        <div className="space-y-2 pl-2">
                          {logsForDate.map((log) => (
                            <div key={log.id} className="border-l border-[#1429A9]/35 pl-2 py-0.5">
                              <div className="text-[9px] font-bold text-slate-400">{log.time}</div>
                              <p className="text-slate-600 text-[11px] font-semibold">{log.action}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
