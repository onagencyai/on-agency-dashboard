"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d",    label: "Last 7 days" },
  { value: "30d",   label: "Last 30 days" },
  { value: "60d",   label: "Last 60 days" },
  { value: "90d",   label: "Last 90 days" },
];

export type RangeValue =
  | { kind: "range"; value: string; label: string; from: Date; to: Date }
  | { kind: "month"; value: string; label: string; from: Date; to: Date };

function buildRangeFrom(value: string): Date {
  const now = new Date();
  switch (value) {
    case "today": { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case "7d":  { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "30d": { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    case "60d": { const d = new Date(now); d.setDate(d.getDate() - 60); return d; }
    case "90d": { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
    default:    { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  }
}

function buildMonthOptions(): { value: string; label: string; from: Date; to: Date }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      from: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
      to:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  });
}

export function defaultRangeValue(): RangeValue {
  const now = new Date();
  const from = buildRangeFrom("30d");
  return { kind: "range", value: "30d", label: "Last 30 days", from, to: now };
}

interface CallRangePickerProps {
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}

export default function CallRangePicker({ value, onChange }: CallRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const monthOptions = buildMonthOptions();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--bg-3)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", padding: "6px 12px",
          borderRadius: 8, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <Calendar size={12} />
        {value.label}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-1)", border: "1px solid var(--border)",
          borderRadius: 8, overflow: "hidden", zIndex: 100,
          minWidth: 180, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          {/* Date ranges section */}
          <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            Date Range
          </div>
          {RANGE_OPTIONS.map((opt) => {
            const active = value.kind === "range" && value.value === opt.value;
            const now = new Date();
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange({ kind: "range", value: opt.value, label: opt.label, from: buildRangeFrom(opt.value), to: now });
                  setOpen(false);
                }}
                style={{
                  display: "block", width: "100%", padding: "7px 14px",
                  textAlign: "left", border: "none", cursor: "pointer",
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: 13, transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--accent-dim)" : "transparent"; e.currentTarget.style.color = active ? "var(--text-primary)" : "var(--text-secondary)"; }}
              >
                {opt.label}
              </button>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

          {/* By month section */}
          <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>
            By Month
          </div>
          {monthOptions.map((opt) => {
            const active = value.kind === "month" && value.value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange({ kind: "month", value: opt.value, label: opt.label, from: opt.from, to: opt.to });
                  setOpen(false);
                }}
                style={{
                  display: "block", width: "100%", padding: "7px 14px",
                  textAlign: "left", border: "none", cursor: "pointer",
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: 13, transition: "all 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-dim)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = active ? "var(--accent-dim)" : "transparent"; e.currentTarget.style.color = active ? "var(--text-primary)" : "var(--text-secondary)"; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
