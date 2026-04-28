"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import NavSidebar from "@/components/NavSidebar";
import LogoMark from "@/components/LogoMark";
import ThemeToggle from "@/components/ThemeToggle";
import type { ServiceType, UserPublicMetadata } from "@/lib/types";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const [services, setServices] = useState<ServiceType[]>((metadata.services ?? ["receptionist"]) as ServiceType[]);
  const [businessName, setBusinessName] = useState(metadata.business_name ?? "");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateClientInfo() {
      try {
        const res = await fetch("/api/client-info", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { services?: unknown; business_name?: unknown };
        if (cancelled) return;

        if (Array.isArray(data.services)) {
          const parsed = data.services.filter((s): s is ServiceType => s === "receptionist" || s === "outbound");
          if (parsed.length) setServices(parsed);
        }
        if (typeof data.business_name === "string") {
          setBusinessName(data.business_name);
        }
      } catch {
        // Keep metadata defaults when client-info fetch fails.
      }
    }
    void hydrateClientInfo();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-shell">
      <NavSidebar
        services={services}
        businessName={businessName}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {mobileMenuOpen && <button className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu overlay" />}

      <div className="dashboard-main-panel">
        <div className="mobile-topbar">
          <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <LogoMark size={20} className="text-[var(--text-primary)]" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeToggle />
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
        <main className="dashboard-main-scroll">{children}</main>
      </div>
    </div>
  );
}
