"use client";

import { useState } from "react";
import type { CallVolumeData } from "@/lib/types";

interface CallVolumeChartProps {
  data: CallVolumeData;
  showOutbound?: boolean;
}

// Daily call bars in the style of Ledger's "Cash in and out" chart: bars grow from zero,
// hover or tap a day for the exact number, one quiet footer line with the busiest day.
export default function CallVolumeChart({ data, showOutbound = true }: CallVolumeChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const label = showOutbound ? "Outbound calls" : "Inbound calls";
  const rows = data.dates.map((date, i) => ({ date, value: (showOutbound ? data.outbound[i] : data.inbound[i]) ?? 0 }));
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  const busiest = rows.reduce((b, r) => (r.value > b.value ? r : b), { date: "", value: 0 });
  const step = Math.max(1, Math.ceil(rows.length / 8));
  const dense = rows.length > 14;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, fontSize: 13, color: "var(--text-secondary)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--blue)" }} />
          {label}
        </span>
        <span className="num">
          <span style={{ color: "var(--ink)", fontWeight: 600 }}>{total}</span> in this period
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: dense ? 2 : 6, height: 210, borderBottom: "1px solid var(--border)" }} onClick={() => setActive(null)}>
        {rows.map((r, i) => {
          const isActive = active === i;
          const pct = (r.value / max) * 100;
          return (
            <div
              key={r.date + i}
              onClick={(e) => { e.stopPropagation(); setActive((c) => (c === i ? null : i)); }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((c) => (c === i ? null : c))}
              style={{
                position: "relative", flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center",
                cursor: "pointer", borderRadius: 6, background: isActive ? "var(--bg-2)" : "transparent", transition: "background 0.12s",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute", top: 0, zIndex: 2, whiteSpace: "nowrap", pointerEvents: "none",
                    left: i >= rows.length - 3 ? "auto" : i <= 2 ? 0 : "50%", right: i >= rows.length - 3 ? 0 : "auto",
                    transform: i >= rows.length - 3 || i <= 2 ? "none" : "translateX(-50%)",
                    background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", fontSize: 12,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.date}</div>
                  <div style={{ color: "var(--text-secondary)" }}>{r.value} {r.value === 1 ? "call" : "calls"}</div>
                </div>
              )}
              <div
                style={{
                  width: dense ? "62%" : "44%", maxWidth: 22, borderRadius: 4,
                  background: isActive ? "var(--blue)" : "var(--blue)", opacity: isActive ? 1 : 0.88,
                  height: `${pct}%`, minHeight: r.value > 0 ? 4 : 0, transition: "opacity 0.12s",
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: dense ? 2 : 6, marginTop: 8 }}>
        {rows.map((r, i) => (
          <div key={r.date + i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "visible" }}>
            {i % step === 0 ? r.date : ""}
          </div>
        ))}
      </div>

      {busiest.value > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>
          Busiest day: <span style={{ color: "var(--ink)", fontWeight: 500 }}>{busiest.date}</span> · <span className="num" style={{ color: "var(--ink)", fontWeight: 500 }}>{busiest.value}</span> {busiest.value === 1 ? "call" : "calls"}
        </div>
      )}
    </div>
  );
}
