export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import SignOutButton from "@/components/SignOutButton";
import { PageSection, PageTitle, cardStyle, pagePadding, pageColumn } from "@/components/PageSection";

// Rendered on the server so the business name is already in the page when it opens.
export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const email = user.primaryEmailAddress?.emailAddress ?? "—";
  let businessName = ((user.publicMetadata as { business_name?: string }).business_name ?? "").trim();
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("clients").select("business_name").eq("clerk_user_id", user.id).single();
    if (data?.business_name && String(data.business_name).trim()) businessName = String(data.business_name).trim();
  } catch {
    // keep the Clerk value
  }
  if (!businessName) businessName = "—";

  return (
    <div style={{ padding: pagePadding }}>
      <div style={pageColumn}>
      <PageTitle>Settings</PageTitle>

      <PageSection title="Account" cue="The details tied to your login.">
        <div className="ledger-grid">
          <InfoCard label="Business name" value={businessName} />
          <InfoCard label="Email" value={email} />
        </div>
      </PageSection>

      <PageSection title="Session" cue="Sign out of this device.">
        <div className="ledger-grid">
          <div style={{ ...cardStyle, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Log out</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>You can sign back in any time with your email.</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </PageSection>
    </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}
