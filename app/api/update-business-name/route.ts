import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { businessName?: string };
  const businessName = body.businessName?.trim();
  if (!businessName) {
    return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("clients")
    .update({ business_name: businessName })
    .eq("clerk_user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
