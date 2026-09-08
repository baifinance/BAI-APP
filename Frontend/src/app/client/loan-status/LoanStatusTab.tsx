/**
 * ==============================================================================
 * COMPONENT: LoanStatusTab.tsx
 * Path: src/app/client/loan-status/LoanStatusTab.tsx
 * Description: Main Loan Status page component for the Client Portal.
 *              - Main container background: White
 *              - Top: ProgressStatus component ("In Progress" with blue gradient)
 *              - Middle: LoanProgressStepper component (Centered Stepper with blue/red steps)
 *              - Bottom: LoanProgressList component (Submitted documents list with status, date, title)
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import { Client } from "../../broker/MockData";
import ProgressStatus from "./components/ProgressStatus";
import LoanProgressStepper, { StepperStep } from "./components/LoanProgressStepper";
import LoanProgressList, { ProgressDocumentItem } from "./components/LoanProgressList";
import { UploadCloud, CheckCircle, X, FileText } from "lucide-react";

interface LoanStatusTabProps {
  client: Client;
  onLogAction?: (msg: string) => void;
}

export default function LoanStatusTab({
  client,
  onLogAction
}: LoanStatusTabProps) {
  // ----------------------------------------------------------------------------
  // 1. STATE MANAGEMENT: Client documents and active upload modal
  // ----------------------------------------------------------------------------
  const [activeUploadDoc, setActiveUploadDoc] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // 2. DATA MAPPING: Progress Stepper Steps
  // ----------------------------------------------------------------------------
  const stepperSteps: StepperStep[] = [
    {
      id: 1,
      title: "Submitted",
      subtitle: "Application logged",
      date: "Aug 10, 2026",
      status: "completed"
    },
    {
      id: 2,
      title: "In Review",
      subtitle: "Broker preliminary check",
      date: "Aug 15, 2026",
      status: "completed"
    },
    {
      id: 3,
      title: "Additional Info",
      subtitle: "Action needed on docs",
      date: "Aug 23, 2026",
      status: "in_process" // In process / has problem -> Red color
    },
    {
      id: 4,
      title: "Assessment",
      subtitle: "Formal underwriting",
      date: "Pending",
      status: "upcoming"
    },
    {
      id: 5,
      title: "Approval",
      subtitle: "Conditional approval",
      date: "Pending",
      status: "upcoming"
    },
    {
      id: 6,
      title: "Settled",
      subtitle: "Disbursement & settlement",
      date: "Pending",
      status: "upcoming"
    }
  ];

  // ----------------------------------------------------------------------------
  // 3. DATA MAPPING: Submitted Loan Documents List
  // ----------------------------------------------------------------------------
  const progressDocuments: ProgressDocumentItem[] = [
    {
      id: "doc-1",
      title: "Government ID",
      status: client.documents.governmentId === "Verified" ? "Approved" : client.documents.governmentId === "Uploaded" ? "Uploaded" : "Approved",
      statusChangeDate: "Aug 10, 2026",
      category: "Identity Verification",
      fileSize: "2.4 MB"
    },
    {
      id: "doc-2",
      title: "Proof of Income",
      status: client.documents.proofOfIncome === "Verified" ? "Approved" : client.documents.proofOfIncome === "Uploaded" ? "Uploaded" : "Approved",
      statusChangeDate: "Aug 12, 2026",
      category: "Income Verification",
      fileSize: "1.8 MB"
    },
    {
      id: "doc-3",
      title: "Bank Statement",
      status: client.documents.bankStatement === "Not Uploaded" ? "Needs Attention" : client.documents.bankStatement === "Uploaded" ? "Uploaded" : "Needs Attention",
      statusChangeDate: "Aug 23, 2026",
      category: "Financial Statement",
      fileSize: "4.1 MB"
    },
    {
      id: "doc-4",
      title: "Tax Documents",
      status: client.documents.taxDocuments === "Verified" ? "Approved" : client.documents.taxDocuments === "Uploaded" ? "Uploaded" : "Uploaded",
      statusChangeDate: "Aug 21, 2026",
      category: "ATO Tax Assessment",
      fileSize: "3.2 MB"
    },
    {
      id: "doc-5",
      title: "Employment Documents",
      status: client.documents.employmentDocs === "Pending" ? "Pending" : client.documents.employmentDocs === "Verified" ? "Approved" : "Pending",
      statusChangeDate: "Aug 18, 2026",
      category: "Letter of Employment",
      fileSize: "1.5 MB"
    },
    {
      id: "doc-6",
      title: "Collateral Documents",
      status: client.documents.collateralDocs === "Verified" ? "Approved" : client.documents.collateralDocs === "Uploaded" ? "Uploaded" : "Uploaded",
      statusChangeDate: "Aug 15, 2026",
      category: "Transfer Certificate of Title",
      fileSize: "5.6 MB"
    }
  ];

  // ----------------------------------------------------------------------------
  // 4. UPLOAD ACTION HANDLERS
  // ----------------------------------------------------------------------------
  const handleUploadTrigger = (docTitle: string) => {
    setActiveUploadDoc(docTitle);
    setSelectedFileName(`${docTitle.toLowerCase().replace(/\s+/g, "_")}_update.pdf`);
  };

  const handleConfirmUpload = () => {
    if (activeUploadDoc && onLogAction) {
      onLogAction(`Uploaded updated version for: ${activeUploadDoc}`);
    }
    setActiveUploadDoc(null);
    setSelectedFileName(null);
  };

  return (
    <div className="bg-white space-y-10 animate-fadeIn">
      
      {/* ---------------------------------------------------------------------- */}
      {/* PART 1: PROGRESS STATUS COMPONENT ("In Progress" with blue gradient)   */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Progress Status Header">
        <ProgressStatus
          statusText="In Progress"
          applicationNumber="LN-2026-8821"
          targetSettlement="Sep 30, 2026"
        />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* PART 2: LOAN PROGRESS STEPPER COMPONENT (Centered Stepper)             */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Loan Progress Stepper" className="pt-2 border-t border-slate-100">
        <LoanProgressStepper steps={stepperSteps} />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* PART 3: LOAN PROGRESS LIST COMPONENT (Submitted Documents Container)   */}
      {/* ---------------------------------------------------------------------- */}
      <section aria-label="Loan Progress Documents List" className="pt-2 border-t border-slate-100">
        <LoanProgressList
          documents={progressDocuments}
          clientDocuments={client.documents}
          onUploadDocument={handleUploadTrigger}
        />
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* PART 4: INTERACTIVE QUICK UPLOAD MODAL                                 */}
      {/* ---------------------------------------------------------------------- */}
      {activeUploadDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 animate-scaleIn">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  Document Re-submission
                </span>
                <h3 className="text-base font-extrabold text-[#0024A8]">{activeUploadDoc}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveUploadDoc(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 space-y-3">
              <UploadCloud className="w-10 h-10 text-[#0024A8] mx-auto animate-bounce" />
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {selectedFileName || "Drag & Drop or Click to Select File"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Supported formats: PDF, PNG, JPEG up to 10MB
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveUploadDoc(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                className="py-2.5 px-6 rounded-xl bg-[#0024A8] hover:bg-[#001D85] text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm & Submit</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
