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
    <main className="min-h-screen bg-[#0A2881] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-10 shadow-2xl">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#0A2881] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>

        <div className="mt-8 text-center">
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

        {step === "email" && (
          <form onSubmit={sendResetCode} className="mt-8 space-y-5">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Email address
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10"
                />
              </div>
            </label>
            <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white transition hover:bg-[#071D60] disabled:opacity-50">
              {isSubmitting ? "Sending code..." : "Send reset code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <div className="mt-8 space-y-5">
            <div className="flex justify-center gap-2 sm:gap-3">
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
                  className="h-12 w-10 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-black text-[#0A2881] outline-none focus:border-[#0A2881] focus:ring-2 focus:ring-[#0A2881]/10 sm:w-12"
                />
              ))}
            </div>
            <button
              type="button"
              disabled={code.length !== OTP_LENGTH}
              onClick={() => { setError(""); setStep("password"); }}
              className="w-full rounded-xl bg-[#0A2881] py-3.5 text-sm font-bold text-white transition hover:bg-[#071D60] disabled:opacity-50"
            >
              Continue
            </button>
            <div className="text-center text-sm text-slate-500">
              Didn’t receive the code?{" "}
              <button type="button" onClick={resendCode} disabled={resendIn > 0 || isSubmitting} className="font-bold text-[#0A2881] disabled:text-slate-400">
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
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
