"use client";

import { useCallback, useState } from "react";
import { Download, Loader2, MoreVertical, Share2, Smartphone } from "lucide-react";
import {
  isAndroid,
  isIOS,
  promptInstall,
  useIsClient,
  usePwaInstall,
} from "@/lib/pwa";

export default function InstallAppCard() {
  const isClient = useIsClient();
  const { canInstall, installed } = usePwaInstall();
  const [busy, setBusy] = useState(false);

  const install = useCallback(async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  }, []);

  if (!isClient || installed) return null;

  const android = isAndroid();
  const ios = isIOS();
  if (!android && !ios) return null;

  return (
    <section className="bg-white border border-slate-200/80 rounded-xl p-6 sm:p-7 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0A2881] flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Install BAI APP
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {android
              ? "Install the full app on this device for faster access and notifications."
              : "Add BAI APP to your home screen for faster access and notifications."}
          </p>
        </div>
      </div>

      {android ? (
        canInstall ? (
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#F2C94C] to-[#E4BA37] text-[#0A2881] text-sm font-bold shadow-sm transition-all hover:from-[#F7D45E] hover:to-[#EDC23E] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Install BAI APP
          </button>
        ) : (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-xs font-semibold text-slate-600">
              <MoreVertical className="w-4 h-4 text-[#0A2881] shrink-0 mt-0.5" />
              <span>
                Open Chrome&apos;s menu and choose{" "}
                <span className="font-bold">Install app</span>.
              </span>
            </p>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              Preparing install… if it&apos;s not listed, wait a moment and
              reload.
            </p>
          </div>
        )
      ) : (
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Smartphone className="w-4 h-4 text-[#0A2881] shrink-0" />
          Tap <Share2 className="w-3.5 h-3.5 text-[#0A2881] shrink-0" />
          <span className="font-bold">Share</span> then{" "}
          <span className="font-bold">Add to Home Screen</span>.
        </p>
      )}
    </section>
  );
}
