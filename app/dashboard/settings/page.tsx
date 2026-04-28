"use client";
export const dynamic = "force-dynamic";

import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import type { UserPublicMetadata } from "@/lib/types";

export default function SettingsPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;

  const businessName = metadata.business_name ?? "—";
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
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
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{businessName}</div>
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
