export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreditCard, MessageCircle } from "lucide-react";

function getMonthRange(): { billingPeriod: string; nextCharge: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const firstOfNext = new Date(year, month + 1, 1);

  const billingPeriod = `${months[firstOfMonth.getMonth()]} ${firstOfMonth.getDate()}, ${firstOfMonth.getFullYear()} – ${months[lastOfMonth.getMonth()]} ${lastOfMonth.getDate()}, ${lastOfMonth.getFullYear()}`;
  const nextCharge = `${months[firstOfNext.getMonth()]} ${firstOfNext.getDate()}, ${firstOfNext.getFullYear()}`;

  return { billingPeriod, nextCharge };
}

export default async function BillingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { billingPeriod, nextCharge } = getMonthRange();

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Billing
        </span>
      </div>

      {/* Current Plan */}
      <div
        style={{
          background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12,
          padding: 24, marginBottom: 16,
        }}
      >
        <CreditCard size={20} style={{ color: "var(--text-secondary)" }} />
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginTop: 12 }}>
          Current Plan
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <InfoItem label="Billing Period" value={billingPeriod} />
          <InfoItem label="Next Charge" value={nextCharge} />
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: 4 }}>
              Status
            </div>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 500, fontFamily: "var(--font-geist-mono, monospace)",
                color: "var(--green)", background: "var(--green-dim)",
                padding: "3px 10px", borderRadius: 20,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
              Active
            </span>
          </div>
          <InfoItem label="Cycle" value="Month to month" />
        </div>
      </div>

      {/* Need changes? */}
      <div
        style={{
          background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: 20,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <MessageCircle size={16} style={{ color: "var(--text-tertiary)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            To add services, update your plan, or make any billing changes, reach out to us directly.{" "}
            <a
              href="mailto:contact@onagency.ai?subject=Billing Inquiry"
              style={{ color: "var(--text-primary)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              contact@onagency.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
