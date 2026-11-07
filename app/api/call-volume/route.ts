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

  // Hourly mode for "Today": hours of the viewer's local day. tz is the browser's getTimezoneOffset() in minutes.
  if (searchParams.get("hourly") === "1") {
    let tz = Number(searchParams.get("tz") ?? "0") || 0;
    let fromMs = new Date(from).getTime();
    // Use the business's saved time zone for "Today" so the hours match their real day.
    try {
      const sb = createServerSupabaseClient();
      const { data: c } = await sb.from("clients").select("timezone").eq("client_id", clientId).maybeSingle();
      if (c?.timezone) {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: c.timezone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date());
        const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
        const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
        tz = Math.round((Date.now() - asUtc) / 60000);
        fromMs = Date.UTC(g("year"), g("month") - 1, g("day")) + tz * 60000;
      }
    } catch {
      // keep the browser's time zone
    }
    const tzMs = tz * 60000;
    const HOUR = 3600000;
    const fromH = Math.floor((fromMs - tzMs) / HOUR);
    const nowH = Math.floor((Math.min(new Date(to).getTime(), Date.now()) - tzMs) / HOUR);
    const toH = Math.max(nowH, fromH + 2);
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("calls")
      .select("started_at, direction")
      .eq("client_id", clientId)
      .gte("started_at", new Date(fromH * HOUR + tzMs).toISOString())
      .lte("started_at", to);
    if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    const dates: string[] = [], inbound: number[] = [], outbound: number[] = [];
    for (let h = fromH; h <= toH; h++) {
      const h24 = ((h % 24) + 24) % 24;
      dates.push(`${h24 % 12 === 0 ? 12 : h24 % 12} ${h24 < 12 ? "AM" : "PM"}`);
      inbound.push(0);
      outbound.push(0);
    }
    for (const row of data ?? []) {
      if (!row.started_at) continue;
      const idx = Math.floor((new Date(row.started_at).getTime() - tzMs) / HOUR) - fromH;
      if (idx < 0 || idx >= dates.length) continue;
      if (row.direction === "inbound") inbound[idx] += 1;
      else if (row.direction === "outbound") outbound[idx] += 1;
    }
    return NextResponse.json({ unit: "hour", dates, inbound, outbound });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("calls")
    .select("started_at, direction")
    .eq("client_id", clientId)
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("started_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Internal server error" }, { status: 500 });

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

  // Always include today so today's bar renders even with no calls.
  const todayKey = dayKeyUTC(new Date());
  if (!days.includes(todayKey)) {
    days.push(todayKey);
    inboundMap[todayKey] = inboundMap[todayKey] ?? 0;
    outboundMap[todayKey] = outboundMap[todayKey] ?? 0;
  }

  // Desktop: match 30d bar density for longer ranges.
  // 60d → every 2 days (~31 bars), 90d → every 3 days (~31 bars).
  const bucketSize = 1;
  const finalDays: string[] = [];
  const finalInbound: number[] = [];
  const finalOutbound: number[] = [];
  for (let i = 0; i < days.length; i += bucketSize) {
    const slice = days.slice(i, i + bucketSize);
    finalDays.push(slice[0]);
    finalInbound.push(slice.reduce((s, d) => s + (inboundMap[d] ?? 0), 0));
    finalOutbound.push(slice.reduce((s, d) => s + (outboundMap[d] ?? 0), 0));
  }

  return NextResponse.json({
    dates: finalDays,
    inbound: finalInbound,
    outbound: finalOutbound,
  });
}
