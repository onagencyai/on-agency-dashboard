// Read-only Stripe lookups for the Billing page, using a restricted key (STRIPE_BILLING_KEY) that can read
// Customers, Subscriptions and Invoices and create Customer portal sessions. No SDK: plain REST.

const API = "https://api.stripe.com/v1";

function key(): string | null {
  const k = process.env.STRIPE_BILLING_KEY;
  return k && (k.startsWith("rk_") || k.startsWith("sk_")) ? k : null;
}

export const stripeConfigured = () => key() !== null;

async function call<T>(path: string, init?: { method?: "GET" | "POST"; body?: URLSearchParams }): Promise<T | null> {
  const k = key();
  if (!k) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${k}`, ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
      body: init?.body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface BillingSubscription {
  status: string;
  planName: string;
  amountCents: number | null;
  currency: string;
  interval: string | null;
  periodStart: number | null; // unix seconds
  nextChargeAt: number | null; // unix seconds
  cancelAtPeriodEnd: boolean;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  created: number;
  amountCents: number;
  currency: string;
  status: string;
  url: string | null;
}

export interface BillingData {
  customerId: string;
  subscription: BillingSubscription | null;
  invoices: BillingInvoice[];
}

interface StripeList<T> { data: T[] }

export async function findCustomerId(email: string | null, knownId: string | null): Promise<string | null> {
  if (knownId) return knownId;
  if (!email) return null;
  const res = await call<StripeList<{ id: string }>>(`/customers?limit=1&email=${encodeURIComponent(email)}`);
  return res?.data?.[0]?.id ?? null;
}

export async function getBilling(customerId: string): Promise<BillingData | null> {
  const [subs, invs] = await Promise.all([
    call<StripeList<Record<string, unknown>>>(`/subscriptions?customer=${customerId}&status=all&limit=5&expand[]=data.items.data.price`),
    call<StripeList<Record<string, unknown>>>(`/invoices?customer=${customerId}&limit=12`),
  ]);
  if (!subs && !invs) return null;

  const rank = (s: string) => (["active", "trialing", "past_due", "unpaid", "incomplete"].indexOf(s) + 1 || 99);
  const sub = (subs?.data ?? []).slice().sort((a, b) => rank(String(a.status)) - rank(String(b.status)))[0];

  let subscription: BillingSubscription | null = null;
  if (sub) {
    const items = (sub.items as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
    const item = items[0] ?? {};
    const price = (item.price as Record<string, unknown> | undefined) ?? {};
    const productId = typeof price.product === "string" ? price.product : (price.product as { id?: string } | undefined)?.id;
    const recurring = price.recurring as { interval?: string } | undefined;
    // Reading the product name needs the "Products: read" permission on the key; without it we fall back to a generic name.
    const product = productId ? await call<{ name?: string }>(`/products/${productId}`) : null;
    const generic = recurring?.interval === "month" ? "Monthly plan" : recurring?.interval === "year" ? "Yearly plan" : "Your plan";
    subscription = {
      status: String(sub.status),
      planName: product?.name || (price.nickname as string) || generic,
      amountCents: typeof price.unit_amount === "number" ? price.unit_amount : null,
      currency: String(price.currency ?? "usd"),
      interval: recurring?.interval ?? null,
      periodStart: (sub.current_period_start as number | undefined) ?? (item.current_period_start as number | undefined) ?? null,
      nextChargeAt: (sub.current_period_end as number | undefined) ?? (item.current_period_end as number | undefined) ?? null,
      cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    };
  }

  const invoices: BillingInvoice[] = (invs?.data ?? [])
    .filter((i) => i.status !== "draft" && i.status !== "void")
    .map((i) => ({
      id: String(i.id),
      number: (i.number as string | null) ?? null,
      created: Number(i.created),
      amountCents: Number((i.status === "paid" ? i.amount_paid : i.amount_due) ?? 0),
      currency: String(i.currency ?? "usd"),
      status: String(i.status),
      url: (i.hosted_invoice_url as string | null) ?? null,
    }));

  return { customerId, subscription, invoices };
}

export async function createPortalUrl(customerId: string, returnUrl: string): Promise<string | null> {
  const body = new URLSearchParams({ customer: customerId, return_url: returnUrl });
  const res = await call<{ url?: string }>("/billing_portal/sessions", { method: "POST", body });
  return res?.url ?? null;
}
