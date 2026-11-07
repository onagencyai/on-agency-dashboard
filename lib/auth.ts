import { createAuthClient } from "@/lib/supabase/server";

export interface AppUser {
  id: string;
  /** Lowercase, verified email. This is what ties a login to a row in `clients`. */
  email: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: Record<string, never>;
}

// The signed-in user, or null. Email sign-ups must be confirmed before they can sign in at all, so the email is verified.
export async function currentUser(): Promise<AppUser | null> {
  const supabase = await createAuthClient();
  // getClaims checks the signed token locally (no round trip to Supabase), which keeps every API call fast.
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub || typeof c.email !== "string" || !c.email) return null;
  const email = c.email.trim().toLowerCase();
  return { id: c.sub, email, primaryEmailAddress: { emailAddress: email }, publicMetadata: {} };
}
