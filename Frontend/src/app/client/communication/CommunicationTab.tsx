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
import { Search, X, Mail, Reply, Calendar, Clock, User, ShieldCheck } from "lucide-react";
import { BrokerEmail, initialBrokerEmails } from "../MockClientData";

export default function CommunicationTab() {
  const brokerEmails: BrokerEmail[] = initialBrokerEmails;
  const [selectedEmail, setSelectedEmail] = useState<BrokerEmail | null>(null);

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
    <div className="space-y-6 animate-fadeIn">
      {/* ==================================================================== */}
      {/* TOP HEADER BAR: Title on Left & Non-working Search Bar on Top Right  */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Communications</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Read secure emails and updates sent to you by your mortgage broker.
          </p>
        </div>

        {/* Top-right non-working search bar (outside of the containers) */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none select-none" />
          <input
            type="text"
            placeholder="Search emails..."
            disabled
            aria-disabled="true"
            tabIndex={-1}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-medium text-slate-400 placeholder:text-slate-400 cursor-not-allowed shadow-xs select-none focus:outline-none"
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN UNIFIED WORKSPACE CONTAINER                                     */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden grid grid-cols-1 lg:grid-cols-16 min-h-[620px]">

        {/* ------------------------------------------------------------------ */}
        {/* LEFT SECTION: LIST OF EMAILS SENT TO CLIENT                         */}
        {/* Contains ONLY the email titles with date and time on bottom right  */}
        {/* ------------------------------------------------------------------ */}
        <div className="lg:col-span-5 flex flex-col h-full border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden">

          {/* Header of the left section with theme blue background and white text */}
          <div className="bg-[#0A2881] px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Received Emails
              </h3>
            </div>
            {/* Number messages badge with #E4BA37 background and #0A2881 text color */}
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#E4BA37] text-[#0A2881] shadow-xs">
              {brokerEmails.length} {brokerEmails.length === 1 ? "Message" : "Messages"}
            </span>
          </div>

          {/* Email Labels List */}
          <div className="p-5 flex-1 overflow-y-auto space-y-2.5 pr-4">
            {brokerEmails.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs font-medium">
                No emails sent yet.
              </div>
            ) : (
              brokerEmails.map((email) => {
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
        <div className="lg:col-span-11 p-6 sm:p-8 flex flex-col h-full min-h-[520px]">
          {selectedEmail ? (
            /* Selected Email View */
            <div className="flex-1 flex flex-col animate-fadeIn">

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
                      To: <span className="text-slate-600 font-semibold">Emma Wilson</span>
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