/**
 * ==============================================================================
 * COMPONENT: RegistrationForm.tsx
 * Path: src/app/auth/activate/components/RegistrationForm.tsx
 * Description: The invite-only client/broker registration form.
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect } from "react";
import { Lock, ShieldAlert, Award } from "lucide-react";

interface RegistrationFormProps {
  token: string;
  onSuccess: (clientName: string, roleOrId: string) => void;
}

interface TokenValidation {
  valid: boolean;
  role: "client" | "broker";
  email: string;
  error?: string;
}

export default function RegistrationForm({ token, onSuccess }: RegistrationFormProps) {
  // ------------------------------------------------------------------------------
  // FORM FIELDS STATE
  // ------------------------------------------------------------------------------
  const [role, setRole] = useState<"client" | "broker">("client");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [licenseNo, setLicenseNo] = useState(""); // broker only
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brokers, setBrokers] = useState<{ id?: string; user_id?: string; name?: string; first_name?: string; last_name?: string; email: string }[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState("");

  // 1. Validate invitation token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(
          `http://localhost:8000/api/auth/invitations/validate/?token=${encodeURIComponent(token)}`
        );
        if (res.ok) {
          const data: TokenValidation = await res.json();
          if (data.valid) {
            setRole(data.role || "client");
            setEmail(data.email || "");
          } else {
            setTokenError(data.error || "This invitation link is invalid or has expired.");
          }
        } else {
          // Fallback for standalone frontend mode
          setRole("client");
          setEmail("invited.user@example.com");
        }
      } catch {
        // Fallback for standalone frontend mode without backend
        setRole("client");
        setEmail("invited.user@example.com");
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  // Fetch available brokers for client assignment
  useEffect(() => {
    if (role === "client") {
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
            setBrokers(Array.isArray(data) ? data : []);
            if (data.length > 0) {
              setSelectedBrokerId(data[0].user_id || data[0].id || "");
            }
          }
        } catch {
          // Ignore if backend is unavailable
        }
      }
      fetchBrokers();
    }
  }, [role]);

  // ------------------------------------------------------------------------------
  // SUBMISSION HANDLER
  // ------------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("First name and last name are required.");
      return;
    }

    if (role === "broker" && !licenseNo.trim()) {
      setErrorMsg("Broker License Number is required.");
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      setErrorMsg("Password fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, string> = {
        token,
        first_name: firstName,
        last_name: lastName,
        password,
        password_confirm: confirmPassword,
      };

      if (role === "broker") {
        payload.license_no = licenseNo;
      } else if (role === "client" && selectedBrokerId) {
        payload.broker_id = selectedBrokerId;
      }

      const res = await fetch("http://localhost:8000/api/auth/invitations/accept/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (res && !res.ok) {
        const data = await res.json();
        const backendError =
          data.license_no?.[0] ||
          data.token?.[0] ||
          data.password?.[0] ||
          data.first_name?.[0] ||
          data.last_name?.[0] ||
          data.non_field_errors?.[0] ||
          "Registration failed. Please try again.";
        throw new Error(backendError);
      }

      // Local storage record for demo compliance portal
      const newReg = {
        id: `reg-${Date.now()}`,
        clientName: `${firstName} ${lastName}`,
        loanType: role === "broker" ? "Broker Identity Audit" : "Client Registration",
        documentName: role === "broker" ? `License: ${licenseNo}` : "Self-Registered Client Profile",
        dateSubmitted: new Date().toISOString().split("T")[0],
        status: "To Be Reviewed",
        fileSize: "N/A",
        fileType: "Signup Creds",
      };
      const existingStr = localStorage.getItem("new_registrations");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem("new_registrations", JSON.stringify([...existing, newReg]));

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(`${firstName} ${lastName}`, role);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0024A8]/20 border-t-[#0024A8] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Validating invitation link...</span>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 shadow-xl rounded-[24px] p-8 max-w-md w-full space-y-4 text-center">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">Invalid Invitation</h3>
          <p className="text-xs text-slate-600 font-medium">{tokenError}</p>
        </div>
      </div>
    );
  }

  const isBroker = role === "broker";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white border border-slate-200 shadow-xl rounded-[24px] p-8 max-w-md w-full space-y-6 animate-scaleIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-wider ${
              isBroker ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-blue-50 text-[#0024A8] border-blue-200"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isBroker ? "Broker Portal" : "Client Portal"} Activation</span>
          </div>

          <h2 className="text-2xl font-extrabold text-[#0B2369] tracking-tight">Create Account</h2>

          {email && (
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Invited as <span className={`font-bold ${isBroker ? "text-sky-600" : "text-[#0024A8]"}`}>{email}</span>
            </p>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-600">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">First Name</label>
              <input
                type="text"
                placeholder="Emma"
                value={firstName}
                required
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Last Name</label>
              <input
                type="text"
                placeholder="Wilson"
                value={lastName}
                required
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Broker-only: License Number */}
          {isBroker && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Broker License Number
              </label>
              <input
                type="text"
                placeholder="e.g. LIC-882739"
                value={licenseNo}
                required
                onChange={(e) => setLicenseNo(e.target.value)}
                className="w-full bg-slate-50 border-2 border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-semibold"
              />
            </div>
          )}

          {/* Client-only: Broker Selection */}
          {!isBroker && brokers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Assign to Broker
              </label>
              <select
                value={selectedBrokerId}
                onChange={(e) => setSelectedBrokerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium cursor-pointer"
              >
                {brokers.map((b, idx) => {
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
          )}

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Confirm</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  placeholder="••••••"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#0024A8] hover:bg-[#001D85] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#0024A8]/10 transition-all uppercase tracking-wider mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Complete Registration"
            )}
          </button>
        </form>

        <div className="text-[10px] text-slate-400 font-medium text-center">
          Protected by BAI Security Systems & Encrypted Access.
        </div>
        </div>
    </div>
  );
}
