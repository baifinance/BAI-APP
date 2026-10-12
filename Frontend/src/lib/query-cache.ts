import type { QueryClientConfig } from "@tanstack/react-query";
import type { Query } from "@tanstack/query-core";

export const QUERY_CACHE_BUSTER = "bai-query-cache-v1";
export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Only queries explicitly marked with `meta.persist = true` may cross a
 * browser refresh. User/session data remains memory-only by default.
 */
export function shouldPersistQuery(query: Query) {
  return query.meta?.persist === true;
}

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
};

export const noopStorage: Storage = {
  get length() {
    return 0;
  },
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};
