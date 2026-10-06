/**
 * ==============================================================================
 * MAIN ROUTE PAGE: /login
 * Path: src/app/login/page.tsx
 * Description: Dedicated Client Hub Login page featuring a split-screen design
 *              and an interactive OTP Pop-Up Modal Container for Two-Factor
 *              Authentication (2FA).
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  FileText,
  UserCheck,
  KeyRound,
  Timer,
  RotateCcw,
  Inbox,
  X,
  ArrowRight,
} from "lucide-react";
import {
  authApi,
  getRoleRedirect,
  otpApi,
  OTP_LOGIN_TTL,
  LoginResponse,
  SESSION_EXPIRED_EVENT,
} from "@/lib/api";

export default function ClientLoginPage() {
  const router = useRouter();

  // ==============================================================================
  // 1. LOGIN CREDENTIALS STATE
  // ==============================================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ==============================================================================
  // 2. OTP POP-UP MODAL STATE
  // ==============================================================================
  const [isOtpPopupOpen, setIsOtpPopupOpen] = useState(false);
  const [loginData, setLoginData] = useState<LoginResponse | null>(null);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ==============================================================================
  // 2b. SESSION-EXPIRED NOTICE (arrived via middleware ?expired=1 redirect)
  // ==============================================================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expired") === "1") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }, []);

  // ==============================================================================
  // 3. OTP COUNTDOWN TIMER EFFECT
  // ==============================================================================
  useEffect(() => {
    if (!isOtpPopupOpen || otpCountdown <= 0) return;
    const id = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [isOtpPopupOpen, otpCountdown]);

  // Focus first OTP input whenever the pop-up modal opens
  useEffect(() => {
    if (isOtpPopupOpen) {
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOtpPopupOpen]);

  // ==============================================================================
  // 4. HELPER & POST-LOGIN ROUTING LOGIC
  // ==============================================================================
  const errMessage = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  const finalizeLogin = useCallback(
    (data: LoginResponse) => {
      if (data.asana_profile) {
        sessionStorage.setItem(
          "asana_profile",
          JSON.stringify(data.asana_profile)
        );
      } else {
        sessionStorage.removeItem("asana_profile");
      }

      const role = data.user.role;
      // Set secure cookie for user role redirection
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      document.cookie = `user-role=${role}; path=/; SameSite=Lax${isHttps ? "; Secure" : ""}`;
      router.push(getRoleRedirect(role));
    },
    [router]
  );

  // ==============================================================================
  // 5. STEP 1: CREDENTIALS SUBMISSION HANDLER
  // ==============================================================================
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await authApi.login(email, password);
      
      // If server demands OTP verification, trigger the OTP Pop-up Container
      if (data.otp_required) {
        setLoginData(data);
        setOtpEmail(data.user.email);
        setOtpCode("");
        setOtpDigits(["", "", "", "", "", ""]);
        setOtpError("");
        setOtpCountdown(data.otp_expires_in ?? OTP_LOGIN_TTL);
        setIsOtpPopupOpen(true);
        return;
      }
      
      // Direct login if OTP is not required
      finalizeLogin(data);
    } catch (err: unknown) {
      setErrorMsg(errMessage(err, "Invalid email or password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  // ==============================================================================
  // 6. STEP 2: OTP VERIFICATION & RESEND HANDLERS (Pop-up Modal)
  // ==============================================================================
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const targetCode = codeToVerify ?? otpCode;
    if (!targetCode || otpSending) return;
    setOtpSending(true);
    setOtpError("");
    try {
      await otpApi.verify(otpEmail, targetCode, "login_2fa");
      if (loginData) {
        finalizeLogin(loginData);
      }
    } catch (err: unknown) {
      setOtpError(errMessage(err, "Invalid or expired code. Please try again."));
    } finally {
      setOtpSending(false);
    }
  };

  // Handle digit input across the 6 boxes
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean && val !== "") return;

    const char = clean.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = char;
    setOtpDigits(nextDigits);

    const fullCode = nextDigits.join("");
    setOtpCode(fullCode);
    setOtpError("");

    if (char && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    if (fullCode.length === 6 && !nextDigits.includes("")) {
      handleVerifyOtp(fullCode);
    }
  };

  // Handle Backspace & Arrow keys navigation between 6 boxes
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = "";
        setOtpDigits(nextDigits);
        setOtpCode(nextDigits.join(""));
        digitInputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (otpDigits[index]) {
        const nextDigits = [...otpDigits];
        nextDigits[index] = "";
        setOtpDigits(nextDigits);
        setOtpCode(nextDigits.join(""));
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste of 6-digit code across boxes
  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    const fullCode = nextDigits.join("");
    setOtpCode(fullCode);
    setOtpError("");

    if (pasted.length === 6) {
      digitInputRefs.current[5]?.focus();
      handleVerifyOtp(fullCode);
    } else {
      digitInputRefs.current[pasted.length]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || otpSending) return;
    setOtpSending(true);
    setOtpError("");
    try {
      await otpApi.send(otpEmail, "login_2fa");
      setOtpCode("");
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpCountdown(OTP_LOGIN_TTL);
      digitInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setOtpError(errMessage(err, "Failed to resend verification code. Please try again."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleCloseOtpModal = () => {
    setIsOtpPopupOpen(false);
    setOtpCode("");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpError("");
    setOtpCountdown(0);
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
  selection:bg-[#0024A8] selection:text-white antialiased relative"
    >
      {/* ---------------------------------------------------------------------- */}
      {/* BACKGROUND RADIAL GLOW OVERLAYS                                        */}
      {/* ---------------------------------------------------------------------- */}
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-[#0024A8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-40 -left-40 w-96 h-96 bg-[#0B2369]/10 rounded-full blur-3xl pointer-events-none" />

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN SPLIT-CONTAINER CARD                                              */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200/50
  grid grid-cols-1 md:grid-cols-2 overflow-hidden relative min-h-[600px] animate-scaleIn"
      >
        {/* ==================================================================== */}
        {/* LEFT COLUMN: BRANDING & FEATURE HIGHLIGHTS                           */}
        {/* ==================================================================== */}
        <div
          className="bg-gradient-to-br from-[#0024A8] via-[#0B2369] to-[#040E30] text-white p-8 md:p-12
    flex flex-col justify-between relative overflow-hidden"
        >
          {/* Decorative gradients */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#0024A8] rounded-full blur-3xl opacity-20 pointer-events-none" />

          {/* Logo / Header */}
          <div className="flex items-center gap-3 relative z-10">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
              <img
                src="/bai_logo_white.png"
                alt="BAI Group of Companies"
                className="h-10 md:h-11 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Core App Information */}
          <div className="space-y-6 my-8 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Next-Gen Brokerage</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                From First Home <br />to Settled.
              </h2>
              <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">
                Experience a streamlined mortgage journey designed around you.
                Connect with brokers, submit documents, and track approvals seamlessly.
              </p>
            </div>

            {/* Feature Bullet Points */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Digital Application Pipeline</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Submit, edit, and track mortgage applications from a single unified hub.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <FileText className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Secure Document Center</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Directly upload and verify your bank statements, IDs, and financial files.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Dedicated Broker Support</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Instant booking system to coordinate meetings with mortgage specialists.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            © 2026 BAI Finance. Secure Client Gateway.
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RIGHT COLUMN: LOGIN CREDENTIALS FORM                                 */}
        {/* ==================================================================== */}
        <div className="p-8 md:p-12 flex flex-col justify-between bg-white relative">
          {/* Back to Home Link */}
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-[#0024A8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="space-y-6 my-auto">
            {/* Header Title */}
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Welcome Back
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mt-2">
                Client Hub Gateway
              </span>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-600 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form
              onSubmit={handleCredentialsSubmit}
              className="space-y-4 text-xs font-semibold"
            >
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/40 focus:ring-2 focus:ring-[#0024A8]/10 rounded-xl text-slate-700 font-medium block transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/40 focus:ring-2 focus:ring-[#0024A8]/10 rounded-xl text-slate-700 font-medium block transition-all"
                  />
                </div>
              </div>

              {/* Access Notice */}
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-1 text-slate-600">
                <span className="text-[10px] font-extrabold text-[#0024A8] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Invitation Only Access</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  New to BAI Finance? Please contact your designated Mortgage Broker to request an invitation link.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0024A8] hover:bg-[#001D85] disabled:opacity-50 text-white rounded-xl
      text-xs font-bold shadow-md shadow-[#0024A8]/15 hover:shadow-lg transition-all uppercase tracking-wider mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Log In to Hub</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-[10px] text-slate-400 font-medium text-center mt-6">
            Protected by BAI Security Systems.
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* 7. OTP POP-UP MODAL CONTAINER (Two-Step Verification)                 */}
      {/* ====================================================================== */}
      {isOtpPopupOpen && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-popup-title"
        >
          {/* Modal Container Card */}
          <div className="bg-white w-full max-w-md rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative animate-scaleIn">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseOtpModal}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close OTP popup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* At the top and centered is a large bold text: "OTP Verification" */}
            <div className="text-center pt-2">
              <h2
                id="otp-popup-title"
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              >
                OTP Verification
              </h2>
              {/* Under this text is a sentence in smaller size font: "We sent you a 6 digit code to (users email)." */}
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                We sent you a 6 digit code to{" "}
                <span className="font-semibold text-slate-800 break-all">
                  {otpEmail || "your email"}
                </span>.
              </p>
            </div>

            {/* Error Alert in Modal */}
            {otpError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-rose-600 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{otpError}</span>
              </div>
            )}

            {/* OTP Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              className="mt-8"
            >
              {/* Under the text is a 6 input boxes to put the OTP */}
              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={otpSending}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={handleDigitPaste}
                    className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border-2 transition-all outline-none ${
                      digit
                        ? "border-[#0024A8] bg-blue-50/30 text-slate-900 shadow-xs"
                        : "border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300"
                    } focus:border-[#0024A8] focus:bg-white focus:ring-4 focus:ring-[#0024A8]/10 disabled:opacity-50`}
                    aria-label={`Digit ${index + 1} of 6`}
                  />
                ))}
              </div>

              {/* Under that input boxes is a small text that said: "Resend code in (timer)." */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                  {otpCountdown > 0 ? (
                    <>
                      Resend code in{" "}
                      <span className="font-semibold text-slate-700 font-mono">
                        {Math.floor(otpCountdown / 60)}:
                        {String(otpCountdown % 60).padStart(2, "0")}
                      </span>.
                    </>
                  ) : (
                    <span className="text-slate-400">
                      Resend code available now.
                    </span>
                  )}
                </p>
              </div>

              {/* Between these is a good amount of space. At the bottom of this UI is the submit button. Under the submit button is the Resend Code button which is grey until the timer ends. */}
              <div className="mt-8 sm:mt-10 space-y-3">
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={otpSending || otpCode.length !== 6}
                  className="w-full py-3.5 px-4 bg-[#0024A8] hover:bg-[#001D85] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl sm:rounded-2xl text-sm font-bold tracking-wide shadow-md shadow-[#0024A8]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {otpSending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Submit</span>
                  )}
                </button>

                {/* Resend Code Button (Grey until timer ends) */}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || otpSending}
                  className={`w-full py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 ${
                    otpCountdown > 0 || otpSending
                      ? "bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed"
                      : "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-xs cursor-pointer"
                  }`}
                >
                  {otpSending && otpCountdown === 0 ? (
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  <span>Resend Code</span>
                </button>
              </div>
            </form>

            {/* Cancel & Back to Login */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleCloseOtpModal}
                className="text-[11px] font-semibold text-slate-400 hover:text-[#0024A8] transition-colors cursor-pointer"
              >
                Cancel and return to login
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
