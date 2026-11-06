"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { Phone as PhoneIcon, Users } from "lucide-react";
import type { LeadRow } from "@/lib/types";
import { formatPhoneNumber } from "@/lib/formatters";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";

const KIND_LABEL: Record<LeadRow["kind"], { label: string; variant: "success" | "info" | "neutral" }> = {
  lead: { label: "Project lead", variant: "success" },
  booked: { label: "Appointment booked", variant: "success" },
  message: { label: "Message", variant: "info" },
  info: { label: "For your info", variant: "neutral" },
};

const COLUMNS = "minmax(200px, 1.3fr) minmax(220px, 2fr) 170px 180px";

function telHref(phone: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `tel:+${d.length === 10 ? "1" + d : d}` : null;
}

// "2026-06-01T16:00:00-05:00" -> "Jun 1, 4:00 PM"
function prettyDates(text: string | null): string {
  if (!text) return "";
  return text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:\d{2}|Z)?/g, (m) => {
    const d = new Date(m);
    return Number.isNaN(d.getTime())
      ? m
      : d.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
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

  const th: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)" };

  return (
    <div style={{ padding: isMobile ? "18px 12px 20px" : "24px 32px 32px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: isMobile ? 22 : 25, lineHeight: isMobile ? "28px" : "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Leads</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>People who called and left their details.</div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 220, borderRadius: 8 }} />
      ) : failed ? (
        <EmptyState icon={Users} primary="We couldn't load your leads" secondary="Please refresh the page. If it keeps happening, let us know." />
      ) : leads.length === 0 ? (
        <EmptyState icon={Users} primary="No leads yet" secondary="When someone calls and leaves their details, they will show up here." />
      ) : (
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 16, padding: "10px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={th}>Name</span>
              <span style={th}>Request</span>
              <span style={th}>Phone</span>
              <span style={th}>Received</span>
            </div>
          )}

          {leads.map((l, i) => {
            const open = openId === l.id;
            const kind = KIND_LABEL[l.kind];
            const phone = l.phone ?? l.caller_id;
            const href = telHref(phone);
            const request = [l.company, prettyDates(l.summary)].filter(Boolean).join(" · ") || "No details given";
            return (
              <div key={l.id} style={{ borderBottom: i < leads.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div
                  onClick={() => setOpenId(open ? null : l.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  style={{
                    display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: COLUMNS, gap: isMobile ? 6 : 16,
                    alignItems: isMobile ? "flex-start" : "center", padding: isMobile ? "14px 16px" : "14px 20px", cursor: "pointer", transition: "background 0.1s",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{l.name ?? "Unknown caller"}</div>
                    <Badge variant={kind.variant} label={kind.label} />
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.45, minWidth: 0 }}>{request}</div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {href ? (
                      <a href={href} className="num" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textDecoration: "none" }}>
                        <PhoneIcon size={14} /> {formatPhoneNumber(phone)}
                      </a>
                    ) : (
                      <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>No number</span>
                    )}
                  </div>
                  <div className="num" style={{ fontSize: 14, color: "var(--text-secondary)" }}>{shortDate(l.created_at)}</div>
                </div>

                {open && (
                  <div style={{ padding: isMobile ? "4px 16px 18px" : "4px 20px 20px", display: "grid", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                      <Detail label="Number they gave" value={l.phone ? formatPhoneNumber(l.phone) : null} />
                      <Detail label="Number they called from" value={l.caller_id ? formatPhoneNumber(l.caller_id) : null} />
                      <Detail label="Email" value={l.email} />
                      <Detail label="Location" value={l.location} />
                    </div>
                    <Detail label="Details" value={prettyDates(l.details) || null} />
                    {l.recording_url ? (
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Call recording</div>
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
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{value}</div>
    </div>
  );
}
