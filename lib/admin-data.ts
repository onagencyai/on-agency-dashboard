import { createServerSupabaseClient } from "@/lib/supabase-server";
import { findCustomerId, getBilling, stripeConfigured } from "@/lib/stripe-billing";
import { isAdminEmail } from "@/lib/admin";

export type Health = "healthy" | "quiet" | "check" | "new";

export interface AdminBilling {
  line1: string;
  line2: string;
  trouble: boolean;
}

export interface AdminClient {
  clientId: string;
  name: string;
  services: string[];
  callsThisMonth: number;
  callsLastMonth: number;
  leadsThisMonth: number;
  messagesThisMonth: number;
  spamThisMonth: number;
  lastCallAt: string | null;
  health: Health;
  reasons: string[];
  billing: AdminBilling;
}

const FILTERED = ["spam", "no_conversation", "vendor", "wrong_number"];
const money = (cents: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
const dayStr = (unix: number) => new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function monthStarts() {
  // Months in Houston time (UTC-6 is close enough for a monthly count).
  const now = new Date();
  const h = new Date(now.getTime() - 6 * 3600000);
  const thisStart = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth(), 1, 6));
  const lastStart = new Date(Date.UTC(h.getUTCFullYear(), h.getUTCMonth() - 1, 1, 6));
  return { thisStart, lastStart };
}

async function billingFor(row: { stripe_customer_id: string | null; billing_email: string | null; login_email: string | null }): Promise<AdminBilling> {
  if (!stripeConfigured()) return { line1: "Stripe not connected", line2: "", trouble: false };
  try {
    const id = await findCustomerId(row.billing_email ?? row.login_email, row.stripe_customer_id);
    if (!id) return { line1: "No Stripe customer", line2: "Not billed through Stripe yet", trouble: false };
    const b = await getBilling(id);
    if (!b) return { line1: "Could not read Stripe", line2: "", trouble: true };
    // An open invoice older than the latest payment belongs to a plan that was replaced (for example a new subscription), so it is not a problem.
    const latestPaid = Math.max(0, ...b.invoices.filter((i) => i.status === "paid").map((i) => i.created));
    const open = b.invoices.filter((i) => i.status === "open" && i.created > latestPaid);
    const openTotal = open.reduce((s, i) => s + i.amountCents, 0);
    const oldestOpenDays = open.length ? Math.floor((Date.now() / 1000 - Math.min(...open.map((i) => i.created))) / 86400) : 0;
    const sub = b.subscription;
    if (sub && ["past_due", "unpaid"].includes(sub.status)) return { line1: sub.status === "past_due" ? "Past due" : "Unpaid", line2: sub.nextChargeAt ? `Period ends ${dayStr(sub.nextChargeAt)}` : "", trouble: true };
    if (open.length) {
      return { line1: `${open.length} invoice${open.length > 1 ? "s" : ""} due: ${money(openTotal, open[0].currency)}`, line2: `Oldest is ${oldestOpenDays} days old`, trouble: oldestOpenDays > 7 };
    }
    if (sub && sub.status === "active") {
      const amt = sub.amountCents !== null ? `${money(sub.amountCents, sub.currency)}${sub.interval ? ` / ${sub.interval}` : ""}` : "Active";
      return { line1: `Active, ${amt}`, line2: sub.nextChargeAt ? `${sub.cancelAtPeriodEnd ? "Ends" : "Next charge"} ${dayStr(sub.nextChargeAt)}` : "", trouble: sub.cancelAtPeriodEnd };
    }
    const lastPaid = b.invoices.find((i) => i.status === "paid");
    return { line1: "Invoiced, all paid", line2: lastPaid ? `Last payment ${dayStr(lastPaid.created)}` : "", trouble: false };
  } catch {
    return { line1: "Could not read Stripe", line2: "", trouble: true };
  }
}

export async function getAdminOverview(): Promise<AdminClient[]> {
  const sb = createServerSupabaseClient();
  const { thisStart, lastStart } = monthStarts();

  const { data: clients } = await sb.from("clients").select("client_id, business_name, services, stripe_customer_id, billing_email, login_email");
  // You are not a client: your own account is left out.
  const rows = (clients ?? []).filter((r) => !isAdminEmail(r.login_email));

  const [{ data: calls }, { data: leads }, lastCalls] = await Promise.all([
    sb.from("calls").select("client_id, started_at, call_category, disconnection_reason, direction").gte("started_at", lastStart.toISOString()).order("started_at", { ascending: false }).limit(5000),
    sb.from("leads").select("client_id, kind, created_at").gte("created_at", thisStart.toISOString()).limit(5000),
    Promise.all(rows.map((r) => sb.from("calls").select("started_at").eq("client_id", r.client_id).not("started_at", "is", null).order("started_at", { ascending: false }).limit(1).maybeSingle())),
  ]);

  const billings = await Promise.all(rows.map((r) => billingFor(r)));
  const fourteenAgo = Date.now() - 14 * 86400000;

  return rows.map((r, i) => {
    const mine = (calls ?? []).filter((c) => c.client_id === r.client_id && c.started_at);
    const thisMonth = mine.filter((c) => new Date(c.started_at as string) >= thisStart);
    const lastMonth = mine.filter((c) => new Date(c.started_at as string) < thisStart);
    const errors = mine.filter((c) => new Date(c.started_at as string).getTime() >= fourteenAgo && /^error|^telephony_provider|^machine_detected_error/i.test(String(c.disconnection_reason ?? "")));
    const myLeads = (leads ?? []).filter((l) => l.client_id === r.client_id);
    const lastCallAt = (lastCalls[i].data?.started_at as string | undefined) ?? null;
    const daysSince = lastCallAt ? Math.floor((Date.now() - new Date(lastCallAt).getTime()) / 86400000) : null;

    const reasons: string[] = [];
    let health: Health = "healthy";
    if (daysSince === null) { health = "new"; reasons.push("No calls yet"); }
    else if (daysSince >= 14) { health = "check"; reasons.push(`No calls in ${daysSince} days. Check the phone line and the agent.`); }
    else if (daysSince >= 7) { health = "quiet"; reasons.push(`No calls in ${daysSince} days`); }
    if (errors.length >= 2) { health = "check"; reasons.push(`${errors.length} calls ended with an error in the last 14 days`); }
    else if (errors.length === 1 && health === "healthy") { health = "quiet"; reasons.push("1 call ended with an error in the last 14 days"); }
    if (billings[i].trouble) { health = "check"; reasons.push(`Billing: ${billings[i].line1}`); }

    return {
      clientId: r.client_id,
      name: r.business_name || r.client_id,
      services: (r.services as string[] | null) ?? [],
      callsThisMonth: thisMonth.length,
      callsLastMonth: lastMonth.length,
      leadsThisMonth: myLeads.filter((l) => l.kind === "lead" || l.kind === "booked").length,
      messagesThisMonth: myLeads.filter((l) => l.kind === "message").length,
      spamThisMonth: thisMonth.filter((c) => FILTERED.includes(String(c.call_category))).length,
      lastCallAt,
      health,
      reasons,
      billing: billings[i],
    };
  });
}
