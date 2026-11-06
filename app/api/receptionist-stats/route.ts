import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

async function fetchPeriodStats(supabase: ReturnType<typeof createServerSupabaseClient>, clientId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("calls")
    .select("duration_ms, user_sentiment, call_status, call_category")
    .eq("client_id", clientId)
    .eq("direction", "inbound")
    .or("call_status.neq.registered,call_status.is.null")
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - NINETY_DAYS).toISOString());

  if (error || !data) return null;

  const total_calls = data.length;
  const total_duration_ms = data.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0);
  const avg_duration_seconds = total_calls > 0 ? total_duration_ms / total_calls / 1000 : 0;
  // Sentiment only counts real conversations. Spam, silent, wrong-number and sales-pitch calls never feed it.
  const FILTERED = new Set(["spam", "no_conversation", "vendor", "wrong_number"]);
  const real = data.filter((r) => !(r.call_category && FILTERED.has(r.call_category)));
  const positive_count = real.filter((r) => r.user_sentiment === "Positive").length;
  const neutral_count = real.filter((r) => r.user_sentiment === "Neutral").length;
  const negative_count = real.filter((r) => r.user_sentiment === "Negative").length;

  const type_counts: Record<string, number> = {};
  for (const r of data) {
    const key = r.call_category ?? (r.user_sentiment === "Spam" ? "spam" : "other");
    type_counts[key] = (type_counts[key] ?? 0) + 1;
  }
  const filtered_count = Object.entries(type_counts).filter(([k]) => FILTERED.has(k)).reduce((s, [, n]) => s + n, 0);
  const spam_count = type_counts["spam"] ?? 0;
  const conversation_count = total_calls - filtered_count;

  return { total_calls, avg_duration_seconds, total_duration_ms, positive_count, neutral_count, negative_count, spam_count, conversation_count, filtered_count, type_counts };
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();

  const rangeMs = new Date(to).getTime() - new Date(from).getTime();
  const prevTo = from;
  const prevFrom = new Date(new Date(from).getTime() - rangeMs).toISOString();

  const supabase = createServerSupabaseClient();
  const [current, previous] = await Promise.all([
    fetchPeriodStats(supabase, clientId, from, to),
    fetchPeriodStats(supabase, clientId, prevFrom, prevTo),
  ]);

  const empty = { total_calls: 0, avg_duration_seconds: 0, total_duration_ms: 0, positive_count: 0, neutral_count: 0, negative_count: 0, spam_count: 0, conversation_count: 0, filtered_count: 0, type_counts: {} as Record<string, number> };

  return NextResponse.json({ current: current ?? empty, previous: previous ?? empty });
}
