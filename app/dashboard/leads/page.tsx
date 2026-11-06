"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Phone as PhoneIcon, Search, Users, X } from "lucide-react";
import type { CallRow, LeadRow } from "@/lib/types";
import { formatPhoneNumber } from "@/lib/formatters";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import CallDetailModal from "@/components/CallDetailModal";

const KIND_LABEL: Record<LeadRow["kind"], { label: string; variant: "success" | "info" | "neutral" }> = {
  lead: { label: "Project lead", variant: "success" },
  booked: { label: "Appointment booked", variant: "success" },
  message: { label: "Message", variant: "info" },
  info: { label: "For your info", variant: "neutral" },
};

type Filter = "all" | "lead" | "booked" | "message";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lead", label: "Leads" },
  { value: "booked", label: "Bookings" },
  { value: "message", label: "Messages" },
];
const matchesFilter = (l: LeadRow, f: Filter) => f === "all" || (f === "message" ? l.kind === "message" || l.kind === "info" : l.kind === f);

const PAGE = 25;
const COLUMNS = "minmax(200px, 1.1fr) minmax(220px, 2fr) 230px 92px";

function telHref(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `tel:+${d.length === 10 ? "1" + d : d}` : null;
}

// "2026-06-01T16:00:00-05:00" -> "Jun 1, 4:00 PM"
function prettyDates(text: string | null): string {
  if (!text) return "";
  return text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:\d{2}|Z)?/g, (m) => {
    const d = new Date(m);
    return Number.isNaN(d.getTime()) ? m : d.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function whenLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 12) return `${Math.floor(mins / 60)}h ago`;
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const isNew = (iso: string) => Date.now() - new Date(iso).getTime() < 24 * 3600 * 1000;

