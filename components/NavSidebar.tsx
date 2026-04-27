"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
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
import type { ServiceType } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
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
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
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
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  });

  return sections;
}

interface NavSidebarProps {
  services: ServiceType[];
  businessName: string;
}

export default function NavSidebar({ services, businessName }: NavSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const sections = buildNavSections(services);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: 220,
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 30,
      }}
    >
      {/* Logo bar */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, flexShrink: 0 }}>
            <LogoMark size={18} className="text-[var(--text-primary)]" />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            ON Agency
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav sections */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 12px 8px",
        }}
      >
        {sections.map((section) => (
          <div key={section.heading} style={{ paddingTop: 20, paddingBottom: 8 }}>
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
              return (
                <NavLink key={item.href} item={item} active={active} />
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          padding: 12,
        }}
      >
        {businessName && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 300,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-tertiary)",
              padding: "2px 8px",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {businessName}
          </div>
        )}
        <LogoutButton onSignOut={() => signOut({ redirectUrl: "/sign-in" })} />
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 8px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        background: active ? "var(--accent-dim)" : "transparent",
        textDecoration: "none",
        marginBottom: 1,
        transition: "all 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "var(--accent-dim)";
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
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 2,
            background: "var(--accent)",
            borderRadius: 2,
          }}
        />
      )}
      <Icon
        size={16}
        style={{ opacity: active ? 1 : 0.6, flexShrink: 0, transition: "opacity 0.15s" }}
      />
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
