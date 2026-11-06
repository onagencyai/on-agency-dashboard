"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { Phone as PhoneIcon, Users } from "lucide-react";
import type { LeadRow, LeadStatus } from "@/lib/types";
import { formatFullDate, formatPhoneNumber } from "@/lib/formatters";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";

const KIND_LABEL: Record<LeadRow["kind"], { label: string; variant: "success" | "info" | "neutral" }> = {
  lead: { label: "Project lead", variant: "success" },
  booked: { label: "Appointment booked", variant: "success" },
  message: { label: "Message", variant: "info" },
  info: { label: "For your info", variant: "neutral" },
};

const STATUS_LABEL: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", closed: "Closed" };
const TABS: { value: "all" | LeadStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

function telHref(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `tel:+${d.length === 10 ? "1" + d : d}` : null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"all" | LeadStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as { leads: LeadRow[] };
        if (!cancelled) setLeads(data.leads ?? []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function setStatus(id: string, status: LeadStatus) {
    const before = leads;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => null);
    if (!res || !res.ok) setLeads(before);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length, new: 0, contacted: 0, closed: 0 };
    for (const l of leads) c[l.status] += 1;
    return c;
  }, [leads]);
  const shown = tab === "all" ? leads : leads.filter((l) => l.status === tab);

  return (
    <div style={{ padding: "24px 32px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leads</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
          People who called and left their details. Tap a row to hear the call.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: "pointer",
                border: "1px solid var(--border)",
                background: active ? "var(--accent)" : "var(--bg-1)",
                color: active ? "var(--bg)" : "var(--text-secondary)",
              }}
            >
              {t.label} <span style={{ opacity: 0.7 }}>{counts[t.value] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 8 }} />
      ) : failed ? (
        <EmptyState icon={Users} primary="We couldn't load your leads" secondary="Please refresh the page. If it keeps happening, let us know." />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Users}
          primary={leads.length === 0 ? "No leads yet" : "Nothing here"}
          secondary={leads.length === 0 ? "When someone calls and leaves their details, they will show up here." : "No leads match this filter."}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shown.map((l) => {
            const open = openId === l.id;
            const kind = KIND_LABEL[l.kind];
            const phone = l.phone ?? l.caller_id;
            const href = telHref(phone);
            return (
              <div key={l.id} style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <div
                  onClick={() => setOpenId(open ? null : l.id)}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", cursor: "pointer", flexWrap: "wrap" }}
                >
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{l.name ?? "Unknown caller"}</span>
                      <Badge variant={kind.variant} label={kind.label} />
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 3 }}>
                      {[l.company, l.summary].filter(Boolean).join(" · ") || "No details given"}
                    </div>
                  </div>
                  <div style={{ flex: "0 0 auto", fontSize: 14, color: "var(--text-secondary)", minWidth: 140 }}>
                    {formatFullDate(l.created_at)}
                  </div>
                  <div style={{ flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                    {href ? (
                      <a href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textDecoration: "none" }}>
                        <PhoneIcon size={14} /> {formatPhoneNumber(phone)}
                      </a>
                    ) : (
                      <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>No number</span>
                    )}
                  </div>
                  <div style={{ flex: "0 0 auto" }} onClick={(e) => e.stopPropagation()}>
                    <select
                      value={l.status}
                      onChange={(e) => void setStatus(l.id, e.target.value as LeadStatus)}
                      aria-label="Lead status"
                      style={{ fontSize: 14, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-hover)", background: "var(--bg-1)", color: "var(--text-primary)", cursor: "pointer" }}
                    >
                      {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {open && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 18px", display: "grid", gap: 14, background: "var(--bg-2)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                      <Detail label="Phone they gave" value={l.phone ? formatPhoneNumber(l.phone) : null} />
                      <Detail label="Number they called from" value={l.caller_id ? formatPhoneNumber(l.caller_id) : null} />
                      <Detail label="Email" value={l.email} />
                      <Detail label="Location" value={l.location} />
                    </div>
                    <Detail label="Details" value={l.details} />
                    {l.recording_url ? (
                      <div>
                        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>Call recording</div>
                        <audio controls preload="none" src={l.recording_url} style={{ width: "100%" }} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
