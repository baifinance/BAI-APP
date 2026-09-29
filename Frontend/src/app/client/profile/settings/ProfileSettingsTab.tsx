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
  KeyRound,
  Timer,
  RotateCcw,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Client } from "../../../broker/MockData";
import { usersApi, authApi } from "@/lib/api";

interface ProfileSettingsTabProps {
  client: Client;
  setClient?: React.Dispatch<React.SetStateAction<Client>>;
  onLogAction?: (actionText: string) => void;
}

export default function ProfileSettingsTab({
  client,
  setClient,
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
  const [showPostEnable, setShowPostEnable] = useState(false);

  // OTP input element reference for auto-focusing
  const mfaInputRef = useRef<HTMLInputElement>(null);

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

  // Automatically focus the OTP input when the verification modal appears
  useEffect(() => {
    if (showMfaEnable && mfaInputRef.current) {
      const focusTimeout = setTimeout(() => {
        mfaInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(focusTimeout);
    }
  }, [showMfaEnable]);

  // ------------------------------------------------------------------------------
  // 3. MFA ACTION HANDLERS
  // ------------------------------------------------------------------------------

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
    <div className="space-y-6 animate-fadeIn pb-12">

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
      {/* MODAL 1: ENABLE MFA - ENTER 6-DIGIT EMAIL CODE                        */}
      {/* ==================================================================== */}
      {showMfaEnable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-[#0024A8] flex items-center justify-center shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Enable Two-Factor Authentication
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify code sent to {displayEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMfaEnable(false);
                  setMfaOtpCode("");
                  setMfaError("");
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {mfaError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              We sent a 6-digit confirmation code to your email. Enter the code below to finalize activating Two-Factor Authentication.
            </p>

            {/* OTP 6-Digit Input */}
            <div className="space-y-3">
              <input
                ref={mfaInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={mfaOtpCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setMfaOtpCode(cleaned);
                  if (cleaned.length === 6) {
                    handleMfaEnableVerify(cleaned);
                  }
                }}
                placeholder="••••••"
                className="w-full py-3.5 px-4 bg-slate-50 border border-slate-300 focus:border-[#0024A8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 rounded-xl text-center font-mono font-bold tracking-[0.5em] text-2xl transition-all shadow-inner"
                disabled={mfaVerifying}
                autoFocus
              />

              {/* Timer & Resend Button */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-slate-400" />
                  Expires in: <strong className="font-mono">{Math.floor(mfaCountdown / 60)}:{String(mfaCountdown % 60).padStart(2, "0")}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleMfaEnableSend}
                  disabled={mfaCountdown > 0 || mfaActionLoading}
                  className="font-bold text-[#0024A8] hover:underline disabled:opacity-40 disabled:no-underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend code</span>
                </button>
              </div>
            </div>

            {mfaVerifying && (
              <p className="text-xs font-semibold text-[#0024A8] mt-3 text-center animate-pulse">
                Verifying code with server...
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowMfaEnable(false);
                  setMfaOtpCode("");
                  setMfaError("");
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleMfaEnableVerify()}
                disabled={mfaVerifying || mfaOtpCode.length !== 6}
                className="flex-1 py-2.5 bg-[#0024A8] hover:bg-[#001D85] text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                {mfaVerifying ? "Verifying..." : "Confirm & Enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: POST-ENABLE CONFIRMATION SUCCESS MODAL                      */}
      {/* ==================================================================== */}
      {showPostEnable && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Two-Factor Authentication Enabled!
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Your account is now protected. From now on, you will receive a secure 6-digit code by email whenever you sign in to BAI Finance.
            </p>
            <button
              type="button"
              onClick={() => setShowPostEnable(false)}
              className="mt-6 w-full py-3 bg-[#0024A8] hover:bg-[#001D85] text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Got it, Continue
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: DISABLE MFA PASSWORD CONFIRMATION MODAL                     */}
      {/* ==================================================================== */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-7 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-xs text-slate-500">Security verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisablePassword("");
                  setMfaError("");
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Please enter your current account password to confirm that you want to turn off Two-Factor Authentication.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Current Password
              </label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 focus:border-[#0024A8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 rounded-xl text-xs font-semibold"
                autoFocus
              />
            </div>

            {mfaError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDisableModal(false);
                  setDisablePassword("");
                  setMfaError("");
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMfaDisable}
                disabled={mfaActionLoading || !disablePassword}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
              >
                {mfaActionLoading ? "Disabling..." : "Confirm Disable"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
