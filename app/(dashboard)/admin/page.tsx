export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { Users, PhoneCall, ClipboardCheck, AlertTriangle } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getAdminOverview } from "@/lib/admin-data";
import type { AdminClient, Health } from "@/lib/admin-data";
import MetricCard from "@/components/MetricCard";
import { PageSection, PageTitle, cardStyle, pageColumn } from "@/components/PageSection";

const HEALTH: Record<Health, { label: string; color: string; bg: string }> = {
  healthy: { label: "Healthy", color: "var(--green-text)", bg: "var(--green-dim)" },
  quiet: { label: "Quiet", color: "var(--amber)", bg: "var(--amber-dim)" },
  check: { label: "Needs attention", color: "var(--red)", bg: "var(--red-dim)" },
  new: { label: "New", color: "var(--text-secondary)", bg: "var(--bg-3)" },
};

function ago(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

const SERVICE_LABEL: Record<string, string> = { receptionist: "AI Receptionist", outbound: "AI Outbound" };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user || !isAdminEmail(user.email)) notFound();

  const clients = await getAdminOverview();
  const order: Record<Health, number> = { check: 0, quiet: 1, new: 2, healthy: 3 };
  const sorted = clients.slice().sort((a, b) => order[a.health] - order[b.health] || b.callsThisMonth - a.callsThisMonth);
  const totalCalls = clients.reduce((s, c) => s + c.callsThisMonth, 0);
  const totalLeads = clients.reduce((s, c) => s + c.leadsThisMonth, 0);
  const attention = clients.filter((c) => c.health === "check").length;
  const monthName = new Date().toLocaleDateString("en-US", { month: "long", timeZone: "America/Chicago" });

  return (
    <div className="page-pad">
      <div style={pageColumn}>
        <PageTitle>Admin</PageTitle>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
          <div style={{ ...cardStyle, borderRadius: 12 }}><MetricCard label="Clients" value={clients.length} icon={<Users size={15} />} /></div>
          <div style={{ ...cardStyle, borderRadius: 12 }}><MetricCard label={`Calls in ${monthName}`} value={totalCalls} icon={<PhoneCall size={15} />} /></div>
          <div style={{ ...cardStyle, borderRadius: 12 }}><MetricCard label={`Leads in ${monthName}`} value={totalLeads} icon={<ClipboardCheck size={15} />} /></div>
          <div style={{ ...cardStyle, borderRadius: 12 }}><MetricCard label="Needs attention" value={attention} icon={<AlertTriangle size={15} />} /></div>
        </div>

        <PageSection title="Clients" cue="Most urgent first. Only you can see this page.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((c) => <ClientCard key={c.clientId} c={c} />)}
            {sorted.length === 0 && <div style={{ ...cardStyle, padding: 20, fontSize: 13.5, color: "var(--text-secondary)" }}>No clients yet.</div>}
          </div>
        </PageSection>
      </div>
    </div>
  );
}

function ClientCard({ c }: { c: AdminClient }) {
  const h = HEALTH[c.health];
  const diff = c.callsThisMonth - c.callsLastMonth;
  return (
    <div style={{ ...cardStyle, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{c.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{c.services.map((s) => SERVICE_LABEL[s] ?? s).join(" · ") || "No services"}</div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 500, color: h.color, background: h.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
          {h.label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <Stat label="Calls this month" value={String(c.callsThisMonth)} note={c.callsLastMonth || c.callsThisMonth ? `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} vs last month` : "None yet"} />
        <Stat label="Leads" value={String(c.leadsThisMonth)} note="Leads and booked calls" />
        <Stat label="Messages" value={String(c.messagesThisMonth)} note={c.spamThisMonth ? `${c.spamThisMonth} spam or silent blocked` : "Taken by the agent"} />
        <Stat label="Last call" value={ago(c.lastCallAt)} note={c.lastCallAt ? new Date(c.lastCallAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" }) : ""} />
        <Stat label="Billing" value={c.billing.line1} note={c.billing.line2} small />
      </div>

      {c.reasons.length > 0 && c.health !== "healthy" && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
          {c.reasons.map((r) => <span key={r}>• {r}</span>)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note, small }: { label: string; value: string; note?: string; small?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
      <div className="num" style={{ fontSize: small ? 15 : 20, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", lineHeight: small ? "22px" : "26px", overflowWrap: "anywhere" }}>{value}</div>
      {note && <div className="num" style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>{note}</div>}
    </div>
  );
}
