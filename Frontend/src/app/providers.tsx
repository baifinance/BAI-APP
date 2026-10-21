"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClientConfig } from "@/lib/query-cache";
import PushRegistration from "@/components/PushRegistration";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient(queryClientConfig),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PushRegistration />
      {children}
    </QueryClientProvider>
  );
}
