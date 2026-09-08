/**
 * ==============================================================================
 * COMPONENT: DashboardTab.tsx
 * Path: src/app/broker/dashboard/DashboardTab.tsx
 * Description: Reworked Dashboard tab featuring stats time-filters,
 *              a clickable Client Summary list, static notification side-box,
 *              meeting reminders, grouped activity logs with minimize switches,
 *              and inline range calendar filter.
 * ==============================================================================
 */

import React, { useState } from "react";
import { ClipboardList, Clock, AlertTriangle, CheckCircle, ArrowRight, Calendar, UserPlus, Percent, Bell, CalendarClock, ChevronDown, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Client } from "../MockData";
import ClientApplicationDashboard from "../applications/ClientApplicationDashboard";
import { useBroker } from "../BrokerContext";
import Link from "next/link";

export default function DashboardTab() {
  const { clients } = useBroker();

  // ------------------------------------------------------------------------------
  // STATE DEFINITIONS
  // ------------------------------------------------------------------------------
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Clickable stat card filter state
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "In review" | "Requested" | "Approved">("All");

  // Calendar filter and range filter states
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [startDate, setStartDate] = useState<string | null>(null); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string | null>(null); // YYYY-MM-DD
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);

  // Minimized dates state for activity logs list
  const [minimizedDates, setMinimizedDates] = useState<{ [date: string]: boolean }>({});

  // Range Picker form fields
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // Month navigation (Defaults to August 2026 since mock data has August entries)
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 7, 1));

  // Static Mock Activity Logs (Spans current date 24th, yesterday 23rd, day before 22nd)
  const mockLogs = [
    { id: "1", date: "2026-08-24", time: "09:14 AM", message: "Sarah Jenkins approved Alice Smith's ID doc" },
    { id: "2", date: "2026-08-24", time: "11:30 AM", message: "Michael Chang application moved to Approved status" },
    { id: "3", date: "2026-08-23", time: "02:45 PM", message: "John Doe submitted proof of income" },
    { id: "4", date: "2026-08-23", time: "04:10 PM", message: "Alice Smith requested a callback on interest rates" },
    { id: "5", date: "2026-08-22", time: "10:15 AM", message: "Michael Brown profile created by system invite" },
    { id: "6", date: "2026-08-22", time: "02:20 PM", message: "Emma Wilson compliance check review started" },
  ];

  // Helper date parsing (assuming current date is 2026-08-24)
  const currentDateStr = "2026-08-24";

  // ------------------------------------------------------------------------------
  // DYNAMIC FILTERING LOGIC
  // ------------------------------------------------------------------------------
  const getFilteredClients = () => {
    return clients.filter((client) => {
      if (selectedDate) {
        return client.dateStarted === selectedDate;
      }
      if (isRangeActive && startDate && endDate) {
        return client.dateStarted >= startDate && client.dateStarted <= endDate;
      }
      return true; // All Time if no calendar filter
    });
  };

  const getFilteredLogs = () => {
    return mockLogs.filter((log) => {
      if (selectedDate) {
        return log.date === selectedDate;
      }
      if (isRangeActive && startDate && endDate) {
        return log.date >= startDate && log.date <= endDate;
      }
      return true; // No filter: show all
    });
  };

  const filteredClients = getFilteredClients();
  const filteredLogs = getFilteredLogs();

  // Sort filtered clients by dateStarted descending (most recent first)
  const sortedClients = [...filteredClients].sort((a, b) =>
    b.dateStarted.localeCompare(a.dateStarted)
  );

  // Calculate dynamic stats based on filter
  const activeAppsCount = filteredClients.filter(c => c.documentState !== "Settled" && c.documentState !== "Declined").length;
  const inReviewCount = filteredClients.filter(c => c.documentState === "In review").length;
  const actionNeededCount = filteredClients.filter(c => c.documentState === "Requested").length;
  const approvedCount = filteredClients.filter(c => c.documentState === "Approved").length;

  // Sum and counts for approved loans
  const approvedClients = filteredClients.filter(c => c.documentState === "Approved");
  const totalApprovedLoanValue = approvedClients.reduce((sum, c) => sum + c.amount, 0);
  const approvedLoansCount = approvedClients.length;

  // Filter sorted clients by status filter if active
  const statusFilteredClients = sortedClients.filter(c => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Active") return c.documentState !== "Settled" && c.documentState !== "Declined";
    if (statusFilter === "In review") return c.documentState === "In review";
    if (statusFilter === "Requested") return c.documentState === "Requested";
    if (statusFilter === "Approved") return c.documentState === "Approved";
    return true;
  });

  // Capped at max of 6 recent clients
  const recentClients = statusFilteredClients.slice(0, 6);

  // Calendar date calculation helper variables
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Group filtered activity logs by date (Sorted by date descending)
  const groupedLogs: { [date: string]: typeof mockLogs } = {};
  filteredLogs.forEach((log) => {
    if (!groupedLogs[log.date]) {
      groupedLogs[log.date] = [];
    }
    groupedLogs[log.date].push(log);
  });
  const sortedLogDates = Object.keys(groupedLogs).sort((a, b) => b.localeCompare(a));

  // Helper for document status badge background color (45% opacity)
  const getStatusBadgeBg = (state: string) => {
    switch (state) {
      case "In review":
      case "In Review":
        return "bg-[#FFBC1F]/45";
      case "Approved":
      case "Settled":
        return "bg-[#00D12A]/45";
      case "Declined":
      case "Decline":
        return "bg-[#D11F00]/45";
      case "Requested":
      case "Action needed":
      default:
        return "bg-[#2268A5]/45";
    }
  };

  if (selectedClient) {
    return (
      <ClientApplicationDashboard
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn font-['Poppins',sans-serif]">

      {/* Split Grid Layout (Left: Stats & Banner & Table | Right: Calendar & Audit Logs) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">

        {/* LEFT COLUMN: STATISTICS, BANNER & CLIENT LIST TABLE */}
        <div className="xl:col-span-8 space-y-8">

          {/* Active Filter Indicators */}
          {(selectedDate || (isRangeActive && startDate && endDate)) && (
            <div className="bg-white border border-[#0038A8] p-4 flex justify-between items-center text-xs text-[#808080] font-bold select-none rounded-[5px]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#0038A8] rounded-full" />
                <span className="font-['Inter',sans-serif]">
                  Filtering statistics for: <strong className="text-[#000000] font-['Poppins',sans-serif]">{selectedDate ? `Date: ${selectedDate}` : `Range: ${startDate} to ${endDate}`}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setIsRangeActive(false);
                  setStartDate(null);
                  setEndDate(null);
                }}
                className="bg-gradient-to-r from-[#0038A8] to-[#002066] text-white px-3 py-1 rounded-[5px] text-xs font-bold transition-all hover:opacity-90 cursor-pointer font-['Poppins',sans-serif]"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* SECTION 1.5: TOTAL LOAN VALUE BANNER */}
          <div className="bg-gradient-to-r from-[#0038A8] to-[#002066] border border-[#0038A8] rounded-[5px] p-6 shadow-soft-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none animate-fadeIn text-white">
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider block font-['Inter',sans-serif]">
                Total Approved Loan Value
              </span>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl font-extrabold text-white tracking-tight font-['Inter',sans-serif]">
                  A$ {totalApprovedLoanValue.toLocaleString()}
                </span>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-[5px] border border-white/30 font-['Poppins',sans-serif]">
                  <ArrowUpRight className="w-3 h-3 text-white" />
                  <span>+14.8% increase</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-0.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-['Inter',sans-serif]">
                Approved Loan Volume
              </span>
              <span className="text-lg font-extrabold text-white font-['Inter',sans-serif]">
                {approvedLoansCount} Approved Loans Totaled
              </span>
              <p className="text-[10px] text-white/80 font-medium font-['Poppins',sans-serif]">
                Calculated dynamically based on timeframe filter
              </p>
            </div>
          </div>

          {/* SECTION 2: STATS SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Card 1: Active Applications */}
            <div
              onClick={() => setStatusFilter(statusFilter === "Active" ? "All" : "Active")}
              className={`relative rounded-[5px] p-6 border border-[#0038A8] shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${statusFilter === "Active"
                ? "bg-[#0038A8] text-white animate-scaleIn"
                : "bg-white text-[#000000] hover:bg-slate-50"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`text-5xl font-black leading-none font-['Inter',sans-serif] ${statusFilter === "Active" ? "text-white" : "text-[#000000]"}`}>
                  {activeAppsCount}
                </div>
                <div className="w-10 h-10 bg-[#0038A8] rounded-[5px] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-['Inter',sans-serif] ${statusFilter === "Active" ? "text-white/90" : "text-[#808080]"}`}>
                Active applications
              </span>
            </div>

            {/* Card 2: In Review */}
            <div
              onClick={() => setStatusFilter(statusFilter === "In review" ? "All" : "In review")}
              className={`relative rounded-[5px] p-6 border border-[#0038A8] shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${statusFilter === "In review"
                ? "bg-[#0038A8] text-white animate-scaleIn"
                : "bg-white text-[#000000] hover:bg-slate-50"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`text-5xl font-black leading-none font-['Inter',sans-serif] ${statusFilter === "In review" ? "text-white" : "text-[#000000]"}`}>
                  {inReviewCount}
                </div>
                <div className="w-10 h-10 bg-[#0038A8] rounded-[5px] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-['Inter',sans-serif] ${statusFilter === "In review" ? "text-white/90" : "text-[#808080]"}`}>
                In review
              </span>
            </div>

            {/* Card 3: Action Needed */}
            <div
              onClick={() => setStatusFilter(statusFilter === "Requested" ? "All" : "Requested")}
              className={`relative rounded-[5px] p-6 border border-[#0038A8] shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${statusFilter === "Requested"
                ? "bg-[#0038A8] text-white animate-scaleIn"
                : "bg-white text-[#000000] hover:bg-slate-50"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`text-5xl font-black leading-none font-['Inter',sans-serif] ${statusFilter === "Requested" ? "text-white" : "text-[#000000]"}`}>
                  {actionNeededCount}
                </div>
                <div className="w-10 h-10 bg-[#0038A8] rounded-[5px] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-['Inter',sans-serif] ${statusFilter === "Requested" ? "text-white/90" : "text-[#808080]"}`}>
                Action needed
              </span>
            </div>

            {/* Card 4: Approved */}
            <div
              onClick={() => setStatusFilter(statusFilter === "Approved" ? "All" : "Approved")}
              className={`relative rounded-[5px] p-6 border border-[#0038A8] shadow-soft-xl hover:shadow-md transition-all duration-300 cursor-pointer select-none ${statusFilter === "Approved"
                ? "bg-[#0038A8] text-white animate-scaleIn"
                : "bg-white text-[#000000] hover:bg-slate-50"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className={`text-5xl font-black leading-none font-['Inter',sans-serif] ${statusFilter === "Approved" ? "text-white" : "text-[#000000]"}`}>
                  {approvedCount}
                </div>
                <div className="w-10 h-10 bg-[#0038A8] rounded-[5px] flex items-center justify-center text-white shrink-0 shadow-xs">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block font-['Inter',sans-serif] ${statusFilter === "Approved" ? "text-white/90" : "text-[#808080]"}`}>
                Approved
              </span>
            </div>

          </div>

          {/* SECTION 3: RECENT CLIENT SUMMARY TABLE */}
          <div className="bg-white rounded-[5px] border border-[#0038A8] shadow-soft-xl overflow-hidden h-[482px] flex flex-col justify-between">
            <div className="p-5 bg-white border-b border-[#0038A8]/20 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-[#000000] text-sm font-['Inter',sans-serif]">
                  Recent Client Summary {statusFilter !== "All" && <span className="text-[#808080] font-['Poppins',sans-serif]">({statusFilter})</span>}
                </h3>
              </div>
              <Link
                href="/broker/applications"
                className="text-[9px] font-bold text-white bg-gradient-to-r from-[#0038A8] to-[#002066] px-3 py-1 rounded-[5px] border border-[#0038A8] transition-all select-none hover:opacity-90 font-['Poppins',sans-serif]"
              >
                View All
              </Link>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#0038A8]/20 text-[10px] font-extrabold uppercase text-[#000000] tracking-wider font-['Inter',sans-serif]">
                    <th className="py-3 px-5">Client Name</th>
                    <th className="py-3 px-5">Dossier Progress</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Loan Type</th>
                    <th className="py-3 px-5">Date Started</th>
                    <th className="py-3 px-5 text-right">Loan Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-['Poppins',sans-serif]">
                  {recentClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#808080] font-medium font-['Poppins',sans-serif]">
                        No clients found for this timeframe filter.
                      </td>
                    </tr>
                  ) : (
                    recentClients.map((client, index) => (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`cursor-pointer transition-colors group ${index % 2 === 0
                          ? "bg-white hover:bg-slate-50"
                          : "bg-slate-50/50 hover:bg-slate-100/60"
                          }`}
                      >
                        <td className="py-3.5 px-5 text-[#808080] font-medium">
                          {client.name}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-[5px] overflow-hidden border border-[#000000]/20">
                              <div
                                className="h-full bg-[#0038A8] rounded-[5px]"
                                style={{ width: `${client.progress}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#808080] font-bold">{client.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-extrabold uppercase tracking-wider text-[#000000] ${getStatusBadgeBg(client.documentState)}`}>
                            {client.documentState === "Requested" ? "Action Req." : client.documentState}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 font-medium text-[#808080]">
                          {client.applicationType}
                        </td>
                        <td className="py-3.5 px-5 text-[#808080]">
                          {client.dateStarted}
                        </td>
                        <td className="py-3.5 px-5 text-right font-medium text-[#808080]">
                          ${client.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CALENDAR FILTER & RECENT ACTIVITY LOGS */}
        <div className="xl:col-span-4 space-y-4">

          {/* Calendar Box Container */}
          <div className="bg-white border border-[#0038A8] p-3.5 shadow-soft-xl rounded-[5px]">

            {/* Calendar Header with navigation & Inline Filter/Accept button */}
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-[#0038A8]/20 select-none min-h-[32px]">
              {showRangeModal ? (
                /* Inline Date Range Picker */
                <div className="flex items-center justify-between w-full gap-2 animate-fadeIn font-['Poppins',sans-serif]">
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="bg-white border border-[#0038A8]/40 text-xs px-2 py-1 rounded-[5px] font-bold text-[#808080] focus:outline-none focus:border-[#0038A8] w-[105px]"
                    />
                    <span className="text-[10px] text-[#808080] font-bold">→</span>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="bg-white border border-[#0038A8]/40 text-xs px-2 py-1 rounded-[5px] font-bold text-[#808080] focus:outline-none focus:border-[#0038A8] w-[105px]"
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
                    className="bg-gradient-to-r from-[#0038A8] to-[#002066] text-white font-extrabold text-[10px] px-3 py-1.5 rounded-[5px] transition-all uppercase tracking-wider border border-[#0038A8] shrink-0 hover:opacity-90 cursor-pointer font-['Poppins',sans-serif]"
                  >
                    Accept
                  </button>
                </div>
              ) : (
                /* Normal Header Month Navigation */
                <>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 bg-gradient-to-r from-[#0038A8] to-[#002066] text-white rounded-[5px] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-white" />
                    </button>
                    <span className="font-extrabold text-[#000000] text-[11px] uppercase tracking-wider px-1 font-['Inter',sans-serif]">
                      {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 bg-gradient-to-r from-[#0038A8] to-[#002066] text-white rounded-[5px] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowRangeModal(true)}
                    className="bg-gradient-to-r from-[#0038A8] to-[#002066] text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-[5px] transition-all uppercase tracking-wider hover:opacity-90 cursor-pointer font-['Poppins',sans-serif]"
                  >
                    Filter
                  </button>
                </>
              )}
            </div>

            {/* Calendar Weekdays grid */}
            <div className="grid grid-cols-7 text-center text-[10px] font-black text-[#000000] uppercase mb-2 select-none font-['Inter',sans-serif]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days grid */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
              {/* Empty slots for spacing */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="p-1.5 select-none" />
              ))}

              {/* Actual calendar day buttons */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                // Highlight state indicators
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
                    className={`p-1.5 font-bold transition-all text-center rounded-[5px] select-none cursor-pointer font-['Inter',sans-serif] ${isSelected || isInRange
                      ? "bg-gradient-to-r from-[#0038A8] to-[#002066] text-white"
                      : isCurrentDate
                        ? "bg-[#0038A8]/10 text-[#000000] ring-1 ring-[#0038A8]/40"
                        : "text-[#000000] hover:bg-[#0038A8]/10"
                      }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Activity Logs Container */}
          <div className="bg-white border border-[#0038A8] p-3.5 shadow-soft-xl rounded-[5px] flex flex-col h-[482px]">
            <h3 className="font-extrabold text-[#000000] text-xs uppercase tracking-wider mb-2.5 pb-2 border-b border-[#0038A8]/20 flex justify-between items-center select-none shrink-0 font-['Inter',sans-serif]">
              <span>Activity Log</span>
              <span className="text-[10px] text-[#808080] font-bold font-['Poppins',sans-serif]">({filteredLogs.length} entries)</span>
            </h3>

            {/* Log item entries grouped and sorted by Date, with minimize buttons */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 font-['Poppins',sans-serif]">
              {sortedLogDates.length === 0 ? (
                <p className="text-[#808080] text-center text-xs py-8 font-medium font-['Poppins',sans-serif]">No logs for selected timeframe.</p>
              ) : (
                sortedLogDates.map((date) => {
                  const isMinimized = !!minimizedDates[date];
                  const logsForDate = groupedLogs[date];
                  return (
                    <div key={date} className="space-y-2 border-b border-slate-100 pb-2 last:border-none">
                      {/* Date label slot with minimize/expand controls */}
                      <div className="flex justify-between items-center select-none bg-slate-50 px-2 py-1 rounded-[5px] border border-slate-200">
                        <span className="text-[9px] font-black text-[#000000] tracking-wider font-['Inter',sans-serif]">
                          {date === currentDateStr ? "Today" : date === "2026-08-23" ? "Yesterday" : "Previous"} ({date})
                        </span>
                        <button
                          onClick={() => setMinimizedDates({ ...minimizedDates, [date]: !isMinimized })}
                          className="bg-gradient-to-r from-[#0038A8] to-[#002066] text-white p-1 rounded-[5px] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center font-['Poppins',sans-serif]"
                          title={isMinimized ? "Expand" : "Minimize"}
                        >
                          {isMinimized ? <Plus className="w-3.5 h-3.5 text-white" /> : <Minus className="w-3.5 h-3.5 text-white" />}
                        </button>
                      </div>

                      {/* Grouped logs block details */}
                      {!isMinimized && (
                        <div className="space-y-2 pl-2">
                          {logsForDate.map((log) => (
                            <div key={log.id} className="border-l-2 border-[#0038A8] pl-2 py-0.5">
                              <div className="text-[9px] font-bold text-[#808080] font-['Poppins',sans-serif]">{log.time}</div>
                              <p className="text-[#808080] text-[11px] font-semibold font-['Poppins',sans-serif]">{log.message}</p>
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
