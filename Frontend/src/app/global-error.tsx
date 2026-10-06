"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <h2>Something went wrong</h2>
          <button onClick={reset} style={{ marginTop: 12, padding: "8px 16px", background: "#0A2881", color: "#fff", border: "none", borderRadius: 8 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
