"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAndLeave } from "@/lib/sign-out";
import {
  Phone,
  UsersRound,
  BarChart2,
  PhoneOutgoing,
  PenLine,
  CreditCard,
  Settings,
  LogOut,
} from "lucide-react";
import LogoMark from "./LogoMark";
import ThemeToggle from "./ThemeToggle";
import OverviewNavIcon from "./icons/OverviewNavIcon";
import type { ServiceType } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType | "overview";
}

function buildNavItems(services: ServiceType[]): (NavItem & { gapBefore?: boolean })[] {
  const items: (NavItem & { gapBefore?: boolean })[] = [];
  const both = services.includes("receptionist") && services.includes("outbound");

  if (services.includes("receptionist")) {
    items.push(
      { label: "Overview", href: "/dashboard/receptionist", icon: "overview" },
      { label: "Call History", href: "/dashboard/receptionist-call-history", icon: Phone },
      { label: "Leads", href: "/dashboard/leads", icon: UsersRound },
    );
  }

  if (services.includes("outbound")) {
    items.push(
      { label: both ? "Outbound Overview" : "Overview", href: "/dashboard/outbound", icon: BarChart2 },
      { label: both ? "Outbound Calls" : "Call History", href: "/dashboard/outbound-call-history", icon: PhoneOutgoing },
    );
  }

  items.push(
    { label: "Updates", href: "/dashboard/updates", icon: PenLine },
    { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { label: "Settings", href: "/dashboard/settings", icon: Settings },
  );
  return items;
}

interface NavSidebarProps {
  services: ServiceType[];
  businessName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function NavSidebar({ services, mobileOpen = false, onClose }: NavSidebarProps) {
  const pathname = usePathname();
  const navItems = buildNavItems(services);

  const isActive = (href: string) => {
    if (href === "/dashboard/receptionist") return pathname === "/dashboard/receptionist" || pathname === "/dashboard";
    if (href === "/dashboard/receptionist-call-history") return pathname === "/dashboard/receptionist-call-history";
    if (href === "/dashboard/outbound") return pathname === "/dashboard/outbound";
    if (href === "/dashboard/outbound-call-history") return pathname === "/dashboard/outbound-call-history";
    return pathname === href || pathname.startsWith(`${href}/`);
  };


  return (
    <aside className={`dashboard-sidebar${mobileOpen ? " is-open" : ""}`}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 15px 0 22px",
          flexShrink: 0,
        }}
      >
        <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          <LogoMark size={20} className="text-[var(--text-primary)]" />
        </div>
        <div className="sidebar-theme-toggle">
          <ThemeToggle />
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 12px 8px",
          minHeight: 0,
        }}
      >
        {navItems.map((item) => (
          <div key={item.href} style={{ marginTop: 0, marginBottom: 2 }}>
            <NavLink item={item} active={isActive(item.href)} onNavigate={onClose} />
          </div>
        ))}
      </nav>

      <div style={{ flexShrink: 0, padding: "12px 12px 16px" }}>
        <LogoutButton onSignOut={() => signOutAndLeave()} />
      </div>
    </aside>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const LucideIcon = item.icon === "overview" ? null : item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="nav-link"
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 7,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--nav-active-text)" : "var(--nav-text)",
        background: active ? "var(--nav-active-bg)" : "transparent",
        textDecoration: "none",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--bg-2)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--nav-text)";
        }
      }}
    >
      {item.icon === "overview" ? (
        <span style={{ flexShrink: 0, display: "flex", opacity: active ? 1 : 0.85 }}>
          <OverviewNavIcon />
        </span>
      ) : (
        LucideIcon && (
          <LucideIcon
            size={16}
            strokeWidth={2}
            style={{ opacity: active ? 1 : 0.9, flexShrink: 0, transition: "opacity 0.15s" }}
          />
        )
      )}
      {item.label}
    </Link>
  );
}

function LogoutButton({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="nav-logout"
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 7,
        color: "var(--text-secondary)",
        width: "100%",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "left",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--red)";
        e.currentTarget.style.background = "var(--red-dim)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <LogOut size={16} strokeWidth={2} style={{ opacity: 0.9 }} />
      Log out
    </button>
  );
}
