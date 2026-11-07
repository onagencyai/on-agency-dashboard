"use client";

import { signOutAndLeave } from "@/lib/sign-out";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOutAndLeave()}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px", borderRadius: 8, background: "var(--bg)", border: "1px solid var(--border-hover)", color: "var(--red)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
    >
      <LogOut size={14} />
      Log out
    </button>
  );
}
