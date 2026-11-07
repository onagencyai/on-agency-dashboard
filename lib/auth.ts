import { createAuthClient } from "@/lib/supabase/server";

export interface AppUser {
  id: string;
  /** Lowercase, verified email. This is what ties a login to a row in `clients`. */
  email: string;
  primaryEmailAddress: { emailAddress: string };
  publicMetadata: Record<string, never>;
}

// The signed-in user, or null. Only verified emails count (Google always is; email sign-ups must be confirmed).
export async function currentUser(): Promise<AppUser | null> {
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u?.email || !u.email_confirmed_at) return null;
  const email = u.email.trim().toLowerCase();
  return { id: u.id, email, primaryEmailAddress: { emailAddress: email }, publicMetadata: {} };
}
