export const dynamic = "force-dynamic";

import { currentUser } from "@/lib/auth";
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
  // The email the client uses in Stripe can differ from their dashboard login (Structta's owner pays with her own email).
  let billingEmail: string | null = null;
  let known: string | null = null;
  const clientId = await resolveClientId(user);
  if (clientId) {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("clients").select("stripe_customer_id, billing_email").eq("client_id", clientId).maybeSingle();
    known = data?.stripe_customer_id ?? null;
    billingEmail = data?.billing_email ?? null;
  }
  if (stripeConfigured()) {
    const customerId = await findCustomerId(billingEmail ?? email, known);
    if (customerId) billing = await getBilling(customerId);
  }

  // Stripe's no-code customer portal link (Settings > Billing > Customer portal). Needs no API key: the client signs in with their email.
  const portalBase = process.env.STRIPE_PORTAL_LOGIN_URL?.startsWith("https://billing.stripe.com/") ? process.env.STRIPE_PORTAL_LOGIN_URL : null;
  const portalHref = portalBase ? `${portalBase}${portalBase.includes("?") ? "&" : "?"}prefilled_email=${encodeURIComponent(billingEmail ?? email ?? "")}` : null;

  const sub = billing?.subscription ?? null;
  const invoices = billing?.invoices ?? [];

  return (
    <div className="page-pad">
      <div style={pageColumn}>
        <PageTitle>Billing</PageTitle>

        {!billing || (!sub && invoices.length === 0) ? (
          <PageSection title="Your plan" cue="Your subscription is managed by On Agency.">
            <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, maxWidth: 520 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{portalHref ? "Manage your billing" : "Invoices and plan changes"}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.5 }}>
                  {portalHref
                    ? "See your invoices and next payment, update your card or cancel, in Stripe's secure billing portal. Stripe will email you a link to sign in."
                    : "For your invoices, payment details or any plan change, contact us and we will take care of it."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {portalHref && (
                  <a href={portalHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                    Manage billing
                  </a>
                )}
                <a href="mailto:contact@onagency.ai?subject=Billing Inquiry" style={portalHref ? { display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--bg)", border: "1px solid var(--border-hover)", color: "var(--text-primary)", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" } : { display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: 6, background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                  Contact us
                </a>
              </div>
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
