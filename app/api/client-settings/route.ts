import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";
import { TIMEZONES } from "@/lib/timezones";

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClientId(user);
  if (!clientId) return NextResponse.json({ error: "No client ID" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { timezone?: unknown } | null;
  if (!body || typeof body.timezone !== "string" || !TIMEZONES.includes(body.timezone)) {
    return NextResponse.json({ error: "Invalid time zone" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("clients").update({ timezone: body.timezone }).eq("client_id", clientId);
  if (error) return NextResponse.json({ error: "Could not save" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
