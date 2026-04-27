"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import NavSidebar from "@/components/NavSidebar";
import type { ServiceType, UserPublicMetadata } from "@/lib/types";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/calls": "Call History",
  "/dashboard/outbound": "Outbound Overview",
  "/dashboard/outbound/calls": "Outbound Call History",
  "/dashboard/outbound/campaigns": "Campaigns",
  "/dashboard/updates": "Updates",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const services = (metadata.services ?? ["receptionist"]) as ServiceType[];
  const businessName = metadata.business_name ?? "";

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.firstName
    ? user.firstName[0]
    : user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ?? "?";

  const pageTitle = PAGE_TITLES[pathname] ?? "Dashboard";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <NavSidebar services={services} businessName={businessName} />

      <div style={{ marginLeft: 220, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Topbar */}
        <header
          style={{
            height: 56,
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "var(--bg-1)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            flexShrink: 0,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              {pageTitle}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #333 0%, #222 100%)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 500,
                color: "#fff",
                userSelect: "none",
                letterSpacing: "0.02em",
                flexShrink: 0,
              }}
            >
              {initials.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
