"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Chrome/Android: show a custom "Install BAI APP" button when the site is
 * installable. The native address-bar icon is subtle, so this gives users an
 * explicit call to action.
 *
 * iOS Safari: there is no install prompt API. We render a static hint telling
 * users to use Share → Add to Home Screen.
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
