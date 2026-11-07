"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

// Opens Stripe's secure billing portal (update card, see invoices, cancel) in a new tab.
export default function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    // Open the tab right away (inside the click) so the browser does not block it, then send it to Stripe.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      if (tab) tab.location.href = data.url;
      else window.location.href = data.url;
    } catch {
      tab?.close();
      setError("We could not open billing right now. Please try again or contact us.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="manage-billing-btn"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 32, padding: "0 14px", borderRadius: 8, border: "none", background: "var(--btn-blue)", color: "#fff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1, whiteSpace: "nowrap" }}
      >
        {busy ? "Opening..." : "Manage billing"}
        <ExternalLink size={15} strokeWidth={2} />
      </button>
      {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginTop: 8 }}>{error}</div>}
    </div>
  );
}
