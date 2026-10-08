export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
import { useEffect, useState } from "react";

export function useTimeAgo(iso?: string | null, fallback?: string): string {
  const [label, setLabel] = useState<string>(fallback ?? "");
  useEffect(() => {
    const update = () => setLabel(iso ? timeAgo(iso) : fallback ?? "");

    if (!iso) {
      const timeoutId = window.setTimeout(update, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(update, 0);
    const intervalId = window.setInterval(update, 30_000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [iso, fallback]);
  return label;
}
