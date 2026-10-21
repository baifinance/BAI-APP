"use client";

import { useEffect } from "react";
import { syncPushSubscription } from "@/lib/push";

export default function PushRegistration() {
  useEffect(() => {
    void syncPushSubscription();
  }, []);

  return null;
}
