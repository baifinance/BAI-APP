/**
 * ==============================================================================
 * COMPONENT: ClientsTab.tsx
 * Path: src/app/broker/components/ClientsTab.tsx
 * Description: Client list tab with search, horizontal document state filters,
 *              3-state alphabetical sorting, date range filter modal, separate
 *              loan type & amount columns, eye action button, and bottom-left page counter.
 * ==============================================================================
 */

import React, { useState } from "react";
import { Search, ArrowUpDown, Mail, Calendar, Eye, X, CalendarRange, Filter } from "lucide-react";
import { Client } from "../MockData";
import ClientProfileView from "./ClientProfileView";
import { useBroker } from "../BrokerContext";

type SortOrder = "none" | "asc" | "desc";
type DocumentStateFilter = "All" | "Submitted" | "In review" | "Requested" | "Settled" | "Declined" | "Approved";

export default function ClientsTab() {
  const { clients } = useBroker();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [stateFilter, setStateFilter] = useState<DocumentStateFilter>("All");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Date Filter Modal State
  const todayStr = new Date().toISOString().split("T")[0]; // e.g. "2026-09-01"
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeDateFilterLabel, setActiveDateFilterLabel] = useState<string>(todayStr);

  const documentStateOptions: DocumentStateFilter[] = [
    "All",
    "Submitted",
    "In review",
    "Requested",
    "Approved",
    "Settled",
    "Declined",
  ];

  // Helper to parse date strings for comparison
  const parseClientDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Sort and filter clients
  const filteredClients = clients
    .filter((client) => {
      // 1. Search Filter
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Document State Filter
      const matchesState =
        stateFilter === "All" || client.documentState === stateFilter;

      // 3. Date Range Filter
      let matchesDate = true;
      if (startDate || endDate) {
        const clientDate = parseClientDate(client.lastActivity);
        if (clientDate) {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (clientDate < start) matchesDate = false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (clientDate > end) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesState && matchesDate;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return a.name.localeCompare(b.name);
      } else if (sortOrder === "desc") {
        return b.name.localeCompare(a.name);
      }
      return 0; // Normal / original order
    });

  // 3-Click Alphabetical Sort Toggle: none -> asc -> desc -> none
  const toggleSort = () => {
    if (sortOrder === "none") setSortOrder("asc");
    else if (sortOrder === "asc") setSortOrder("desc");
    else setSortOrder("none");
  };

  const handleApplyDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      setActiveDateFilterLabel(`${startDate} to ${endDate}`);
    } else if (startDate) {
      setActiveDateFilterLabel(`From ${startDate}`);
    } else if (endDate) {
      setActiveDateFilterLabel(`Until ${endDate}`);
    } else {
      setActiveDateFilterLabel(todayStr);
    }
    setIsDateModalOpen(false);
  };

  const handleResetDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setActiveDateFilterLabel(todayStr);
    setIsDateModalOpen(false);
  };

  // If a client has been clicked, display their detailed dashboard
  if (selectedClient) {
    return (
      <ClientProfileView
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ---------------------------------------------------------------------- */}
      {/* SECTION HEADER & DESCRIPTIONS                                          */}
      {/* ---------------------------------------------------------------------- */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">Assigned Clients</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Manage your mortgage clients, review dossiers, and filter activity.
        </p>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SEARCH BAR & HORIZONTAL DOCUMENT STATE FILTERS                         */}
      {/* ---------------------------------------------------------------------- */}
      <div className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl space-y-4">
        {/* Search Input Field */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-medium placeholder:text-slate-400"
          />
        </div>

        {/* Horizontal Document State Filter Pills (Left to Right) */}
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
            Filter by Document State
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {documentStateOptions.map((state) => {
              const isActive = stateFilter === state;
              const displayLabel = state === "Requested" ? "Action Needed" : state;
              return (
                <button
                  key={state}
                  onClick={() => setStateFilter(state)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#0B2369] text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* CLIENTS DATA LIST TABLE CONTAINER                                      */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden space-y-0">
        
        {/* TOP LEFT CONTROLS (Sort Alphabetically + Date Range Filter) */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Alphabetical Sort Button (3-State Toggle: None -> A-Z -> Z-A -> None) */}
            <button
              onClick={toggleSort}
              className={`py-2 px-3.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                sortOrder !== "none"
                  ? "bg-[#0B2369] text-white border-[#0B2369] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {sortOrder === "none"
                  ? "Sort Alphabetically"
                  : sortOrder === "asc"
                  ? "Alphabetical (A - Z)"
                  : "Alphabetical (Z - A)"}
              </span>
            </button>

            {/* 2. Date Filter Button (Opens Date Input Modal) */}
            <button
              onClick={() => setIsDateModalOpen(true)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                startDate || endDate
                  ? "bg-[#0024A8] text-white border-[#0024A8] shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Date Filter: {activeDateFilterLabel}</span>
            </button>

            {(startDate || endDate) && (
              <button
                onClick={handleResetDateFilter}
                className="text-[10px] font-extrabold text-rose-600 hover:underline px-1 cursor-pointer"
              >
                Clear Date Filter
              </button>
            )}
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">Client Info</th>
                <th className="py-4 px-6">Loan Type</th>
                <th className="py-4 px-6">Loan Amount</th>
                <th className="py-4 px-6">Last Activity</th>
                <th className="py-4 px-6">Dossier State</th>
                <th className="py-4 px-6 text-right">View Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                    No clients found matching search or filter parameters.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                  >
                    {/* Client Info Column (Phone Number Removed) */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EBF2FF] text-[#0B2369] flex items-center justify-center font-bold text-xs shrink-0">
                          {client.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 block truncate">
                            {client.name}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                            <Mail className="w-3 h-3 shrink-0" />
                            {client.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Loan Type Column */}
                    <td className="py-4.5 px-6">
                      <span className="text-xs font-bold text-slate-700 block">
                        {client.applicationType}
                      </span>
                    </td>

                    {/* Loan Amount Column (Separate Column) */}
                    <td className="py-4.5 px-6">
                      <span className="text-xs font-extrabold text-[#0B2369] block">
                        ${client.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* Last Activity Column */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.lastActivity}</span>
                      </div>
                    </td>

                    {/* Dossier State Column */}
                    <td className="py-4.5 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          client.documentState === "Approved" || client.documentState === "Settled"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : client.documentState === "Declined"
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : client.documentState === "In review"
                            ? "bg-blue-50 text-blue-600 border border-blue-200"
                            : client.documentState === "Requested"
                            ? "bg-amber-50 text-amber-600 border border-amber-200"
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {client.documentState === "Requested" ? "Action Needed" : client.documentState}
                      </span>
                    </td>

                    {/* Actions Column with Eye Icon */}
                    <td className="py-4.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setSelectedClient(client)}
                          title="View Client Dossier"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-[#0B2369] text-slate-600 hover:text-white border border-slate-200/60 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM LEFT PAGE COUNTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredClients.length > 0 ? 1 : 0} to {filteredClients.length} of {filteredClients.length} entries
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* DATE RANGE FILTER MODAL                                                */}
      {/* ---------------------------------------------------------------------- */}
      {isDateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 relative animate-scaleIn">
            <button
              onClick={() => setIsDateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-[#0B2369] uppercase tracking-wider block">
                Filter Client Activity
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                Select Date Range
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Filter the assigned clients list by their last activity date.
              </p>
            </div>

            <form onSubmit={handleApplyDateFilter} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369] rounded-xl text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369] rounded-xl text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetDateFilter}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider transition-all"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-[#0B2369] text-white rounded-xl shadow-md text-[10px] font-extrabold uppercase tracking-wider transition-all"
                >
                  Apply Filter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
