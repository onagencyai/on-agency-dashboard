"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut({ redirectUrl: "/sign-in" })}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border-hover)", color: "var(--red)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
    >
      <LogOut size={14} />
      Log out
    </button>
  );
}
