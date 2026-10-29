"use client";

import { useEffect } from "react";
import { registerServiceWorker, syncPushSubscription } from "@/lib/push";

export default function PushRegistration() {
  useEffect(() => {
    void registerServiceWorker();
    void syncPushSubscription();
  }, []);

  return null;
}
