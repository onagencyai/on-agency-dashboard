export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { UserPublicMetadata, ServiceType } from "@/lib/types";

function derivePlan(services: ServiceType[]): string {
  const hasReceptionist = services.includes("receptionist");
  const hasOutbound = services.includes("outbound");
  if (hasReceptionist && hasOutbound) return "AI Receptionist + Outbound Caller";
  if (hasReceptionist) return "AI Receptionist";
  if (hasOutbound) return "AI Outbound Caller";
  return "—";
}

interface SettingsRowProps {
  label: string;
  value: string;
  last?: boolean;
}

function SettingsRow({ label, value, last }: SettingsRowProps) {
  return (
    <>
      <div className="flex items-center justify-between py-4 px-5">
        <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
        <span className="text-[14px] text-[var(--text-primary)]">{value}</span>
      </div>
      {!last && <div className="h-px bg-[var(--border)] mx-5" />}
    </>
  );
}

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const metadata = (user.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const businessName = metadata.business_name ?? "—";
  const services = (metadata.services ?? []) as ServiceType[];
  const email = user.primaryEmailAddress?.emailAddress ?? "—";
  const plan = derivePlan(services);

  return (
    <div className="p-7">
      <div className="max-w-[480px]">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <SettingsRow label="Business Name" value={businessName} />
          <SettingsRow label="Email" value={email} />
          <SettingsRow label="Plan" value={plan} last />
        </div>

        <p className="mt-4 text-[12px] text-[var(--text-tertiary)]">
          To update your plan or account details, contact your On Agency representative.
        </p>
      </div>
    </div>
  );
}
