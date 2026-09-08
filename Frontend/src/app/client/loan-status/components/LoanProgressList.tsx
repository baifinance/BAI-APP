/**
 * ==============================================================================
 * COMPONENT: LoanProgressList.tsx
 * Path: src/app/client/loan-status/components/LoanProgressList.tsx
 * Description: Container component displaying the list of submitted loan documents.
 *              - Left: Document Title
 *              - Center: Date of recent status change
 *              - Right: Document Status (square with 5px radius, 75% opacity background, white text)
 *                * Green = Approved / Verified
 *                * Orange = Uploaded / Pending
 *                * Red = Declined / Needs Attention / Action Needed
 *              - Table header has website theme blue background (#0024A8) and white text.
 *              - Connected compact table layout without separate containers or shadows.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { FileText, Calendar, UploadCloud, X } from "lucide-react";
import { ClientDocuments } from "../../../broker/MockData";

export interface ProgressDocumentItem {
  id: string;
  title: string;
  status: "Approved" | "Uploaded" | "Pending" | "Declined" | "Needs Attention" | "Not Uploaded";
  statusChangeDate: string;
  category?: string;
  fileSize?: string;
}

interface LoanProgressListProps {
  documents?: ProgressDocumentItem[];
  clientDocuments?: ClientDocuments;
  onUploadDocument?: (docTitle: string) => void;
}

export default function LoanProgressList({
  documents,
  clientDocuments,
  onUploadDocument
}: LoanProgressListProps) {
  // Modal state for uploading/viewing document details
  const [selectedDoc, setSelectedDoc] = useState<ProgressDocumentItem | null>(null);

  // Default document list if not explicitly passed
  const defaultDocuments: ProgressDocumentItem[] = [
    {
      id: "doc-1",
      title: "Government ID",
      status: "Approved",
      statusChangeDate: "Aug 10, 2026",
      category: "Identity Verification",
      fileSize: "2.4 MB"
    },
    {
      id: "doc-2",
      title: "Proof of Income",
      status: "Approved",
      statusChangeDate: "Aug 12, 2026",
      category: "Income Verification",
      fileSize: "1.8 MB"
    },
    {
      id: "doc-3",
      title: "Bank Statement",
      status: "Needs Attention",
      statusChangeDate: "Aug 23, 2026",
      category: "Financial Statement",
      fileSize: "4.1 MB"
    },
    {
      id: "doc-4",
      title: "Tax Documents",
      status: "Uploaded",
      statusChangeDate: "Aug 21, 2026",
      category: "ATO Tax Assessment",
      fileSize: "3.2 MB"
    },
    {
      id: "doc-5",
      title: "Employment Documents",
      status: "Pending",
      statusChangeDate: "Aug 18, 2026",
      category: "Employment Contract",
      fileSize: "1.5 MB"
    },
    {
      id: "doc-6",
      title: "Collateral Documents",
      status: "Uploaded",
      statusChangeDate: "Aug 15, 2026",
      category: "Property Title & Appraisal",
      fileSize: "5.6 MB"
    }
  ];

  // Resolve documents list
  const docList = documents || defaultDocuments;

  // ----------------------------------------------------------------------------
  // 1. STATUS BADGE STYLING HELPER: 5px radius, 75% opacity, white text
  // ----------------------------------------------------------------------------
  const getStatusBadgeStyle = (status: ProgressDocumentItem["status"]) => {
    switch (status) {
      case "Approved":
        return {
          bgClass: "bg-emerald-600/75",
          label: "Approved"
        };
      case "Uploaded":
      case "Pending":
        return {
          bgClass: "bg-amber-500/75",
          label: status
        };
      case "Declined":
      case "Needs Attention":
      case "Not Uploaded":
      default:
        return {
          bgClass: "bg-rose-600/75",
          label: status === "Not Uploaded" ? "Needs Attention" : status
        };
    }
  };

  return (
    /* ------------------------------------------------------------------------ */
    /* 2. MAIN CONTAINER: Unified compact table container without shadows      */
    /* ------------------------------------------------------------------------ */
    <div className="w-full rounded-2xl border border-slate-200/80 overflow-hidden shadow-none bg-white animate-fadeIn">
      
      {/* ---------------------------------------------------------------------- */}
      {/* 3. TABLE HEADER: Blue theme (#0024A8) background with white text       */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-[#0024A8] text-white text-[11px] font-extrabold uppercase tracking-wider items-center">
        {/* Left: Document Title */}
        <div className="col-span-6 sm:col-span-5 text-left">
          Document Title
        </div>
        
        {/* Center: Recent Status Date */}
        <div className="col-span-3 sm:col-span-4 text-center">
          Recent Status Date
        </div>

        {/* Right: Document Status */}
        <div className="col-span-3 text-right">
          Document Status
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. DOCUMENT LIST: Connected rows, close to each other, no shadow       */}
      {/* ---------------------------------------------------------------------- */}
      <div className="divide-y divide-slate-100">
        {docList.map((doc) => {
          const badgeStyle = getStatusBadgeStyle(doc.status);

          return (
            <div
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="grid grid-cols-12 gap-4 items-center px-5 py-3.5 bg-white hover:bg-blue-50/30 transition-colors cursor-pointer group"
            >
              {/* -------------------------------------------------------------- */}
              {/* LEFT: Document Title & Category                                */}
              {/* -------------------------------------------------------------- */}
              <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#0024A8] shrink-0" />
                <div className="min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm text-slate-800 group-hover:text-[#0024A8] transition-colors block truncate">
                    {doc.title}
                  </span>
                  {doc.category && (
                    <span className="text-[10px] text-slate-400 font-medium block truncate">
                      {doc.category}
                    </span>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------------- */}
              {/* CENTER: Recent Status Date                                     */}
              {/* -------------------------------------------------------------- */}
              <div className="col-span-3 sm:col-span-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline-block" />
                <span>{doc.statusChangeDate}</span>
              </div>

              {/* -------------------------------------------------------------- */}
              {/* RIGHT: Document Status Badge (Square, 5 radius, 75% opacity)  */}
              {/* -------------------------------------------------------------- */}
              <div className="col-span-3 flex items-center justify-end">
                <span
                  className={`${badgeStyle.bgClass} text-white text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-[5px] text-center min-w-[95px] sm:min-w-[110px]`}
                >
                  {badgeStyle.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. INTERACTIVE DOCUMENT DETAIL / ACTION MODAL                          */}
      {/* ---------------------------------------------------------------------- */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200/60 space-y-5 animate-scaleIn">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Document Audit Record
                </span>
                <h4 className="text-base font-extrabold text-[#0024A8]">
                  {selectedDoc.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/50">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                <span className="font-extrabold text-slate-800">{selectedDoc.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Recent Update</span>
                <span className="font-bold text-slate-700">{selectedDoc.statusChangeDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-slate-700">{selectedDoc.category || "General"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Size</span>
                <span className="font-semibold text-slate-700">{selectedDoc.fileSize || "PDF Document"}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUploadDocument) onUploadDocument(selectedDoc.title);
                  setSelectedDoc(null);
                }}
                className="py-2 px-5 rounded-xl bg-[#0024A8] hover:bg-[#001D85] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload New Version</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
