import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  while (cur <= toDate) {
    const key = `${MONTHS[cur.getMonth()]} ${cur.getDate()}`;
    days.push(key);
    inboundMap[key] = 0;
    outboundMap[key] = 0;
    cur.setDate(cur.getDate() + 1);
  }

  for (const row of data ?? []) {
    if (!row.started_at) continue;
    const d = new Date(row.started_at);
    const key = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    if (row.direction === "inbound") {
      inboundMap[key] = (inboundMap[key] ?? 0) + 1;
    } else if (row.direction === "outbound") {
      outboundMap[key] = (outboundMap[key] ?? 0) + 1;
    }
  }

  // Limit to last 30 labels for readability when range is large
  const limit = days.length > 30 ? Math.ceil(days.length / 30) : 1;
  const filteredDays = days.filter((_, i) => i % limit === 0);

  return NextResponse.json({
    dates: filteredDays,
    inbound: filteredDays.map((d) => inboundMap[d] ?? 0),
    outbound: filteredDays.map((d) => outboundMap[d] ?? 0),
  });
}
