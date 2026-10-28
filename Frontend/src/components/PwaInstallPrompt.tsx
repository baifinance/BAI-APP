"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

const DISMISS_KEY = "bai_pwa_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 768;
}

function isMobileUserAgent(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod|Mobile|Android/.test(ua);
}

function isMobile(): boolean {
  return isMobileViewport() || isMobileUserAgent();
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw) as { ts: number };
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ ts: Date.now() })
    );
  } catch {
    // localStorage may be unavailable in private mode; ignore.
  }
}

/**
 * Mobile-only hard-block install overlay.
 *
 * Desktop users get no install prompt UI — they can install via the browser
 * address bar if they choose.
 *
 * Mobile devices (≤768px or mobile UA) see a full-screen "Download BAI APP"
 * overlay until they install or explicitly continue to the website.
 *
 * Chrome/Android: install button triggers beforeinstallprompt.
 * iOS Safari: "Add to Home Screen → Share" hint (no prompt API).
 * Dismissal is remembered in localStorage for 30 days.
 * Already installed (standalone mode): nothing shown.
 */
export default function PwaInstallPrompt() {
  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(window.navigator.platform) ||
    (typeof window !== "undefined" &&
      /Macintosh/.test(window.navigator.platform) &&
      navigator.maxTouchPoints > 1);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone);

  // Initialize from standalone status (avoids set-state-in-effect).
  const [installed, setInstalled] = useState(() => isStandalone);
  const [canInstall, setCanInstall] = useState(() => !isStandalone);

  const handleBeforeInstallPrompt = useCallback(
    (event: Event) => {
      // Prevent Chrome from showing its own mini-infobar so we control the UX.
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    },
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [handleBeforeInstallPrompt]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    deferredPrompt = null;
    setCanInstall(false);
  }, []);

  const continueToWebsite = useCallback(() => {
    setDismissed();
  }, []);

  // Desktop: no install prompt UI at all.
  if (!isMobile()) return null;

  // Already installed (standalone mode): nothing shown.
  if (installed) return null;

  // User dismissed within the last 30 days: nothing shown.
  if (isDismissed()) return null;

  // Not installable and not iOS: nothing useful to show.
  if (!canInstall && !isIOS) return null;

  // Mobile hard-block overlay.
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-between bg-gradient-to-b from-[#0024A8] to-[#0A2881] text-white p-6 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      {/* Top-right close / continue */}
      <div className="flex justify-end w-full pt-2 pr-4">
        <button
          type="button"
          onClick={continueToWebsite}
          className="pointer-events-auto text-xs text-white/60 hover:text-white underline"
          aria-label="Continue to website"
        >
          Continue to website
        </button>
      </div>

      {/* Icon with glow ring */}
      <div className="relative mx-auto mb-8">
        <div className="absolute inset-0 rounded-full bg-[#0024A8]/30 blur-[24px] animate-pulse" />
        <Smartphone className="w-20 h-20 mx-auto relative z-10 text-white/90 drop-shadow-lg" />
      </div>

      {/* Heading */}
      <h1 id="pwa-install-title" className="text-3xl font-black leading-tight mb-2 text-center">
        Download <span className="text-[#E4BA37]">BAI APP</span>
      </h1>
      <p className="text-white/90 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed px-4">
        Get loan status updates, notifications, and track your applications —
        even when the tab is closed.
      </p>

      {/* Primary CTA */}
      {canInstall ? (
        <button
          type="button"
          onClick={installApp}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#0024A8] to-[#0A2881] text-white text-sm font-bold shadow-xl transition-all hover:from-[#0A2881] hover:to-[#12309B]"
          aria-label="Install BAI APP"
        >
          <Download className="w-5 h-5" />
          Install BAI APP
        </button>
      ) : isIOS ? (
        <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold">
          <Smartphone className="w-5 h-5 text-[#E4BA37]" />
          <span>Add to Home Screen</span>
          <Share2 className="w-4 h-4 text-[#E4BA37]" />
        </div>
      ) : null}

      {/* Bottom dismiss */}
      <p className="mt-8 text-xs text-white/50 uppercase tracking-wider font-semibold">
        Already installed? Open BAI APP from your home screen.
      </p>
    </div>
  );
}
