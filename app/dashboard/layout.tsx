"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { Menu, LogOut } from "lucide-react";
import NavSidebar from "@/components/NavSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import type { UserPublicMetadata, ServiceType } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const services = (metadata.services ?? []) as ServiceType[];
  const businessName = metadata.business_name ?? "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <NavSidebar
        services={services}
        email={email}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main area */}
      <div className="md:ml-[216px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-[52px] sticky top-0 z-20 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              {businessName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="w-px h-4 bg-[var(--border-strong)] mx-1" />
            <div className="relative group">
              <button
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
                className="w-8 h-8 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-bg)] transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
              <div className="absolute right-0 top-full mt-1.5 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-[6px] text-[11px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Sign out
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
