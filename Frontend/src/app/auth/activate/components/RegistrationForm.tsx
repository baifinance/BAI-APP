/**
 * ==============================================================================
 * COMPONENT: RegistrationForm.tsx
 * Path: src/app/auth/activate/components/RegistrationForm.tsx
 * Description: Reworked invite-only client & broker registration form page.
 *              Features the immersive login-theme background, centered card,
 *              matching input fields from design, password confirmation check,
 *              "Register" CTA button, and "Invited by (compliance account name)".
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShieldAlert, Eye, EyeOff, Check, X } from "lucide-react";
import { API_BASE } from "@/lib/api";

// ==============================================================================
// 1. COMPONENT PROPS & API INTERFACES
// ==============================================================================
interface RegistrationFormProps {
  token: string;
  onSuccess: (clientName: string, roleOrId: string, password?: string) => void;
}

interface TokenValidationResponse {
  valid: boolean;
  role: "client" | "broker";
  email: string;
  invited_by?: string;
  compliance_name?: string;
  broker_id?: string | null;
  broker_name?: string;
  error?: string;
}

export default function RegistrationForm({ token, onSuccess }: RegistrationFormProps) {
  // ============================================================================
  // 2. STATE MANAGEMENT: FORM FIELDS & UI CONTROLS
  // ============================================================================
  const [role, setRole] = useState<"client" | "broker">("client");

  const [complianceName, setComplianceName] = useState("");

  // User details inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [licenseNo, setLicenseNo] = useState(""); // Used when broker activation

  // Password fields state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordMismatchError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? "Password mismatch."
      : "";

  // Feedback, loading & token validation states
  const [errorMsg, setErrorMsg] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Broker assigned by the inviter (read-only; clients cannot list brokers).
  const [assignedBrokerName, setAssignedBrokerName] = useState("");

  // ============================================================================
  // 3. TOKEN VALIDATION & COMPLIANCE ACCOUNT RETRIEVAL
  // ============================================================================
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`${API_BASE}/api/auth/invitations/validate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data: TokenValidationResponse = await res.json();
          if (data.valid) {
            setRole(data.role || "client");
            const inviter = data.invited_by || data.compliance_name || "";
            setComplianceName(inviter || "Compliance Team");
            setAssignedBrokerName(
              data.role === "client" ? data.broker_name || "" : "",
            );
          } else {
            setTokenError(data.error || "This invitation link is invalid or has expired.");
          }
        } else {
          let detail = "This invitation link is invalid or has expired.";
          try {
            const data = await res.json();
            detail = data.error || data.detail || detail;
          } catch {
            // Keep the generic message when the server returns a non-JSON body.
          }
          setTokenError(detail);
        }
      } catch {
        setTokenError(
          "Unable to validate this invitation right now. Please check your connection and try again.",
        );
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  // ============================================================================
  // 4. PASSWORD VALIDATION & MATCHING LOGIC
  // ============================================================================
  // Compute password complexity criteria
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
    const barColor =
      score <= 2
        ? "bg-rose-500"
        : score === 3
        ? "bg-amber-500"
        : score === 4
        ? "bg-blue-500"
        : "bg-emerald-500";
    return { ...checks, score, label, barColor, allPass: score === 5 };
  }, [password]);

  // Helper to format middle initial
  const toDisplayName = (first: string, middle: string, last: string) => {
    const tokens = middle.trim().split(/\s+/).filter(Boolean);
    const initial = tokens.length ? ` ${tokens[tokens.length - 1].charAt(0).toUpperCase()}.` : "";
    return `${first.trim()}${initial} ${last.trim()}`.replace(/\s+/g, " ").trim();
  };

  // ============================================================================
  // 5. FORM SUBMISSION HANDLER
  // ============================================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate name inputs
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("First name and last name are required.");
      return;
    }

    // Validate broker license if broker
    if (role === "broker" && !licenseNo.trim()) {
      setErrorMsg("Broker License Number is required.");
      return;
    }

    // Validate password existence
    if (!password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    // Validate password confirmation match
    if (password !== confirmPassword) {
      setErrorMsg("Password mismatch.");
      return;
    }

    // Validate security criteria
    if (!pwChecks.allPass) {
      setErrorMsg("Password must be 12+ characters with uppercase, lowercase, number, and special symbol.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, string> = {
        token,
        password,
        password_confirm: confirmPassword,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      };

      if (middleName.trim()) {
        payload.middle_name = middleName.trim();
      }

      if (role === "broker") {
        payload.license_no = licenseNo.trim();
      }

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/api/auth/invitations/accept/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new Error(
          "Unable to reach the server. Please check your connection and try again.",
        );
      }

      if (!res.ok) {
        let data: Record<string, unknown> = {};
        try {
          data = await res.json();
        } catch {
          // Non-JSON error body — fall through to the generic message.
        }
        const firstError = (value: unknown): string | undefined => {
          if (typeof value === "string") return value;
          if (Array.isArray(value) && typeof value[0] === "string") return value[0];
          return undefined;
        };
        const backendError =
          firstError(data.password_confirm) ||
          firstError(data.license_no) ||
          firstError(data.token) ||
          firstError(data.password) ||
          firstError(data.first_name) ||
          firstError(data.middle_name) ||
          firstError(data.last_name) ||
          firstError(data.email) ||
          firstError(data.non_field_errors) ||
          firstError(data.detail) ||
          "Registration failed. Please try again.";
        throw new Error(backendError);
      }

      const displayName = toDisplayName(firstName, middleName, lastName);

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(displayName, role, password);
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // 6. CONDITIONAL RENDERING: LOADING & TOKEN ERROR STATES
  // ============================================================================
  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="fixed inset-0 pointer-events-none select-none z-0">
          <img
            src="/loginImage.jpeg"
            alt=""
            className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
          />
          <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-xs font-semibold text-white/90 tracking-wide">
            Validating invitation link...
          </span>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Atmosphere */}
        <div className="fixed inset-0 pointer-events-none select-none z-0">
          <img
            src="/loginImage.jpeg"
            alt=""
            className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
          />
          <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />
        </div>
        <div className="bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-8 max-w-md w-full space-y-4 text-center relative z-10 animate-scaleIn">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-xl font-extrabold text-[#0B2369]">Invalid Invitation</h3>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">{tokenError}</p>
        </div>
      </div>
    );
  }

  const isBroker = role === "broker";

  // ============================================================================
  // 7. MAIN PAGE RENDER
  // ============================================================================
  return (
    <div
      className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
      selection:bg-[#0024A8] selection:text-white antialiased relative overflow-hidden"
    >
      {/* ---------------------------------------------------------------------- */}
      {/* BACKGROUND LAYERS (Identical to Login Page)                           */}
      {/* Layer 0a: loginImage.jpeg (blurry) + Layer 0b: 65% Blue Layer          */}
      {/* Layer 0c: Moving Glowing Golden Rings                                 */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
        aria-hidden="true"
      >
        {/* Layer 0a: loginImage background blurred */}
        <img
          src="/loginImage.jpeg"
          alt=""
          className="absolute -inset-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] object-cover object-center filter blur-md scale-105 pointer-events-none"
        />

        {/* Layer 0b: Theme blue layer on top with 65% opacity */}
        <div className="absolute inset-0 bg-[#0A2881]/65 pointer-events-none" />

        {/* Layer 0c: Moving blurry glowing golden rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Glowing Golden Ring 1 - Top Left Large Atmospheric Orb */}
          <div className="absolute -top-16 -left-16 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-[#E4BA37]/35 via-[#F59E0B]/20 to-transparent blur-2xl animate-orb-1" />

          {/* Glowing Golden Ring 2 - Bottom Right Large Glowing Disc */}
          <div className="absolute -bottom-24 -right-24 w-96 h-96 sm:w-[28rem] sm:h-[28rem] rounded-full bg-[#E4BA37]/25 blur-3xl animate-orb-2" />

          {/* Glowing Golden Ring 3 - Center Right Soft Floating Accent Ring */}
          <div className="absolute top-[20%] right-[14%] w-64 h-64 rounded-full bg-gradient-to-br from-[#E4BA37]/25 via-[#F59E0B]/15 to-transparent blur-xl animate-orb-3" />

          {/* Glowing Golden Ring 4 - Bottom Left Floating Glow */}
          <div className="absolute bottom-[18%] left-[10%] w-60 h-60 rounded-full bg-[#E4BA37]/20 blur-xl animate-orb-4" />
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN REGISTRATION CONTAINER (Centered Card)                            */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="bg-white/95 backdrop-blur-md w-full max-w-lg rounded-3xl shadow-2xl
        p-8 sm:p-10 relative z-10 border border-white/20 animate-scaleIn space-y-6"
      >
        {/* Logo Branding */}
        <div className="flex justify-center pt-1">
          <img
            src="/bai_logo_blue.png"
            alt="BAI Group of Companies"
            className="h-9 w-auto object-contain"
          />
        </div>

        {/* -------------------------------------------------------------------- */}
        {/* HEADER SECTION: "Create Account" & Subtitle                          */}
        {/* -------------------------------------------------------------------- */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-[#0024A8] tracking-tight text-center">
            Create Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium text-center">
            Please input your information below.
          </p>
        </div>

        {/* Feedback / Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-600">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* -------------------------------------------------------------------- */}
        {/* REGISTRATION FORM                                                    */}
        {/* -------------------------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USER INFORMATION INPUTS (Matching Provided Screenshot Design) */}
          <div className="space-y-4">
            {/* Row 1: FIRST NAME & LAST NAME (Side by side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* FIRST NAME Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  FIRST NAME
                </label>
                <input
                  type="text"
                  placeholder="Emma"
                  value={firstName}
                  required
                  maxLength={150}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* LAST NAME Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  LAST NAME
                </label>
                <input
                  type="text"
                  placeholder="Wilson"
                  value={lastName}
                  required
                  maxLength={150}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Row 2: MIDDLE NAME (optional) Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                MIDDLE NAME <span className="text-slate-400 font-normal lowercase tracking-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Trazona"
                value={middleName}
                maxLength={150}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Broker-only: License Number */}
          {isBroker && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                BROKER LICENSE NUMBER
              </label>
              <input
                type="text"
                placeholder="e.g. LIC-882739"
                value={licenseNo}
                required
                onChange={(e) => setLicenseNo(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] focus:bg-white transition-all font-medium"
              />
            </div>
          )}

          {/* Client-only: broker assigned by the inviter (read-only). */}
          {!isBroker && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                YOUR BROKER
              </label>
              <div className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-medium">
                {assignedBrokerName || "No broker assigned yet"}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* PASSWORD & CONFIRM PASSWORD INPUTS                                 */}
          {/* ------------------------------------------------------------------ */}
          {/* PASSWORD INPUT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                PASSWORD
              </label>
              {password && (
                <span
                  className={`text-[10px] font-extrabold uppercase ${
                    pwChecks.score <= 2
                      ? "text-rose-600"
                      : pwChecks.score === 3
                      ? "text-amber-600"
                      : pwChecks.score === 4
                      ? "text-blue-600"
                      : "text-emerald-600"
                  }`}
                >
                  {pwChecks.label}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                required
                minLength={12}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE] focus:bg-white transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password security requirement indicators */}
            {password && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        i < Math.ceil((pwChecks.score / 5) * 4) ? pwChecks.barColor : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] font-medium pt-0.5">
                  {[
                    { ok: pwChecks.length, text: "12+ characters" },
                    { ok: pwChecks.upper, text: "Uppercase (A-Z)" },
                    { ok: pwChecks.lower, text: "Lowercase (a-z)" },
                    { ok: pwChecks.number, text: "Number (0-9)" },
                    { ok: pwChecks.special, text: "Special symbol" },
                  ].map((r) => (
                    <li
                      key={r.text}
                      className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {r.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* CONFIRM PASSWORD INPUT */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              CONFIRM PASSWORD
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={confirmPassword}
                required
                minLength={12}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-[#F8FAFC] rounded-xl px-4 py-2.5 pr-11 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all font-medium border ${
                  passwordMismatchError
                    ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-200 focus:border-[#4361EE] focus:ring-1 focus:ring-[#4361EE]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message for Password Mismatch */}
            {passwordMismatchError && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Password mismatch.</span>
              </p>
            )}
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* REGISTER BUTTON                                                    */}
          {/* ------------------------------------------------------------------ */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || Boolean(passwordMismatchError) || (password.length > 0 && !pwChecks.allPass)}
              className="w-full py-3.5 px-6 bg-[#0024A8] hover:bg-[#001D85] active:bg-[#00176B] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#0024A8]/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Register"
              )}
            </button>
          </div>
        </form>

        {/* -------------------------------------------------------------------- */}
        {/* FOOTER: "Invited by (compliance account name)"                       */}
        {/* -------------------------------------------------------------------- */}
        <div className="text-center pt-1 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium text-center">
            Invited by{" "}
            <span className="font-semibold text-slate-700">
              {complianceName || "(compliance account name)"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
