"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Phone,
  FileText,
  PhoneOutgoing,
  Megaphone,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import LogoMark from "./LogoMark";
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
      heading: "AI Receptionist",
      items: [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "Call History", href: "/dashboard/calls", icon: Phone },
        { label: "Transcripts", href: "/dashboard/transcripts", icon: FileText },
      ],
    });
  }

  if (services.includes("outbound")) {
    sections.push({
      heading: "AI Outbound",
      items: [
        { label: "Outbound Calls", href: "/dashboard/outbound", icon: PhoneOutgoing },
        { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
      ],
    });
  }

  return sections;
}

interface NavSidebarProps {
  services: ServiceType[];
  email: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function NavSidebar({
  services,
  email,
  mobileOpen = false,
  onMobileClose,
}: NavSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const sections = buildNavSections(services);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-[216px] bg-[var(--bg-card)] border-r border-[var(--border)]">
      {/* Logo area */}
      <div className="h-[52px] flex items-center px-5 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center justify-between w-full">
          <LogoMark size={26} className="text-[var(--text-primary)]" />
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              aria-label="Close menu"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sections.map((section) => (
          <div key={section.heading}>
            <div
              className="px-4 pt-4 pb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-tertiary)] select-none"
            >
              {section.heading}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={`flex items-center gap-2.5 mx-2 px-3 py-2 rounded-[7px] text-[13px] transition-colors
                    ${active
                      ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium border-l-2 border-[var(--green)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] border-l-2 border-transparent"
                    }`}
                >
                  <item.icon size={14} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-[var(--border)]">
        <Link
          href="/dashboard/settings"
          onClick={onMobileClose}
          className={`flex items-center gap-2.5 mx-2 my-1 px-3 py-2 rounded-[7px] text-[13px] transition-colors
            ${isActive("/dashboard/settings")
              ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium border-l-2 border-[var(--green)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] border-l-2 border-transparent"
            }`}
        >
          <Settings size={14} className="shrink-0" />
          Settings
        </Link>

        <div className="border-t border-[var(--border)] mx-0" />

        <div className="flex items-center justify-between px-4 h-[52px]">
          <span className="text-[12px] text-[var(--text-secondary)] truncate max-w-[140px]">
            {email}
          </span>
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors shrink-0"
            aria-label="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[216px] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="fixed left-0 top-0 h-screen z-50 md:hidden shadow-2xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
