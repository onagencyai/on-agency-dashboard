import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface DeltaProps {
  value: string;
  direction: "up" | "down" | "neutral";
}

interface MetricCardProps {
  label: string;
  value: string | number;
  valueSuffix?: string;
  icon?: ReactNode;
  delta?: DeltaProps;
  children?: ReactNode;
}

// Stat card in Ledger's style: small caps label, large number, one line of context.
export default function MetricCard({ label, value, valueSuffix, icon, delta, children }: MetricCardProps) {
  const deltaColor =
    delta?.direction === "up" ? "var(--green-text)" : delta?.direction === "down" ? "var(--red)" : "var(--text-secondary)";

  return (
    <div style={{ background: "var(--bg-1)", padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {icon && <span style={{ color: "var(--text-secondary)", display: "flex" }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.025em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
          {label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: children || delta ? 10 : 0 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", lineHeight: "30px" }}>
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
