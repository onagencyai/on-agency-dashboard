"use client";

import { useEffect, useState } from "react";
import type { IntentData } from "@/lib/types";

const INTENT_COLORS: Record<string, string> = {
  "General Information": "var(--intent-blue)",
  "Pricing Information": "var(--intent-cyan)",
  "Appointments & Scheduling": "var(--intent-green)",
  "Complaints & Cancellations": "var(--intent-red)",
  "Customer Support Requests": "var(--intent-amber)",
  "Other": "var(--intent-gray)",
};

interface IntentChartProps {
  intents: IntentData[];
}

export default function IntentChart({ intents }: IntentChartProps) {
  const [animated, setAnimated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {intents.map((intent, i) => {
        const bar = (
          <div style={{ flex: 1, height: 7, background: "var(--bg-3)", borderRadius: 999, overflow: "hidden" }}>
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
        );
        const pct = (
          <span className="num" style={{ width: 40, fontSize: 13, color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>
            {intent.percentage}%
          </span>
        );
        const border = i < intents.length - 1 ? "1px solid var(--border)" : "none";

        if (isMobile) {
          return (
            <div key={intent.label} style={{ padding: "11px 0", borderBottom: border }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{intent.label}</span>
                {pct}
              </div>
              {bar}
            </div>
          );
        }
        return (
          <div key={intent.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: border }}>
            <span style={{ flex: "0 0 190px", fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {intent.label}
            </span>
            {bar}
            {pct}
          </div>
        );
      })}
    </div>
  );
}
