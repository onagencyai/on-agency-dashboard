import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

const STATUSES = ["new", "contacted", "closed"];

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const supabase = createServerSupabaseClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "Could not load leads" }, { status: 500 });

  const callIds = (leads ?? []).map((l) => l.call_id);
  const calls: Record<string, Record<string, unknown>> = {};
  if (callIds.length > 0) {
    const { data: callRows } = await supabase
      .from("calls")
      .select("*")
      .eq("client_id", clientId)
      .in("call_id", callIds);
    for (const c of callRows ?? []) calls[c.call_id as string] = c as Record<string, unknown>;
  }

  return NextResponse.json({
    leads: (leads ?? []).map((l) => ({
      ...l,
      recording_url: (calls[l.call_id]?.recording_url as string | null) ?? null,
      duration_ms: (calls[l.call_id]?.duration_ms as number | null) ?? null,
      call: calls[l.call_id] ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown } | null;
  if (!body || typeof body.id !== "string" || typeof body.status !== "string" || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("client_id", clientId);
  if (error) return NextResponse.json({ error: "Could not update lead" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
