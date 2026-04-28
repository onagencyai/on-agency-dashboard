import { createServerSupabaseClient } from "@/lib/supabase-server";

interface UserLike {
  id: string;
  publicMetadata?: unknown;
}

function metadataClientId(publicMetadata: unknown): string | null {
  if (!publicMetadata || typeof publicMetadata !== "object") return null;
  const value = (publicMetadata as { client_id?: unknown }).client_id;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function resolveClientId(user: UserLike): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("client_id")
    .eq("clerk_user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!error && data?.client_id) return data.client_id;

  const fromMetadata = metadataClientId(user.publicMetadata);
  if (fromMetadata) return fromMetadata;
  return null;
}
