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
  Eye,
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigatingHome, setIsNavigatingHome] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // ==============================================================================
  // 1b. PASSWORD RESET POP-UP MODAL STATE & HANDLERS
  // ==============================================================================
  const [isResetPopupOpen, setIsResetPopupOpen] = useState(false);
  const [resetDigits, setResetDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const resetDigitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOpenPasswordReset = (e: React.MouseEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your registered email address first to reset your password.");
      emailInputRef.current?.focus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address format (e.g., name@example.com).");
      emailInputRef.current?.focus();
      return;
    }

    setErrorMsg("");
    setIsResetPopupOpen(true);
    setResetDigits(["", "", "", "", "", ""]);
    setTimeout(() => resetDigitRefs.current[0]?.focus(), 120);
  };

  const handleResetDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean && val !== "") return;

    const char = clean.slice(-1);
    const nextDigits = [...resetDigits];
    nextDigits[index] = char;
    setResetDigits(nextDigits);

    if (char && index < 5) {
      resetDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleResetDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!resetDigits[index] && index > 0) {
        const nextDigits = [...resetDigits];
        nextDigits[index - 1] = "";
        setResetDigits(nextDigits);
        resetDigitRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (resetDigits[index]) {
        const nextDigits = [...resetDigits];
        nextDigits[index] = "";
        setResetDigits(nextDigits);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      resetDigitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      resetDigitRefs.current[index + 1]?.focus();
    }
  };

  const handleResetPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const nextDigits = [...resetDigits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pastedData[i] || "";
    }
    setResetDigits(nextDigits);

    const nextFocusIndex = Math.min(pastedData.length, 5);
    resetDigitRefs.current[nextFocusIndex]?.focus();
  };

  const handleBackToHome = () => {
    setIsNavigatingHome(true);
    setTimeout(() => {
      router.push("/");
    }, 250);
  };

  // ==============================================================================
  // 1c. NEW PASSWORD POP-UP MODAL STATE & HANDLERS (Follow-up to Reset OTP)
  // ==============================================================================
  const [isNewPasswordPopupOpen, setIsNewPasswordPopupOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [reEnterPassword, setReEnterPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showReEnterPassword, setShowReEnterPassword] = useState(false);
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

  // Transition from Password Reset OTP popup to New Password popup
  const handleOtpSubmitToNewPassword = (e: React.MouseEvent | React.FormEvent) => {
    e.preventDefault();
    // Close the OTP modal container and open the New Password modal container
    setIsResetPopupOpen(false);
    setIsNewPasswordPopupOpen(true);
    setNewPassword("");
    setReEnterPassword("");
    setPasswordMatchError("");
    setPasswordResetSuccess(false);
  };

  // Close the New Password popup modal
  const handleCloseNewPasswordPopup = () => {
    setIsNewPasswordPopupOpen(false);
    setNewPassword("");
    setReEnterPassword("");
    setPasswordMatchError("");
    setPasswordResetSuccess(false);
  };

  // Password input change handlers with interactive match checker logic
  const handleNewPasswordChange = (val: string) => {
    setNewPassword(val);
    if (reEnterPassword && val !== reEnterPassword) {
      setPasswordMatchError("Passwords do not match. Please ensure both fields are identical.");
    } else {
      setPasswordMatchError("");
    }
  };

  const handleReEnterPasswordChange = (val: string) => {
    setReEnterPassword(val);
    if (newPassword && val !== newPassword) {
      setPasswordMatchError("Passwords do not match. Please ensure both fields are identical.");
    } else {
      setPasswordMatchError("");
    }
  };

  // Password match checker submission handler (UI prototype only)
  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !reEnterPassword.trim()) {
      setPasswordMatchError("Please enter both password fields.");
      return;
    }
    // Checker to make sure New Password and Re-Enter Password match
    if (newPassword !== reEnterPassword) {
      setPasswordMatchError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setPasswordMatchError("");
    // UI Prototype success state (no backend password reset call)
    setPasswordResetSuccess(true);
  };

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
      className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
  selection:bg-[#0024A8] selection:text-white antialiased relative overflow-hidden"
    >
      {/* ---------------------------------------------------------------------- */}
      {/* FARTHEST BACKGROUND: loginImage.jpeg (blurry) + 65% Blue Layer         */}
      {/* + Moving Blurry Glowing Gold Rings                                     */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
        aria-hidden="true"
      >
        {/* Layer 0a: loginImage background, expanded slightly and blurred */}
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
      {/* TOP-LEFT RETURN BUTTON: Blue square with white arrow -> Gold / Dark Blue */}
      {/* ---------------------------------------------------------------------- */}
      <button
        type="button"
        onClick={handleBackToHome}
        aria-label="Return to Main Page"
        className={`fixed top-4 left-4 sm:top-6 sm:left-6 z-30 w-11 h-11 flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-95 ${
          isNavigatingHome
            ? "bg-[#E4BA37] text-[#0A2881] shadow-[#E4BA37]/50"
            : "bg-[#0A2881] text-white hover:bg-[#071D60] shadow-[#0A2881]/40"
        }`}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* ---------------------------------------------------------------------- */}
      {/* MAIN SPLIT-CONTAINER CARD (In front of everything, no outer white border)*/}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="bg-white/95 backdrop-blur-md w-full max-w-5xl rounded-3xl shadow-2xl
  grid grid-cols-1 md:grid-cols-2 overflow-hidden relative z-10 min-h-[600px] animate-scaleIn"
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
          <div className="space-y-6 my-auto">
            {/* ---------------------------------------------------------------- */}
            {/* 1. HEADER SECTION: CENTERED LOG IN TITLE & SUBTEXT               */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-2 text-center mb-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0A2881] tracking-tight leading-none uppercase">
                LOG IN
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Please input the following credentials to procceed.
              </p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-600 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* 2. LOGIN FORM                                                    */}
            {/* ---------------------------------------------------------------- */}
            <form
              onSubmit={handleCredentialsSubmit}
              className="space-y-4"
            >
              {/* Field 1: Email Address (Email Icon to its Left) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Email Address
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all bg-slate-50">
                  {/* Email icon positioned on the left */}
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    className="w-full pl-11 pr-4 py-3 bg-transparent focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400/70"
                  />
                </div>
              </div>

              {/* Field 2: Password (Key Icon to Left, Show/Hide Eye Toggle on Right) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Password
                </label>
                <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all bg-slate-50">
                  {/* Key icon positioned on the left */}
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-transparent focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400/70"
                  />
                  {/* Eye toggle icon appears when there is input in the password field */}
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0A2881] transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* 3. SUBMIT BUTTON: Theme Blue "Log In"                            */}
              {/* ---------------------------------------------------------------- */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#0A2881] hover:bg-[#071D60] active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-[#0A2881]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Log In</span>
                )}
              </button>

              {/* ---------------------------------------------------------------- */}
              {/* 4. FORGOT PASSWORD HYPERLINK (Triggers Password Reset Modal)      */}
              {/* ---------------------------------------------------------------- */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-500 font-medium">
                  Forgot your password?{" "}
                  <a
                    href="#"
                    onClick={handleOpenPasswordReset}
                    className="text-[#0A2881] font-bold hover:underline cursor-pointer"
                  >
                    Click here to reset
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Footer Info */}
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

      {/* ====================================================================== */}
      {/* 8. PASSWORD RESET POP-UP MODAL CONTAINER                               */}
      {/* ====================================================================== */}
      {isResetPopupOpen && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-reset-title"
        >
          {/* Modal Container Card */}
          <div className="bg-white w-full max-w-md rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative animate-scaleIn">
            
            {/* Exit Icon on the top right */}
            <button
              type="button"
              onClick={() => setIsResetPopupOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close password reset modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Large Bold Centered Blue Title */}
            <div className="text-center space-y-2 mb-6">
              <h3
                id="password-reset-title"
                className="text-2xl sm:text-3xl font-black text-[#0A2881] tracking-tight"
              >
                Password Reset
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
                We sent a password reset email containing a 6-digit code to{" "}
                <span className="font-bold text-slate-800">
                  {email.trim() || "(user email)"}
                </span>
                . Please input the code below.
              </p>
            </div>

            {/* 6-Slot Input that only accepts numbers */}
            <div className="my-6">
              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {resetDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      resetDigitRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleResetDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleResetDigitKeyDown(index, e)}
                    onPaste={handleResetPaste}
                    className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border-2 transition-all outline-none ${
                      digit
                        ? "border-[#0A2881] bg-blue-50/30 text-slate-900 shadow-xs"
                        : "border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300"
                    } focus:border-[#0A2881] focus:bg-white focus:ring-4 focus:ring-[#0A2881]/10`}
                    aria-label={`Digit ${index + 1} of 6`}
                  />
                ))}
              </div>

              {/* Resend message with hyperlink */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                  Didn&apos;t recieve a code?{" "}
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-[#0A2881] font-bold hover:underline cursor-pointer"
                  >
                    Click here to resend.
                  </a>
                </p>
              </div>
            </div>

            {/* Centered Blue Submit Button (Redirects to New Password Reset Popup) */}
            <div className="mt-6 sm:mt-8">
              <button
                type="button"
                onClick={handleOtpSubmitToNewPassword}
                className="w-full py-3.5 px-4 bg-[#0A2881] hover:bg-[#071D60] text-white rounded-xl sm:rounded-2xl text-sm font-bold shadow-md shadow-[#0A2881]/20 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
              >
                Submit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ====================================================================== */}
      {/* 9. NEW PASSWORD POP-UP MODAL CONTAINER (Follow-up to Reset OTP)       */}
      {/*    Separate Container for entering new password & matching check       */}
      {/* ====================================================================== */}
      {isNewPasswordPopupOpen && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-password-modal-title"
        >
          {/* Modal Container Card - Separate Container */}
          <div className="bg-white w-full max-w-md rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative animate-scaleIn">
            
            {/* Exit / Close Icon Button */}
            <button
              type="button"
              onClick={handleCloseNewPasswordPopup}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close password reset modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header: Large Bold Centered Text "Password Reset" */}
            <div className="text-center space-y-2 mb-6">
              <h3
                id="new-password-modal-title"
                className="text-2xl sm:text-3xl font-black text-[#0A2881] tracking-tight"
              >
                Password Reset
              </h3>
            </div>

            {/* UI Prototype Success Notification */}
            {passwordResetSuccess ? (
              <div className="space-y-6 my-4 animate-fadeIn">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs sm:text-sm font-bold">Password Updated!</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Your new password has been verified and reset successfully (UI Prototype).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseNewPasswordPopup}
                  className="w-full py-3.5 px-4 bg-[#0A2881] hover:bg-[#071D60] text-white rounded-xl sm:rounded-2xl text-sm font-bold shadow-md shadow-[#0A2881]/20 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              /* Password Reset Form with Match Checker */
              <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                
                {/* Error Banner: Password Match Checker */}
                {passwordMatchError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600 animate-fadeIn">
                    <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{passwordMatchError}</span>
                  </div>
                )}

                {/* ------------------------------------------------------------ */}
                {/* FIELD 1: Smaller text placed on the left "New Password"      */}
                {/* Under that text is an input bar                              */}
                {/* ------------------------------------------------------------ */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="reset-new-password"
                    className="text-xs sm:text-sm font-semibold text-slate-700 block text-left"
                  >
                    New Password
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all bg-slate-50">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => handleNewPasswordChange(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-transparent focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400/70"
                    />
                    {newPassword.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0A2881] transition-colors cursor-pointer"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* ------------------------------------------------------------ */}
                {/* FIELD 2: Smaller text placed on the left "Re-Enter Password" */}
                {/* Under that text is another input box                         */}
                {/* ------------------------------------------------------------ */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="reset-re-enter-password"
                    className="text-xs sm:text-sm font-semibold text-slate-700 block text-left"
                  >
                    Re-Enter Password
                  </label>
                  <div className="relative rounded-xl overflow-hidden shadow-2xs border border-slate-200 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all bg-slate-50">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-re-enter-password"
                      type={showReEnterPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter your new password"
                      value={reEnterPassword}
                      onChange={(e) => handleReEnterPasswordChange(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-transparent focus:outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400/70"
                    />
                    {reEnterPassword.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowReEnterPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0A2881] transition-colors cursor-pointer"
                        aria-label={showReEnterPassword ? "Hide password" : "Show password"}
                      >
                        {showReEnterPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Match Confirmation Badge (when user enters matching passwords) */}
                {newPassword && reEnterPassword && newPassword === reEnterPassword && !passwordMatchError && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-600 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Passwords match</span>
                  </div>
                )}

                {/* Submit Button with Match Checker */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-[#0A2881] hover:bg-[#071D60] active:scale-[0.99] text-white rounded-xl sm:rounded-2xl text-sm font-bold shadow-md shadow-[#0A2881]/20 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer"
                  >
                    Submit
                  </button>
                </div>

                {/* Cancel Link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleCloseNewPasswordPopup}
                    className="text-[11px] font-semibold text-slate-400 hover:text-[#0A2881] transition-colors cursor-pointer"
                  >
                    Cancel and return to login
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
