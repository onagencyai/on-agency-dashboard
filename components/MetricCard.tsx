import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DeltaProps {
  value: string;
  direction: "up" | "down" | "neutral";
}

interface MetricCardProps {
  label: string;
  /** Shorter label used on phones so it stays on one line. */
  shortLabel?: string;
  value: string | number;
  valueSuffix?: string;
  icon?: ReactNode;
  delta?: DeltaProps;
  children?: ReactNode;
}

// Stat card: label in the same type as the section titles, icon in a soft tile at the top right, big number,
// and the change against the previous period as a small pill.
export default function MetricCard({ label, shortLabel, value, valueSuffix, icon, delta, children }: MetricCardProps) {
  const tone =
    delta?.direction === "up"
      ? { color: "var(--green-text)", bg: "var(--green-dim)" }
      : delta?.direction === "down"
        ? { color: "var(--red)", bg: "var(--red-dim)" }
        : { color: "var(--text-secondary)", bg: "var(--bg-3)" };

  return (
    <div className="metric-card" style={{ background: "var(--bg-1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em", color: "var(--ink)", minWidth: 0 }}>
          {shortLabel ? (
            <>
              <span className="label-full">{label}</span>
              <span className="label-short">{shortLabel}</span>
            </>
          ) : label}
        </span>
        {icon && (
          <span className="metric-icon" style={{ color: "var(--text-secondary)", background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: children || delta ? 12 : 0 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: "30px" }}>
          {value}
        </span>
        {valueSuffix && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>{valueSuffix}</span>}
      </div>

      {children}

      {delta && (
        <span className="num" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12.5, fontWeight: 500, color: tone.color, background: tone.bg, padding: "3px 9px", borderRadius: 999, marginTop: children ? 10 : 0, maxWidth: "100%" }}>
          {delta.direction === "up" && <ArrowUpRight size={13} />}
          {delta.direction === "down" && <ArrowDownRight size={13} />}
          {delta.value}
        </span>
      )}
    </div>
  );
}
