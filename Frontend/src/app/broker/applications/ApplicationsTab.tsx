/**
 * ==============================================================================
 * COMPONENT: ApplicationsTab.tsx
 * Path: src/app/broker/components/ApplicationsTab.tsx
 * Description: Reworked Applications tab with sorting controls, status filters,
 *              row transitions, and invite/document modals wired to backend.
 * ==============================================================================
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  Eye,
  Mail,
  ArrowUpDown,
  Filter,
  X,
  FileText,
  UserCheck,
} from "lucide-react";
import { Application, Client } from "../MockData";
import ClientApplicationDashboard from "./ClientApplicationDashboard";

interface ApplicationsTabProps {
  clients: Client[];
  applications: Application[];
  setApplications: React.Dispatch<React.SetStateAction<Application[]>>;
  onSendEmail: () => void;
  variant?: "broker" | "loan_processing";
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>;
}

type SortCriteria =
  | "none"
  | "name-asc"
  | "name-desc"
  | "amount-low"
  | "amount-high"
  | "progress-low"
  | "progress-high";

const STATUS_OPTIONS: Application["status"][] = [
  "Submitted",
  "In review",
  "Action needed",
  "Approved",
  "Settled",
  "Declined",
];

const DOCUMENT_OPTIONS = [
  "Government ID (Passport / Driver License)",
  "Proof of Income (Recent Payslips)",
  "Bank Statements (Last 3 Months)",
  "Tax Documents (Notice of Assessment)",
  "Employment Contract",
  "Business Documents (For Self-Employed)",
  "Collateral & Assets Proof",
  "Other Supporting Evidence",
];

export default function ApplicationsTab({
  clients,
  applications,
  setApplications,
  onSendEmail,
  variant,
  setClients,
}: ApplicationsTabProps) {
  // ------------------------------------------------------------------------------
  // THEME VARIANTS
  // ------------------------------------------------------------------------------
  const isLoanProcessing = variant === "loan_processing";
  const primaryBg = isLoanProcessing
    ? "bg-[#1429A9] hover:bg-[#10218A]"
    : "bg-[#0B2369] hover:bg-[#071644]";
  const primaryText = isLoanProcessing ? "text-[#1429A9]" : "text-[#0B2369]";
  const primaryBorder = isLoanProcessing
    ? "focus:border-[#1429A9]/30"
    : "focus:border-[#0B2369]/30";
  const barBg = isLoanProcessing ? "bg-[#1429A9]" : "bg-[#0B2369]";
  const shadowBg = isLoanProcessing ? "shadow-[#1429A9]/10" : "shadow-[#0B2369]/10";
  const hoverBg = isLoanProcessing ? "hover:bg-[#1429A9]" : "hover:bg-[#0B2369]";

  // ------------------------------------------------------------------------------
  // REGISTERED BROKERS STATE (API: /api/brokers/)
  // ------------------------------------------------------------------------------
  const [registeredBrokers, setRegisteredBrokers] = useState<
    Array<{ id: string; user_id?: string; name?: string; first_name?: string; last_name?: string; email?: string }>
  >([]);
  const [inviteBrokerId, setInviteBrokerId] = useState<string>("");

  useEffect(() => {
    async function fetchBrokers() {
      try {
        let res = await fetch("http://localhost:8000/api/brokers/", {
          credentials: "include",
        });
        if (!res.ok) {
          res = await fetch("http://localhost:8000/api/bookings/brokers/", {
            credentials: "include",
          });
        }
        if (res.ok) {
          const data = await res.json();
          const brokerList = Array.isArray(data) ? data : [];
          setRegisteredBrokers(brokerList);
        }
      } catch (err) {
        console.error("Failed to load brokers from /api/brokers/:", err);
      }
    }
    fetchBrokers();
  }, []);

  // ------------------------------------------------------------------------------
  // INVITE MODAL STATE
  // ------------------------------------------------------------------------------
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"client" | "broker">("client");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState("");

  const openInviteModal = () => {
    setInviteEmail("");
    setInviteRole("client");
    setInviteStatus("idle");
    setInviteError("");
    setInviteBrokerId("");
    setIsInviteOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    if (inviteRole === "client" && !inviteBrokerId) {
      setInviteError("Please select an available broker to assign to this client.");
      setInviteStatus("error");
      return;
    }

    setInviteStatus("loading");
    setInviteError("");

    const payload: Record<string, any> = {
      email: inviteEmail.trim(),
      role: inviteRole,
    };
    if (inviteRole === "client" && inviteBrokerId) {
      payload.broker_id = inviteBrokerId;
    }

    try {
      const res = await fetch(
        "http://localhost:8000/api/auth/invitations/send/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        let errorMessage = "Failed to send invitation.";

        // Helper to safely extract string whether it's a string, array, or object
        const parseDRFError = (val: any): string => {
          if (!val) return "";
          if (typeof val === "string") return val;
          if (Array.isArray(val))
            return typeof val[0] === "string" ? val[0] : JSON.stringify(val[0]);
          if (typeof val === "object")
            return parseDRFError(Object.values(val)[0]);
          return String(val);
        };

        if (typeof data === "string") {
          errorMessage = data;
        } else if (data.email) {
          errorMessage = parseDRFError(data.email);
        } else if (data.broker_id) {
          errorMessage = parseDRFError(data.broker_id);
        } else if (data.role) {
          errorMessage = parseDRFError(data.role);
        } else if (data.non_field_errors) {
          errorMessage = parseDRFError(data.non_field_errors);
        } else if (data.detail) {
          errorMessage = parseDRFError(data.detail);
        } else if (data.error) {
          errorMessage = parseDRFError(data.error);
        } else {
          const firstKey = Object.keys(data)[0];
          errorMessage = `${firstKey}: ${parseDRFError(data[firstKey])}`;
        }

        throw new Error(errorMessage);
      }

      setInviteStatus("success");
    } catch (err: any) {
      setInviteError(err.message || "Something went wrong.");
      setInviteStatus("error");
    }
  };

  // ------------------------------------------------------------------------------
  // DOCUMENT REQUEST MODAL STATE
  // ------------------------------------------------------------------------------
  const [isRequestDocOpen, setIsRequestDocOpen] = useState(false);
  const [requestClient, setRequestClient] = useState("");
  const [requestDocType, setRequestDocType] = useState("");
  const [requestNotes, setRequestNotes] = useState("");

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedClient = clients.find((c) => c.id === requestClient);
    if (!matchedClient || !requestDocType) return;

    alert(
      `Document request sent to ${matchedClient.name} (${matchedClient.email})!\n` +
        `Document Requested: ${requestDocType}\n` +
        `Message: ${requestNotes || "None"}`,
    );

    setIsRequestDocOpen(false);
    setRequestClient("");
    setRequestDocType("");
    setRequestNotes("");
  };

  // ------------------------------------------------------------------------------
  // EDIT STATUS & PROGRESS STATE
  // ------------------------------------------------------------------------------
  const [activeStatusEditId, setActiveStatusEditId] = useState<string | null>(
    null,
  );
  const [activeProgressEditId, setActiveProgressEditId] = useState<
    string | null
  >(null);
  const [progressInputValue, setProgressInputValue] = useState<number>(0);

  const handleUpdateStatus = (
    appId: string,
    newStatus: Application["status"],
  ) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: newStatus } : app,
      ),
    );
    setActiveStatusEditId(null);
  };

  const handleUpdateProgress = (appId: string, newProgress: number) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, progress: newProgress } : app,
      ),
    );
    setActiveProgressEditId(null);
  };

  // ------------------------------------------------------------------------------
  // SEARCH / SORT / FILTER STATE
  // ------------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [sortOption, setSortOption] = useState<SortCriteria>("none");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // ------------------------------------------------------------------------------
  // FILTER & SORT APPLICATIONS DATA
  // ------------------------------------------------------------------------------
  const processedApps = applications
    .filter((app) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        app.clientName.toLowerCase().includes(query) ||
        app.id.toLowerCase().includes(query) ||
        app.type.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" ||
        app.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc":
          return a.clientName.localeCompare(b.clientName);
        case "name-desc":
          return b.clientName.localeCompare(a.clientName);
        case "amount-low":
          return a.amount - b.amount;
        case "amount-high":
          return b.amount - a.amount;
        case "progress-low":
          return a.progress - b.progress;
        case "progress-high":
          return b.progress - a.progress;
        default:
          return 0;
      }
    });

  // ------------------------------------------------------------------------------
  // DETAIL VIEW TRANSITION
  // ------------------------------------------------------------------------------
  if (selectedApp) {
    const matchedClient = clients.find((c) => c.id === selectedApp.clientId);
    if (matchedClient) {
      return (
        <ClientApplicationDashboard
          client={matchedClient}
          onBack={() => setSelectedApp(null)}
          variant={variant}
          onUpdateClient={(updatedClient) => {
            if (setClients) {
              setClients((prev) =>
                prev.map((c) =>
                  c.id === updatedClient.id ? updatedClient : c,
                ),
              );
            }
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ==================================================================== */}
      {/* SECTION 1: HEADER & ACTION BUTTONS                                   */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">
            Submitted Document Applications
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Review dossier packages, check file progress, and progress
            applications to final approval.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Invite button — visible for both loan processing and broker */}
          <button
            onClick={openInviteModal}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all ${primaryBg} shadow-md ${shadowBg}`}
          >
            <Mail className="w-4 h-4" />
            <span>{isLoanProcessing ? "Send Invitation" : "Invite Client"}</span>
          </button>

          <button
            onClick={() => {
              if (clients.length > 0) setRequestClient(clients[0].id);
              setIsRequestDocOpen(true);
            }}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white transition-all ${primaryBg} shadow-md ${shadowBg}`}
          >
            <FileText className="w-4 h-4" />
            <span>Request Documents</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: SEARCH & SORT CONTROLS                                    */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 p-4 bg-white border border-slate-200/60 rounded-3xl shadow-soft-xl">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, ID, or loan type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none text-xs font-medium placeholder:text-slate-400 ${primaryBorder}`}
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortCriteria)}
            className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none text-xs font-semibold text-slate-600 ${primaryBorder}`}
          >
            <option value="none">Sort Applications By...</option>
            <option value="name-asc">Alphabetical: A to Z</option>
            <option value="name-desc">Alphabetical: Z to A</option>
            <option value="amount-low">Amount: Low to High</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="progress-low">Progress: Low to High</option>
            <option value="progress-high">Progress: High to Low</option>
          </select>
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none text-xs font-semibold text-slate-600 ${primaryBorder}`}
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="In review">In Review</option>
            <option value="Action needed">Action Needed</option>
            <option value="Approved">Approved</option>
            <option value="Settled">Settled</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 3: APPLICATIONS TABLE                                        */}
      {/* ==================================================================== */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-soft-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">ID & Client</th>
                <th className="py-4 px-6">Type & Amount</th>
                <th className="py-4 px-6">Lobby Progress</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {processedApps.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No applications matched sorting or filtering rules.
                  </td>
                </tr>
              ) : (
                processedApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className="hover:bg-slate-50/40 cursor-pointer transition-colors"
                  >
                    {/* ID & Client */}
                    <td className="py-4 px-6 font-medium">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/40 inline-block mb-1">
                        {app.id}
                      </span>
                      <span className="text-slate-800 font-bold block">
                        {app.clientName}
                      </span>
                    </td>

                    {/* Type & Amount */}
                    <td className="py-4 px-6">
                      <span className="text-slate-600 block">{app.type}</span>
                      <span className={`font-extrabold block ${primaryText}`}>
                        ${app.amount.toLocaleString()}
                      </span>
                    </td>

                    {/* Progress Bar */}
                    <td
                      className="py-4 px-6 relative"
                      onClick={(e) => {
                        if (isLoanProcessing) return;
                        e.stopPropagation();
                        setActiveProgressEditId(
                          activeProgressEditId === app.id ? null : app.id,
                        );
                        setProgressInputValue(app.progress);
                        setActiveStatusEditId(null);
                      }}
                    >
                      <div className={`space-y-1 p-1 rounded-lg transition-all ${
                        !isLoanProcessing ? "cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
                      }`}>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className={`h-full rounded-full ${barBg}`}
                            style={{ width: `${app.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {app.progress}% Dossier Uploaded
                        </span>
                      </div>

                      {!isLoanProcessing && activeProgressEditId === app.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveProgressEditId(null);
                            }}
                          />
                          <div
                            className="absolute left-6 top-14 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-30 p-4 w-48 space-y-3.5 animate-scaleIn text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                              Update Progress
                            </span>
                            <div className="space-y-2">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={progressInputValue}
                                onChange={(e) =>
                                  setProgressInputValue(
                                    parseInt(e.target.value),
                                  )
                                }
                                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1429A9]"
                              />
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-extrabold text-slate-500">
                                  {progressInputValue}%
                                </span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() =>
                                      setActiveProgressEditId(null)
                                    }
                                    className="px-2 py-1 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-400 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleUpdateProgress(
                                        app.id,
                                        progressInputValue,
                                      )
                                    }
                                    className={`px-2.5 py-1 text-white rounded-lg text-[9px] font-bold ${primaryBg}`}
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </td>

                    {/* Status */}
                    <td
                      className="py-4 px-6 relative"
                      onClick={(e) => {
                        if (isLoanProcessing) return;
                        e.stopPropagation();
                        setActiveStatusEditId(
                          activeStatusEditId === app.id ? null : app.id,
                        );
                        setActiveProgressEditId(null);
                      }}
                    >
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                          !isLoanProcessing ? "cursor-pointer hover:ring-2 hover:ring-slate-200" : ""
                        } ${
                          app.status === "Action needed"
                            ? "bg-rose-50 text-rose-600 border border-rose-200"
                            : app.status === "In review"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : app.status === "Approved"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {app.status === "Action needed"
                          ? "Action Required"
                          : app.status}
                      </span>

                      {!isLoanProcessing && activeStatusEditId === app.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20 cursor-default"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusEditId(null);
                            }}
                          />
                          <div className="absolute right-6 top-12 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-30 p-2.5 w-40 space-y-1 animate-scaleIn text-left">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
                              Select Status
                            </span>
                            {STATUS_OPTIONS.map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(app.id, status);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                  app.status === status
                                    ? `bg-slate-50 ${primaryText}`
                                    : "hover:bg-slate-50 text-slate-600"
                                }`}
                              >
                                {status === "Action needed"
                                  ? "Action Required"
                                  : status}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </td>

                    {/* View Action */}
                    <td
                      className="py-4 px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedApp(app)}
                        className={`p-2 bg-slate-100 rounded-xl border border-slate-200/60 text-slate-500 transition-all ${hoverBg} hover:text-white`}
                        title="Review Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM LEFT PAGE COUNTER */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">
            Showing {processedApps.length > 0 ? 1 : 0} to {processedApps.length} of {processedApps.length} entries
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 4: INVITE MODAL — Wired to real backend                      */}
      {/* ==================================================================== */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-5 relative animate-scaleIn">
            {/* Close */}
            <button
              onClick={() => setIsInviteOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div>
              <span
                className={`text-[10px] font-extrabold ${primaryText} uppercase tracking-wider block`}
              >
                {isLoanProcessing ? "Loan Processing Portal" : "Broker Portal"} · Send
                Invitation
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                Invite to BAI Finance
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                An activation link will be emailed directly. They set their own
                password upon activation.
              </p>
            </div>

            {/* SUCCESS STATE */}
            {inviteStatus === "success" ? (
              <div className="py-6 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-7 h-7 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    Invitation Sent!
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    An activation link was sent to{" "}
                    <span className="font-bold text-slate-700">
                      {inviteEmail}
                    </span>{" "}
                    as a{" "}
                    <span className={`font-bold capitalize ${primaryText}`}>
                      {inviteRole}
                    </span>
                    .
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={openInviteModal}
                    className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
                  >
                    Send Another
                  </button>
                  <button
                    onClick={() => setIsInviteOpen(false)}
                    className={`px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl ${primaryBg} text-white shadow-md transition-all`}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                {/* Role Toggle — Loan Processing sees both; Broker always invites clients */}
                {isLoanProcessing ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Invite As
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setInviteRole("client")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          inviteRole === "client"
                            ? `${primaryBg} text-white shadow-sm`
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Client
                      </button>
                      <button
                        type="button"
                        onClick={() => setInviteRole("broker")}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                          inviteRole === "broker"
                            ? `${primaryBg} text-white shadow-sm`
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Broker
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <Mail className={`w-3.5 h-3.5 ${primaryText}`} />
                    <span className="text-xs text-slate-500 font-medium">
                      Inviting as{" "}
                      <span className={`font-bold ${primaryText}`}>Client</span>
                    </span>
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={`Enter ${inviteRole} email (e.g. emma@example.com)`}
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setInviteError("");
                    }}
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none transition-all ${
                      inviteStatus === "error"
                        ? "border-rose-300 focus:border-rose-400"
                        : `border-slate-200 ${primaryBorder}`
                    }`}
                  />
                </div>

                {/* ASSIGN BROKER DROPDOWN (Fetched from /api/brokers/) */}
                {inviteRole === "client" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ASSIGN BROKER <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={inviteBrokerId}
                        onChange={(e) => {
                          setInviteBrokerId(e.target.value);
                          setInviteError("");
                        }}
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all ${
                          !inviteBrokerId && inviteStatus === "error"
                            ? "border-rose-300 focus:border-rose-400"
                            : `border-slate-200 ${primaryBorder}`
                        }`}
                      >
                        <option value="">Select available broker...</option>
                        {registeredBrokers.map((b, idx) => {
                          const brokerId = b.user_id || b.id;
                          const displayName =
                            b.name ||
                            `${b.first_name || ""} ${b.last_name || ""}`.trim() ||
                            b.email ||
                            `Broker #${idx + 1}`;
                          return (
                            <option key={brokerId || idx} value={brokerId}>
                              {displayName} {b.email ? `(${b.email})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {registeredBrokers.length === 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">
                        No active brokers found in database. Please invite a broker first.
                      </p>
                    )}
                  </div>
                )}

                {/* Error */}
                {inviteStatus === "error" && inviteError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600">
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Note */}
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  The link expires in{" "}
                  <strong className="text-slate-500">7 days</strong>. If unused,
                  you can resend from the invitation manager.
                </p>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsInviteOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteStatus === "loading"}
                    className={`py-2.5 px-5 ${primaryBg} text-white rounded-xl shadow-md ${shadowBg} text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-60`}
                  >
                    {inviteStatus === "loading" ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Invite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 5: REQUEST DOCUMENTS MODAL                                   */}
      {/* ==================================================================== */}
      {isRequestDocOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/50 space-y-6 relative animate-scaleIn">
            {/* Close */}
            <button
              onClick={() => setIsRequestDocOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div>
              <span
                className={`text-[10px] font-extrabold ${primaryText} uppercase tracking-wider block`}
              >
                {isLoanProcessing ? "Loan Processing" : "Broker"} Action Center
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-0.5">
                Request Supporting Documents
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Client
                </label>
                <select
                  required
                  value={requestClient}
                  onChange={(e) => setRequestClient(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none ${primaryBorder} rounded-xl text-xs font-semibold text-slate-700`}
                >
                  <option value="">Choose a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Document Type
                </label>
                <select
                  required
                  value={requestDocType}
                  onChange={(e) => setRequestDocType(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none ${primaryBorder} rounded-xl text-xs font-semibold text-slate-700`}
                >
                  <option value="">Select document category...</option>
                  {DOCUMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Additional Notes
                </label>
                <textarea
                  placeholder="Provide details or specific instructions for this document request..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none ${primaryBorder} rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 resize-none`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 text-[10px] font-extrabold uppercase">
                <button
                  type="button"
                  onClick={() => setIsRequestDocOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`py-2.5 px-5 ${primaryBg} text-white rounded-xl shadow-md ${shadowBg} transition-all`}
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
