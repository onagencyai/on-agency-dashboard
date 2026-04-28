"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Phone,
  BarChart2,
  Radio,
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
        { label: "Overview", href: "/dashboard", icon: "overview" },
        { label: "Call History", href: "/dashboard/calls", icon: Phone },
      ],
    });
  }

  if (services.includes("outbound")) {
    sections.push({
      heading: "AI OUTBOUND CALLER",
      items: [
        { label: "Overview", href: "/dashboard/outbound", icon: BarChart2 },
        { label: "Campaigns", href: "/dashboard/outbound/campaigns", icon: Radio },
        { label: "Call History", href: "/dashboard/outbound/calls", icon: PhoneOutgoing },
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

export default function NavSidebar({ services, businessName, mobileOpen = false, onClose }: NavSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const sections = buildNavSections(services);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const displayBusiness = businessName.trim() || "Your business";

  return (
    <aside className={`dashboard-sidebar${mobileOpen ? " is-open" : ""}`}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 0 20px",
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
        {sections.map((section) => (
          <div key={section.heading} style={{ paddingTop: 12, paddingBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                padding: "0 8px",
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

      <div style={{ flexShrink: 0, padding: "12px 12px 14px" }}>
        <div
          style={{
            height: 1,
            margin: "0 10px 14px",
            background: "var(--sidebar-divider)",
            borderRadius: 1,
          }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            padding: "0 8px 10px",
            lineHeight: 1.3,
            wordBreak: "break-word",
          }}
        >
          {displayBusiness}
        </div>
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
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--nav-active-text)" : "var(--text-secondary)",
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
          e.currentTarget.style.color = "var(--text-secondary)";
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
            style={{ opacity: active ? 1 : 0.65, flexShrink: 0, transition: "opacity 0.15s" }}
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
        padding: "7px 8px",
        borderRadius: 8,
        color: "var(--text-secondary)",
        fontSize: 13,
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
      <LogOut size={16} style={{ opacity: 0.7 }} />
      Log out
    </button>
  );
}
