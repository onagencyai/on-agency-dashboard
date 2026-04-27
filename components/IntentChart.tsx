"use client";

import { useEffect, useRef, useState } from "react";
import type { IntentData } from "@/lib/types";

const INTENT_COLORS: Record<string, string> = {
  "General Information": "rgba(237,237,237,0.5)",
  "Pricing Information": "rgba(59,130,246,0.5)",
  "Appointments & Scheduling": "rgba(34,197,94,0.6)",
  "Complaints & Cancellations": "rgba(239,68,68,0.5)",
  "Customer Support Requests": "rgba(245,158,11,0.6)",
  "Other": "var(--text-tertiary)",
};

interface IntentChartProps {
  intents: IntentData[];
}

export default function IntentChart({ intents }: IntentChartProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column" }}>
      {intents.map((intent, i) => (
        <div
          key={intent.label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 0",
            borderBottom: i < intents.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <span
            style={{
              flex: "0 0 160px",
              fontSize: 12,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {intent.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 4,
              background: "var(--bg-3)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: animated ? `${intent.percentage}%` : "0%",
                background: INTENT_COLORS[intent.label] ?? "var(--text-tertiary)",
                borderRadius: 2,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <span
            style={{
              width: 36,
              fontSize: 11,
              fontFamily: "var(--font-geist-mono, monospace)",
              color: "var(--text-tertiary)",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {intent.percentage}%
          </span>
        </div>
      ))}
    </div>
  );
}
