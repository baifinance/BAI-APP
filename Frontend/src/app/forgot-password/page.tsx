"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { otpApi } from "@/lib/api";

type Step = "email" | "code" | "password" | "success";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") inputRefs.current[0]?.focus();
  }, [step]);

  const sendResetCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }

    setIsSubmitting(true);
    try {
      await otpApi.send(email.trim(), "reset_password");
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendIn(RESEND_SECONDS);
      setStep("code");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to send a reset code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDigit = (index: number, value: string) => {
    const next = [...digits];
    const clean = value.replace(/\D/g, "").slice(-1);
    next[index] = clean;
    setDigits(next);
    setError("");
    if (clean && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleDigitKeyDown = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((value, index) => {
      next[index] = value;
    });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerifyCode = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (code.length !== OTP_LENGTH || isSubmitting) {
      setError("Invalid OTP");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await otpApi.verify(email.trim(), code, "reset_password");
      setStep("password");
    } catch {
      setError("Invalid OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== OTP_LENGTH) {
      setError("Enter the 6-digit verification code.");
      setStep("code");
      return;
    }
    if (newPassword.length < 12) {
      setError("Your password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await otpApi.resetPassword(email.trim(), code, newPassword, confirmPassword);
      setStep("success");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to reset your password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await otpApi.send(email.trim(), "reset_password");
      setDigits(Array(OTP_LENGTH).fill(""));
      setResendIn(RESEND_SECONDS);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Unable to resend the reset code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="min-h-screen min-h-[100dvh] bg-[#0A2881] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
  selection:bg-[#0024A8] selection:text-white antialiased relative overflow-hidden pt-20 sm:pt-20 xl:pt-8"
    >
      {/* ====================================================================== */}
      {/* 1. BACKGROUND LAYERS (COPIED FROM LOGIN PAGE):                         */}
      {/* loginImage.jpeg (blurry) + 65% Blue Layer + Moving Blurry Gold Rings   */}
      {/* ====================================================================== */}
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

      {/* ====================================================================== */}
      {/* 2. TOP-LEFT NAVIGATION: BACK TO LOGIN                                  */}
      {/* Positioned at the top-left of the page instead of inside the card      */}
      {/* ====================================================================== */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8 z-30">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-bold text-white transition-all duration-200 shadow-sm"
          aria-label="Back to login"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to login</span>
        </Link>
      </div>

      {/* ====================================================================== */}
      {/* 3. RESET PASSWORD MAIN CARD CONTAINER                                  */}
      {/* Glassmorphic white container matching login card aesthetics            */}
      {/* ====================================================================== */}
      <div className="w-full max-w-xl rounded-3xl bg-white/95 backdrop-blur-md p-6 sm:p-10 shadow-2xl relative z-10 animate-scaleIn">
        {/* Header Icon & Title */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0A2881]">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-[#0A2881] sm:text-3xl">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === "email" && "Enter your account email and we’ll send you a verification code."}
            {step === "code" && `Enter the 6-digit code sent to ${email}.`}
            {step === "password" && "Choose a new password for your account."}
            {step === "success" && "Your password has been updated successfully."}
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3.5 text-sm font-semibold text-rose-600">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step !== "success" && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {["email", "code", "password"].map((item, index) => (
              <div key={item} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  ["email", "code", "password"].indexOf(step) >= index
                    ? "bg-[#0A2881] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {index + 1}
                </span>
                {index < 2 && <span className="h-px w-8 bg-slate-200 sm:w-14" />}
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 4. STEP 1: EMAIL ENTRY FORM                                        */}
        {/* Features non-bold font on email input and customized validation     */}
        {/* ------------------------------------------------------------------ */}
        {step === "email" && (
          <form onSubmit={sendResetCode} className="mt-8 space-y-5">
            {/* Field: Email Address (separate label to keep input font non-bold) */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-email"
                className="block text-xs font-extrabold uppercase tracking-wider text-slate-400"
              >
                Email address
              </label>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 focus-within:border-[#0A2881] focus-within:ring-2 focus-within:ring-[#0A2881]/10 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity("Please enter a valid email.");
                  }}
                  onInput={(e) => {
                    e.currentTarget.setCustomValidity("");
                  }}
                  placeholder="Enter your registered email"
                  className="w-full py-3 pl-11 pr-4 text-sm font-normal text-slate-800 placeholder:text-slate-400/70 placeholder:font-normal outline-none bg-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white transition hover:bg-[#071D60] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Sending code..." : "Send reset code"}
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* 5. STEP 2: OTP VERIFICATION CODE FORM                              */}
        {/* Validates the 6-digit code against server before proceeding        */}
        {/* ------------------------------------------------------------------ */}
        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="mt-8 space-y-5">
            <div className="flex justify-center gap-1.5 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => { inputRefs.current[index] = element; }}
                  value={digit}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => handleDigitKeyDown(index, event.key)}
                  onPaste={handlePaste}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Verification digit ${index + 1}`}
                  className="h-12 flex-1 max-w-10 sm:max-w-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg sm:text-xl font-black text-[#0A2881] outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={code.length !== OTP_LENGTH || isSubmitting}
              className="w-full rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white transition hover:bg-[#071D60] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Verifying code..." : "Continue"}
            </button>
            <div className="text-center text-sm text-slate-500">
              Didn’t receive the code?{" "}
              <button type="button" onClick={resendCode} disabled={resendIn > 0 || isSubmitting} className="font-bold text-[#0A2881] disabled:text-slate-400 cursor-pointer">
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} className="mt-8 space-y-4">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              New password
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={12}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10"
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Confirm password
              <div className="relative mt-1.5">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={12}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-800 outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10"
                />
                <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white transition hover:bg-[#071D60] disabled:opacity-50">
              {isSubmitting ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="mt-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-4 text-sm font-medium text-slate-600">
              You can now sign in with your new password.
            </p>
            <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white hover:bg-[#071D60]">
              Return to login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
