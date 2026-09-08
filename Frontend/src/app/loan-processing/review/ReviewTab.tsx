/**
 * ==============================================================================
 * COMPONENT: ReviewTab.tsx
 * Path: src/app/loan-processing/review/ReviewTab.tsx
 * Description: Interactive Document Review screen with auditor triggers
 *              (Approve, Request Info, Decline) linking to the Audit Logs.
 * ==============================================================================
 */

import React, { useState } from "react";
import { CheckSquare, Check, HelpCircle, XCircle, Info, FileText } from "lucide-react";
import { SubmittedDocument } from "../MockLoanProcessingData";

interface ReviewTabProps {
  submittedDocs: SubmittedDocument[];
  setSubmittedDocs: React.Dispatch<React.SetStateAction<SubmittedDocument[]>>;
  onLogAction: (actionText: string) => void;
}

export default function ReviewTab({ submittedDocs, setSubmittedDocs, onLogAction }: ReviewTabProps) {
  // ------------------------------------------------------------------------------
  // STATE DEFINITIONS
  // ------------------------------------------------------------------------------
  const [selectedDoc, setSelectedDoc] = useState<SubmittedDocument | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);

  // Filter only pending reviews
  const pendingDocs = submittedDocs.filter((doc) => doc.status === "To Be Reviewed");

  // Helper date parsing (current date 2026-08-24)
  const currentDateStr = "2026-08-24";
  const currentTimeStr = "11:00 AM";

  // ------------------------------------------------------------------------------
  // ACTION HANDLERS
  // ------------------------------------------------------------------------------
  const handleApprove = (docId: string, clientName: string, docName: string) => {
    setSubmittedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "Approved" as const } : d))
    );
    onLogAction(`Approved ${docName} for ${clientName}`);
    setSelectedDoc(null);
  };

  const handleAdditionalRequest = (docId: string, clientName: string, docName: string) => {
    setSubmittedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "Additional Request" as const } : d))
    );
    onLogAction(`Requested Additional Info (${docName}) for ${clientName}`);
    setSelectedDoc(null);
  };

  const handleDecline = (docId: string, clientName: string, docName: string) => {
    if (!declineReason) {
      alert("Please provide a reason for declining.");
      return;
    }
    setSubmittedDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "Decline" as const } : d))
    );
    onLogAction(`Declined ${docName} for ${clientName} - Reason: ${declineReason}`);
    setDeclineReason("");
    setIsDeclineOpen(false);
    setSelectedDoc(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-800">Document Review Audit</h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Process client document submissions, inspect security compliance, and authorize files.
        </p>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Pending Files list */}
        <div className={`${selectedDoc ? "lg:col-span-6" : "lg:col-span-12"} bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4 transition-all duration-300`}>
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-50 pb-2">
            Pending Submissions ({pendingDocs.length})
          </h3>

          <div className="divide-y divide-slate-100">
            {pendingDocs.length === 0 ? (
              <p className="py-8 text-center text-slate-400 text-xs font-semibold">
                All uploaded client documents reviewed. Outstanding count: 0.
              </p>
            ) : (
              pendingDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => { setSelectedDoc(doc); setIsDeclineOpen(false); }}
                  className={`py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 p-2.5 rounded-xl transition-colors ${
                    selectedDoc?.id === doc.id ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 block">
                      {doc.clientName}
                    </span>
                    <span className="text-[11px] text-[#1429A9] font-bold block">
                      {doc.documentName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Submitted: {doc.dateSubmitted} | Loan: {doc.loanType}
                    </span>
                  </div>

                  <button className="py-1 px-3 bg-slate-100 hover:bg-[#1429A9] hover:text-white rounded-lg text-[10px] font-bold border border-slate-200/50 text-slate-600 transition-all shrink-0">
                    Audit File
                  </button>
                </div>
              ))
            )}
          </div>

          {/* BOTTOM LEFT PAGE COUNTER */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Showing {pendingDocs.length > 0 ? 1 : 0} to {pendingDocs.length} of {pendingDocs.length} entries</span>
          </div>
        </div>

        {/* Right Side: File Review workspace */}
        {selectedDoc && (
          <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-6 animate-scaleIn">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Document Auditor Panel
                </span>
                <h3 className="text-base font-extrabold text-[#1429A9]">
                  {selectedDoc.documentName}
                </h3>
              </div>
              
              <button
                onClick={() => { setSelectedDoc(null); setIsDeclineOpen(false); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50"
              >
                Close Audit
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-4.5 rounded-2xl border border-slate-200/30">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase">Applicant Client</span>
                <span className="text-slate-800 block">{selectedDoc.clientName}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase">Loan Category</span>
                <span className="text-slate-800 block">{selectedDoc.loanType}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase">File Format</span>
                <span className="text-slate-700 block">{selectedDoc.fileType || "PDF"}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase">Document Size</span>
                <span className="text-slate-700 block">{selectedDoc.fileSize || "1.5 MB"}</span>
              </div>
            </div>

            {/* Verification operations */}
            {!isDeclineOpen ? (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Audit Actions</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleApprove(selectedDoc.id, selectedDoc.clientName, selectedDoc.documentName)}
                    className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleAdditionalRequest(selectedDoc.id, selectedDoc.clientName, selectedDoc.documentName)}
                    className="py-3 px-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-md shadow-amber-500/10 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request Info</span>
                  </button>

                  <button
                    onClick={() => setIsDeclineOpen(true)}
                    className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-md shadow-rose-600/10 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4.5 bg-rose-50/50 border border-rose-100 rounded-2xl animate-fadeIn">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Decline Reason Details</span>
                
                <textarea
                  required
                  placeholder="Provide brief details (e.g. Payslip dates expired, ID document signatures missing...)"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-rose-200 focus:outline-none text-xs font-semibold text-slate-700 placeholder:text-slate-400 rounded-xl resize-none"
                />

                <div className="flex items-center justify-end gap-2 text-[10px] font-bold pt-1.5 border-t border-rose-100">
                  <button
                    onClick={() => { setIsDeclineOpen(false); setDeclineReason(""); }}
                    className="py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDecline(selectedDoc.id, selectedDoc.clientName, selectedDoc.documentName)}
                    className="py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Decline File
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
