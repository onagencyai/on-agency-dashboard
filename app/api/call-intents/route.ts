import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const CATEGORIES = [
  "General Information",
  "Pricing Information",
  "Appointments & Scheduling",
  "Complaints & Cancellations",
  "Customer Support Requests",
  "Other",
] as const;

function mapToCategory(intent: string): string {
  const lower = intent.toLowerCase();
  if (lower.includes("appointment") || lower.includes("schedul") || lower.includes("booking") || lower.includes("book")) {
    return "Appointments & Scheduling";
  }
  if (lower.includes("price") || lower.includes("pricing") || lower.includes("cost") || lower.includes("rate") || lower.includes("fee") || lower.includes("quote")) {
    return "Pricing Information";
  }
  if (lower.includes("complaint") || lower.includes("cancel") || lower.includes("refund") || lower.includes("unhappy") || lower.includes("dissatisf")) {
    return "Complaints & Cancellations";
  }
  if (lower.includes("support") || lower.includes("help") || lower.includes("issue") || lower.includes("problem") || lower.includes("trouble") || lower.includes("fix")) {
    return "Customer Support Requests";
  }
  if (lower.includes("general") || lower.includes("information") || lower.includes("info") || lower.includes("question") || lower.includes("hour") || lower.includes("location") || lower.includes("address")) {
    return "General Information";
  }
  return "Other";
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();
  const direction = searchParams.get("direction") ?? "inbound";

  const supabase = createServerSupabaseClient();
  const query = supabase
    .from("calls")
    .select("custom_analysis_data")
    .eq("client_id", clientId)
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .not("custom_analysis_data", "is", null);

  if (direction !== "all") {
    query.eq("direction", direction);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  CATEGORIES.forEach((c) => (counts[c] = 0));

  for (const row of data ?? []) {
    const analysis = row.custom_analysis_data as Record<string, unknown> | null;
    if (!analysis) continue;
    const raw = analysis.call_reason ?? analysis.reason ?? analysis.intent;
    if (typeof raw !== "string" || !raw.trim()) {
      counts["Other"]++;
      continue;
    }
    const category = mapToCategory(raw.trim());
    counts[category]++;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const intents = CATEGORIES.map((label) => ({
    label,
    count: counts[label] ?? 0,
    percentage: total > 0 ? Math.round(((counts[label] ?? 0) / total) * 100) : 0,
  }));

  return NextResponse.json({ intents });
}
