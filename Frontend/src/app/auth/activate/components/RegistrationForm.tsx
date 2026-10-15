/**
 * ==============================================================================
 * COMPONENT: RegistrationForm.tsx
 * Path: src/app/auth/activate/components/RegistrationForm.tsx
 * Description: The invite-only client/broker registration form.
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lock, ShieldAlert, Award, Check, X } from "lucide-react";

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
  const [middleName, setMiddleName] = useState(""); // optional, shown as initial e.g. Trazona → T.
  const [lastName, setLastName] = useState("");
  const [licenseNo, setLicenseNo] = useState(""); // broker only
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/auth/invitations/validate/?token=${encodeURIComponent(token)}`
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
          let res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/brokers/", {
            credentials: "include",
          });
          if (!res.ok) {
            res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/bookings/brokers/", {
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
  const toDisplayName = (first: string, middle: string, last: string) => {
    const tokens = middle.trim().split(/\s+/).filter(Boolean);
    const initial = tokens.length ? ` ${tokens[tokens.length - 1].charAt(0).toUpperCase()}.` : "";
    return `${first.trim()}${initial} ${last.trim()}`.replace(/\s+/g, " ").trim();
  };

  const pwChecks = useMemo(() => {
    const checks = {
      length: password.length >= 12,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const label = score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";
    const barColor = score <= 2 ? "bg-rose-500" : score === 3 ? "bg-amber-500" : score === 4 ? "bg-blue-500" : "bg-emerald-500";
    return { ...checks, score, label, barColor, allPass: score === 5 };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isBroker && (!firstName.trim() || !lastName.trim())) {
      setErrorMsg("First name and last name are required.");
      return;
    }

    if (role === "broker" && !licenseNo.trim()) {
      setErrorMsg("Broker License Number is required.");
      return;
    }

    if (!password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    if (!pwChecks.allPass) {
      setErrorMsg("Password must be 12+ chars with upper, lower, number, and special character.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, string> = { token, password };

      if (!isBroker) {
        payload.first_name = firstName.trim();
        if (middleName.trim()) payload.middle_name = middleName.trim();
        payload.last_name = lastName.trim();
      } else {
        if (firstName.trim()) payload.first_name = firstName.trim();
        if (middleName.trim()) payload.middle_name = middleName.trim();
        if (lastName.trim()) payload.last_name = lastName.trim();
      }

      if (role === "broker") {
        payload.license_no = licenseNo;
      } else if (role === "client" && selectedBrokerId) {
        payload.broker_id = selectedBrokerId;
      }

      const res = await fetch((process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") + "/api/auth/invitations/accept/", {
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
          data.middle_name?.[0] ||
          data.last_name?.[0] ||
          data.email?.[0] ||
          data.non_field_errors?.[0] ||
          "Registration failed. Please try again.";
        throw new Error(backendError);
      }

      // Account is active in Supabase now — go straight to login.
      const displayName = !isBroker
        ? toDisplayName(firstName, middleName, lastName)
        : email.split("@")[0].replace(/[._]/g, " ");

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(displayName, role);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#0024A8]/20 border-t-[#0024A8] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Validating invitation link...</span>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white border border-slate-200 shadow-xl rounded-[24px] p-8 max-w-md w-full space-y-6 animate-scaleIn">
        {/* Logo */}
        <div className="flex justify-center pt-1">
          <img
            src="/bai_logo_blue.png"
            alt="BAI Group of Companies"
            className="h-9 w-auto object-contain"
          />
        </div>

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
          {!isBroker ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">First Name</label>
                  <input
                    type="text"
                    placeholder="Emma"
                    value={firstName}
                    required
                    maxLength={150}
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
                    maxLength={150}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Middle Name <span className="text-slate-400 normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Trazona"
                  value={middleName}
                  maxLength={150}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
                />
                {middleName.trim() && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    Will appear as: <span className="font-bold text-slate-800">{toDisplayName(firstName || "First", middleName, lastName || "Last")}</span>
                  </p>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                Contact details are auto-filled from Asana. Just confirm your name + set a password.
              </p>
            </div>
          ) : null}

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

          {/* Password + strength meter */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Password (min 12 chars)</span>
              {password && (
                <span className={`text-[10px] font-extrabold uppercase ${pwChecks.score <= 2 ? "text-rose-600" : pwChecks.score === 3 ? "text-amber-600" : pwChecks.score === 4 ? "text-blue-600" : "text-emerald-600"}`}>
                  {pwChecks.label}
                </span>
              )}
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                required
                minLength={12}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-16 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0024A8] focus:bg-white transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-500 hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${i < Math.ceil((pwChecks.score / 5) * 4) ? pwChecks.barColor : "bg-slate-200"}`}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-1 gap-1 text-[11px] font-medium">
                  {[
                    { ok: pwChecks.length, text: "At least 12 characters" },
                    { ok: pwChecks.upper, text: "Uppercase letter (A-Z)" },
                    { ok: pwChecks.lower, text: "Lowercase letter (a-z)" },
                    { ok: pwChecks.number, text: "Number (0-9)" },
                    { ok: pwChecks.special, text: "Special character (!@#$%)" },
                  ].map((r) => (
                    <li key={r.text} className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-600" : "text-slate-400"}`}>
                      {r.ok ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (password.length > 0 && !pwChecks.allPass)}
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
