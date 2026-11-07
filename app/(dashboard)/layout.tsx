"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import NavSidebar from "@/components/NavSidebar";
import LogoMark from "@/components/LogoMark";
import ThemeToggle from "@/components/ThemeToggle";
import { prefetchOutbound } from "@/lib/prefetch";
import type { ServiceType } from "@/lib/types";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [services, setServices] = useState<ServiceType[]>((["receptionist"]) as ServiceType[]);
  const [businessName, setBusinessName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Remember on this browser that this is an admin, so Updates and Billing never flash in the sidebar.
  useEffect(() => {
    try { if (localStorage.getItem("oa-is-admin") === "1") setIsAdmin(true); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateClientInfo() {
      try {
        const res = await fetch("/api/client-info", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { services?: unknown; business_name?: unknown; is_admin?: unknown };
        if (cancelled) return;

        if (Array.isArray(data.services)) {
          const parsed = data.services.filter((s): s is ServiceType => s === "receptionist" || s === "outbound");
          if (parsed.length) setServices(parsed);
        }
        setIsAdmin(data.is_admin === true);
        try { localStorage.setItem("oa-is-admin", data.is_admin === true ? "1" : "0"); } catch { /* ignore */ }
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

  // Warm up the Outbound page in the background so its first open is instant.
  useEffect(() => {
    if (!services.includes("outbound")) return;
    const id = window.setTimeout(() => { void prefetchOutbound(); }, 1200);
    return () => window.clearTimeout(id);
  }, [services]);

  return (
    <div className="dashboard-shell">
      <NavSidebar
        services={services}
        isAdmin={isAdmin}
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
