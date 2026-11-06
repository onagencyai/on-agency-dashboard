"use client";

import { useEffect, useRef, useState } from "react";
import type { IntentData } from "@/lib/types";


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
                background: "var(--blue)",
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
