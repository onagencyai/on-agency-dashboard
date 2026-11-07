"use client";
export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Phone as PhoneIcon, Search, Users, X } from "lucide-react";
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

// Same pill look as the Outcome column in Call History.
const KIND_PILL: Record<LeadRow["kind"], { color: string; bg: string }> = {
  lead: { color: "var(--green)", bg: "var(--green-dim)" },
  booked: { color: "var(--green)", bg: "var(--green-dim)" },
  message: { color: "var(--blue)", bg: "var(--blue-dim)" },
  info: { color: "var(--text-secondary)", bg: "var(--bg-3)" },
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
  const [page, setPage] = useState(1);
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

  useEffect(() => { setPage(1); }, [filter, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const visible = filtered.slice((page - 1) * PAGE, page * PAGE);

  const exportBtn = (
    <button
      onClick={() => exportCsv(filtered)}
      disabled={filtered.length === 0}
      style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "var(--bg)", border: "none", whiteSpace: "nowrap", flexShrink: 0, height: 32, padding: "0 12px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: filtered.length === 0 ? 0.4 : 1 }}
    >
      <Download size={12} /> Export CSV
    </button>
  );

  const th: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "var(--text-tertiary)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
    position: "sticky", top: 0, zIndex: 2, background: "var(--bg-1)",
  };
  const td: React.CSSProperties = { padding: "12px 16px", fontSize: 13, verticalAlign: "middle" };

  return (
    <div className="page-pad">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leads</span>
        {!isMobile && exportBtn}
      </div>

      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, overflow: "clip" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: isMobile ? "0 8px" : "0 20px", overflowX: isMobile ? "auto" : "visible" }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: isMobile ? "12px 12px" : "12px 16px", background: "none", border: "none", whiteSpace: "nowrap", flexShrink: 0,
                borderBottom: filter === f.value ? "2px solid var(--accent)" : "2px solid transparent",
                color: filter === f.value ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: 14, fontWeight: filter === f.value ? 500 : 400, cursor: "pointer", transition: "all 0.15s", marginBottom: -1,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Search name, phone or request..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", paddingLeft: 32, paddingRight: 12, height: 36, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, color: "var(--text-primary)", outline: "none", transition: "border-color 0.15s" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
          <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginLeft: "auto", whiteSpace: "nowrap" }}>
            {!loading && !failed && `${total} ${total === 1 ? "lead" : "leads"}`}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, margin: "2px 16px", borderRadius: 4 }} />
            ))}
          </div>
        ) : failed ? (
          <EmptyState icon={Users} primary="We couldn't load your leads" secondary="Please refresh the page. If it keeps happening, let us know." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            primary={leads.length === 0 ? "No leads yet" : "Nothing matches"}
            secondary={leads.length === 0 ? "When someone calls and leaves their details, they will show up here." : "Try a different search or filter."}
          />
        ) : isMobile ? (
          <div>
            {visible.map((l) => {
              const phone = l.phone ?? l.caller_id;
              const request = prettyDates(l.summary) || "No details given";
              const sub = [l.company, l.location].filter(Boolean).join(" · ");
              const pill = KIND_PILL[l.kind];
              return (
                <div key={l.id} onClick={() => setSelected(l)} style={{ cursor: "pointer", borderBottom: "1px solid var(--border)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 600, color: "var(--ink)", minWidth: 0 }}>
                      {isNew(l.created_at) && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name ?? "Unknown caller"}</span>
                    </span>
                    <span className="num" style={{ fontSize: 13, color: "var(--text-secondary)", flexShrink: 0 }}>{whenLabel(l.created_at)}</span>
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, color: pill.color, background: pill.bg }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                      {KIND_LABEL[l.kind].label}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.45 }}>{request}{sub ? <span style={{ color: "var(--text-secondary)" }}> · {sub}</span> : null}</div>
                  {phone && <div className="num" style={{ fontSize: 14, color: "var(--text-secondary)" }}>{formatPhoneNumber(phone)}</div>}
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {["Name", "Type", "Request", "Phone", "Date & Time", ""].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const phone = l.phone ?? l.caller_id;
                const request = prettyDates(l.summary) || "No details given";
                const sub = [l.company, l.location].filter(Boolean).join(" · ");
                const pill = KIND_PILL[l.kind];
                const cell: React.CSSProperties = { ...td, borderBottom: "1px solid var(--border)" };
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{ cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...cell, fontSize: 14, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        {isNew(l.created_at) && <span title="New" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />}
                        {l.name ?? "Unknown caller"}
                      </span>
                    </td>
                    <td style={cell}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", color: pill.color, background: pill.bg }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                        {KIND_LABEL[l.kind].label}
                      </span>
                    </td>
                    <td style={{ ...cell, maxWidth: 380, minWidth: 220 }}>
                      <div style={{ color: "var(--text-primary)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{request}</div>
                      {sub && <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</div>}
                    </td>
                    <td style={{ ...cell, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {phone ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <span>{formatPhoneNumber(phone)}</span>
                        </span>
                      ) : "No number"}
                    </td>
                    <td style={{ ...cell, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {new Date(l.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td style={cell}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(l); }}
                        style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && !failed && total > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Showing {Math.min((page - 1) * PAGE + 1, total)}–{Math.min(page * PAGE, total)} of {total} {total === 1 ? "lead" : "leads"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft size={13} /></PageBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>;
              })}
              <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight size={13} /></PageBtn>
            </div>
          </div>
        )}
      </div>

      {selected && !callOpen && (
        <LeadPanel lead={selected} onClose={() => setSelected(null)} onViewCall={(c) => setCallOpen(c)} />
      )}
      <CallDetailModal call={callOpen} onClose={() => setCallOpen(null)} />
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, padding: "0 8px", display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
        background: active ? "var(--bg-3)" : "transparent",
        border: active ? "1px solid var(--border-hover)" : "1px solid transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
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
