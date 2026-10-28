"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";

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
 * Chrome/Android: show a custom "Install BAI APP" button when the site is
 * installable. The native address-bar icon is subtle, so this gives users an
 * explicit call to action.
 *
 * iOS Safari: there is no install prompt API. We render a static hint telling
 * users to use Share → Add to Home Screen.
 *
 * Mobile devices get a hard-block overlay ("Download The App") that covers the
 * web app until the user installs or explicitly continues to the website.
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
  const [mobileBlock, setMobileBlock] = useState(() =>
    isMobile() && !isStandalone && !isDismissed()
  );

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
    setMobileBlock(false);
  }, []);

  // Desktop: small bottom-right install button only.
  if (!isMobile()) {
    if (installed || (!canInstall && !isIOS)) return null;

    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {canInstall && (
          <button
            type="button"
            onClick={installApp}
            className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl bg-[#0024A8] text-white text-xs font-bold shadow-lg transition-all hover:bg-[#0A2881]"
            aria-label="Install BAI APP"
          >
            <Download className="w-4 h-4" />
            Install BAI APP
          </button>
        )}
        {isIOS && !installed && (
          <div className="pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FAFAFA] border border-slate-200 text-xs text-slate-600 shadow-sm">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <div className="text-slate-500">Add to Home Screen</div>
            <Share2 className="w-3 h-3 text-slate-400 ml-2 shrink-0" />
          </div>
        )}
      </div>
    );
  }

  // Mobile: hard-block overlay until install or explicit dismiss.
  if (!mobileBlock) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0024A8] text-white p-6 text-center pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <button
        type="button"
        onClick={continueToWebsite}
        className="absolute top-4 right-4 pointer-events-auto text-xs text-white/70 hover:text-white"
        aria-label="Continue to website"
      >
        <X className="w-4 h-4" />
        Continue to website
      </button>

      <Smartphone className="w-16 h-16 mx-auto mb-6 text-white/20" />

      <h1 id="pwa-install-title" className="text-2xl sm:text-3xl font-extrabold mb-2">
        Download The App
      </h1>
      <p className="text-white/90 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
        Install BAI APP to get loan status updates, notifications, and track
        your applications — even when the tab is closed.
      </p>

      {canInstall ? (
        <button
          type="button"
          onClick={installApp}
          className="pointer-events-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-[#0024A8] text-sm font-bold shadow-lg transition-all hover:bg-[#FAFAFA]"
          aria-label="Install BAI APP"
        >
          <Download className="w-5 h-5" />
          Install BAI APP
        </button>
      ) : isIOS ? (
        <div className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 bg-white/10 text-sm font-bold">
          <Smartphone className="w-5 h-5 text-white" />
          <span>Add to Home Screen → Share</span>
          <Share2 className="w-4 h-4" />
        </div>
      ) : null}

      <p className="mt-6 text-xs text-white/60">
        Already installed? Open BAI APP from your home screen.
      </p>
    </div>
  );
}
