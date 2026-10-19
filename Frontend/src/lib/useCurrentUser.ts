"use client";

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";

/**
 * Resolve the signed-in user's display identity from the API so headers and
 * sidebars never fall back to hardcoded placeholder personas.
 */
export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ["current-user", "profile"],
    queryFn: usersApi.getProfile,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const fullName =
    data?.full_name?.trim() ||
    [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim() ||
    "";

  const email = data?.email ?? "";

  const initials = (() => {
    if (data?.first_name || data?.last_name) {
      return `${(data?.first_name ?? "")[0] ?? ""}${(data?.last_name ?? "")[0] ?? ""}`.toUpperCase() || "?";
    }
    const local = (email.split("@")[0] ?? "").replace(/[^a-zA-Z0-9]/g, "");
    return local.slice(0, 2).toUpperCase() || "?";
  })();

  return { fullName, email, initials, role: data?.role ?? null, isLoading };
}
