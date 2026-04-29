import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function dayKeyUTC(input: Date) {
  return `${MONTHS[input.getUTCMonth()]} ${input.getUTCDate()}`;
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("calls")
    .select("started_at, direction")
    .eq("client_id", clientId)
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("started_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days: string[] = [];
  const inboundMap: Record<string, number> = {};
  const outboundMap: Record<string, number> = {};

  // Build day buckets in UTC to avoid timezone drift (e.g. Apr 28 becoming Apr 29).
  const cur = new Date(Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()));
  const end = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate()));
  while (cur.getTime() <= end.getTime()) {
    const key = dayKeyUTC(cur);
    days.push(key);
    inboundMap[key] = 0;
    outboundMap[key] = 0;
    cur.setTime(cur.getTime() + ONE_DAY_MS);
  }

  for (const row of data ?? []) {
    if (!row.started_at) continue;
    const d = new Date(row.started_at);
    const key = dayKeyUTC(d);
    if (row.direction === "inbound") {
      inboundMap[key] = (inboundMap[key] ?? 0) + 1;
    } else if (row.direction === "outbound") {
      outboundMap[key] = (outboundMap[key] ?? 0) + 1;
    }
  }

  // Keep contiguous days and always include "today" so today's bar can render.
  const todayKey = dayKeyUTC(new Date());
  if (!days.includes(todayKey)) {
    days.push(todayKey);
    inboundMap[todayKey] = inboundMap[todayKey] ?? 0;
    outboundMap[todayKey] = outboundMap[todayKey] ?? 0;
  }
  const filteredDays = days.slice(-30);

  return NextResponse.json({
    dates: filteredDays,
    inbound: filteredDays.map((d) => inboundMap[d] ?? 0),
    outbound: filteredDays.map((d) => outboundMap[d] ?? 0),
  });
}
