export default function LoadingSkeleton() {
  return (
    <div className="w-full animate-pulse p-4 md:p-6 lg:p-8" aria-busy="true" aria-label="Loading">
      <div className="h-24 w-full rounded-2xl bg-slate-200 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="h-5 w-1/3 rounded bg-slate-200" />
          <div className="h-10 w-full rounded-xl bg-slate-100" />
          <div className="h-10 w-full rounded-xl bg-slate-100" />
          <div className="h-10 w-2/3 rounded-xl bg-slate-100" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
          <div className="h-5 w-1/4 rounded bg-slate-200" />
          <div className="h-28 w-full rounded-xl bg-slate-200" />
          <div className="h-12 w-full rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
