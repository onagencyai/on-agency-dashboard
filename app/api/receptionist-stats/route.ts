import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

async function fetchPeriodStats(supabase: ReturnType<typeof createServerSupabaseClient>, clientId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("calls")
    .select("duration_ms, user_sentiment, call_status, call_category, from_number")
    .eq("client_id", clientId)
    .eq("direction", "inbound")
    .or("call_status.neq.registered,call_status.is.null")
    .gte("started_at", from)
    .lte("started_at", to);

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

  // Leads = callers who left their details or booked. Callbacks = callers who left a message or asked for a person.
  const lead_count = (type_counts["lead"] ?? 0) + (type_counts["booked"] ?? 0);
  const callback_count = (type_counts["message"] ?? 0) + (type_counts["wants_person"] ?? 0);

  // First-time callers = real callers whose number has no earlier call to this client.
  const numbers = Array.from(new Set(real.map((r) => r.from_number).filter((n): n is string => !!n)));
  let first_time_callers = numbers.length;
  if (numbers.length > 0) {
    const { data: earlier } = await supabase
      .from("calls")
      .select("from_number")
      .eq("client_id", clientId)
      .eq("direction", "inbound")
      .lt("started_at", from)
      .in("from_number", numbers);
    const seen = new Set((earlier ?? []).map((r) => r.from_number));
    first_time_callers = numbers.filter((n) => !seen.has(n)).length;
  }

  return { total_calls, avg_duration_seconds, total_duration_ms, positive_count, neutral_count, negative_count, spam_count, conversation_count, filtered_count, type_counts, lead_count, callback_count, first_time_callers };
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

  const empty = { total_calls: 0, avg_duration_seconds: 0, total_duration_ms: 0, positive_count: 0, neutral_count: 0, negative_count: 0, spam_count: 0, conversation_count: 0, filtered_count: 0, type_counts: {} as Record<string, number>, lead_count: 0, callback_count: 0, first_time_callers: 0 };

  return NextResponse.json({ current: current ?? empty, previous: previous ?? empty });
}
