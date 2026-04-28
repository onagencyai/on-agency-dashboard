export const dynamic = "force-dynamic";

import { Radio } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Campaigns
        </span>
      </div>

      <div
        style={{
          background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "80px 20px",
        }}
      >
        <Radio size={28} style={{ color: "var(--text-tertiary)", marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>
          Campaigns coming soon
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280, textAlign: "center" }}>
          Manage your outbound campaigns here once they are configured.
        </div>
      </div>
    </div>
  );
}
