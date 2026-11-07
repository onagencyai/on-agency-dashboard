import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";
import { createPortalUrl, findCustomerId } from "@/lib/stripe-billing";

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("clients").select("stripe_customer_id, billing_email").eq("client_id", clientId).maybeSingle();
  const customerId = await findCustomerId(data?.billing_email ?? user.primaryEmailAddress?.emailAddress ?? null, data?.stripe_customer_id ?? null);
  if (!customerId) return NextResponse.json({ error: "No billing account found" }, { status: 404 });

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const url = await createPortalUrl(customerId, `${origin}/billing`);
  if (!url) return NextResponse.json({ error: "Could not open billing" }, { status: 502 });
  return NextResponse.json({ url });
}
