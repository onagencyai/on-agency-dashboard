import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ServiceType } from "@/lib/types";

function sanitizeServices(input: unknown): ServiceType[] {
  if (!Array.isArray(input)) return [];
  return input.filter((s): s is ServiceType => s === "receptionist" || s === "outbound");
}

export default async function DashboardEntryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("clients")
    .select("services")
    .eq("login_email", user.email)
    .limit(1)
    .maybeSingle();

  const fromDb = sanitizeServices(data?.services);
  const fromMetadata = sanitizeServices((user.publicMetadata as { services?: unknown })?.services);
  const services = fromDb.length ? fromDb : fromMetadata;

  if (services.includes("receptionist")) redirect("/dashboard/receptionist");
  if (services.includes("outbound")) redirect("/dashboard/outbound");

  redirect("/dashboard/receptionist");
}
