/**
 * ==============================================================================
 * COMPONENT: UsersTab.tsx
 * Path: src/app/compliance/components/UsersTab.tsx
 * Description: Users Tab for the Compliance Portal.
 *              - Directly renders the Registered Users table without the top hero banner.
 *              - Connects to the database via /api/users/ to reflect live registered users.
 *              - Table displays Full Name on the left and Role on the right.
 *              - Features an "Invite User" button that sends broker/client
 *                invitations through the backend invitation API.
 * ==============================================================================
 */

"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Mail,
  Search,
  X,
  CheckCircle2,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  authApi,
  usersApi,
  RegisteredUserApiItem,
} from "@/lib/api";

export interface RegisteredUser {
  id: string;
  fullName: string;
  email: string;
  role: "Client" | "Broker" | "Loan Processing" | "Compliance";
  registeredDate: string;
}

// Map backend role string to standard display role
function mapRoleToDisplay(rawRole: string): RegisteredUser["role"] {
  const normalized = (rawRole || "").toLowerCase().trim();
  if (normalized === "client") return "Client";
  if (normalized === "broker") return "Broker";
  if (normalized === "loan_processing") return "Loan Processing";
  if (normalized === "compliance") return "Compliance";
  return "Client";
}

function mapUser(item: RegisteredUserApiItem): RegisteredUser {
  return {
    id: item.id,
    fullName:
      item.full_name ||
      (item.first_name && item.last_name
        ? `${item.first_name} ${item.last_name}`.trim()
        : item.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())),
    email: item.email,
    role: mapRoleToDisplay(item.role),
    registeredDate: item.registered_date || (item.created_at ? new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"),
  };
}

function getRoleBadgeClasses(role: RegisteredUser["role"]) {
  switch (role) {
    case "Compliance":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/80 ring-1 ring-indigo-500/10";
    case "Broker":
      return "bg-blue-50 text-[#0024A8] border-blue-200/80 ring-1 ring-blue-500/10";
    case "Loan Processing":
      return "bg-amber-50 text-amber-800 border-amber-200/80 ring-1 ring-amber-500/10";
    case "Client":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-1 ring-emerald-500/10";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

const UserRow = React.memo(function UserRow({ user }: { user: RegisteredUser }) {
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="hover:bg-blue-50/20 transition-colors group">
      <td className="py-4 px-6 text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-[#0A2881] font-bold text-xs flex items-center justify-center shrink-0 group-hover:border-[#0A2881]/30 transition-colors shadow-2xs">
            {initials || "U"}
          </div>
          <div>
            <span className="font-extrabold text-slate-900 block text-sm">
              {user.fullName}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {user.email}
            </span>
          </div>
        </div>
      </td>

      <td className="py-4 px-6 text-right">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeClasses(
            user.role
          )}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          <span>{user.role}</span>
        </span>
      </td>
    </tr>
  );
});

