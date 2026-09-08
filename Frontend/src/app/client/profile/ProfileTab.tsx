/**
 * ==============================================================================
 * COMPONENT: ProfileTab.tsx
 * Path: src/app/client/components/ProfileTab.tsx
 * Description: Client Profile dashboard featuring Welcome banner, tabbed dossier
 *              folders with a stacked "All View" category, document uploader
 *              popup modal, application vertical stepper, and meeting reminder.
 * ==============================================================================
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, ShieldCheck, Landmark, Check, FileText, X, AlertCircle, Calendar, UploadCloud, Trash2, ArrowRight, Pen, Mail, Phone } from "lucide-react";
import { Client, Booking, LiabilityItem } from "../../broker/MockData";
import { dossierDocIcons } from "./dossierIcons";
import { usersApi } from "@/lib/api";

interface ProfileTabProps {
  client: Client;
  setClient: React.Dispatch<React.SetStateAction<Client>>;
  onLogAction: (actionText: string) => void;
}

type DossierCategory = "Personal" | "Financial" | "Collateral" | "Liabilities";

/**
 * ==============================================================================
 * SUB-COMPONENT: CountryFlag
 * Description: Renders a high-resolution SVG flag graphic to ensure consistent,
 *              crisp visual presentation across all operating systems and browsers
 *              (avoiding OS emoji font discrepancies such as plain two-letter codes).
 * ==============================================================================
 */
