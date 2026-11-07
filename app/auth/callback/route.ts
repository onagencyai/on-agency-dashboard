import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

// Google sends people back here with a one-time code; we trade it for a session and open the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/sign-in?error=google`);
}
