"use client";

import { useCallback, useState } from "react";
import { Download, MoreVertical, Share2, Smartphone } from "lucide-react";
import {
  isDismissed,
  isIOS,
  isMobile,
  promptInstall,
  rememberDismissal,
  useIsClient,
  usePwaInstall,
} from "@/lib/pwa";

/**
 * Mobile-only hard-block install overlay.
 *
 * Desktop users get no install prompt UI — they can install via the browser
 * address bar if they choose.
 *
 * Mobile and tablet devices (phone UA, iPad, Android tablet, or ≤1024px) see
 * a full-screen "Download BAI APP" overlay until they install or explicitly
 * continue to the website.
 *
 * Chrome/Android: install button triggers beforeinstallprompt; until the
 * browser fires that event, manual menu instructions are shown instead of a
 * dead button.
 * iOS/iPadOS Safari: "Add to Home Screen → Share" hint (no prompt API).
 * Dismissal is remembered in localStorage for 30 days.
 * Already installed (standalone mode): nothing shown.
 */
export default function PwaInstallPrompt() {
  const isClient = useIsClient();
  const { canInstall, installed } = usePwaInstall();
  const [dismissed, setDismissedState] = useState(false);

  const installApp = useCallback(async () => {
    await promptInstall();
  }, []);

  const continueToWebsite = useCallback(() => {
    rememberDismissal();
    setDismissedState(true);
  }, []);

  // Server + hydration render must match: don't render client-only UI yet.
  if (!isClient) return null;

  // Desktop: no install prompt UI at all.
  if (!isMobile()) return null;

  // Already installed (standalone mode): nothing shown.
  if (installed) return null;

  // User dismissed within the last 30 days: nothing shown.
  if (dismissed || isDismissed()) return null;

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

      {/* Brand logo */}
      <div className="relative mx-auto mb-4">
        <img
          src="/bai_logo_white-384.webp"
          alt="BAI Group of Companies"
          width={384}
          height={165}
          className="h-21 w-auto object-contain drop-shadow-lg"
        />
      </div>

      {/* Main content group */}
      <div className="flex w-full -translate-y-8 flex-col items-center">
        {/* Heading */}
        <h1 id="pwa-install-title" className="text-3xl font-black leading-tight mb-2 text-center">
          Download <span className="text-[#E4BA37]">BAI APP</span>
        </h1>
        <p className="text-white/90 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed px-4 text-center">
          Get loan status updates, notifications, and track your applications —
          even when the tab is closed.
        </p>

        {/* Primary CTA */}
        {canInstall ? (
          <button
            type="button"
            onClick={installApp}
            className="pointer-events-auto w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#F2C94C] to-[#E4BA37] text-[#0A2881] text-sm font-bold shadow-xl shadow-[#E4BA37]/30 transition-all hover:from-[#F7D45E] hover:to-[#EDC23E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Install BAI APP"
          >
            <Download className="w-5 h-5" />
            Install BAI APP
          </button>
        ) : isIOS() ? (
          <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold text-center">
            <Smartphone className="w-5 h-5 text-[#E4BA37] shrink-0" />
            <span>Share</span>
            <Share2 className="w-4 h-4 text-[#E4BA37] shrink-0" />
            <span>Add to Home Screen</span>
          </div>
        ) : (
          <div className="flex items-start gap-3 px-6 py-4 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold">
            <MoreVertical className="w-5 h-5 text-[#E4BA37] shrink-0 mt-0.5" />
            <span className="text-left leading-relaxed">
              Open your browser menu and choose{" "}
              <span className="text-[#E4BA37]">Install app</span> or{" "}
              <span className="text-[#E4BA37]">Add to Home screen</span>.
            </span>
          </div>
        )}
      </div>

      {/* Bottom dismiss */}
      <p className="mt-8 text-xs text-white/50 uppercase tracking-wider font-semibold text-center">
        Already installed? Open BAI APP from your home screen.
      </p>
    </div>
  );
}
