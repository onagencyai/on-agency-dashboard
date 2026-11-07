"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { PageSection, PageTitle, cardStyle, pagePadding, pageColumn } from "@/components/PageSection";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [businessName, setBusinessName] = useState("—");
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  useEffect(() => {
    async function fetchClientInfo() {
      try {
        const res = await fetch("/api/client-info", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { business_name?: unknown };
        if (typeof data.business_name === "string" && data.business_name.trim()) {
          setBusinessName(data.business_name);
        }
      } catch {
        // keep default "—"
      }
    }
    void fetchClientInfo();
  }, []);

  return (
    <div style={{ padding: pagePadding }}>
      <div style={pageColumn}>
      <PageTitle>Settings</PageTitle>

      <PageSection title="Account" cue="The details tied to your login.">
        <div style={cardStyle}>
          <Row label="Business name" value={businessName} />
          <Row label="Email" value={email} last />
        </div>
      </PageSection>

      <PageSection title="Session" cue="Sign out of this device.">
        <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Log out</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>You can sign back in any time with your email.</div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border-hover)", color: "var(--red)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            <LogOut size={14} />
            Log out
          </button>
        </div>
      </PageSection>
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 150px) minmax(0, 1fr)", alignItems: "baseline", gap: 16, padding: "16px 20px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)", overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );
}
