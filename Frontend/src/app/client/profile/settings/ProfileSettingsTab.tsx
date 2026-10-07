/**
 * ==============================================================================
 * COMPONENT: ProfileSettingsTab.tsx
 * Path: src/app/client/profile/settings/ProfileSettingsTab.tsx
 * Description: Client Profile Settings page with a streamlined layout.
 *              Displays page header "Profile Settings" and a single card container
 *              with bold "Enable Two-Factor Authentication" and an interactive
 *              slider button (#0A2881 when on, dark red #8B0000 when off).
 *              Integrates full backend MFA functionality including OTP verification,
 *              countdown timer, resend, and password-authenticated disable flow.
 * ==============================================================================
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCcw,
  X,
  Check,
  AlertTriangle,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { ClientData } from "../../types";
import { usersApi, authApi } from "@/lib/api";

interface ProfileSettingsTabProps {
  client: ClientData;
  onLogAction?: (actionText: string) => void;
}

export default function ProfileSettingsTab({
  client,
  onLogAction,
}: ProfileSettingsTabProps) {
  // ------------------------------------------------------------------------------
  // 1. STATE DEFINITIONS
  // ------------------------------------------------------------------------------

  // Multi-Factor Authentication state
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaInitialLoading, setMfaInitialLoading] = useState(true);
  const [mfaActionLoading, setMfaActionLoading] = useState(false);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaOtpCode, setMfaOtpCode] = useState("");
  const [mfaCountdown, setMfaCountdown] = useState(0);
  const [mfaError, setMfaError] = useState("");

  // Modal triggers
  const [showMfaEnable, setShowMfaEnable] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [showPostEnable, setShowPostEnable] = useState(false);

  // 6-digit OTP input states for MFA enable modal
  const [mfaDigits, setMfaDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const mfaDigitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  // User details resolved from client prop
  const displayEmail = client.profile?.email || client.email || "your registered email";

  /**
   * Navigate back to the previous page the user opened
   */
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/client/profile");
    }
  };

  // ------------------------------------------------------------------------------
  // 2. LIFECYCLE & EFFECTS
  // ------------------------------------------------------------------------------

  // Fetch current user MFA status on component mount
  useEffect(() => {
    let isMounted = true;
    setMfaInitialLoading(true);

    authApi
      .me()
      .then((user) => {
        if (isMounted) {
          setMfaEnabled(!!user?.mfa_enabled);
        }
      })
      .catch((err) => {
        console.debug("Note: Could not fetch MFA status:", err);
        if (isMounted) {
          setMfaEnabled(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setMfaInitialLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Countdown timer effect for OTP code expiration (180 seconds)
  useEffect(() => {
    if (!showMfaEnable || mfaCountdown <= 0) return;

    const timerId = setInterval(() => {
      setMfaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [showMfaEnable, mfaCountdown]);

  // Automatically focus the first OTP input when the verification modal appears
  useEffect(() => {
    if (showMfaEnable) {
      const focusTimeout = setTimeout(() => {
        mfaDigitRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(focusTimeout);
    }
  }, [showMfaEnable]);

  // ------------------------------------------------------------------------------
  // 3. MFA ACTION HANDLERS
  // ------------------------------------------------------------------------------

  /**
   * Handle digit entry across the 6 boxes for MFA Enable modal.
   */
  const handleMfaDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean && val !== "") return;

    const char = clean.slice(-1);
    const nextDigits = [...mfaDigits];
    nextDigits[index] = char;
    setMfaDigits(nextDigits);

    const fullCode = nextDigits.join("");
    setMfaOtpCode(fullCode);
    setMfaError("");

    if (char && index < 5) {
      mfaDigitRefs.current[index + 1]?.focus();
    }

    if (fullCode.length === 6 && !nextDigits.includes("")) {
      handleMfaEnableVerify(fullCode);
    }
  };

  /**
   * Handle Backspace & Arrow keys navigation between the 6 boxes.
   */
  const handleMfaDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!mfaDigits[index] && index > 0) {
        const nextDigits = [...mfaDigits];
        nextDigits[index - 1] = "";
        setMfaDigits(nextDigits);
        setMfaOtpCode(nextDigits.join(""));
        mfaDigitRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (mfaDigits[index]) {
        const nextDigits = [...mfaDigits];
        nextDigits[index] = "";
        setMfaDigits(nextDigits);
        setMfaOtpCode(nextDigits.join(""));
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      mfaDigitRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      mfaDigitRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Handle paste of 6-digit code across the boxes.
   */
  const handleMfaDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextDigits = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setMfaDigits(nextDigits);
    const fullCode = nextDigits.join("");
    setMfaOtpCode(fullCode);
    setMfaError("");

    if (pasted.length === 6) {
      mfaDigitRefs.current[5]?.focus();
      handleMfaEnableVerify(fullCode);
    } else {
      mfaDigitRefs.current[pasted.length]?.focus();
    }
  };

  /**
   * Request OTP dispatch to the user's registered email address to initiate MFA enablement.
   */
  const handleMfaEnableSend = async () => {
    setMfaError("");
    setMfaActionLoading(true);

    try {
      await usersApi.mfaEnableSend();
      setShowMfaEnable(true);
      setMfaCountdown(180); // 3-minute OTP validity
      setMfaOtpCode("");
      setMfaDigits(["", "", "", "", "", ""]);
      mfaDigitRefs.current[0]?.focus();
      if (onLogAction) {
        onLogAction("Requested MFA enablement OTP code");
      }
    } catch (err: any) {
      setMfaError(err?.message || "Failed to send verification code. Please try again.");
    } finally {
      setMfaActionLoading(false);
    }
  };

  /**
   * Verify the 6-digit OTP code to confirm and activate Multi-Factor Authentication.
   */
  const handleMfaEnableVerify = async (code?: string) => {
    const targetCode = code ?? mfaOtpCode;
    if (!targetCode || targetCode.length !== 6) return;

    setMfaVerifying(true);
    setMfaError("");

    try {
      const res = await usersApi.mfaEnableVerify(targetCode);
      setMfaEnabled(res.mfa_enabled);
      setShowMfaEnable(false);
      setShowPostEnable(true);
      setMfaOtpCode("");
      setMfaDigits(["", "", "", "", "", ""]);
      setMfaCountdown(0);
      if (onLogAction) {
        onLogAction("Successfully enabled Multi-Factor Authentication (MFA)");
      }
    } catch (err: any) {
      setMfaError(err?.message || "Invalid or expired verification code.");
    } finally {
      setMfaVerifying(false);
    }
  };

  /**
   * Disable Multi-Factor Authentication with password confirmation.
   */
  const handleMfaDisable = async () => {
    if (!disablePassword) return;

    setMfaActionLoading(true);
    setMfaError("");

    try {
      const res = await usersApi.mfaDisable(disablePassword);
      setMfaEnabled(!res.mfa_enabled ? false : !res.mfa_enabled);
      setShowDisableModal(false);
      setDisablePassword("");
      if (onLogAction) {
        onLogAction("Disabled Multi-Factor Authentication");
      }
    } catch (err: any) {
      setMfaError(err?.message || "Failed to disable MFA. Please verify your current password.");
    } finally {
      setMfaActionLoading(false);
    }
  };

  /**
   * Handle slider toggle button click:
   * - If off: trigger MFA email dispatch and open OTP verification modal
   * - If on: prompt password modal to confirm disabling MFA
   */
  const handleToggleSlider = () => {
    if (mfaActionLoading || mfaInitialLoading || mfaVerifying) return;

    if (!mfaEnabled) {
      handleMfaEnableSend();
    } else {
      setDisablePassword("");
      setMfaError("");
      setShowDisableModal(true);
    }
  };

  // ------------------------------------------------------------------------------
  // 4. RENDER UI
  // ------------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">

      {/* ==================================================================== */}
      {/* PAGE HEADER: Back Arrow Button & Profile Settings Title              */}
      {/* ==================================================================== */}
      <div className="border-b border-slate-200/80 pb-4 flex items-center gap-3">
        {/* Back Button to Previous Page */}
        <button
          type="button"
          onClick={handleBack}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center group"
          title="Go back to previous page"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5] transition-transform group-hover:-translate-x-0.5" />
        </button>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Profile Settings
        </h1>
      </div>

      {/* ==================================================================== */}
      {/* CONTAINER: Enable Two-Factor Authentication with Slider Toggle        */}
      {/* Slider turns #0A2881 when on and dark red (#8B0000) when off          */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 sm:p-7 flex items-center justify-between gap-4">
        <div>
          <span className="font-bold text-slate-900 text-sm sm:text-base block">
            Enable Two-Factor Authentication
          </span>
        </div>

        {/* Interactive Slider Switch Button */}
        <button
          type="button"
          role="switch"
          aria-checked={!!mfaEnabled}
          onClick={handleToggleSlider}
          disabled={mfaActionLoading || mfaInitialLoading || mfaVerifying}
          className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0A2881] focus:ring-offset-2 disabled:opacity-50 ${
            mfaEnabled ? "bg-[#0A2881]" : "bg-[#8B0000]"
          }`}
          title={
            mfaEnabled
              ? "Two-Factor Authentication is ON. Click to disable."
              : "Two-Factor Authentication is OFF. Click to enable."
          }
          aria-label="Toggle Two-Factor Authentication"
        >
          {/* Slider knob */}
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              mfaEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Error banner (if an error occurs outside of modals) */}
      {mfaError && !showMfaEnable && !showDisableModal && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{mfaError}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: ENABLE TWO-FACTOR AUTHENTICATION OTP POP-UP                 */}
      {/* ==================================================================== */}
      {showMfaEnable && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enable-2fa-title"
        >
          {/* Modal Container Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 max-w-md w-full shadow-2xl border border-slate-100 relative animate-scaleIn max-h-[90vh] overflow-y-auto">
            
            {/* Modal Close Icon Button */}
            <button
              type="button"
              onClick={() => {
                setShowMfaEnable(false);
                setMfaOtpCode("");
                setMfaDigits(["", "", "", "", "", ""]);
                setMfaError("");
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Centered Header: Title & Subtitle */}
            <div className="text-center pt-2">
              {/* Big bold text centered: "Enable Two-Factor Authentication" */}
              <h2
                id="enable-2fa-title"
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              >
                Enable Two-Factor Authentication
              </h2>
              {/* Smaller text: "We sent a 6 digit confirmation code to (users email). Enter the code below to enable Two-Factor Authentication." */}
              <p className="text-sm text-slate-500 font-normal mt-2.5 leading-relaxed max-w-sm mx-auto">
                We sent a 6 digit confirmation code to{" "}
                <span className="font-semibold text-slate-800 break-all">{displayEmail}</span>. Enter the code below to enable Two-Factor Authentication.
              </p>
            </div>

            {/* Error Message Display */}
            {mfaError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl text-xs font-semibold text-rose-600 flex items-center justify-center gap-2 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{mfaError}</span>
              </div>
            )}

            {/* OTP Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMfaEnableVerify();
              }}
              className="mt-8"
            >
              {/* 6 input boxes to put the OTP */}
              <div className="flex justify-center items-center gap-2 sm:gap-3">
                {mfaDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      mfaDigitRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={mfaVerifying}
                    onChange={(e) => handleMfaDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleMfaDigitKeyDown(index, e)}
                    onPaste={handleMfaDigitPaste}
                    className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border-2 transition-all outline-none ${
                      digit
                        ? "border-[#0024A8] bg-blue-50/30 text-slate-900 shadow-xs"
                        : "border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300"
                    } focus:border-[#0024A8] focus:bg-white focus:ring-4 focus:ring-[#0024A8]/10 disabled:opacity-50`}
                    aria-label={`Digit ${index + 1} of 6`}
                  />
                ))}
              </div>

              {/* Timer at Bottom Left & Resend Code at Bottom Right */}
              <div className="flex items-center justify-between mt-4 text-xs">
                {/* Bottom Left: Code Expires in (timer). */}
                <span className="text-slate-500 font-medium">
                  {mfaCountdown > 0 ? (
                    <>
                      Code Expires in{" "}
                      <span className="font-bold text-slate-700 font-mono">
                        {Math.floor(mfaCountdown / 60)}:
                        {String(mfaCountdown % 60).padStart(2, "0")}
                      </span>.
                    </>
                  ) : (
                    <span className="text-rose-500 font-semibold">Code Expired.</span>
                  )}
                </span>

                {/* Bottom Right: Resend Code Link (Available only if timer is 0) */}
                {mfaCountdown === 0 && (
                  <button
                    type="button"
                    onClick={handleMfaEnableSend}
                    disabled={mfaActionLoading}
                    className="text-[#0024A8] hover:text-[#001D85] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Resend Code</span>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Good amount of space between timer/resend and bottom buttons */}
              <div className="mt-8 sm:mt-10 space-y-3">
                {/* Top Button: Confirm (Confirms the OTP) */}
                <button
                  type="submit"
                  disabled={mfaVerifying || mfaOtpCode.length !== 6}
                  className="w-full py-3.5 px-4 bg-[#0024A8] hover:bg-[#001D85] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-xl sm:rounded-2xl text-sm shadow-md shadow-[#0024A8]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {mfaVerifying ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>

                {/* Below Button: Grey colored Cancel button to cancel */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMfaEnable(false);
                    setMfaOtpCode("");
                    setMfaDigits(["", "", "", "", "", ""]);
                    setMfaError("");
                  }}
                  className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl sm:rounded-2xl text-sm transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: 2FA CONFIRMATION ENABLED MODAL                              */}
      {/* ==================================================================== */}
      {showPostEnable && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="two-factor-enabled-title"
          aria-describedby="two-factor-enabled-desc"
        >
          {/* Modal Dialog Card Container */}
          <div className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10 text-center overflow-hidden transform transition-all duration-300 animate-scaleUp">
            {/* Subtle decorative top background gradient glow */}
            <div
              aria-hidden="true"
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
            />

            {/* -------------------------------------------------------------- */}
            {/* TOP CENTERED: LARGE BLUE CHECK ICON                            */}
            {/* -------------------------------------------------------------- */}
            <div className="relative mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-blue-50/90 border border-blue-100 ring-8 ring-blue-50/50 text-[#0038A8] shadow-sm shadow-blue-500/10 transition-transform">
              <Check
                className="w-10 h-10 stroke-[2.5]"
                aria-hidden="true"
              />
            </div>

            {/* -------------------------------------------------------------- */}
            {/* TITLE: BOLD LARGE FORMAT CENTERED                              */}
            {/* -------------------------------------------------------------- */}
            <h3
              id="two-factor-enabled-title"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center"
            >
              Enabled Two-Factor Authentication!
            </h3>

            {/* -------------------------------------------------------------- */}
            {/* SUBTEXT: SMALLER DESCRIPTIVE NOTICE                            */}
            {/* -------------------------------------------------------------- */}
            <p
              id="two-factor-enabled-desc"
              className="mt-3 text-sm sm:text-base text-slate-500 text-center leading-relaxed max-w-sm mx-auto"
            >
              Your account is now protected. You will recieve a 6 digit code by email whenever you log in.
            </p>

            {/* -------------------------------------------------------------- */}
            {/* ACTION BUTTON: CONTINUE (CLOSES THE POP-UP)                    */}
            {/* -------------------------------------------------------------- */}
            <button
              type="button"
              onClick={() => setShowPostEnable(false)}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white bg-[#0038A8] hover:bg-[#002b82] active:bg-[#002066] shadow-md shadow-blue-900/20 hover:shadow-lg hover:shadow-blue-900/30 transition-all duration-200 cursor-pointer text-base group"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DISABLE 2FA CONFIRMATION POP-UP                             */}
      {/* ==================================================================== */}
      {showDisableModal && (
        <div
          className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disable-2fa-title"
        >
          {/* Modal Container Card */}
          <div className="bg-white rounded-3xl p-7 sm:p-9 max-w-md w-full shadow-2xl border border-slate-100 relative animate-scaleIn max-h-[90vh] overflow-y-auto">
            
            {/* Modal Close Icon Button */}
            <button
              type="button"
              onClick={() => {
                setShowDisableModal(false);
                setDisablePassword("");
                setMfaError("");
                setShowDisablePassword(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Centered Header: Title & Subtitle */}
            <div className="text-center pt-2">
              {/* Big bold text centered: "Disable Two-Factor Authentication" */}
              <h2
                id="disable-2fa-title"
                className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              >
                Disable Two-Factor Authentication
              </h2>
              {/* Smaller not bold text */}
              <p className="text-sm text-slate-500 font-normal mt-2.5 leading-relaxed max-w-sm mx-auto">
                Please enter your current account password to confirm that you want to turn off Two-Factor Authentication.
              </p>
            </div>

            {/* Error Notice Display (e.g. incorrect password) */}
            {mfaError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl sm:rounded-2xl text-xs font-semibold text-rose-600 flex items-center justify-center gap-2 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{mfaError}</span>
              </div>
            )}

            {/* Password Confirmation Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleMfaDisable();
              }}
              className="mt-8"
            >
              {/* Input Container: "Enter current password" with subtle opacity placeholder */}
              <div className="relative flex items-center">
                {/* Security Lock Icon */}
                <div className="absolute left-4 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>

                {/* Password Input Field */}
                <input
                  type={showDisablePassword ? "text" : "password"}
                  value={disablePassword}
                  onChange={(e) => {
                    setDisablePassword(e.target.value);
                    if (mfaError) setMfaError("");
                  }}
                  placeholder="Enter current password"
                  className="w-full py-3.5 pl-11 pr-11 bg-slate-50 border-2 border-slate-200 focus:border-[#0024A8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0024A8]/10 rounded-xl sm:rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:opacity-60 transition-all"
                  autoFocus
                  required
                />

                {/* Password Visibility Toggle */}
                {disablePassword && (
                  <button
                    type="button"
                    onClick={() => setShowDisablePassword((prev) => !prev)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                    aria-label={showDisablePassword ? "Hide password" : "Show password"}
                  >
                    {showDisablePassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons: Cancel (Left) and Confirm (Right) */}
              <div className="flex items-center gap-3 mt-8 sm:mt-10">
                {/* Left: Cancel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisablePassword("");
                    setMfaError("");
                    setShowDisablePassword(false);
                  }}
                  disabled={mfaActionLoading}
                  className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl sm:rounded-2xl text-sm transition-all border border-slate-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                {/* Right: Confirm Button */}
                <button
                  type="submit"
                  disabled={mfaActionLoading || !disablePassword.trim()}
                  className="flex-1 py-3.5 px-4 bg-[#0024A8] hover:bg-[#001D85] active:scale-[0.99] text-white font-bold rounded-xl sm:rounded-2xl text-sm shadow-md shadow-[#0024A8]/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {mfaActionLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <span>Confirm</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
