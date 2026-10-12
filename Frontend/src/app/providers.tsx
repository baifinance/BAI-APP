"use client";

import React, { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  noopStorage,
  QUERY_CACHE_BUSTER,
  QUERY_CACHE_MAX_AGE,
  queryClientConfig,
  shouldPersistQuery,
} from "@/lib/query-cache";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient(queryClientConfig),
  );
  const [persister] = useState(() =>
    createSyncStoragePersister({
      key: "bai-query-cache",
      storage: typeof window === "undefined" ? noopStorage : window.localStorage,
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: QUERY_CACHE_BUSTER,
        maxAge: QUERY_CACHE_MAX_AGE,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
