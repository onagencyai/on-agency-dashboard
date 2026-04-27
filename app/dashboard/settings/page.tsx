"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import type { UserPublicMetadata } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;

  const [businessName, setBusinessName] = useState(metadata.business_name ?? "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/update-business-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Settings
        </span>
      </div>

      <div
        style={{
          background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
          maxWidth: 520,
        }}
      >
        {/* Panel header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Account</span>
        </div>

        {/* Fields */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Business Name */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Business Name
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="text"
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  setIsDirty(e.target.value !== (metadata.business_name ?? ""));
                }}
                style={{
                  width: "100%", maxWidth: 400,
                  background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
                  padding: "8px 12px", fontSize: 13, color: "var(--text-primary)",
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              {isDirty && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: "var(--accent)", color: "var(--bg)", border: "none",
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                    transition: "opacity 0.15s", whiteSpace: "nowrap",
                  }}
                >
                  {saved ? "Saved" : saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginBottom: 6 }}>
              Email
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{email}</div>
          </div>
        </div>

        {/* Logout */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "20px 24px" }}>
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              color: "var(--red)", fontSize: 13, fontWeight: 400,
              cursor: "pointer", background: "none", border: "none", padding: 0,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <LogOut size={16} />
            Log out of your account
          </button>
        </div>
      </div>
    </div>
  );
}
