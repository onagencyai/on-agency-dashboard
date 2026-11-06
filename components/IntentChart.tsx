"use client";

import { useEffect, useRef, useState } from "react";
import type { IntentData } from "@/lib/types";


const INTENT_COLORS: Record<string, string> = {
  "General Information": "var(--blue)",
  "Pricing Information": "var(--intent-indigo)",
  "Appointments & Scheduling": "var(--green)",
  "Complaints & Cancellations": "var(--red)",
  "Customer Support Requests": "var(--amber-fill)",
  "Other": "var(--intent-gray)",
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
              flex: "0 0 190px",
              fontSize: 13,
              color: "var(--text-primary)",
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
              height: 8,
              background: "var(--bg-2)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: animated ? `${intent.percentage}%` : "0%",
                background: INTENT_COLORS[intent.label] ?? "var(--intent-gray)",
                borderRadius: 999,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <span
            style={{
              width: 40,
              fontSize: 13,
              fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
              color: "var(--text-secondary)",
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
