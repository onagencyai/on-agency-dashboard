"use client";

import { useState } from "react";
import { Check } from "lucide-react";
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
      <select
        value={value}
        onChange={(e) => void change(e.target.value)}
        aria-label="Time zone"
        style={{ height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit" }}
      >
        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{TIMEZONE_LABELS[tz] ?? tz}</option>)}
      </select>
      {state === "saved" && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--green)" }}><Check size={13} /> Saved</span>}
      {state === "error" && <span style={{ fontSize: 12.5, color: "var(--red)" }}>Could not save. Try again.</span>}
    </div>
  );
}
