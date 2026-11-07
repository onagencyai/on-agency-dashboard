"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

export default function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch {
      setError("We could not open billing right now. Please try again or contact us.");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <button
        onClick={open}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 6, border: "none", background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap" }}
      >
        {busy ? "Opening..." : "Manage billing"} <ExternalLink size={13} />
      </button>
      {error && <span style={{ fontSize: 12.5, color: "var(--red)" }}>{error}</span>}
    </div>
  );
}
