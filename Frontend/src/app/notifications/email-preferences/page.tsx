"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BellOff, CheckCircle2, Loader2, Mail } from "lucide-react";

import {
  emailPreferencesApi,
  EmailPreferences,
} from "@/lib/api";

function EmailPreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [preference, setPreference] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;

    emailPreferencesApi
      .get(token)
      .then((data) => {
        if (mounted) setPreference(data);
      })
      .catch(() => {
        if (mounted) setMessage("This link is invalid or has expired.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const disable = async (scope: "all" | "critical" | "optional") => {
    if (!token) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await emailPreferencesApi.update(token, scope);
      setPreference((current) => ({ ...current, ...updated }));
      setMessage("Your email preferences have been updated.");
    } catch {
      setMessage("Your preferences could not be updated. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-7 sm:p-9 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0A2881] flex items-center justify-center">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Email preferences
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            BAI Finance notification emails
          </p>
        </div>
      </div>

      {!token ? (
        <p className="text-sm font-semibold text-rose-600">
          This link is missing its secure token.
        </p>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your preferences...
        </div>
      ) : preference ? (
        <>
          {preference.email && (
            <p className="text-sm text-slate-600 font-medium">
              Signed in address:{" "}
              <span className="font-bold text-slate-900">{preference.email}</span>
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Critical alerts</p>
                <p className="text-xs text-slate-500 font-medium">
                  Loan status, bookings, and account security.
                </p>
              </div>
              <span
                className={`text-xs font-bold ${
                  preference.email_critical_enabled
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {preference.email_critical_enabled ? "On" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Optional updates</p>
                <p className="text-xs text-slate-500 font-medium">
                  Messages and general document updates.
                </p>
              </div>
              <span
                className={`text-xs font-bold ${
                  preference.email_optional_enabled
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {preference.email_optional_enabled ? "On" : "Off"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => disable("all")}
              disabled={saving}
              className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0A2881] hover:bg-[#071D60] text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              Turn off all notification emails
            </button>
            <Link
              href="/login"
              className="inline-flex flex-1 items-center justify-center px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors"
            >
              Go to BAI Finance
            </Link>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
            Security and account-recovery emails are always sent and cannot be
            disabled. Signed-in users can manage individual categories from
            Notification Settings in their portal.
          </p>
        </>
      ) : null}

      {message && (
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0A2881]" />
          {message}
        </p>
      )}
    </div>
  );
}

export default function EmailPreferencesPage() {
  return (
    <main className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-9 text-sm font-semibold text-slate-500">
            Loading email preferences...
          </div>
        }
      >
        <EmailPreferencesContent />
      </Suspense>
    </main>
  );
}
