export const dynamic = "force-dynamic";

import { Check, Mail, MessageSquare } from "lucide-react";
import { PageSection, PageTitle, cardStyle, cardGrid, pagePadding } from "@/components/PageSection";

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
    <div style={{ padding: pagePadding }}>
      <PageTitle>Updates</PageTitle>

      <PageSection title="Request a change" cue="We handle every change for you. Send us a message and we update your AI. We usually reply within 24 hours.">
        <div style={cardGrid}>
          <ContactCard
            icon={<Mail size={16} />}
            label="Email"
            value="contact@onagency.ai"
            buttonLabel="Send email"
            href="mailto:contact@onagency.ai?subject=Dashboard Update Request"
          />
          <ContactCard
            icon={<MessageSquare size={16} />}
            label="Text message"
            value="+1 (832) 961-4870"
            buttonLabel="Send text"
            href="sms:+18329614870"
          />
        </div>
      </PageSection>

      <PageSection title="What you can request" cue="Anything about how your AI talks, answers or routes calls.">
        <div style={cardGrid}>
          {UPDATE_ITEMS.map((item) => (
            <div key={item} style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--green-dim)", color: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Check size={13} strokeWidth={2.5} />
              </span>
              <span style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </PageSection>
    </div>
  );
}

function ContactCard({ icon, label, value, buttonLabel, href }: { icon: React.ReactNode; label: string; value: string; buttonLabel: string; href: string }) {
  return (
    <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-2)", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{label}</div>
          <div className="num" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{value}</div>
        </div>
      </div>
      <a
        href={href}
        style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {buttonLabel}
      </a>
    </div>
  );
}
