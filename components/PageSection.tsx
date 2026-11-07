import type { CSSProperties, ReactNode } from "react";

// Section block in Ledger's settings style: 18px title, 13px cue, then bordered cards.
export function PageSection({ title, cue, children }: { title: string; cue?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 4 }}>{title}</div>
      {cue && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{cue}</div>}
      {!cue && <div style={{ height: 8 }} />}
      {children}
    </section>
  );
}

export const cardStyle: CSSProperties = {
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

export const cardGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

// Same page container as Ledger: centered, up to 1440px wide.
export const pageColumn: CSSProperties = { maxWidth: 1440, margin: "0 auto" };

export const pagePadding = "24px clamp(12px, 3vw, 32px) 32px";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
