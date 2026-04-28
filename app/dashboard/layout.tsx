"use client";

import { useUser } from "@clerk/nextjs";
import NavSidebar from "@/components/NavSidebar";
import type { ServiceType, UserPublicMetadata } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const services = (metadata.services ?? ["receptionist"]) as ServiceType[];
  const businessName = metadata.business_name ?? "";

  return (
    <div className="dashboard-shell">
      <NavSidebar services={services} businessName={businessName} />

      <div className="dashboard-main-panel">
        <main className="dashboard-main-scroll">{children}</main>
      </div>
    </div>
  );
}
