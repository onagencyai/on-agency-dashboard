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

// Stat card: icon and label on one line in dark ink, then the big number, then one plain line for the change
// against the previous period.
export default function MetricCard({ label, shortLabel, value, valueSuffix, icon, delta, children }: MetricCardProps) {
  const deltaColor =
    delta?.direction === "up" ? "var(--green-text)" : delta?.direction === "down" ? "var(--red)" : "var(--text-secondary)";

  return (
    <div className="metric-card" style={{ background: "var(--bg-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {icon && (
          <span className="metric-icon" style={{ color: "var(--ink)", display: "flex", flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em", color: "var(--ink)", minWidth: 0 }}>
          {shortLabel ? (
            <>
              <span className="label-full">{label}</span>
              <span className="label-short">{shortLabel}</span>
            </>
          ) : label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: children || delta ? 12 : 0 }}>
        <span className="num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: "32px" }}>
          {value}
        </span>
        {valueSuffix && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)" }}>{valueSuffix}</span>}
      </div>

      {children}

      {delta && (
        <div className="num" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: deltaColor, marginTop: children ? 8 : 0 }}>
          {delta.direction === "up" && <ArrowUpRight size={13} />}
          {delta.direction === "down" && <ArrowDownRight size={13} />}
          {delta.value}
        </div>
      )}
    </div>
  );
}
