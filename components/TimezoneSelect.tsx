"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { TIMEZONES, TIMEZONE_LABELS } from "@/lib/timezones";

export default function TimezoneSelect({ initial }: { initial: string }) {
  const [value, setValue] = useState(TIMEZONES.includes(initial) ? initial : "America/Chicago");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setState("saving");
    try {
      const res = await fetch("/api/client-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timezone: next }) });
      if (!res.ok) throw new Error();
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setValue(prev);
      setState("error");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
        <select
          value={value}
          onChange={(e) => void change(e.target.value)}
          aria-label="Time zone"
          style={{ appearance: "none", WebkitAppearance: "none", width: "100%", height: 38, padding: "0 38px 0 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-1)", color: "var(--ink)", fontSize: 14, fontFamily: "inherit", cursor: "pointer", outline: "none", textOverflow: "ellipsis" }}
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{TIMEZONE_LABELS[tz] ?? tz}</option>)}
        </select>
        <ChevronDown size={15} aria-hidden style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", pointerEvents: "none" }} />
      </div>
      {state === "saved" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--green)" }}><Check size={13} /> Saved</span>}
      {state === "error" && <span style={{ fontSize: 12.5, color: "var(--red)" }}>Could not save. Try again.</span>}
    </div>
  );
}