function exportCsv(leads: LeadRow[]) {
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Received", "Name", "Type", "Request", "Details", "Phone", "Email", "Company", "Location"];
  const rows = leads.map((l) => [
    new Date(l.created_at).toLocaleString("en-US"), l.name, KIND_LABEL[l.kind].label, prettyDates(l.summary), prettyDates(l.details),
    l.phone ?? l.caller_id, l.email, l.company, l.location,
  ].map((v) => esc(v as string | null)).join(","));
  const blob = new Blob([[head.map((h) => esc(h)).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<LeadRow | null>(null);
  const [callOpen, setCallOpen] = useState<CallRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qd = q.replace(/\D/g, "");
    return [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).filter((l) => {
      if (!matchesFilter(l, filter)) return false;
      if (!q) return true;
      const hay = [l.name, l.company, l.summary, l.details, l.email, l.location].join(" ").toLowerCase();
      const phones = [l.phone, l.caller_id].join(" ").replace(/\D/g, "");
      return hay.includes(q) || (qd.length >= 3 && phones.includes(qd));
    });
  }, [leads, filter, search]);

  useEffect(() => { setShown(PAGE); }, [filter, search]);

  const visible = filtered.slice(0, shown);
  const groups: { label: string; items: LeadRow[] }[] = [];
  for (const l of visible) {
    const label = dayLabel(l.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(l); else groups.push({ label, items: [l] });
  }

  const th: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" };

  return (
    <div style={{ padding: isMobile ? "18px 12px 20px" : "24px 32px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: isMobile ? 22 : 25, lineHeight: isMobile ? "28px" : "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leads</span>
          {!loading && <span className="num" style={{ fontSize: 14, color: "var(--text-secondary)" }}>{leads.length}</span>}
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          disabled={filtered.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "var(--bg)", border: "none", whiteSpace: "nowrap", flexShrink: 0, height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: filtered.length === 0 ? 0.4 : 1 }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 18 }}>People who called and left their details, newest first.</div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
          <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or request"
            style={{ width: "100%", height: 36, paddingLeft: 32, paddingRight: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, color: "var(--text-primary)", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", gap: 2, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflowX: "auto", maxWidth: "100%" }}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            const n = leads.filter((l) => matchesFilter(l, f.value)).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", background: active ? "var(--accent)" : "transparent", color: active ? "var(--bg)" : "var(--text-secondary)" }}
              >
                {f.label} <span className="num" style={{ opacity: 0.7 }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 240, borderRadius: 12 }} />
      ) : failed ? (
        <EmptyState icon={Users} primary="We couldn't load your leads" secondary="Please refresh the page. If it keeps happening, let us know." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          primary={leads.length === 0 ? "No leads yet" : "Nothing matches"}
          secondary={leads.length === 0 ? "When someone calls and leaves their details, they will show up here." : "Try a different search or filter."}
        />
      ) : (
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 16, padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={th}>Name</span><span style={th}>Request</span><span style={th}>Phone</span><span style={{ ...th, textAlign: "right" }}>Received</span>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.label}>
              <div style={{ padding: "9px 20px", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", background: "var(--bg-2)", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
                {g.label} <span className="num" style={{ fontWeight: 400 }}>· {g.items.length}</span>
              </div>
              {g.items.map((l) => {
                const kind = KIND_LABEL[l.kind];
                const phone = l.phone ?? l.caller_id;
                const href = telHref(phone);
                const request = prettyDates(l.summary) || "No details given";
                const sub = [l.company, l.location].filter(Boolean).join(" · ");
                const callBtn = href ? (
                  <a
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid var(--border-hover)", color: "var(--text-primary)", fontSize: 13, fontWeight: 500, textDecoration: "none", background: "var(--bg)", flexShrink: 0 }}
                  >
                    <PhoneIcon size={13} /> Call
                  </a>
                ) : null;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelected(l)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    style={{ cursor: "pointer", borderBottom: "1px solid var(--border)", transition: "background 0.1s", padding: isMobile ? "14px 16px" : "14px 20px" }}
                  >
                    {isMobile ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 600, color: "var(--ink)", minWidth: 0 }}>
                            {isNew(l.created_at) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name ?? "Unknown caller"}</span>
                          </span>
                          <span className="num" style={{ fontSize: 13, color: "var(--text-secondary)", flexShrink: 0 }}>{whenLabel(l.created_at)}</span>
                        </div>
                        <div><Badge variant={kind.variant} label={kind.label} /></div>
                        <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.45 }}>{request}{sub ? <span style={{ color: "var(--text-secondary)" }}> · {sub}</span> : null}</div>
                        {href && (
                          <a href={href} onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 42, borderRadius: 8, background: "var(--accent)", color: "var(--bg)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                            <PhoneIcon size={16} /> Call <span className="num" style={{ fontWeight: 400, opacity: 0.85 }}>{formatPhoneNumber(phone)}</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 16, alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                            {isNew(l.created_at) && <span title="New" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name ?? "Unknown caller"}</span>
                          </div>
                          <Badge variant={kind.variant} label={kind.label} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{request}</div>
                          {sub && <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{sub}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span className="num" style={{ fontSize: 14, color: "var(--text-primary)" }}>{phone ? formatPhoneNumber(phone) : <span style={{ color: "var(--text-secondary)" }}>No number</span>}</span>
                          {callBtn}
                        </div>
                        <div className="num" style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "right" }}>{whenLabel(l.created_at)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", fontSize: 13, color: "var(--text-secondary)" }}>
            <span className="num">Showing {visible.length} of {filtered.length}</span>
            {filtered.length > visible.length && (
              <button onClick={() => setShown((n) => n + PAGE)} style={{ height: 32, padding: "0 14px", borderRadius: 6, border: "1px solid var(--border-hover)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                Load more
              </button>
            )}
          </div>
        </div>
      )}

      {selected && !callOpen && (
        <LeadPanel lead={selected} onClose={() => setSelected(null)} onViewCall={(c) => setCallOpen(c)} />
      )}
      <CallDetailModal call={callOpen} onClose={() => setCallOpen(null)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 14, lineHeight: "22px", flexWrap: "wrap" }}>
      <span style={{ color: "var(--text-secondary)", minWidth: 96 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function LeadPanel({ lead, onClose, onViewCall }: { lead: LeadRow; onClose: () => void; onViewCall: (c: CallRow) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const kind = KIND_LABEL[lead.kind];
  const phone = lead.phone ?? lead.caller_id;
  const href = telHref(phone);
  const received = new Date(lead.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
      <div role="dialog" aria-modal="true" style={{ position: "relative", width: 520, maxWidth: "100vw", height: "100%", background: "var(--bg-1)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0" }}>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 32px" }}>
          <div style={{ fontSize: 22, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 8 }}>{lead.name ?? "Unknown caller"}</div>
          <Badge variant={kind.variant} label={kind.label} />

          {href && (
            <a href={href} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 44, marginTop: 18, borderRadius: 8, background: "var(--accent)", color: "var(--bg)", fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
              <PhoneIcon size={16} /> Call <span className="num" style={{ fontWeight: 400, opacity: 0.85 }}>{formatPhoneNumber(phone)}</span>
            </a>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 22 }}>
            <Field label="Received">{received}</Field>
            {lead.phone && <Field label="Phone they gave"><span className="num">{formatPhoneNumber(lead.phone)}</span></Field>}
            {lead.caller_id && lead.caller_id.replace(/\D/g, "").slice(-10) !== (lead.phone ?? "").replace(/\D/g, "").slice(-10) && (
              <Field label="Called from"><span className="num">{formatPhoneNumber(lead.caller_id)}</span></Field>
            )}
            {lead.email && <Field label="Email"><a href={`mailto:${lead.email}`} style={{ color: "var(--blue)", textDecoration: "none" }}>{lead.email}</a></Field>}
            {lead.company && <Field label="Company">{lead.company}</Field>}
            {lead.location && <Field label="Location">{lead.location}</Field>}
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>What they need</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>{prettyDates(lead.summary) || "No details given."}</p>
          {lead.details && <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: "10px 0 0", whiteSpace: "pre-line" }}>{prettyDates(lead.details)}</p>}

          {lead.recording_url && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 10 }}>Listen to the call</div>
              <audio controls preload="none" src={lead.recording_url} style={{ width: "100%", maxWidth: 420, height: 40 }} />
            </>
          )}

          {lead.call && (
            <button
              onClick={() => onViewCall(lead.call as CallRow)}
              style={{ marginTop: 22, height: 38, padding: "0 16px", borderRadius: 6, border: "1px solid var(--border-hover)", background: "var(--bg)", color: "var(--text-primary)", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            >
              View full call and transcript
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
