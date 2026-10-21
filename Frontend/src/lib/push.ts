"use client";

import { notificationsApi, PushSubscriptionPayload } from "@/lib/api";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function toPayload(subscription: PushSubscription): PushSubscriptionPayload | null {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;

  return {
    endpoint: json.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent.slice(0, 255),
  };
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await registerPushServiceWorker();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  if (!isPushSupported()) {
    return { ok: false, message: "Push notifications are not supported by this browser." };
  }

  const config = await notificationsApi.getPushConfig();
  if (!config.enabled || !config.public_key) {
    return { ok: false, message: "Push notifications are not configured on this server." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Notification permission was not granted." };
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    return { ok: false, message: "The notification service worker could not be registered." };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.public_key) as BufferSource,
    }));

  const payload = toPayload(subscription);
  if (!payload) {
    return { ok: false, message: "This browser returned an incomplete push subscription." };
  }

  await notificationsApi.subscribePush(payload);
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;

  const subscription = await getPushSubscription();
  if (subscription) {
    try {
      await notificationsApi.unsubscribePush(subscription.endpoint);
    } finally {
      await subscription.unsubscribe();
    }
    return;
  }

  await notificationsApi.updatePreferences({ push_enabled: false });
}

export async function syncPushSubscription(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;

  const subscription = await getPushSubscription();
  if (!subscription) return;

  const payload = toPayload(subscription);
  if (!payload) return;

  try {
    await notificationsApi.subscribePush(payload);
  } catch {
    // Unverified MFA sessions and logged-out tabs will retry on the next load.
  }
}

export async function unsubscribePushForLogout(): Promise<void> {
  if (!isPushSupported()) return;

  const subscription = await getPushSubscription();
  if (!subscription) return;

  try {
    await notificationsApi.unsubscribePush(subscription.endpoint);
  } catch {
    // Logout must continue even when the server is unreachable.
  }
  try {
    await subscription.unsubscribe();
  } catch {
    // The browser may already have dropped it.
  }
}
