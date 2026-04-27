"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { useEffect } from "react";
import NavSidebar from "@/components/NavSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import LogoMark from "@/components/LogoMark";
import type { ServiceType } from "@/lib/types";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<ServiceType[]>(["receptionist"]);
  const [businessName, setBusinessName] = useState("");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  // Fetch client info from Supabase and update Clerk
  useEffect(() => {
    if (!user?.id) return;

    const fetchClientData = async () => {
      try {
        const res = await fetch(`/api/client-info?userId=${user.id}`);
        const data = await res.json();
        if (data.services) {
          setServices(data.services);
        }
        if (data.business_name) {
          setBusinessName(data.business_name);
        }
      } catch (err) {
        console.error("Failed to fetch client data:", err);
      }
    };

    fetchClientData();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <NavSidebar
        services={services}
        email={email}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Rest of layout stays the same */}
      <div className="md:ml-[216px] flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-[52px] sticky top-0 z-20 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <LogoMark size={24} className="text-[var(--text-primary)]" />
            </div>
            <span className="hidden md:inline text-[13px] font-medium text-[var(--text-primary)]">
              {businessName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={16} />
            </button>
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