/**
 * ==============================================================================
 * COMPONENT: CommunicationTab.tsx
 * Path: src/app/broker/components/CommunicationTab.tsx
 * Description: Communication log showing sent emails and a Compose Email modal.
 * ==============================================================================
 */

import React, { useState } from "react";
import { Mail, Search, Send, X, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Client, Email } from "../MockData";

interface CommunicationTabProps {
  clients: Client[];
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  autoCompose?: boolean;
  clearAutoCompose?: () => void;
}

export default function CommunicationTab({ clients, emails, setEmails, autoCompose, clearAutoCompose }: CommunicationTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [notification, setNotification] = useState<string | null>(null);

  // Auto-open compose modal if redirected
  React.useEffect(() => {
    if (autoCompose) {
      setIsComposeOpen(true);
      if (clearAutoCompose) {
        clearAutoCompose();
      }
    }
  }, [autoCompose, clearAutoCompose]);

  // Filter sent emails
  const filteredEmails = emails.filter((email) =>
    email.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Send Email Handler
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;

    // Get current date/time in custom string format
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours() % 12 || 12).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}`;

    const newEmail: Email = {
      id: `e-${Date.now()}`,
      clientId: selectedClientId,
      clientName: client.name,
      subject,
      body,
      dateSent: formattedDate,
      status: "Delivered"
    };

    setEmails(prev => [newEmail, ...prev]);
    setIsComposeOpen(false);
    
    // Reset Form
    setSelectedClientId("");
    setSubject("");
    setBody("");

    setNotification(`Email successfully dispatched to ${client.name}.`);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn relative">
      
      {/* ---------------------------------------------------------------------- */}
      {/* TAB HEADER & TOP-RIGHT COMPOSE BUTTON                                   */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">Communication Logs</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            View full outbound messages logs and dispatch secure mail alerts to your clients.
          </p>
        </div>

        {/* Compose Button (Top-Right as per request) */}
        <button
          onClick={() => setIsComposeOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#0B2369] hover:bg-[#071644] shadow-md shadow-[#0B2369]/10 transition-all self-start sm:self-auto"
        >
          <Mail className="w-4 h-4" />
          <span>Send Email</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{notification}</span>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* SEARCH FIELD                                                           */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search email archives by client name, subject, or contents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* EMAIL HISTORY ARCHIVE                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">Recipient Client</th>
                <th className="py-4 px-6">Subject & Snippet</th>
                <th className="py-4 px-6">Date Transmitted</th>
                <th className="py-4 px-6">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                    No emails dispatched matching query criteria.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((email) => (
                  <tr key={email.id} className="hover:bg-slate-50/30 transition-colors">
                    {/* Recipient Client */}
                    <td className="py-4.5 px-6 font-bold text-slate-800">
                      {email.clientName}
                    </td>

                    {/* Subject & Snippet */}
                    <td className="py-4.5 px-6 max-w-md">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">
                          {email.subject}
                        </span>
                        <p className="text-[11px] text-slate-400 font-medium truncate">
                          {email.body}
                        </p>
                      </div>
                    </td>

                    {/* Date Transmitted */}
                    <td className="py-4.5 px-6 text-slate-500 font-semibold">
                      {email.dateSent}
                    </td>

                    {/* Dispatch Status */}
                    <td className="py-4.5 px-6">
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {email.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* COMPOSE EMAIL MODAL (BACKDROP BLUR MOCKUP)                           */}
      {/* ==================================================================== */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-glow border border-slate-200 overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0B2369]" />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Compose Email to Client
                </h3>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              
              {/* Select Client Dropdown */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Recipient
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-semibold text-slate-600"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              {/* Subject Title */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outstanding Documents Review Required"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-bold text-slate-700 placeholder:text-slate-400"
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Email Message Body
                </label>
                <textarea
                  required
                  placeholder="Hi client name, please upload your tax files..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0B2369]/30 text-xs font-semibold text-slate-700 placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-[#0B2369] text-white hover:bg-[#071644] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#0B2369]/10"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
