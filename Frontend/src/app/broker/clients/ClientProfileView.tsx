/**
 * ==============================================================================
 * COMPONENT: ClientProfileView.tsx
 * Path: src/app/broker/components/ClientProfileView.tsx
 * Description: Detailed deep-dive Client Information dashboard with tabs:
 *              Profile, Loan, Employment, Collateral, Obligations, Documents, Broker.
 * ==============================================================================
 */

import React, { useState } from "react";
import { ArrowLeft, User, DollarSign, Briefcase, ShieldAlert, FileText, CheckCircle, Percent } from "lucide-react";
import { Client } from "../MockData";

interface ClientProfileViewProps {
  client: Client;
  onBack: () => void;
}

type SubTab = "Profile" | "Loan" | "Employment" | "Collateral" | "Obligations" | "Documents" | "Broker";

export default function ClientProfileView({ client, onBack }: ClientProfileViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("Profile");

  // Tab definitions
  const tabs = [
    { id: "Profile" as SubTab, label: "Profile", icon: User },
    { id: "Loan" as SubTab, label: "Loan", icon: DollarSign },
    { id: "Employment" as SubTab, label: "Employment", icon: Briefcase },
    { id: "Collateral" as SubTab, label: "Collateral", icon: FileText },
    { id: "Obligations" as SubTab, label: "Obligations", icon: ShieldAlert },
    { id: "Documents" as SubTab, label: "Documents", icon: CheckCircle },
    { id: "Broker" as SubTab, label: "Broker", icon: Percent },
  ];

  // Helper: Format currency
  const formatCurrency = (val: number) => {
    return `A$ ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Helper: Get status colors for documents
  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200";
      case "Uploaded":
        return "bg-blue-50 text-blue-600 border border-blue-200";
      case "Pending":
        return "bg-amber-50 text-amber-600 border border-amber-200 animate-pulse";
      case "Not Uploaded":
        return "bg-rose-50 text-rose-600 border border-rose-200";
      default:
        return "bg-slate-50 text-slate-400 border border-slate-200";
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Back button header */}
      <div>
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#0B2369] bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: PROFILE CONTAINER                                         */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl flex items-center gap-5">
        {/* Avatar Profile Picture (Top Left of container) */}
        <div className="w-16 h-16 rounded-full bg-[#EBF2FF] text-[#0B2369] flex items-center justify-center font-black text-2xl border-2 border-white shadow-soft-xl shrink-0">
          {client.name.split(" ").map(n => n[0]).join("")}
        </div>
        
        {/* Client Name and Small Italic Email */}
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-[#0B2369] tracking-tight truncate">
            {client.name}
          </h2>
          <span className="text-xs text-slate-500 font-medium italic block mt-0.5">
            {client.email}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: INFORMATION CONTAINER                                     */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden">
        
        {/* Sub-tab Selectors (Top Left of this container) */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-2.5 overflow-x-auto gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeSubTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                  isTabActive
                    ? "bg-[#0B2369] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Detail Content Fields */}
        <div className="p-6 sm:p-8">
          
          {/* PROFILE DATA FIELDS */}
          {activeSubTab === "Profile" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Legal Name</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile?.fullLegalName || client.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Birth</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.dob}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Place of Birth</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.placeOfBirth || "N/A"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nationality</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.nationality}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Civil Status</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.civilStatus}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Number of Dependents</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.numberOfDependents ?? 0}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.mobile || client.phone}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.email || client.email}</span>
              </div>
              <div className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Residential Address</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.residentialAddress || client.profile.address}</span>
              </div>
              <div className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current / Previous Address</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.previousAddress || "N/A"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Verification Type</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.profile.idType}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ID Reference Number</span>
                <span className="text-sm font-mono font-semibold text-slate-700 block">{client.profile.idNumber}</span>
              </div>
            </div>
          )}

          {/* LOAN DATA FIELDS */}
          {activeSubTab === "Loan" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loan Type</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.loan.loanType}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested Amount</span>
                <span className="text-sm font-black text-[#0B2369] block">{formatCurrency(client.loan.requestedAmount)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Urgency Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1 ${
                  client.loan.urgency === "Critical" || client.loan.urgency === "High"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {client.loan.urgency}
                </span>
              </div>
              <div className="space-y-1 md:col-span-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Application Purpose</span>
                <span className="text-sm font-medium text-slate-600 leading-relaxed block">{client.loan.purpose}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Term</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.loan.preferredTerm} Years</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Monthly Repayments</span>
                <span className="text-sm font-semibold text-slate-700 block">{formatCurrency(client.loan.preferredMonthlyPayment)} / month</span>
              </div>
            </div>
          )}

          {/* EMPLOYMENT DATA FIELDS */}
          {activeSubTab === "Employment" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employment Status</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.employment.status}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employer / Business Name</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.employment.employerBusiness}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job Position / Title</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.employment.position}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Years Employed / Operating</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.employment.yearsEmployed} Years</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Gross Income</span>
                <span className="text-sm font-semibold text-emerald-600 block">{formatCurrency(client.employment.monthlyGrossIncome)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Net Income (After Tax)</span>
                <span className="text-sm font-semibold text-emerald-700 block">{formatCurrency(client.employment.monthlyNetIncome)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Declared Other Monthly Income</span>
                <span className="text-sm font-semibold text-slate-700 block">{formatCurrency(client.employment.otherIncome)}</span>
              </div>
            </div>
          )}

          {/* COLLATERAL DATA FIELDS */}
          {activeSubTab === "Collateral" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Collateral Type</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.collateral.collateralType || "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ownership Status</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.collateral.ownership || "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Value</span>
                  <span className="text-sm font-bold text-[#0B2369] block">{client.collateral.estimatedValue > 0 ? formatCurrency(client.collateral.estimatedValue) : "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Appraised Value</span>
                  <span className="text-sm font-bold text-emerald-700 block">{client.collateral.appraisedValue ? formatCurrency(client.collateral.appraisedValue) : "N/A"}</span>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.collateral.location || client.profile?.residentialAddress || client.profile?.address}</span>
                </div>
                <div className="space-y-1 md:col-span-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description</span>
                  <span className="text-sm font-medium text-slate-600 leading-relaxed block bg-slate-50 p-3.5 rounded-xl border border-slate-100">{client.collateral.description || "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condition</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.collateral.condition || "N/A"}</span>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Existing Mortgages or Financing encumbrances</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.collateral.existingMortgage || "None"}</span>
                </div>
              </div>

              {client.collateral.requiredDocuments && client.collateral.requiredDocuments.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="text-[10px] font-bold text-[#0B2369] uppercase tracking-wider block">Collateral Documents Needed</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                    {client.collateral.requiredDocuments.map((doc, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                        <span className="text-slate-700">{doc}</span>
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">Required</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OBLIGATIONS DATA FIELDS */}
          {activeSubTab === "Obligations" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Has Existing Loans?</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.obligations.hasExistingLoans}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Existing Debt Balance</span>
                  <span className="text-sm font-semibold text-slate-700 block">{formatCurrency(client.obligations.existingLoanAmount)}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Debt Payments</span>
                  <span className="text-sm font-semibold text-rose-600 block">{formatCurrency(client.obligations.monthlyDebtPayments)} / month</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Number of Active Loans</span>
                  <span className="text-sm font-semibold text-slate-700 block">{client.obligations.numExistingLoans}</span>
                </div>
              </div>

              {client.obligations.items && client.obligations.items.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-[#0B2369] uppercase tracking-wider block">Detailed Liabilities Breakdown</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {client.obligations.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                          <span className="font-extrabold text-xs text-slate-800">{item.liabilityType}</span>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">{item.paymentStatus}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Creditor</span>
                            <span className="text-slate-700">{item.creditor}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Balance</span>
                            <span className="text-rose-600 font-bold">{formatCurrency(item.outstandingBalance)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Monthly Payment</span>
                            <span className="text-slate-700">{formatCurrency(item.monthlyPayment)} / mo</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Interest Rate</span>
                            <span className="text-slate-700">{item.interestRate}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Loan Term</span>
                            <span className="text-slate-700">{item.loanTerm}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Remaining Term</span>
                            <span className="text-slate-700">{item.remainingTerm}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS DATA FIELDS */}
          {activeSubTab === "Documents" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Government ID</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.governmentId)}`}>
                  {client.documents.governmentId}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Proof of Income</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.proofOfIncome)}`}>
                  {client.documents.proofOfIncome}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Bank Statement</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.bankStatement)}`}>
                  {client.documents.bankStatement}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Tax Documents</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.taxDocuments)}`}>
                  {client.documents.taxDocuments}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Employment Documents</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.employmentDocs)}`}>
                  {client.documents.employmentDocs}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Business Documents</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.businessDocs)}`}>
                  {client.documents.businessDocs}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Collateral Documents</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.collateralDocs)}`}>
                  {client.documents.collateralDocs}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-700">Other Documents</span>
                <span className={`px-2.5 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase ${getDocStatusBadge(client.documents.otherDocs)}`}>
                  {client.documents.otherDocs}
                </span>
              </div>

            </div>
          )}

          {/* BROKER DETAILS DATA FIELDS */}
          {activeSubTab === "Broker" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Broker</span>
                <span className="text-sm font-semibold text-slate-700 block">{client.brokerDetails.assignedBroker}</span>
              </div>
              
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Application Status</span>
                <span className="text-sm font-semibold text-[#0B2369] block font-extrabold">{client.brokerDetails.applicationStatus}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Commission</span>
                <span className="text-sm font-semibold text-emerald-600 block font-bold">{client.brokerDetails.commission}</span>
              </div>

              <div className="space-y-1 md:col-span-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Broker Internal Notes</span>
                <span className="text-sm font-medium text-slate-600 leading-relaxed block bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {client.brokerDetails.brokerNotes}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lender Recommendation Matches</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {client.brokerDetails.lenderMatches.map((l, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold">
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lenders Submitted To</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {client.brokerDetails.submittedLenders.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">None submitted yet</span>
                  ) : (
                    client.brokerDetails.submittedLenders.map((l, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                        {l}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lender Approval Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-extrabold uppercase mt-1.5 ${
                  client.brokerDetails.approvalStatus.includes("Fully") || client.brokerDetails.approvalStatus.includes("Pre-Approved")
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : client.brokerDetails.approvalStatus.includes("Declined")
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-amber-50 text-amber-600 border border-amber-200"
                }`}>
                  {client.brokerDetails.approvalStatus}
                </span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
