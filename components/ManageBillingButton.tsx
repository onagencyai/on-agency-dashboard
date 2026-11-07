"use client";

import { useState } from "react";
import { CreditCard, ArrowUpRight } from "lucide-react";

// Opens Stripe's secure billing portal (update card, see invoices, cancel). Same pattern as the Fluensy membership screen.
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
    <div>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="manage-billing-row"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, textAlign: "left", color: "var(--ink)", fontFamily: "inherit" }}
      >
        <CreditCard size={20} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{busy ? "Opening..." : "Manage billing"}</span>
        <ArrowUpRight size={18} strokeWidth={1.75} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
      </button>
      {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
