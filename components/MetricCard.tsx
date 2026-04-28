import type { ReactNode } from "react";

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

export default function MetricCard({ label, value, valueSuffix, icon, delta, children }: MetricCardProps) {
  const safeDelta: DeltaProps = delta ?? { value: "— vs last period", direction: "up" };
  const isPlaceholderDelta =
    safeDelta.direction === "neutral" && safeDelta.value.trim().startsWith("—");

  const deltaColor =
    isPlaceholderDelta || safeDelta.direction === "up"
      ? "var(--green)"
      : safeDelta.direction === "down"
      ? "var(--red)"
      : "var(--text-tertiary)";

  const arrow = isPlaceholderDelta
    ? "↑"
    : safeDelta.direction === "up"
    ? "↑"
    : safeDelta.direction === "down"
    ? "↓"
    : "·";

  return (
    <div
      style={{
        background: "var(--bg-1)",
        padding: "20px 24px",
        transition: "background 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-1)")}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {icon && (
          <span style={{ color: "var(--text-tertiary)", display: "flex" }}>{icon}</span>
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginBottom: children ? 10 : 8,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {valueSuffix && (
          <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)" }}>
            {valueSuffix}
          </span>
        )}
      </div>

      {children}

      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-geist-mono, monospace)",
          color: deltaColor,
          marginTop: children ? 8 : 0,
        }}
      >
        {arrow} {safeDelta.value}
      </div>
    </div>
  );
}
