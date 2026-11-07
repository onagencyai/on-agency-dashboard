"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import type { TimeRange } from "@/lib/types";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "60d", label: "Last 60 days" },
];

interface TimeRangeDropdownProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export default function TimeRangeDropdown({ value, onChange }: TimeRangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const label = OPTIONS.find((o) => o.value === value)?.label ?? "Last 30 days";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          height: 36,
          padding: "0 12px",
          borderRadius: 6,
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <Calendar size={12} />
        {label}
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="menu-panel" style={{ minWidth: 180 }}>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`menu-item${opt.value === value ? " is-active" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
