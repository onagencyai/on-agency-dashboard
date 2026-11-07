export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";
import { findCustomerId, getBilling, stripeConfigured } from "@/lib/stripe-billing";
import type { BillingInvoice } from "@/lib/stripe-billing";
import ManageBillingButton from "@/components/ManageBillingButton";
import { PageSection, PageTitle, cardStyle, pageColumn } from "@/components/PageSection";

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
const day = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const SUB_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "var(--green)", bg: "var(--green-dim)" },
  trialing: { label: "Trial", color: "var(--blue)", bg: "var(--blue-dim)" },
  past_due: { label: "Past due", color: "var(--amber)", bg: "var(--amber-dim)" },
  unpaid: { label: "Unpaid", color: "var(--red)", bg: "var(--red-dim)" },
  canceled: { label: "Canceled", color: "var(--text-secondary)", bg: "var(--bg-3)" },
  incomplete: { label: "Incomplete", color: "var(--amber)", bg: "var(--amber-dim)" },
};
const INV_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "var(--green)", bg: "var(--green-dim)" },
  open: { label: "Due", color: "var(--amber)", bg: "var(--amber-dim)" },
  uncollectible: { label: "Unpaid", color: "var(--red)", bg: "var(--red-dim)" },
  void: { label: "Void", color: "var(--text-secondary)", bg: "var(--bg-3)" },
};

export default async function BillingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  let billing = null;
  if (stripeConfigured()) {
    const clientId = await resolveClientId(user);
    let known: string | null = null;
    if (clientId) {
      const supabase = createServerSupabaseClient();
      const { data } = await supabase.from("clients").select("stripe_customer_id").eq("client_id", clientId).maybeSingle();
      known = data?.stripe_customer_id ?? null;
    }
    const customerId = await findCustomerId(email, known);
    if (customerId) billing = await getBilling(customerId);
  }

  const sub = billing?.subscription ?? null;
  const invoices = billing?.invoices ?? [];

  return (
    <div className="page-pad">
      <div style={pageColumn}>
        <PageTitle>Billing</PageTitle>

        {!billing || (!sub && invoices.length === 0) ? (
          <PageSection title="Your plan" cue="Your subscription is managed by On Agency.">
            <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Invoices and plan changes</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>For your invoices, payment details or any plan change, contact us and we will take care of it.</div>
              </div>
              <a href="mailto:contact@onagency.ai?subject=Billing Inquiry" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                Contact us
              </a>
            </div>
          </PageSection>
        ) : (
          <>
            {sub && (
              <PageSection title="Current plan" cue="Your subscription with On Agency.">
                <div className="ledger-grid">
                  <InfoCard label="Plan" value={sub.planName} />
                  <InfoCard label="Price" value={sub.amountCents !== null ? `${money(sub.amountCents, sub.currency)}${sub.interval ? ` / ${sub.interval}` : ""}` : "—"} />
                  <InfoCard label={sub.cancelAtPeriodEnd ? "Ends on" : "Next charge"} value={sub.nextChargeAt ? day(sub.nextChargeAt) : "—"} />
                  <div style={{ ...cardStyle, padding: 20 }}>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 8 }}>Status</div>
                    <Pill {...(SUB_STATUS[sub.status] ?? { label: sub.status, color: "var(--text-secondary)", bg: "var(--bg-3)" })} />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}><ManageBillingButton /></div>
              </PageSection>
            )}

            {invoices.length > 0 && (
              <PageSection title="Invoices" cue="Your recent invoices. Open one to see or download it.">
                <div style={{ ...cardStyle, overflow: "hidden" }}>
                  {invoices.map((inv, i) => <InvoiceRow key={inv.id} inv={inv} last={i === invoices.length - 1} />)}
                </div>
              </PageSection>
            )}

            <PageSection title="Need a change?" cue="To add services or change your plan, reach out to us.">
              <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Billing questions</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>contact@onagency.ai</div>
                </div>
                <a href="mailto:contact@onagency.ai?subject=Billing Inquiry" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Contact us
                </a>
              </div>
            </PageSection>
          </>
        )}
      </div>
    </div>
  );
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color, background: bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
      {label}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function InvoiceRow({ inv, last }: { inv: BillingInvoice; last: boolean }) {
  const st = INV_STATUS[inv.status] ?? { label: inv.status, color: "var(--text-secondary)", bg: "var(--bg-3)" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "14px 20px", borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <div style={{ minWidth: 0 }}>
        <div className="num" style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{money(inv.amountCents, inv.currency)}</div>
        <div className="num" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{day(inv.created)}{inv.number ? ` · ${inv.number}` : ""}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Pill {...st} />
        {inv.url && <a href={inv.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: "var(--blue)", textDecoration: "none" }}>View →</a>}
      </div>
    </div>
  );
}
