import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const CATEGORIES = [
  "Business hours or holidays",
  "Services or pricing",
  "Answers and FAQs",
  "Transfer numbers",
  "Greeting, name or voice",
  "Promotions",
  "Something else",
];
const NOTIFY_URL = "https://n8n.onagency.ai/webhook/dashboard-update-request-8f3a9c";
const MAX_PER_HOUR = 10;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("update_requests")
    .select("id, category, message, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "Could not load requests" }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { category?: unknown; message?: unknown } | null;
  const category = typeof body?.category === "string" ? body.category : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: "Pick what you want to change." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Tell us a bit more about the change." }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Please keep it under 2000 characters." }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("update_requests")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: "Too many requests in a short time. Please try again later." }, { status: 429 });

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const { data, error } = await supabase
    .from("update_requests")
    .insert({ client_id: clientId, requested_by: email, category, message })
    .select("id, category, message, status, created_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not save your request. Please try again." }, { status: 500 });

  // Tell us right away. A failed notification never loses the request, it is already saved.
  try {
    const { data: client } = await supabase.from("clients").select("business_name").eq("client_id", clientId).maybeSingle();
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, business_name: client?.business_name ?? "", requested_by: email, category, message }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ request: data }, { status: 201 });
}
