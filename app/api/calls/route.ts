import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

// Allow only digits, +, -, spaces, and parentheses — the characters that can
// appear in a phone number. Anything else is stripped before the ILIKE query.
function sanitizePhoneSearch(raw: string): string {
  return raw.replace(/[^0-9+\-() ]/g, "").slice(0, 30);
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();
  const direction = searchParams.get("direction");
  const outcome = searchParams.get("outcome");
  const search = sanitizePhoneSearch(searchParams.get("search") ?? "");
  const hasTranscript = searchParams.get("hasTranscript") === "true";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "25");

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("calls")
    .select("*", { count: "exact" })
    .eq("client_id", clientId)
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("started_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (direction) query = query.eq("direction", direction);

  if (hasTranscript) {
    query = query.not("transcript", "is", null).neq("transcript", "");
  }

  if (outcome === "resolved") {
    query = query.eq("call_successful", true).eq("in_voicemail", false);
  } else if (outcome === "transferred") {
    query = query.eq("disconnection_reason", "call_transfer");
  } else if (outcome === "voicemail") {
    query = query.eq("in_voicemail", true);
  } else if (outcome === "dropped") {
    query = query.eq("call_successful", false).eq("in_voicemail", false);
  }

  if (search) {
    query = query.or(`from_number.ilike.%${search}%,to_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  return NextResponse.json({ calls: data ?? [], total: count ?? 0 });
}
