/**
 * ==============================================================================
 * COMPONENT: CommunicationTab.tsx
 * Path: src/app/client/communication/CommunicationTab.tsx
 * Description: Reworked Client Communication tab with a split two-container UI:
 *              - Left container: List of emails sent to the client (titles only,
 *                with date and time sent on the bottom right).
 *              - Right container: Email preview when selected, or semi-transparent
 *                blue 'X' logo and "No Email" placeholder when no email is selected.
 *              - Top right outside container: Non-working search bar.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { Search, X, Reply, Calendar, Clock, ShieldCheck } from "lucide-react";
import { BrokerEmail } from "../types";

export default function CommunicationTab() {
  // The backend has no communication/inbox endpoint yet (`communications` is
  // model-only), so the inbox is empty until one is wired up.
  const brokerEmails: BrokerEmail[] = [];
  const [selectedEmail, setSelectedEmail] = useState<BrokerEmail | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = brokerEmails.filter((email) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.sender.toLowerCase().includes(query) ||
      email.body.toLowerCase().includes(query)
    );
  });

  // Builds a mailto: link for the OS-default mail app
  const getMailtoLink = (email: BrokerEmail) => {
    const to = encodeURIComponent(email.senderEmail);
    const subject = encodeURIComponent(`Re: ${email.subject}`);
    const body = encodeURIComponent(
      `\n\n---- Original Message ----\nFrom: ${email.sender}\nDate: ${email.date} ${email.time || ""}\n\n${email.body}`
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* TOP HEADER BAR                                                       */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Inbox</h2>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN UNIFIED WORKSPACE CONTAINER                                     */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden grid grid-cols-1 lg:grid-cols-16 lg:min-h-[620px]">

        {/* ------------------------------------------------------------------ */}
        {/* LEFT SECTION: LIST OF EMAILS SENT TO CLIENT                         */}
        {/* Contains ONLY the email titles with date and time on bottom right  */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-5 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden max-h-[50vh] lg:max-h-none">

          {/* Header of the left section with search bar replacing previous texts and details */}
          <div className="bg-[#0A2881] px-4 py-3 shrink-0 flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none select-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E4BA37] transition-all"
              />
            </div>
          </div>

          {/* Email Labels List */}
          <div className="p-5 flex-1 overflow-y-auto space-y-2.5 pr-4">
            {filteredEmails.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-medium">
                {searchQuery ? "No matching emails found." : "No emails sent yet."}
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedEmail(email);
                      }
                    }}
                    className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${isSelected
                      ? "bg-[#0024A8]/5 border-[#0024A8]/40 shadow-sm ring-1 ring-[#0024A8]/20"
                      : "bg-white border-slate-200/70 hover:border-[#0024A8]/30 hover:bg-slate-50/70 shadow-xs"
                      }`}
                  >
                    {/* Active accent indicator strip */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#0024A8]" />
                    )}

                    {/* Email Title (Subject) only */}
                    <div className="pr-2 min-h-[38px] flex items-start">
                      <h4
                        className={`text-xs font-bold leading-snug transition-colors line-clamp-2 ${isSelected
                          ? "text-[#0024A8] font-extrabold"
                          : "text-slate-800 group-hover:text-slate-900"
                          }`}
                      >
                        {email.subject}
                      </h4>
                    </div>

                    {/* Date and Time Sent placed on the bottom right of the label */}
                    <div className="flex items-center justify-end gap-1.5 mt-2.5 text-[11px] font-semibold text-slate-400 group-hover:text-slate-500">
                      <span>{email.date}</span>
                      {email.time && (
                        <>
                          <span className="opacity-40">•</span>
                          <span>{email.time}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT SECTION: EMAIL PREVIEW OR NO EMAIL PLACEHOLDER                */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-11 p-6 sm:p-8 flex flex-col h-full min-h-[60vh] lg:min-h-[520px]">
          {selectedEmail ? (
            /* Selected Email View */
            <div className="flex-1 flex flex-col">

              {/* Header: Title and Deselect / Close button */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#0024A8]/10 text-[#0024A8] text-[9px] font-extrabold uppercase tracking-wider">
                      Broker Message
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure Transmission
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-snug">
                    {selectedEmail.subject}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEmail(null)}
                  title="Close preview"
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/60 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sender & Metadata Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 my-4 rounded-2xl bg-slate-50 border border-slate-200/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0024A8] text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                    SJ
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{selectedEmail.sender}</span>
                      <span className="text-[10px] font-medium text-slate-400">
                        &lt;{selectedEmail.senderEmail}&gt;
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      To: <span className="text-slate-600 font-semibold">You</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/50">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedEmail.date}</span>
                  </div>
                  {selectedEmail.time && (
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedEmail.time}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto pr-2 py-2 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
                {selectedEmail.body}
              </div>

              {/* Action Toolbar */}
              <div className="pt-4 mt-auto border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[10px] text-slate-400 font-medium">
                  Sent directly through the BAI Finance Broker Portal
                </span>

                <a
                  href={getMailtoLink(selectedEmail)}
                  className="py-2.5 px-5 rounded-xl bg-[#0024A8] hover:bg-[#001D85] text-white font-extrabold text-xs shadow-md shadow-[#0024A8]/15 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                </a>
              </div>
            </div>
          ) : (
            /* Empty State: Semi-transparent blue 'X' logo & "No Email" text */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
              {/* Semi-transparent blue X logo */}
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                <X className="w-10 h-10 text-blue-600/40" strokeWidth={2.5} />
              </div>

              {/* Semi-transparent blue "No Email" message */}
              <h4 className="text-lg font-extrabold text-blue-600/40 tracking-wide">
                No Email
              </h4>
              <p className="text-xs text-blue-500/35 font-medium mt-1">
                Select an email from the list on the left to preview its content
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}