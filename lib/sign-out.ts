import { createClient } from "@/lib/supabase/client";

export async function signOutAndLeave() {
  await createClient().auth.signOut();
  window.location.href = "/sign-in";
}
