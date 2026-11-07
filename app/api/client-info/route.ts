import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveClientId } from "@/lib/resolve-client-id";

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = await resolveClientId(user);
  if (!clientId) {
    return NextResponse.json({ error: "No client ID" }, { status: 403 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("client_id, services, business_name")
    .eq("login_email", user.email)
    .single();

  if (error || !data) {
    return NextResponse.json({
      client_id: clientId,
      services: (user.publicMetadata as { services?: string[] }).services ?? ["receptionist"],
      business_name: (user.publicMetadata as { business_name?: string }).business_name ?? "",
    });
  }

  return NextResponse.json({
    client_id: data.client_id,
    services: data.services ?? ["receptionist"],
    business_name: data.business_name ?? "",
  });
}
