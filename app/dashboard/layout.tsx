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
    <div
      style={{
        minHeight: "100vh",
        background: "var(--dashboard-shell)",
        padding: 16,
        boxSizing: "border-box",
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <NavSidebar services={services} businessName={businessName} />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "calc(100vh - 32px)",
          background: "var(--dashboard-panel)",
          border: "1px solid var(--dashboard-border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "var(--dashboard-sidebar-shadow)",
        }}
      >
        <main style={{ flex: 1, overflow: "auto", minHeight: 0 }}>{children}</main>
      </div>
    </div>
  );
}
