"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, MoreVertical, Share2, Smartphone } from "lucide-react";
import {
  isAndroid,
  isDismissed,
  isIOS,
  promptInstall,
  rememberDismissal,
  useIsClient,
  usePwaInstall,
} from "@/lib/pwa";

/**
 * Hard-block install overlay for Android and iOS only.
 *
 * Desktop users get no install prompt UI — they can install via the browser
 * address bar if they choose.
 *
 * Android (Chrome): only the full WebAPK install flow. The gold button appears
 * when beforeinstallprompt is available; until then we point at Chrome's
 * "Install app" menu entry. "Add to Home screen" is never suggested because it
 * only creates a shortcut, not a full PWA install.
 * iOS/iPadOS Safari: "Share → Add to Home Screen" hint (no prompt API).
 * Dismissal is remembered in localStorage for 30 days.
 * Already installed (standalone mode / WebAPK): nothing shown.
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

  const android = isAndroid();
  const ios = isIOS();

  // Desktop / other platforms: no install prompt UI at all.
  if (!android && !ios) return null;

  // Already installed: nothing shown.
  if (installed) return null;

  // User dismissed within the last 30 days: nothing shown.
  if (dismissed || isDismissed()) return null;

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

        {/* Android: full install only */}
        {android &&
          (canInstall ? (
            <button
              type="button"
              onClick={installApp}
              className="pointer-events-auto w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#F2C94C] to-[#E4BA37] text-[#0A2881] text-sm font-bold shadow-xl shadow-[#E4BA37]/30 transition-all hover:from-[#F7D45E] hover:to-[#EDC23E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label="Install BAI APP"
            >
              <Download className="w-5 h-5" />
              Install BAI APP
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-start gap-3 px-6 py-4 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold">
                <MoreVertical className="w-5 h-5 text-[#E4BA37] shrink-0 mt-0.5" />
                <span className="text-left leading-relaxed">
                  Open Chrome&apos;s <span className="text-[#E4BA37]">⋮</span> menu
                  and choose{" "}
                  <span className="text-[#E4BA37]">Install app</span>.
                </span>
              </div>
              <p className="flex items-center gap-2 text-xs text-white/70 text-center">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                Preparing install… if it&apos;s not listed, wait a moment and
                reload.
              </p>
            </div>
          ))}

        {/* iOS: no install prompt API */}
        {ios && (
          <div className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold text-center">
            <Smartphone className="w-5 h-5 text-[#E4BA37] shrink-0" />
            <span>Share</span>
            <Share2 className="w-4 h-4 text-[#E4BA37] shrink-0" />
            <span>Add to Home Screen</span>
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
