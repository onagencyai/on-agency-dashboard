"use client";

import type { CallRow } from "@/lib/types";
import { formatDuration, formatPhoneNumber, getSentimentColor } from "@/lib/formatters";

interface Outcome { label: string; color: string; bg: string }

interface CallCardListProps {
  calls: CallRow[];
  getOutcome: (call: CallRow) => Outcome;
  getIntent?: (call: CallRow) => string;
  onSelect: (call: CallRow) => void;
}

// Phone-sized version of the calls table: one tappable row per call with everything that matters.
export default function CallCardList({ calls, getOutcome, getIntent, onSelect }: CallCardListProps) {
  return (
    <div>
      {calls.map((call, i) => {
        const outcome = getOutcome(call);
        const intent = getIntent ? getIntent(call) : "";
        const number = call.direction === "outbound" ? call.to_number : call.from_number;
        const when = call.started_at
          ? new Date(call.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "—";
        return (
          <button
            key={call.id}
            onClick={() => onSelect(call)}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", background: "transparent", border: "none", borderTop: i > 0 ? "1px solid var(--border)" : "none", cursor: "pointer", color: "inherit", font: "inherit" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{formatPhoneNumber(number)}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, fontSize: 12, fontWeight: 500, color: outcome.color, background: outcome.bg, whiteSpace: "nowrap" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                {outcome.label}
              </span>
            </div>
            <div className="num" style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", marginTop: 6, fontSize: 13, color: "var(--text-secondary)" }}>
              <span>{when}</span>
              <span>·</span>
              <span>{formatDuration(call.duration_ms)}</span>
              {call.user_sentiment && (
                <>
                  <span>·</span>
                  <span style={{ color: getSentimentColor(call.user_sentiment) }}>{call.user_sentiment}</span>
                </>
              )}
            </div>
            {intent && intent !== "—" && <div style={{ marginTop: 4, fontSize: 13, color: "var(--text-secondary)" }}>{intent}</div>}
          </button>
        );
      })}
    </div>
  );
}
