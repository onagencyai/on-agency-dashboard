"use client";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { PenLine, CheckCircle2, Mail, MessageSquare } from "lucide-react";

const UPDATE_ITEMS = [
  "Business hours or holiday closures",
  "Service list or pricing information",
  "Custom responses or FAQ answers",
  "Call transfer numbers or destinations",
  "Agent name, voice, or greeting script",
  "Special promotions or seasonal messaging",
];

export default function UpdatesPage() {
  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Updates
        </span>
      </div>

      <div
        style={{
          background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
          <PenLine size={20} style={{ color: "var(--text-secondary)" }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            Request a change to your AI
          </span>
        </div>

        {/* Panel body */}
        <div style={{ padding: 28 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 560, marginBottom: 24 }}>
            Want to update your AI receptionist? We handle all changes for you — just send us a message.
          </p>

          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12 }}>
            What you can request
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}>
            {UPDATE_ITEMS.map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 12 }}>
              How to reach us
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <ContactCard
                icon={<Mail size={20} style={{ color: "var(--text-secondary)" }} />}
                label="Email"
                value="contact@onagency.ai"
                buttonLabel="Send Email"
                href="mailto:contact@onagency.ai?subject=Dashboard Update Request"
              />
              <ContactCard
                icon={<MessageSquare size={20} style={{ color: "var(--text-secondary)" }} />}
                label="Text Message"
                value="+1 (832) 961-4870"
                buttonLabel="Send Text"
                href="sms:+18329614870"
              />
            </div>

            <p style={{ fontSize: 12, color: "var(--text-tertiary)", fontStyle: "italic" }}>
              We review all requests and typically respond within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({ icon, label, value, buttonLabel, href }: {
  icon: ReactNode;
  label: string;
  value: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
      {icon}
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", marginTop: 10 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{value}</div>
      <a
        href={href}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
          background: "var(--bg-3)", border: "1px solid var(--border)",
          color: "var(--text-secondary)", padding: "6px 12px", borderRadius: 8,
          fontSize: 12, cursor: "pointer", textDecoration: "none", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {buttonLabel}
      </a>
    </div>
  );
}