export default function UsersTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");

  // ============================================================================
  // INVITE USER MODAL STATE
  // ============================================================================
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"client" | "broker">("client");
  const [inviteStatus, setInviteStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccessFeedback, setInviteSuccessFeedback] = useState(false);

  // Fetch registered users from backend database (cached + deduped)
  const {
    data: users = [],
    isLoading: loading,
    isFetching,
    isError,
    refetch: fetchRegisteredUsers,
  } = useQuery({
    queryKey: ["compliance", "active-users"],
    queryFn: async () => {
      const data: RegisteredUserApiItem[] = await usersApi.activeList();
      return Array.isArray(data) ? data.map(mapUser) : [];
    },
    staleTime: 60_000,
  });

  const fetchError = isError ? "Unable to load active users." : null;

  // Open the invite pop-up modal
  const handleOpenInviteModal = () => {
    setInviteEmail("");
    setInviteRole("client");
    setInviteStatus("idle");
    setInviteError("");
    setInviteSuccessFeedback(false);
    setIsInviteModalOpen(true);
  };

  // Close the invite pop-up modal
  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("client");
    setInviteStatus("idle");
    setInviteError("");
    setInviteSuccessFeedback(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviteStatus("loading");
    setInviteError("");

    try {
      await authApi.sendInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteStatus("success");
      setInviteSuccessFeedback(true);
      await fetchRegisteredUsers();
    } catch (error: unknown) {
      setInviteStatus("error");
      setInviteError(error instanceof Error ? error.message : "Failed to send invitation.");
    }
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === "All" ||
        u.role.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ==================================================================== */}
      {/* REGISTERED USERS TABLE CONTAINER                                     */}
      {/* Top Banner has been removed per request. Starts directly with table. */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Table Top Header Bar with "Invite User" Button on the Top Right */}
        <div className="bg-[#0A2881] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                Users Tab
              </h2>
              <p className="text-[11px] text-blue-200 font-medium">
                Connected to database: {users.length} registered accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Refresh button */}
            <button
              type="button"
              onClick={() => {
                void fetchRegisteredUsers();
              }}
              disabled={loading || isFetching}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer"
              title="Refresh users from database"
              aria-label="Refresh database users"
            >
              <RefreshCw className={`w-4 h-4 ${loading || isFetching ? "animate-spin" : ""}`} />
            </button>

            {/* Button on the top right that says "invite user" */}
            <button
              type="button"
              onClick={handleOpenInviteModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#E4BA37] hover:bg-[#D4AC2B] active:scale-95 text-[#0A2881] font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-[#E4BA37]/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite User</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by full name, email, or role..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10 transition-all shadow-2xs"
            />
          </div>

          {/* Role Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block shrink-0" />
            {["All", "Client", "Broker", "Loan Processing", "Compliance"].map(
              (roleOption) => (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => setRoleFilter(roleOption)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    roleFilter === roleOption
                      ? "bg-[#0A2881] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {roleOption}
                </button>
              )
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TABLE: Full Name on the Left and Role on the Right                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                {/* Full name on the left */}
                <th scope="col" className="py-3.5 px-6 text-left">
                  Full Name
                </th>
                {/* Role on the right */}
                <th scope="col" className="py-3.5 px-6 text-right">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`user-skeleton-${index}`} className="animate-pulse">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-36 rounded bg-slate-200" />
                          <div className="h-3 w-48 rounded bg-slate-100" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="ml-auto h-6 w-24 rounded-full bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : fetchError ? (
                <tr>
                  <td colSpan={2} className="py-12 px-6 text-center text-rose-500 text-xs sm:text-sm font-medium">
                    {fetchError}
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((registeredUser) => (
                  <UserRow key={registeredUser.id} user={registeredUser} />
                ))
              ) : (
                <tr>
                  <td
                    colSpan={2}
                    className="py-12 px-6 text-center text-slate-400 text-xs sm:text-sm font-medium"
                  >
                    No registered users match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count */}
        <div className="p-4 sm:px-6 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 font-semibold">
          <span>
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of{" "}
            <strong className="text-slate-800">{users.length}</strong> database users
          </span>
        </div>

      </div>

      {/* ==================================================================== */}
      {/* INVITE USER POP-UP UI MODAL                                          */}
      {/* Opened on click of "invite user" button. Asks for email input.        */}
      {/* Prototype only: No backend submission functionality.                 */}
      {/* ==================================================================== */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-user-modal-title"
        >
          {/* Modal Container Card */}
          <div className="bg-white w-full max-w-md rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative animate-scaleIn">
            
            {/* Top Right Exit Button */}
            <button
              type="button"
              onClick={handleCloseInviteModal}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close invite user modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Centered Large Title & Instruction */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0024A8] border border-blue-100 flex items-center justify-center mx-auto mb-2">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3
                id="invite-user-modal-title"
                className="text-2xl sm:text-3xl font-black text-[#0A2881] tracking-tight"
              >
                Invite User
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                Enter the email address of the person you want to invite to the platform.
                {inviteRole === "client" && (
                  <span className="mt-1 block text-[11px] font-bold text-amber-700">
                    Client must exist in Asana — otherwise the invite is blocked.
                  </span>
                )}
              </p>
            </div>

            {/* Backend response state */}
            {inviteSuccessFeedback ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2.5 text-emerald-700 text-xs sm:text-sm font-bold animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>Invitation sent to {inviteEmail}.</span>
              </div>
            ) : (
                  /* Invite Form */
              <form onSubmit={handleInviteSubmit} className="space-y-5">
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="invite-email-input"
                    className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block"
                  >
                    User Email Address
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all bg-slate-50">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="invite-email-input"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={inviteStatus === "loading"}
                      placeholder="e.g. name@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-transparent focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="invite-role-input"
                    className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block"
                  >
                    Account Role
                  </label>
                  <select
                    id="invite-role-input"
                    value={inviteRole}
                    onChange={(e) => {
                      const role = e.target.value as "client" | "broker";
                      setInviteRole(role);
                    }}
                    disabled={inviteStatus === "loading"}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100/70"
                  >
                    <option value="client">Client</option>
                    <option value="broker">Broker</option>
                  </select>
                </div>

                {inviteStatus === "error" && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={inviteStatus === "loading"}
                    className="w-full py-3.5 px-4 bg-[#0A2881] hover:bg-[#071D60] active:scale-[0.99] text-white rounded-xl sm:rounded-2xl text-sm font-bold shadow-md shadow-[#0A2881]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {inviteStatus === "loading" ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>{inviteStatus === "loading" ? "Sending..." : "Send Invitation"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseInviteModal}
                    className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
