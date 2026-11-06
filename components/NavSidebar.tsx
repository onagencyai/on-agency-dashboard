"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Phone,
  Users,
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

interface NavSection {
  heading: string;
  items: NavItem[];
}

function buildNavSections(services: ServiceType[]): NavSection[] {
  const sections: NavSection[] = [];

  if (services.includes("receptionist")) {
    sections.push({
      heading: "AI RECEPTIONIST",
      items: [
        { label: "Overview", href: "/dashboard/receptionist", icon: "overview" },
        { label: "Call History", href: "/dashboard/receptionist-call-history", icon: Phone },
        { label: "Leads", href: "/dashboard/leads", icon: Users },
      ],
    });
  }

  if (services.includes("outbound")) {
    sections.push({
      heading: "AI OUTBOUND CALLER",
      items: [
        { label: "Overview", href: "/dashboard/outbound", icon: BarChart2 },
        { label: "Call History", href: "/dashboard/outbound-call-history", icon: PhoneOutgoing },
      ],
    });
  }

  sections.push({
    heading: "ACCOUNT",
    items: [
      { label: "Updates", href: "/dashboard/updates", icon: PenLine },
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    ],
  });

  sections.push({
    heading: "CONFIGURATION",
    items: [{ label: "Settings", href: "/dashboard/settings", icon: Settings }],
  });

  return sections;
}

interface NavSidebarProps {
  services: ServiceType[];
  businessName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function NavSidebar({ services, mobileOpen = false, onClose }: NavSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const sections = buildNavSections(services);

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
          padding: "4px 15px 8px",
          minHeight: 0,
        }}
      >
        {sections.map((section) => (
          <div key={section.heading} style={{ paddingTop: 12, paddingBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--text-secondary)",
                padding: "0 10px",
                marginBottom: 4,
                userSelect: "none",
              }}
            >
              {section.heading}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return <NavLink key={item.href} item={item} active={active} onNavigate={onClose} />;
            })}
          </div>
        ))}
      </nav>

      <div style={{ flexShrink: 0, padding: "12px 15px 14px" }}>
        <LogoutButton onSignOut={() => signOut({ redirectUrl: "/sign-in" })} />
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 7,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--nav-active-text)" : "var(--nav-text)",
        background: active ? "var(--nav-active-bg)" : "transparent",
        textDecoration: "none",
        marginBottom: 2,
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 7,
        color: "var(--text-secondary)",
        fontSize: 14,
        fontWeight: 400,
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
