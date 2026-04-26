export const dynamic = "force-dynamic";

import LogoMark from "@/components/LogoMark";

export default function CampaignsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-52px)] gap-4">
      <LogoMark size={28} className="text-[var(--text-tertiary)]" />
      <h1 className="text-[18px] font-medium text-[var(--text-primary)]">Campaigns</h1>
      <p className="text-[14px] text-[var(--text-secondary)] max-w-[280px] text-center">
        Your outbound campaigns will appear here once configured.
      </p>
    </div>
  );
}
