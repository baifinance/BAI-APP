/**
 * ==============================================================================
 * COMPONENT: ClientApplicationDashboard.tsx
 * Path: src/app/broker/components/ClientApplicationDashboard.tsx
 * Description: Client Application Dashboard detailing loan stats,
 *              document uploads check/cross lists, vertical stages timeline,
 *              and client-specific system notifications.
 * ==============================================================================
 */

import React from "react";
import { ArrowLeft, Check, FileText, X, AlertTriangle, AlertCircle, Calendar, MessageSquare, Info } from "lucide-react";
import { Client } from "../MockData";

interface ClientApplicationDashboardProps {
  client: Client;
  onBack: () => void;
  variant?: "broker" | "loan_processing";
  onUpdateClient?: (updatedClient: Client) => void;
}

export default function ClientApplicationDashboard({ client: initialClient, onBack, variant, onUpdateClient }: ClientApplicationDashboardProps) {
  // Local state for client to allow immediate edits
  const [localClient, setLocalClient] = React.useState<Client>(initialClient);
  const client = localClient;

  // Active document status edit state
  const [activeDocEditKey, setActiveDocEditKey] = React.useState<string | null>(null);

  // Theme variants configuration
  const isLoanProcessing = variant === "loan_processing";
  const primaryText = isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";
  const timelineCompletedBg = isLoanProcessing ? "bg-[#1429A9]" : "bg-[#0070c0]";
  const hoverTextHighlight = isLoanProcessing ? "hover:text-[#1429A9] hover:border-[#1429A9]/40" : "hover:text-[#0B2369] hover:border-[#0B2369]/40";
  
  // Format currency helper
  const formatCurrency = (val: number) => {
    return `A$ ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleUpdateDocStatus = (docKey: string, newStatus: string) => {
    const updatedClient = {
      ...localClient,
      documents: {
        ...localClient.documents,
        [docKey]: newStatus
      }
    };
    setLocalClient(updatedClient);
    if (onUpdateClient) {
      onUpdateClient(updatedClient);
    }
  };

  const handleStageClick = (stageIndex: number) => {
    if (!isLoanProcessing) return;
    
    let targetProgress = 20;
    if (stageIndex === 1) targetProgress = 20;
    else if (stageIndex === 2) targetProgress = 40;
    else if (stageIndex === 3) targetProgress = 60;
    else if (stageIndex === 4) targetProgress = 80;
    else if (stageIndex === 5) targetProgress = 90;
    else if (stageIndex === 6) targetProgress = 100;

    const updatedClient = {
      ...localClient,
      progress: targetProgress
    };
    setLocalClient(updatedClient);
    if (onUpdateClient) {
      onUpdateClient(updatedClient);
    }
  };

  const getStageState = (stageIndex: number) => {
    const currentProgress = localClient.progress;
    switch (stageIndex) {
      case 1: return currentProgress >= 20 ? "completed" : "pending";
      case 2: return currentProgress >= 40 ? "completed" : "pending";
      case 3: return currentProgress >= 60 ? "completed" : "pending";
      case 4: return currentProgress >= 80 ? "completed" : "pending";
      case 5: return currentProgress >= 90 ? "completed" : "pending";
      case 6: return currentProgress >= 100 ? "completed" : "pending";
      default: return "pending";
    }
  };

  // ------------------------------------------------------------------------------
  // CLIENT NOTIFICATIONS LOG GENERATOR
  // ------------------------------------------------------------------------------
  const getClientNotifications = (clientId: string) => {
    switch (clientId) {
      case "c4": // Emma Wilson
        return [
          { type: "upload", message: "Emma Wilson uploaded certified UMID ID document.", time: "2 hours ago" },
          { type: "alert", message: "System alert: Bank Statement document uploaded is missing page 3.", time: "1 day ago" },
          { type: "broker", message: "Broker Sarah Jenkins requested signed builder contract and warranty insurance.", time: "2 days ago" }
        ];
      case "c2": // Alice Smith
        return [
          { type: "upload", message: "Alice Smith uploaded tax return worksheets.", time: "10 mins ago" },
          { type: "broker", message: "Broker Sarah Jenkins updated status to In Review.", time: "30 mins ago" },
          { type: "upload", message: "Alice Smith uploaded primary driver license copy.", time: "Yesterday" }
        ];
      case "c3": // Michael Brown
        return [
          { type: "upload", message: "Michael Brown uploaded investment property rental appraisal.", time: "Yesterday" },
          { type: "verify", message: "All 6 required document items verified by Sarah Jenkins.", time: "2 days ago" },
          { type: "submit", message: "Application files transmitted to Macquarie Bank.", time: "2 days ago" }
        ];
      default:
        return [
          { type: "status", message: `Application initialized in system. Document state: ${client.documentState}.`, time: "5 days ago" },
          { type: "broker", message: "Sarah Jenkins completed initial serviceability review.", time: "4 days ago" }
        ];
    }
  };

  const clientNotifications = getClientNotifications(client.id);

  // ------------------------------------------------------------------------------
  // DOCUMENTS CHECKLIST COMPILER (Has / Has Not)
  // ------------------------------------------------------------------------------
  const hasDocuments = [];
  const hasNotDocuments = [];

  const docs = client.documents;
  
  if (docs.governmentId === "Verified" || docs.governmentId === "Uploaded") hasDocuments.push("Government ID");
  else hasNotDocuments.push("Government ID");

  if (docs.proofOfIncome === "Verified" || docs.proofOfIncome === "Uploaded") hasDocuments.push("Proof of Income");
  else hasNotDocuments.push("Proof of Income");

  if (docs.bankStatement === "Verified" || docs.bankStatement === "Uploaded") hasDocuments.push("Bank Statement");
  else hasNotDocuments.push("Bank Statement");

  if (docs.taxDocuments === "Verified" || docs.taxDocuments === "Uploaded") hasDocuments.push("Tax Documents");
  else hasNotDocuments.push("Tax Documents");

  if (docs.employmentDocs === "Verified" || docs.employmentDocs === "Uploaded") hasDocuments.push("Employment Documents");
  else hasNotDocuments.push("Employment Documents");

  if (docs.businessDocs === "Verified" || docs.businessDocs === "Uploaded") hasDocuments.push("Business Documents");
  else if (docs.businessDocs !== "Not Required") hasNotDocuments.push("Business Documents");

  if (docs.collateralDocs === "Verified" || docs.collateralDocs === "Uploaded") hasDocuments.push("Collateral Documents");
  else if (docs.collateralDocs !== "Not Required") hasNotDocuments.push("Collateral Documents");

  if (docs.otherDocs === "Verified" || docs.otherDocs === "Uploaded") hasDocuments.push("Other Documents");
  else if (docs.otherDocs !== "Not Required") hasNotDocuments.push("Other Documents");

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Back button */}
      <div>
        <button 
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all shadow-xs ${primaryText} ${hoverTextHighlight}`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to List</span>
        </button>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ==================================================================== */}
        {/* LEFT COLUMN: LOAN INFO & DOCUMENTS CHECKLIST                          */}
        {/* ==================================================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Information Container */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className={`text-base font-extrabold ${primaryText}`}>
                Loan Information
              </h3>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/40">
                {client.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs font-medium text-slate-600">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Client Name</span>
                <span className="text-sm font-bold text-slate-800 block">{client.name}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Loan Type</span>
                <span className="text-sm font-bold text-slate-800 block">{client.loan.loanType}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Requested Amount</span>
                <span className={`text-sm font-black block ${primaryText}`}>{formatCurrency(client.loan.requestedAmount)}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Preferred Term</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.loan.preferredTerm} Years</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Est. Monthly Repayments</span>
                <span className="text-sm font-semibold text-slate-700 block">{formatCurrency(client.loan.preferredMonthlyPayment)}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Urgency Level</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1 ${
                  client.loan.urgency === "Critical" || client.loan.urgency === "High"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {client.loan.urgency}
                </span>
              </div>
              <div className="space-y-0.5 sm:col-span-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Application Purpose</span>
                <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
                  {client.loan.purpose}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Documents Container (Under Information Container) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 pb-2 border-b border-slate-100">
              Dossier Documents Checklist
            </h3>

            {/* Document Metadata Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Date Uploaded</th>
                    <th className="py-2.5 px-3 text-right">Size</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 text-xs font-semibold">
                  {[
                    { name: "Government ID", status: docs.governmentId, key: "governmentId" },
                    { name: "Proof of Income", status: docs.proofOfIncome, key: "proofOfIncome" },
                    { name: "Bank Statement", status: docs.bankStatement, key: "bankStatement" },
                    { name: "Tax Documents", status: docs.taxDocuments, key: "taxDocuments" },
                    { name: "Employment Documents", status: docs.employmentDocs, key: "employmentDocs" },
                    ...(docs.businessDocs !== "Not Required" ? [{ name: "Business Documents", status: docs.businessDocs, key: "businessDocs" }] : []),
                    ...(docs.collateralDocs !== "Not Required" ? [{ name: "Collateral Documents", status: docs.collateralDocs, key: "collateralDocs" }] : []),
                    ...(docs.otherDocs !== "Not Required" ? [{ name: "Other Documents", status: docs.otherDocs, key: "otherDocs" }] : []),
                  ].map((doc, idx) => {
                    // Fetch document details dynamically based on status
                    const isLoaded = doc.status === "Verified" || doc.status === "Uploaded";
                    const meta = isLoaded 
                      ? (doc.name === "Government ID" ? { type: "PDF", date: "2026-08-20", size: "1.2 MB" }
                        : doc.name === "Proof of Income" ? { type: "PDF", date: "2026-08-21", size: "3.4 MB" }
                        : doc.name === "Bank Statement" ? { type: "PDF", date: "2026-08-22", size: "4.1 MB" }
                        : doc.name === "Tax Documents" ? { type: "PDF", date: "2026-08-19", size: "2.8 MB" }
                        : doc.name === "Employment Documents" ? { type: "PDF", date: "2026-08-20", size: "950 KB" }
                        : doc.name === "Business Documents" ? { type: "PDF", date: "2026-08-22", size: "2.1 MB" }
                        : doc.name === "Collateral Documents" ? { type: "JPEG", date: "2026-08-21", size: "1.8 MB" }
                        : { type: "PDF", date: "2026-08-23", size: "550 KB" })
                      : { type: "-", date: "-", size: "-" };

                    return (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-slate-800 font-bold">{doc.name}</td>
                        <td className="py-3 px-3 relative">
                          <span 
                            onClick={(e) => {
                              if (isLoanProcessing) {
                                e.stopPropagation();
                                setActiveDocEditKey(activeDocEditKey === doc.key ? null : doc.key);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                              isLoanProcessing ? "cursor-pointer hover:ring-2 hover:ring-[#1429A9]/30" : ""
                            } ${
                              doc.status === "Verified"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : doc.status === "Uploaded"
                                ? "bg-blue-50 text-blue-600 border border-blue-100"
                                : doc.status === "Pending"
                                ? "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse"
                                : doc.status === "Not Uploaded"
                                ? "bg-slate-50 text-slate-400 border border-slate-200"
                                : "bg-rose-50 text-rose-600 border border-rose-100"
                            }`}
                          >
                            {doc.status === "Not Uploaded" ? "Action Needed" : doc.status}
                          </span>

                          {isLoanProcessing && activeDocEditKey === doc.key && (
                            <>
                              <div 
                                className="fixed inset-0 z-20 cursor-default" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDocEditKey(null);
                                }}
                              />
                              <div 
                                className="absolute left-3 top-9 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-30 p-2 w-32 space-y-1 animate-scaleIn text-left"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-0.5">
                                  Set Status
                                </span>
                                {["Not Uploaded", "Pending", "Uploaded", "Verified", "Declined"].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => {
                                      handleUpdateDocStatus(doc.key, opt);
                                      setActiveDocEditKey(null);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded-lg text-[9px] font-bold transition-colors ${
                                      doc.status === opt 
                                        ? "bg-[#1429A9]/5 text-[#1429A9]" 
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                    }`}
                                  >
                                    {opt === "Not Uploaded" ? "Action Needed" : opt}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium">{meta.type}</td>
                        <td className="py-3 px-3 text-slate-500 font-medium">{meta.date}</td>
                        <td className="py-3 px-3 text-right text-slate-600 font-bold">{meta.size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: PROGRESS TIMELINE & CLIENT NOTIFICATIONS               */}
        {/* ==================================================================== */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. Progress Container (Vertical Timeline matching user screenshot) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-soft-xl space-y-6">
            <h3 className="text-base font-extrabold text-slate-800">
              Progress
            </h3>

            {/* Vertical stages timeline */}
            <div className="space-y-6 relative pl-3.5 before:absolute before:left-7.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
              {[
                { index: 1, label: "Submitted" },
                { index: 2, label: "In Review" },
                { index: 3, label: "Additional Info Requested" },
                { index: 4, label: "Approved" },
                { index: 5, label: "Declined" },
                { index: 6, label: "Settled" },
              ].map((stage) => {
                const state = getStageState(stage.index);
                const isCompleted = state === "completed";
                const isClickable = isLoanProcessing;

                let circleContent = <span className="font-extrabold text-[10px]">{stage.index}</span>;
                let circleClass = "bg-slate-100 border border-slate-300 text-slate-400";
                let textClass = "text-slate-400 font-semibold";
                let opacityClass = "opacity-60";

                if (isCompleted) {
                  opacityClass = "opacity-100";
                  textClass = "text-slate-700 font-bold";

                  if (stage.index === 1 || stage.index === 2) {
                    circleContent = <Check className="w-4 h-4 stroke-[3]" />;
                    circleClass = `text-white ${timelineCompletedBg}`;
                  } else if (stage.index === 3) {
                    if (localClient.progress >= 80) {
                      circleContent = <Check className="w-4 h-4 stroke-[3]" />;
                      circleClass = `text-white ${timelineCompletedBg}`;
                    } else {
                      circleContent = <FileText className="w-4 h-4" />;
                      circleClass = "bg-[#EA580C] text-white";
                    }
                  } else if (stage.index === 4) {
                    circleContent = <Check className="w-4 h-4 stroke-[3]" />;
                    circleClass = "bg-emerald-600 text-white";
                  } else if (stage.index === 5) {
                    circleClass = "bg-rose-600 text-white border-rose-600";
                  } else if (stage.index === 6) {
                    circleClass = "bg-indigo-955 text-white border-indigo-955";
                  }
                }

                return (
                  <div key={stage.index} className={`flex items-center gap-4 relative z-10 ${opacityClass}`}>
                    <div 
                      onClick={() => handleStageClick(stage.index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-soft-xl transition-all ${circleClass} ${
                        isClickable ? "cursor-pointer hover:scale-110 active:scale-95" : ""
                      }`}
                    >
                      {circleContent}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${textClass}`}>{stage.label}</span>
                      {stage.index === 3 && isCompleted && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-extrabold uppercase tracking-wider">
                          Action needed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Notification Container (Under Progress Bar) */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-soft-xl space-y-4">
            <div className="border-b border-slate-50 pb-2.5 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 text-sm">Application Alerts</h4>
              <span className="text-[10px] font-bold text-slate-400">Activity Logs</span>
            </div>

            <div className="space-y-3">
              {clientNotifications.map((notif, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border text-[11px] leading-relaxed font-semibold ${
                    notif.type === "alert" 
                      ? "bg-rose-50/50 border-rose-100 text-rose-800"
                      : notif.type === "upload"
                      ? "bg-blue-50/50 border-blue-100 text-blue-800"
                      : "bg-slate-50 border-slate-200/40 text-slate-700"
                  }`}
                >
                  <p>{notif.message}</p>
                  <span className="text-[9px] text-slate-400 block mt-1 font-medium">{notif.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
