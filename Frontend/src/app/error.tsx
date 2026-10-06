"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-extrabold text-slate-800">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-md">An unexpected error occurred. Please try again.</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-[#0A2881] text-white text-sm font-bold hover:bg-[#071D60] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
