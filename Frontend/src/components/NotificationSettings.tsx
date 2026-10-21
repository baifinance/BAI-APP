"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, CheckCircle2, Loader2, Mail, Smartphone } from "lucide-react";

import {
  notificationsApi,
  NotificationPreference,
} from "@/lib/api";
import {
  disablePush,
  enablePush,
  getPushSubscription,
  isPushSupported,
} from "@/lib/push";

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A2881]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#0A2881]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationSettings() {
  const [preference, setPreference] = useState<NotificationPreference | null>(null);
  const [hasPushSubscription, setHasPushSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"push" | "email" | "test" | null>(null);
  const [message, setMessage] = useState("");
  const supported = isPushSupported();

  const refreshSubscription = useCallback(async () => {
    const subscription = await getPushSubscription();
    setHasPushSubscription(Boolean(subscription));
  }, []);

  useEffect(() => {
    let mounted = true;

    notificationsApi
      .getPreferences()
      .then((data) => {
        if (mounted) setPreference(data);
      })
      .catch(() => {
        if (mounted) setMessage("Notification settings could not be loaded.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    getPushSubscription()
      .then((subscription) => {
        if (mounted) setHasPushSubscription(Boolean(subscription));
      })
      .catch(() => {
        if (mounted) setHasPushSubscription(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreference = async (patch: Partial<NotificationPreference>) => {
    setBusy("email");
    setMessage("");
    try {
      const updated = await notificationsApi.updatePreferences(patch);
      setPreference(updated);
    } catch {
      setMessage("Could not save notification preferences.");
    } finally {
      setBusy(null);
    }
  };

  const togglePush = async (next: boolean) => {
    setBusy("push");
    setMessage("");
    try {
      if (next) {
        const result = await enablePush();
        if (!result.ok) {
          setMessage(result.message ?? "Push notifications could not be enabled.");
          return;
        }
      } else {
        await disablePush();
      }
      const updated = await notificationsApi.getPreferences();
      setPreference(updated);
      await refreshSubscription();
    } catch {
      setMessage("Push notification settings could not be updated.");
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    setMessage("");
    try {
      const result = await notificationsApi.sendTestPush();
      setMessage(
        result.sent > 0
          ? "Test notification sent to this device."
          : "No active push subscription was found.",
      );
    } catch {
      setMessage("Test notification could not be sent.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading notification settings...
        </div>
      </div>
    );
  }

  if (!preference) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-soft-xl text-sm font-semibold text-rose-600">
        {message || "Notification settings are unavailable."}
      </div>
    );
  }

  const pushOn = hasPushSubscription && preference.push_enabled;

  return (
    <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-soft-xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0A2881] flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Notification Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Choose how BAI Finance reaches you. Security and account emails are always sent.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <Mail className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Critical email alerts</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Loan status changes, bookings, and account security events.
              </p>
            </div>
          </div>
          <Toggle
            label="Critical email alerts"
            checked={preference.email_critical_enabled}
            disabled={busy === "email"}
            onChange={(next) => updatePreference({ email_critical_enabled: next })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <Mail className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Optional email updates</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Messages and general document updates. Off by default.
              </p>
            </div>
          </div>
          <Toggle
            label="Optional email updates"
            checked={preference.email_optional_enabled}
            disabled={busy === "email"}
            onChange={(next) => updatePreference({ email_optional_enabled: next })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <Smartphone className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-800">Browser push on this device</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {supported
                  ? "Get alerts even when the BAI Finance tab is closed. This setting applies to this browser only."
                  : "This browser does not support Web Push notifications."}
              </p>
            </div>
          </div>
          <Toggle
            label="Browser push notifications"
            checked={pushOn}
            disabled={!supported || busy === "push"}
            onChange={togglePush}
          />
        </div>
      </div>

      {pushOn && (
        <button
          type="button"
          onClick={sendTest}
          disabled={busy === "test"}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
        >
          {busy === "test" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
          Send test notification
        </button>
      )}

      {message && (
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#0A2881]" />
          {message}
        </p>
      )}
    </section>
  );
}
