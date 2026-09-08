/**
 * ==============================================================================
 * COMPONENT: CommunicationTab.tsx
 * Path: src/app/client/components/CommunicationTab.tsx
 * Description: Reworked Client Communication tab listing emails sent by broker.
 *              Clicking an email card opens a detailed overlay reader modal.
 * ==============================================================================
 */

import React, { useState } from "react";
import { Mail, Search, X, Calendar, User, ArrowRight, Reply } from "lucide-react";
import { BrokerEmail, initialBrokerEmails } from "../MockClientData";

export default function CommunicationTab() {
  // ------------------------------------------------------------------------------
  // STATIC BROKER EMAILS DATA
  // ------------------------------------------------------------------------------
  const brokerEmails: BrokerEmail[] = initialBrokerEmails;

  // ------------------------------------------------------------------------------
  // STATE DEFINITIONS
  // ------------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<BrokerEmail | null>(null);

  // Filter emails based on search query
  const filteredEmails = brokerEmails.filter((email) =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.date.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      
      {/* Header section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">Broker Messages Inbox</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Read secure emails and updates sent to you by your mortgage broker Sarah Jenkins.
        </p>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: SEARCH FILTER                                             */}
      {/* ==================================================================== */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email subject lines or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 text-xs font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: EMAIL LIST GRID                                           */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        {filteredEmails.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400 text-xs font-semibold shadow-soft-xl">
            No broker messages matching your search query.
          </div>
        ) : (
          filteredEmails.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className="bg-white border border-slate-200/65 hover:border-[#0024A8]/30 rounded-3xl p-5 sm:p-6 shadow-soft-xl cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0024A8]" />
                  <span className="text-[10px] font-extrabold uppercase text-[#0024A8] tracking-wider block">
                    {email.sender}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 truncate">
                  {email.subject}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {email.snippet}
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{email.date}</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-[#0024A8] hover:bg-[#0024A8]/5 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ==================================================================== */}
      {/* SECTION 3: EMAIL READER OVERLAY POPUP MODAL                          */}
      {/* ==================================================================== */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 animate-scaleIn max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 shrink-0">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-extrabold text-[#0024A8] uppercase tracking-wider block">
                  Secure Message Viewer
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-snug">
                  {selectedEmail.subject}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200/50 shrink-0 ml-4"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Email Sender Metadata */}
            <div className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0024A8]/10 text-[#0024A8] flex items-center justify-center font-bold">
                  SJ
                </div>
                <div>
                  <span className="text-slate-800 font-bold block">{selectedEmail.sender}</span>
                  <span className="text-[10px] text-slate-400 block">{selectedEmail.senderEmail}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase">Received Date</span>
                <span className="text-slate-700 block">{selectedEmail.date}</span>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto text-slate-600 text-xs leading-relaxed whitespace-pre-line py-2 pr-1 font-medium bg-white">
              {selectedEmail.body}
            </div>

            {/* Action buttons: Exit Reader and Reply */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0 text-[10px] font-extrabold uppercase">
              <button
                type="button"
                onClick={() => setSelectedEmail(null)}
                className="py-2.5 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all cursor-pointer"
              >
                Exit Reader
              </button>

              {/* Blue Reply button with white text (Placeholder action: does nothing for now) */}
              <button
                type="button"
                onClick={() => {
                  // Intentional placeholder: does nothing for now per instructions
                }}
                className="py-2.5 px-6 rounded-xl bg-[#0024A8] hover:bg-[#001D85] text-white font-extrabold shadow-md shadow-[#0024A8]/15 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