function CountryFlag({ isPhilippines }: { isPhilippines: boolean }) {
  if (isPhilippines) {
    return (
      <svg
        className="w-5 h-3.5 rounded-[2px] shadow-2xs inline-block shrink-0 border border-slate-200/50"
        viewBox="0 0 600 300"
        aria-label="Flag of Philippines"
      >
        <rect width="600" height="150" fill="#0038A8" />
        <rect y="150" width="600" height="150" fill="#CE1126" />
        <polygon points="0,0 260,150 0,300" fill="#FFFFFF" />
        <circle cx="85" cy="150" r="28" fill="#FCD116" />
        <polygon points="215,150 205,153 210,145" fill="#FCD116" />
        <polygon points="45,45 55,50 48,40" fill="#FCD116" />
        <polygon points="45,255 55,250 48,260" fill="#FCD116" />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-3.5 rounded-[2px] shadow-2xs inline-block shrink-0 border border-slate-200/50"
      viewBox="0 0 1200 600"
      aria-label="Flag of Australia"
    >
      <rect width="1200" height="600" fill="#00008B" />
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#FFFFFF" strokeWidth="60" />
      <path d="M0,0 L600,300 M600,0 L0,300" stroke="#CC0000" strokeWidth="40" />
      <path d="M300,0 V300 M0,150 H600" stroke="#FFFFFF" strokeWidth="100" />
      <path d="M300,0 V300 M0,150 H600" stroke="#CC0000" strokeWidth="60" />
    </svg>
  );
}

export default function ProfileTab({ client, setClient, onLogAction }: ProfileTabProps) {
  // ------------------------------------------------------------------------------
  // 1. STATE DEFINITIONS
  // ------------------------------------------------------------------------------

  // 1A. Dossier active tab filter
  const [activeDossierTab, setActiveDossierTab] = useState<DossierCategory>("Personal");

  // 1B. Profile cover banner theme switcher ("blue" or "gold")
  const [bannerTheme, setBannerTheme] = useState<"blue" | "gold">("blue");

  // 1C. Profile Edit modal form fields
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFullLegalName, setEditFullLegalName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPlaceOfBirth, setEditPlaceOfBirth] = useState("");
  const [editNationality, setEditNationality] = useState("");
  const [editCivilStatus, setEditCivilStatus] = useState<"Single" | "Married" | "De Facto" | "Divorced" | "Widowed">("Single");
  const [editNumberOfDependents, setEditNumberOfDependents] = useState<number>(0);
  const [editResidentialAddress, setEditResidentialAddress] = useState("");
  const [editPreviousAddress, setEditPreviousAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmployer, setEditEmployer] = useState("");
  const [editPosition, setEditPosition] = useState("");

  // ------------------------------------------------------------------------------
  // 1D. FETCH BACKEND PROFILE ENDPOINT (/api/users/profile/)
  // Reflects the authenticated client's full_name, email, and profile details
  // ------------------------------------------------------------------------------
  useEffect(() => {
    usersApi.getProfile()
      .then((profile) => {
        if (profile && (profile.full_name || profile.first_name || profile.last_name)) {
          const resolvedFullName = profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
          setClient(prev => ({
            ...prev,
            name: resolvedFullName || prev.name,
            email: profile.email || prev.email,
            profile: {
              ...prev.profile,
              fullLegalName: resolvedFullName || prev.profile?.fullLegalName || prev.name,
              email: profile.email || prev.profile?.email || prev.email,
            }
          }));
        }
      })
      .catch((err) => {
        console.debug("Note: Could not reach /api/users/profile/ or unauthorized, using current client context:", err);
      });
  }, [setClient]);

  // ------------------------------------------------------------------------------
  // 2. THEME & PROFILE MODAL HANDLERS
  // ------------------------------------------------------------------------------

  /**
   * Toggles the top cover background between the theme-aligned Blue gradient
   * and the warm luxury Gold gradient.
   */
  const toggleBannerTheme = () => {
    setBannerTheme(prev => (prev === "blue" ? "gold" : "blue"));
  };

  /**
   * Populates edit modal inputs with current client profile data and displays modal.
   */
  const openEditModal = () => {
    setEditFullLegalName(client.profile?.fullLegalName || client.name);
    setEditDob(client.profile?.dob || "");
    setEditPlaceOfBirth(client.profile?.placeOfBirth || "");
    setEditNationality(client.profile?.nationality || "");
    setEditCivilStatus(client.profile?.civilStatus || "Single");
    setEditNumberOfDependents(client.profile?.numberOfDependents ?? 0);
    setEditResidentialAddress(client.profile?.residentialAddress || client.profile?.address || "");
    setEditPreviousAddress(client.profile?.previousAddress || "");
    setEditPhone(client.profile?.mobile || client.phone);
    setEditEmail(client.profile?.email || client.email);
    setEditEmployer(client.employment?.employerBusiness || "");
    setEditPosition(client.employment?.position || "");
    setIsEditOpen(true);
  };

  /**
   * Saves updated client details to parent state, calls PATCH /api/users/profile/,
   * and logs the activity.
   */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Split full name into first and last name for backend endpoint update
    const nameParts = editFullLegalName.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 2. Update backend profile endpoint (PATCH /api/users/profile/)
    try {
      await usersApi.updateProfile({
        first_name: firstName,
        last_name: lastName
      });
    } catch (err) {
      console.debug("Backend profile update skipped or offline:", err);
    }

    // 3. Update local state
    setClient(prev => ({
      ...prev,
      name: editFullLegalName,
      phone: editPhone,
      email: editEmail,
      profile: {
        ...prev.profile,
        fullLegalName: editFullLegalName,
        dob: editDob,
        placeOfBirth: editPlaceOfBirth,
        nationality: editNationality,
        civilStatus: editCivilStatus,
        numberOfDependents: Number(editNumberOfDependents),
        residentialAddress: editResidentialAddress,
        address: editResidentialAddress,
        previousAddress: editPreviousAddress,
        mobile: editPhone,
        email: editEmail,
      },
      employment: {
        ...prev.employment,
        employerBusiness: editEmployer,
        position: editPosition
      }
    }));
    onLogAction("Updated client profile details successfully.");
    setIsEditOpen(false);
  };

  const [uploadDocName, setUploadDocName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const docs = client.documents;

  // Helpers to parse document status keys
  const getDocStatus = (docName: string) => {
    switch (docName) {
      case "Government ID": return docs.governmentId;
      case "Proof of Income": return docs.proofOfIncome;
      case "Bank Statement": return docs.bankStatement;
      case "Tax Documents": return docs.taxDocuments;
      case "Employment Documents": return docs.employmentDocs;
      case "Business Documents": return docs.businessDocs;
      case "Collateral Documents": return docs.collateralDocs;
      case "Other Documents": return docs.otherDocs;
      default: return "Not Uploaded";
    }
  };

  // Helper currency formatter
  const formatCurrency = (val: number) => {
    return `A$ ${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // ------------------------------------------------------------------------------
  // POPUP MODAL HANDLERS (Upload & Delete Triggers)
  // ------------------------------------------------------------------------------
  const openUploadModal = (docName: string) => {
    setUploadDocName(docName);
    const status = getDocStatus(docName);
    if (status === "Verified" || status === "Uploaded" || status === "Pending") {
      setSelectedFileName(`${docName.toLowerCase().replace(/\s+/g, "_")}_scanned.pdf`);
    } else {
      setSelectedFileName(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const executeUpload = () => {
    if (!uploadDocName) return;
    const docKeyMap: Record<string, keyof typeof client.documents> = {
      "Government ID": "governmentId",
      "Proof of Income": "proofOfIncome",
      "Bank Statement": "bankStatement",
      "Tax Documents": "taxDocuments",
      "Employment Documents": "employmentDocs",
      "Business Documents": "businessDocs",
      "Collateral Documents": "collateralDocs",
      "Other Documents": "otherDocs"
    };

    const key = docKeyMap[uploadDocName];
    if (key) {
      setClient(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [key]: "Uploaded"
        }
      }));
      onLogAction(`Uploaded new document: ${uploadDocName} (${selectedFileName || "file_attached.pdf"})`);
    }
    setUploadDocName(null);
    setSelectedFileName(null);
  };

  const executeDelete = () => {
    if (!uploadDocName) return;
    const docKeyMap: Record<string, keyof typeof client.documents> = {
      "Government ID": "governmentId",
      "Proof of Income": "proofOfIncome",
      "Bank Statement": "bankStatement",
      "Tax Documents": "taxDocuments",
      "Employment Documents": "employmentDocs",
      "Business Documents": "businessDocs",
      "Collateral Documents": "collateralDocs",
      "Other Documents": "otherDocs"
    };

    const key = docKeyMap[uploadDocName];
    if (key) {
      setClient(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [key]: "Not Uploaded"
        }
      }));
      onLogAction(`Deleted document: ${uploadDocName}`);
    }
    setUploadDocName(null);
    setSelectedFileName(null);
  };

  // ------------------------------------------------------------------------------
  // DOSSIER CARDS RENDER HELPERS
  // ------------------------------------------------------------------------------
  const renderPersonalCard = () => (
    <div className="bg-white space-y-4 animate-fadeIn pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
        <div>
          <span className="text-slate-400 block mb-0.5">Full Legal Name</span>
          <span className="text-slate-800 font-bold">{client.profile?.fullLegalName || client.name}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Date of Birth</span>
          <span className="text-slate-800">{client.profile?.dob}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Place of Birth</span>
          <span className="text-slate-800">{client.profile?.placeOfBirth || "N/A"}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Nationality</span>
          <span className="text-slate-800">{client.profile?.nationality}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Civil Status</span>
          <span className="text-slate-800">{client.profile?.civilStatus}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Number of Dependents</span>
          <span className="text-slate-800">{client.profile?.numberOfDependents ?? 0}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Mobile Number</span>
          <span className="text-slate-800">{client.profile?.mobile || client.phone}</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Email Address</span>
          <span className="text-slate-800 truncate block">{client.profile?.email || client.email}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-400 block mb-0.5">Residential Address</span>
          <span className="text-slate-800 block">{client.profile?.residentialAddress || client.profile?.address}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-slate-400 block mb-0.5">Current / Previous Address</span>
          <span className="text-slate-800 block">{client.profile?.previousAddress || "N/A"}</span>
        </div>
      </div>
    </div>
  );

  const renderFinancialCard = () => (
    <div className="bg-white space-y-4 animate-fadeIn pt-2">
      {/* Employment Details Section Above Income */}
      <div className="pb-3 border-b border-slate-200/60 space-y-2">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Employment Overview</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block mb-0.5">Employment Status</span>
            <span className="text-slate-800 font-bold">{client.employment?.status || "Full-Time Permanent"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Employer / Business</span>
            <span className="text-slate-800 font-bold">{client.employment?.employerBusiness || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Length of Employment</span>
            <span className="text-slate-800">{client.employment?.yearsEmployed ? `${client.employment.yearsEmployed} Years` : "4 Years"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Employment Position</span>
            <span className="text-slate-800">{client.employment?.position || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Income & Assets Section */}
      <div className="space-y-2">
        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Income & Financial Commitments</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block mb-0.5">Annual Income</span>
            <span className="text-emerald-700 font-bold">{formatCurrency((client.employment?.monthlyGrossIncome || 10000) * 12)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Monthly Commitments</span>
            <span className="text-rose-600 font-bold">{formatCurrency(client.obligations?.monthlyDebtPayments || 3000)}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block mb-0.5">Est. Asset Portfolio</span>
            <span className="text-slate-800 font-extrabold">{formatCurrency(client.collateral?.estimatedValue ? client.collateral.estimatedValue * 2.5 : 980000)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCollateralCard = () => {
    const defaultDocs = [
      "Original Transfer Certificate of Title (TCT)",
      "Property Tax Declaration & Clearance Receipt",
      "Certified Bureau of Lands Lot Plan & Vicinity Map",
      "Certified Real Estate Appraisal Report",
      "Comprehensive Property & Fire Insurance Policy"
    ];
    const docsList = client.collateral?.requiredDocuments || defaultDocs;

    return (
      <div className="bg-white space-y-5 animate-fadeIn pt-2">
        {/* Main Collateral Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block mb-0.5">Collateral Type</span>
            <span className="text-slate-800 font-bold">{client.collateral?.collateralType || "Residential Property"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Ownership Status</span>
            <span className="text-slate-800">{client.collateral?.ownership || "Sole Owner"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Estimated Value</span>
            <span className="text-[#0024A8] font-extrabold">{formatCurrency(client.collateral?.estimatedValue || 350000)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Appraised Value</span>
            <span className="text-emerald-700 font-extrabold">{formatCurrency(client.collateral?.appraisedValue || (client.collateral?.estimatedValue ? Math.round(client.collateral.estimatedValue * 0.95) : 340000))}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block mb-0.5">Location</span>
            <span className="text-slate-800 block">{client.collateral?.location || client.profile?.residentialAddress || client.profile?.address || "Alabang, Muntinlupa, Philippines"}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-400 block mb-0.5">Description</span>
            <span className="text-slate-700 leading-relaxed block bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">{client.collateral?.description || "4-Bedroom Modern Architectural Villa Lot located in Prime Alabang Estate with gated security."}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Condition</span>
            <span className="text-slate-800 font-medium">{client.collateral?.condition || "Excellent - Well Maintained Property"}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Existing Encumbrances</span>
            <span className="text-slate-800">{client.collateral?.existingMortgage || "No Encumbrance"}</span>
          </div>
        </div>

        {/* Separated Documents Needed Section at Bottom */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase text-[#0024A8] tracking-wider block">Collateral Documents Needed</span>
            <span className="text-[10px] font-bold text-slate-400">{docsList.length} Files Required</span>
          </div>
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 divide-y divide-slate-200/60 overflow-hidden">
            {docsList.map((docName, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#0024A8] shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 truncate">{docName}</span>
                </div>
                <span className="px-2 py-0.5 rounded-[5px] text-[9px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                  Required
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLiabilitiesCard = () => {
    const defaultLiabilities: LiabilityItem[] = [
      {
        liabilityType: "Personal Vehicle Loan",
        creditor: "BDO Unibank / Auto Finance",
        outstandingBalance: 22000,
        monthlyPayment: 450,
        interestRate: "6.25% p.a.",
        loanTerm: "5 Years",
        remainingTerm: "2 Years 4 Months",
        paymentStatus: "Current"
      },
      {
        liabilityType: "Revolving Credit Card Line",
        creditor: "BPI Commercial Bank",
        outstandingBalance: 15000,
        monthlyPayment: 400,
        interestRate: "18.50% p.a.",
        loanTerm: "Revolving",
        remainingTerm: "Ongoing",
        paymentStatus: "Current"
      }
    ];

    const liabilitiesList = client.obligations?.items && client.obligations.items.length > 0
      ? client.obligations.items
      : defaultLiabilities;

    return (
      <div className="bg-white space-y-4 animate-fadeIn pt-2">
        <div className="flex items-center justify-end">
          <span className="text-[10px] font-bold text-slate-400">Total Balance: {formatCurrency(client.obligations?.existingLoanAmount || 37000)}</span>
        </div>

        <div className="space-y-4">
          {liabilitiesList.map((item, idx) => (
            <div key={idx} className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-800">{item.liabilityType}</span>
                  <span className="text-[10px] font-semibold text-slate-400">({item.creditor})</span>
                </div>
                <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-extrabold uppercase tracking-wider ${
                  item.paymentStatus === "Current"
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    : item.paymentStatus === "Pending"
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-rose-50 text-rose-600 border border-rose-100"
                }`}>
                  {item.paymentStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Outstanding Balance</span>
                  <span className="text-rose-600 font-bold">{formatCurrency(item.outstandingBalance)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Monthly Payment</span>
                  <span className="text-slate-800">{formatCurrency(item.monthlyPayment)} / mo</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Interest Rate</span>
                  <span className="text-slate-800">{item.interestRate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Remaining Term</span>
                  <span className="text-slate-800">{item.remainingTerm}</span>
                </div>
              </div>
              
              <div className="text-[10px] font-medium text-slate-400 pt-1 flex justify-between border-t border-slate-50">
                <span>Original Loan Term: {item.loanTerm}</span>
                <span>Creditor: {item.creditor}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveDossierContent = () => {
    switch (activeDossierTab) {
      case "Personal": return renderPersonalCard();
      case "Financial": return renderFinancialCard();
      case "Collateral": return renderCollateralCard();
      case "Liabilities": return renderLiabilitiesCard();
      default: return renderPersonalCard();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ==================================================================== */}
      {/* SECTION 1: CLIENT PROFILE HERO CARD                                  */}
      {/* Renders cover banner with theme toggle, overlapping circular avatar,  */}
      {/* bold name, country flag + address, and contact information.          */}
      {/* ==================================================================== */}
      {(() => {
        // Resolve client address, full legal name, contact details and determine country flag
        const displayName = client.profile?.fullLegalName || client.name;
        const displayAddress = client.profile?.residentialAddress || client.profile?.address || "Block 15 Lot 4, Park Place, Alabang, Muntinlupa, Philippines";
        const displayMobile = client.profile?.mobile || client.phone;
        const displayEmail = client.profile?.email || client.email;
        const isPhilippines = displayAddress.toLowerCase().includes("philippines") || client.profile?.nationality?.toLowerCase().includes("filipino");

        return (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden animate-fadeIn">

            {/* ------------------------------------------------------------------ */}
            {/* SUBSECTION 1A: COVER BANNER WITH THEME SWITCHER PEN                */}
            {/* Toggles between Blue gradient (theme default) and luxury Gold      */}
            {/* ------------------------------------------------------------------ */}
            <div
              className={`relative h-36 sm:h-44 w-full transition-all duration-500 overflow-hidden ${bannerTheme === "blue"
                ? "bg-gradient-to-r from-[#001B79] via-[#0024A8] to-[#1E40AF]"
                : "bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#FBBF24]"
                }`}
            >
              {/* Ambient radial blur highlights for depth */}
              <div className="absolute top-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              {/* Theme Toggle Pen Button (top-right of profile background) */}
              <button
                type="button"
                onClick={toggleBannerTheme}
                title={`Switch banner to ${bannerTheme === "blue" ? "Gold" : "Blue"} theme`}
                className="absolute top-4 right-4 z-10 p-2 sm:px-3 sm:py-1.5 rounded-full bg-black/25 hover:bg-black/45 text-white backdrop-blur-md border border-white/25 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer group"
                aria-label="Switch banner theme between Blue and Gold"
              >
                <Pen className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />
                <span className="hidden sm:inline text-[11px] font-medium text-white/90">
                  {bannerTheme === "blue" ? "Gold Theme" : "Blue Theme"}
                </span>
              </button>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* SUBSECTION 1B: CARD BODY WITH OVERLAPPING CIRCULAR AVATAR          */}
            {/* relative z-10 and z-20 ensure avatar cleanly overlays the banner    */}
            {/* ------------------------------------------------------------------ */}
            <div className="relative z-10 px-6 sm:px-8 pb-6">

              {/* Avatar & Edit Profile Action Row */}
              <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-3">
                {/* Circular Profile Picture / Initials Avatar */}
                <div className="relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-[#0024A8] to-[#0B2369] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shrink-0 select-none">
                  {displayName.split(" ").map((w) => w[0]).join("")}
                </div>

                {/* Edit Profile CTA Button */}
                <button
                  type="button"
                  onClick={openEditModal}
                  className="self-start sm:self-end px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  Edit Profile
                </button>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* SUBSECTION 1C: CLIENT INFORMATION DETAILS                        */}
              {/* Full name (bold), Address + Country (with flag), Email & Phone   */}
              {/* ---------------------------------------------------------------- */}
              <div className="space-y-1.5">
                {/* 1. Full Client Name in Bold */}
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {displayName}
                </h2>

                {/* 2. Country Flag and Address (Lower shade of gray for high legibility) */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-400">
                  <CountryFlag isPhilippines={isPhilippines} />
                  <span>{displayAddress}</span>
                </div>

                {/* 3. Contact Row: Email on the left, Phone number on the right */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600 font-semibold pt-2 mt-2 border-t border-slate-100">
                  {/* Email (Left) */}
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{displayEmail}</span>
                  </div>

                  {/* Phone Number (Right) */}
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{displayMobile}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ==================================================================== */}
      {/* 2. MAIN PROFILE CONTAINER (wraps all sub-sections)                   */}
      {/* ==================================================================== */}
      <div className="bg-[#F2F2F2] rounded-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: PERSONAL INFO DOSSIER */}
          <div className="lg:col-span-7 space-y-5">

            {/* Dossier Folders Sub-Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">

              {/* Connected Filter Tab Strip */}
              <div className="flex border-b border-slate-200 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5">
                {(["Personal", "Financial", "Collateral", "Liabilities"] as DossierCategory[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDossierTab(tab)}
                    className={`px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider transition-all border-b-2 -mb-px whitespace-nowrap ${activeDossierTab === tab
                      ? "border-[#0024A8] text-[#0024A8]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {renderActiveDossierContent()}
            </div>

          </div>

          {/* RIGHT COLUMN: LOAN STATUS & DOCUMENT CHECKLIST */}
          <div className="lg:col-span-5 space-y-5">

            {/* Loan Status Sub-Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-800">
                  Loan Status Checklist
                </h3>
                <Link
                  href="/client/loan-status"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#0024A8] hover:underline"
                >
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* Stepper progress stages */}
              <div className="space-y-6 relative pl-3.5 before:absolute before:left-7.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">

                {/* Step 1: Submitted */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#0024A8] text-white flex items-center justify-center font-bold text-sm shrink-0 border-2 border-white shadow-soft-xl">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Submitted</span>
                </div>

                {/* Step 2: In Review */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#0024A8] text-white flex items-center justify-center font-bold text-sm shrink-0 border-2 border-white shadow-soft-xl">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">In Review</span>
                </div>

                {/* Step 3: Additional Info Requested */}
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center font-bold text-sm shrink-0 border-2 border-white shadow-soft-xl animate-pulse">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">Additional Info Requested</span>
                    <span className="px-2.5 py-0.5 rounded-[5px] bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase border border-rose-200 tracking-wider">
                      Action needed
                    </span>
                  </div>
                </div>

                {/* Step 4: Approved */}
                <div className="flex items-center gap-4 relative z-10 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                    4
                  </div>
                  <span className="text-sm font-semibold text-slate-400">Approved</span>
                </div>

                {/* Step 5: Declined */}
                <div className="flex items-center gap-4 relative z-10 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                    5
                  </div>
                  <span className="text-sm font-semibold text-slate-400">Declined</span>
                </div>

                {/* Step 6: Settled */}
                <div className="flex items-center gap-4 relative z-10 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                    6
                  </div>
                  <span className="text-sm font-semibold text-slate-400">Settled</span>
                </div>

              </div>
            </div>

            {/* Dossier Document Checklist Sub-Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-800 pb-2 border-b border-slate-100">
                Dossier Document Checklist
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5 px-3">File Name</th>
                      <th className="py-2.5 px-3 text-right">Status State</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 text-xs font-semibold">
                    {[
                      { name: "Government ID", status: docs.governmentId },
                      { name: "Proof of Income", status: docs.proofOfIncome },
                      { name: "Bank Statement", status: docs.bankStatement },
                      { name: "Tax Documents", status: docs.taxDocuments },
                      { name: "Employment Documents", status: docs.employmentDocs },
                      ...(docs.businessDocs !== "Not Required" ? [{ name: "Business Documents", status: docs.businessDocs }] : []),
                      ...(docs.collateralDocs !== "Not Required" ? [{ name: "Collateral Documents", status: docs.collateralDocs }] : []),
                      ...(docs.otherDocs !== "Not Required" ? [{ name: "Other Documents", status: docs.otherDocs }] : []),
                    ].map((doc, idx) => (
                      <tr
                        key={idx}
                        onClick={() => openUploadModal(doc.name)}
                        className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            {(() => { const DocIcon = dossierDocIcons[doc.name]; return DocIcon ? <DocIcon className="w-3.5 h-3.5 text-[#0024A8] shrink-0" /> : null; })()}
                            <span className="text-[#0024A8] font-bold">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded-[5px] text-[9px] font-extrabold uppercase tracking-wider ${doc.status === "Verified"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : doc.status === "Uploaded"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : doc.status === "Pending"
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-rose-50 text-rose-600 border border-rose-100"
                            }`}>
                            {doc.status === "Not Uploaded" ? "Action Needed" : doc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. DYNAMIC UPLOAD MODAL POPUP WINDOW                                 */}
      {/* ==================================================================== */}
      {uploadDocName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 animate-scaleIn">

            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Document Uploader</span>
                <h3 className="text-base font-extrabold text-[#0024A8]">{uploadDocName}</h3>
              </div>
              <button
                onClick={() => { setUploadDocName(null); setSelectedFileName(null); }}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drag & Drop zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragActive
                ? "border-[#0024A8] bg-[#0024A8]/5"
                : "border-slate-200 hover:border-[#0024A8]/60 bg-slate-50/50"
                }`}
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-xs text-slate-600 font-bold mb-1">
                Drag & drop your file here
              </p>
              <p className="text-[10px] text-slate-400 font-medium mb-3">
                Supports PDF, JPEG, or PNG up to 10MB
              </p>

              <label className="inline-block px-4 py-2 bg-white hover:bg-slate-50 text-[#0024A8] border border-slate-200 text-[10px] font-bold rounded-xl shadow-2xs cursor-pointer transition-colors">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg"
                />
              </label>
            </div>

            {/* Selected File Details */}
            {selectedFileName && (
              <div className="flex items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60 font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#0024A8] shrink-0" />
                  <span className="text-slate-700 truncate">{selectedFileName}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold shrink-0">Scanned PDF</span>
              </div>
            )}

            {/* Actions panel */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 text-[10px] font-extrabold uppercase">

              {/* Delete trigger (Only visible if file exists) */}
              {(getDocStatus(uploadDocName) !== "Not Uploaded") && (
                <button
                  onClick={executeDelete}
                  className="mr-auto py-2.5 px-4 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <button
                onClick={() => { setUploadDocName(null); setSelectedFileName(null); }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={executeUpload}
                disabled={!selectedFileName}
                className={`py-2.5 px-4 rounded-xl text-white shadow-md shadow-[#0024A8]/10 transition-all ${selectedFileName ? "bg-[#0024A8] hover:bg-[#001D85]" : "bg-slate-300 cursor-not-allowed"
                  }`}
              >
                Upload File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. EDIT PROFILE POPUP MODAL WINDOW                                   */}
      {/* ==================================================================== */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 relative overflow-hidden animate-scaleIn">

            {/* Exit button on the top right */}
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="text-[10px] font-extrabold text-[#0024A8] uppercase tracking-wider block">
                Account Settings
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                Edit Profile Information
              </h3>
            </div>

            {/* Form fields */}
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullLegalName}
                    onChange={(e) => setEditFullLegalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Date of Birth
                  </label>
                  <input
                    type="text"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    required
                    value={editPlaceOfBirth}
                    onChange={(e) => setEditPlaceOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nationality
                  </label>
                  <input
                    type="text"
                    required
                    value={editNationality}
                    onChange={(e) => setEditNationality(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Civil Status
                  </label>
                  <select
                    value={editCivilStatus}
                    onChange={(e) => setEditCivilStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-600 font-semibold"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="De Facto">De Facto</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Number of Dependents
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editNumberOfDependents}
                    onChange={(e) => setEditNumberOfDependents(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    required
                    value={editResidentialAddress}
                    onChange={(e) => setEditResidentialAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current / Previous Address
                  </label>
                  <input
                    type="text"
                    value={editPreviousAddress}
                    onChange={(e) => setEditPreviousAddress(e.target.value)}
                    placeholder="e.g. Unit 402, Sunset Towers, Makati City (2020 - 2024)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Employer
                  </label>
                  <input
                    type="text"
                    required
                    value={editEmployer}
                    onChange={(e) => setEditEmployer(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    Position / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium"
                  />
                </div>

              </div>

              {/* Bottom CTA Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 text-[10px] font-extrabold uppercase">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="py-2.5 px-5 bg-[#0024A8] hover:bg-[#001D85] text-white rounded-xl shadow-md shadow-[#0024A8]/10 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
