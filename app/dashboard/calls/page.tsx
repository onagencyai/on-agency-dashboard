"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Search, Download, PhoneOff, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeRange, UserPublicMetadata, CallRow } from "@/lib/types";
import { getDateRange, formatDateRange } from "@/lib/dateRange";
import { formatDuration } from "@/lib/formatters";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import CallDetailModal from "@/components/CallDetailModal";

const PAGE_SIZE = 25;

type OutcomeTab = "all" | "resolved" | "transferred" | "voicemail" | "dropped";

const TABS: { value: OutcomeTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "resolved", label: "Resolved" },
  { value: "transferred", label: "Transferred" },
  { value: "voicemail", label: "Voicemail" },
  { value: "dropped", label: "Dropped" },
];

function getCallOutcome(call: CallRow): { label: string; color: string; bg: string } {
  if (call.in_voicemail) return { label: "Voicemail", color: "var(--text-secondary)", bg: "var(--bg-3)" };
  if (call.disconnection_reason === "call_transfer") return { label: "Transferred", color: "var(--blue)", bg: "var(--blue-dim)" };
  if (call.call_successful === true) return { label: "Resolved", color: "var(--green)", bg: "var(--green-dim)" };
  if (call.call_successful === false) return { label: "Dropped", color: "var(--red)", bg: "var(--red-dim)" };
  return { label: "Ended", color: "var(--text-secondary)", bg: "var(--bg-3)" };
}

function getCallIntent(call: CallRow): string {
  if (!call.custom_analysis_data) return "—";
  const a = call.custom_analysis_data as Record<string, unknown>;
  const raw = a.call_reason ?? a.reason ?? a.intent;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "—";
}

export default function CallHistoryPage() {
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const clientId = metadata.client_id ?? "";

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [activeTab, setActiveTab] = useState<OutcomeTab>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { from, to } = getDateRange(timeRange);
  const dateLabel = formatDateRange(from, to);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchCalls = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const f = from.toISOString();
    const t = to.toISOString();
    const params = new URLSearchParams({
      from: f, to: t, direction: "inbound",
      page: String(page), limit: String(PAGE_SIZE),
    });
    if (activeTab !== "all") params.set("outcome", activeTab);
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const res = await fetch(`/api/calls?${params}`);
      const data = await res.json() as { calls: CallRow[]; total: number };
      setCalls(data.calls ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setCalls([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, activeTab, debouncedSearch, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchCalls(); }, [fetchCalls]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function handleExport() {
    const f = from.toISOString();
    const t = to.toISOString();
    window.location.href = `/api/export-calls?from=${f}&to=${t}&direction=inbound`;
  }

  return (
    <div style={{ padding: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Call History
        </span>
        <span
          style={{
            fontSize: 10, background: "var(--bg-3)", border: "1px solid var(--border)",
            color: "var(--text-tertiary)", padding: "2px 8px", borderRadius: 20,
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          {dateLabel}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <TimeRangeDropdown value={timeRange} onChange={(v) => { setTimeRange(v); setPage(1); }} />
          <button
            onClick={handleExport}
            style={{
              background: "var(--accent)", color: "var(--bg)", border: "none",
              padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: "pointer", transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 20px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); setPage(1); }}
              style={{
                padding: "12px 16px", background: "none", border: "none",
                borderBottom: activeTab === tab.value ? "2px solid var(--accent)" : "2px solid transparent",
                color: activeTab === tab.value ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: 13, fontWeight: activeTab === tab.value ? 500 : 400,
                cursor: "pointer", transition: "all 0.15s", marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Search by number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8,
                fontSize: 13, color: "var(--text-primary)", outline: "none", transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: "auto" }}>
            {total > 0 && `${total} calls`}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 44, margin: "2px 16px", borderRadius: 4 }} />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
            <PhoneOff size={24} style={{ color: "var(--text-tertiary)", marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>No calls recorded yet</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Call data will appear here automatically.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Call ID","Date & Time","From","Duration","Outcome","Sentiment","Intent",""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px", textAlign: "left",
                        fontSize: 10, fontWeight: 500, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: "var(--text-tertiary)",
                        borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const outcome = getCallOutcome(call);
                  const intent = getCallIntent(call);
                  const sentiment = call.user_sentiment;
                  const sentColor = sentiment === "Positive" ? "var(--green)" : sentiment === "Negative" ? "var(--red)" : sentiment === "Neutral" ? "var(--amber)" : "var(--text-tertiary)";
                  return (
                    <tr
                      key={call.id}
                      style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", color: "var(--text-primary)", fontWeight: 500 }}>
                        {(call.call_id ?? call.id ?? "").slice(0, 8)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {call.started_at ? new Date(call.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {call.from_number ?? "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatDuration(call.duration_ms)}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                          fontFamily: "var(--font-geist-mono, monospace)",
                          color: outcome.color, background: outcome.bg,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                          {outcome.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: sentColor }}>
                        {sentiment ?? "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)", maxWidth: 160 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {intent}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <button
                          onClick={() => setSelectedCall(call)}
                          style={{ fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderTop: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} calls
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={13} />
              </PageBtn>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return (
                  <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>
                    {p}
                  </PageBtn>
                );
              })}
              <PageBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={13} />
              </PageBtn>
            </div>
          </div>
        )}
      </div>

      <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}

function PageBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 28, height: 28, padding: "0 8px",
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 6, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
        background: active ? "var(--bg-3)" : "transparent",
        border: active ? "1px solid var(--border-hover)" : "1px solid transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}
