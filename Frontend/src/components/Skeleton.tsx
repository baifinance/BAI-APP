import React from "react";
import SkeletonBase, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const BASE_COLOR = "#e2e8f0";
const HIGHLIGHT_COLOR = "#f1f5f9";

/** Applies the shared slate theme to every skeleton rendered inside. */
function Themed({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme baseColor={BASE_COLOR} highlightColor={HIGHLIGHT_COLOR}>
      {children}
    </SkeletonTheme>
  );
}

/** Low-level themed bar. Kept for API compatibility with earlier callers. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <SkeletonBase className={className} />;
}

/** Generic page-level skeleton: header + a few cards. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Themed>
      <div className="space-y-6" role="status" aria-label="Loading">
        <div className="space-y-3">
          <SkeletonBase width={192} height={24} borderRadius={8} />
          <SkeletonBase width={288} height={12} borderRadius={6} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonBase height={112} borderRadius={16} />
          <SkeletonBase height={112} borderRadius={16} />
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-200/70 p-6">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonBase key={i} height={40} borderRadius={8} />
          ))}
        </div>
      </div>
    </Themed>
  );
}

/** Profile page skeleton: banner + detail grid. */
export function ProfileSkeleton() {
  return (
    <Themed>
      <div className="space-y-6" role="status" aria-label="Loading profile">
        <div className="overflow-hidden rounded-[5px] border-0 shadow-sm">
          <SkeletonBase height={176} borderRadius={0} />
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBase width={96} height={12} borderRadius={6} />
                <SkeletonBase width={160} height={16} borderRadius={6} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Themed>
  );
}

/** Table skeleton used by payment history. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Themed>
      <div
        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white"
        role="status"
        aria-label="Loading"
      >
        <div className="border-b border-slate-100 bg-slate-50/75 px-6 py-4">
          <SkeletonBase width={128} height={12} borderRadius={6} />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <SkeletonBase width={28} height={28} borderRadius={8} />
              <div className="flex-1">
                <SkeletonBase height={16} borderRadius={6} />
              </div>
              <SkeletonBase width={96} height={16} borderRadius={6} />
              <SkeletonBase width={80} height={16} borderRadius={6} />
            </div>
          ))}
        </div>
      </div>
    </Themed>
  );
}

/** Split-pane skeleton used by the communication inbox. */
export function InboxSkeleton() {
  return (
    <Themed>
      <div
        className="grid min-h-[620px] grid-cols-1 overflow-hidden rounded-3xl border border-slate-200/80 bg-white lg:grid-cols-16"
        role="status"
        aria-label="Loading inbox"
      >
        <div className="flex flex-col gap-3 border-slate-200 p-5 lg:col-span-5 lg:border-r">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBase key={i} height={64} borderRadius={16} />
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 lg:col-span-11">
          <SkeletonBase circle width={64} height={64} />
          <SkeletonBase width={128} height={16} borderRadius={6} />
        </div>
      </div>
    </Themed>
  );
}

/** Notification list skeleton. */
export function NotificationSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Themed>
      <div
        className="space-y-2.5 rounded-3xl border border-slate-200/80 bg-white p-5"
        role="status"
        aria-label="Loading notifications"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
            <SkeletonBase width={32} height={32} borderRadius={8} />
            <div className="flex-1 space-y-2">
              <SkeletonBase width="66%" height={14} borderRadius={6} />
              <SkeletonBase width="33%" height={12} borderRadius={6} />
            </div>
          </div>
        ))}
      </div>
    </Themed>
  );
}
