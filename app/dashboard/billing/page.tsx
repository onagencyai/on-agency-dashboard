export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageSection, PageTitle, cardStyle, pageColumn } from "@/components/PageSection";

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
    <div className="page-pad">
      <div style={pageColumn}>
      <PageTitle>Billing</PageTitle>

      <PageSection title="Current plan" cue="Your subscription with On Agency.">
        <div className="ledger-grid">
          <InfoCard label="Billing period" value={billingPeriod} />
          <InfoCard label="Next charge" value={nextCharge} />
          <InfoCard label="Cycle" value="Month to month" />
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 8 }}>Status</div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: "var(--green)", background: "var(--green-dim)", padding: "3px 10px", borderRadius: 20 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
              Active
            </span>
          </div>
        </div>
      </PageSection>

      <PageSection title="Need a change?" cue="To add services, update your plan or change anything about billing, reach out to us.">
        <div className="ledger-grid">
        <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Billing questions</div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>contact@onagency.ai</div>
          </div>
          <a
            href="mailto:contact@onagency.ai?subject=Billing Inquiry"
            style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}
          >
            Contact us
          </a>
        </div>
        </div>
      </PageSection>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
