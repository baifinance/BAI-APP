"use client";

import { useSyncExternalStore } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

interface PwaSnapshot {
  canInstall: boolean;
  installed: boolean;
}

type InstallWindow = Window & {
  __baiInstallPrompt?: BeforeInstallPromptEvent;
  navigator: Navigator & {
    getInstalledRelatedApps?: () => Promise<unknown[]>;
  };
};

const SERVER_SNAPSHOT: PwaSnapshot = { canInstall: false, installed: false };

const DISMISS_KEY = "bai_pwa_dismissed_at";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
let snapshot: PwaSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { canInstall: deferredPrompt !== null, installed: installedFlag };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PwaSnapshot {
  return snapshot;
}

function getServerSnapshot(): PwaSnapshot {
  return SERVER_SNAPSHOT;
}

export function usePwaInstall(): PwaSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
const getServerClientSnapshot = () => false;

export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerClientSnapshot
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
  );
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/.test(window.navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator;
  return (
    /iPad|iPhone|iPod/.test(nav.userAgent) ||
    // iPadOS 13+ Safari reports a Macintosh UA; touch points expose the iPad.
    (nav.platform === "MacIntel" && nav.maxTouchPoints > 1)
  );
}

export async function promptInstall(): Promise<InstallOutcome> {
  const prompt = deferredPrompt;
  if (!prompt) return "unavailable";

  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    clearPrompt(prompt);
    if (outcome === "accepted") installedFlag = true;
    emit();
    return outcome;
  } catch {
    clearPrompt(prompt);
    emit();
    return "unavailable";
  }
}

function clearPrompt(prompt: BeforeInstallPromptEvent): void {
  if (deferredPrompt === prompt) deferredPrompt = null;
  if (typeof window !== "undefined") {
    const win = window as InstallWindow;
    if (win.__baiInstallPrompt === prompt) {
      delete win.__baiInstallPrompt;
    }
  }
}

export function isDismissed(): boolean {
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

export function rememberDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() }));
  } catch {
    // localStorage may be unavailable in private mode; ignore.
  }
}

// Android Chrome only: an installed WebAPK suppresses beforeinstallprompt.
// getInstalledRelatedApps() lets us tell the user the app already exists.
async function detectInstalledWebApp(): Promise<void> {
  if (!isAndroid()) return;
  const nav = (window as InstallWindow).navigator;
  if (!nav.getInstalledRelatedApps) return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    if (apps.length > 0 && !installedFlag) {
      installedFlag = true;
      deferredPrompt = null;
      emit();
    }
  } catch {
    // Unsupported or blocked; beforeinstallprompt remains the only signal.
  }
}

// Capture the event as early as possible; Chrome may fire it before hydration.
if (typeof window !== "undefined") {
  const win = window as InstallWindow;
  installedFlag = isStandalone();
  deferredPrompt = win.__baiInstallPrompt ?? null;
  snapshot = { canInstall: deferredPrompt !== null, installed: installedFlag };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    win.__baiInstallPrompt = deferredPrompt;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    installedFlag = true;
    deferredPrompt = null;
    delete win.__baiInstallPrompt;
    emit();
  });

  void detectInstalledWebApp();
}
