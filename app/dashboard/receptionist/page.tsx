"use client";
export const dynamic = "force-dynamic";
 
import { useState, useEffect, useCallback } from "react";
import { Download, PhoneOff, Phone, ClipboardCheck, PhoneOutgoing, UserPlus } from "lucide-react";
import Link from "next/link";
import type { TimeRange, ReceptionistStats, CallVolumeData, IntentData, CallRow } from "@/lib/types";
import { getDateRange } from "@/lib/dateRange";
import { formatDuration, formatPhoneNumber, getInboundOutcome } from "@/lib/formatters";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import MetricCard from "@/components/MetricCard";
import CallVolumeChart from "@/components/CallVolumeChart";
import IntentChart from "@/components/IntentChart";
import CallDetailModal from "@/components/CallDetailModal";
import CallCardList from "@/components/CallCardList";
import { cacheGet, cacheSet } from "@/lib/page-cache";
 
function periodLabel(range: TimeRange, short = false): string {
  if (short) return "vs prior";
  switch (range) {
    case "today": return "vs yesterday";
    case "7d":    return "vs 7 days ago";
    case "30d":   return "vs 30 days ago";
    case "60d":   return "vs 60 days ago";
    case "90d":   return "vs 90 days ago";
  }
}

function pctDelta(current: number, previous: number, range: TimeRange, isMs = false, fmt?: (n: number) => string, short = false): { value: string; direction: "up" | "down" | "neutral" } {
  if (!previous || previous === 0) {
    // Nothing to compare against: show what we gained instead of a dash.
    if (!current) return { value: "—", direction: "neutral" };
    const shown = isMs ? `${Math.floor(current / 60000)}:${Math.floor((current % 60000) / 1000).toString().padStart(2, "0")}` : (fmt ? fmt(current) : String(current));
    return { value: `+${shown} ${periodLabel(range, short)}`, direction: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  const label = periodLabel(range, short);
  if (isMs) {
    const diffSec = Math.abs((current - previous) / 1000);
    const m = Math.floor(diffSec / 60);
    const s = Math.floor(diffSec % 60);
    const dur = m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
    return { value: `${dur} ${label}`, direction: current >= previous ? "up" : "down" };
  }
  const sign = pct >= 0 ? "up" : "down";
  return { value: `${Math.abs(pct).toFixed(1)}% ${label}`, direction: sign };
}
 
function countDelta(current: number, previous: number, range: TimeRange, neutral = false, short = false): { value: string; direction: "up" | "down" | "neutral" } {
  const diff = current - previous;
  const label = periodLabel(range, short);
  if (diff === 0) return { value: `No change ${label}`, direction: "neutral" };
  const dir = neutral ? "neutral" : diff > 0 ? "up" : "down";
  return { value: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} ${label}`, direction: dir };
}

 
function getCallOutcome(call: CallRow): { label: string; color: string; bg: string } {
  const typed = getInboundOutcome(call);
  if (typed) return typed;
  if (call.in_voicemail) return { label: "Voicemail", color: "var(--text-secondary)", bg: "var(--bg-3)" };
  if (call.disconnection_reason === "call_transfer") return { label: "Transferred", color: "var(--blue)", bg: "var(--blue-dim)" };
  if (call.call_successful === true) return { label: "Resolved", color: "var(--green)", bg: "var(--green-dim)" };
  if (call.call_successful === false) return { label: "Not resolved", color: "var(--red)", bg: "var(--red-dim)" };
  return { label: "Ended", color: "var(--text-secondary)", bg: "var(--bg-3)" };
}
 
function getCallIntent(call: CallRow): string {
  if (!call.custom_analysis_data) return "—";
  const a = call.custom_analysis_data as Record<string, unknown>;
  const raw = a.call_reason ?? a.reason ?? a.intent;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "—";
}
 
export default function ReceptionistOverviewPage() {
 
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [stats, setStats] = useState<ReceptionistStats | null>(null);
  const [volume, setVolume] = useState<CallVolumeData | null>(null);
  const [intents, setIntents] = useState<IntentData[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);
 
  const { from, to } = getDateRange(timeRange);
 
  const fetchData = useCallback(async () => {
    const ck = `receptionist:${timeRange}`;
    const hit = cacheGet<{ stats: ReceptionistStats | null; volume: CallVolumeData | null; intents: IntentData[]; calls: CallRow[] }>(ck);
    if (hit) {
      setStats(hit.stats); setVolume(hit.volume); setIntents(hit.intents); setCalls(hit.calls);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const f = from.toISOString();
    const t = to.toISOString();
    const tPlusOne = new Date(to.getTime() + 86400000).toISOString();

    const [statsRes, volRes, intentRes, callsRes] = await Promise.allSettled([
      fetch(`/api/receptionist-stats?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/call-volume?from=${f}&to=${tPlusOne}${timeRange === "today" ? `&hourly=1&tz=${new Date().getTimezoneOffset()}` : ""}`).then((r) => r.json()),
      fetch(`/api/call-intents?from=${f}&to=${t}&direction=inbound`).then((r) => r.json()),
      fetch(`/api/calls?from=${f}&to=${t}&direction=inbound&page=1&limit=10`).then((r) => r.json()),
    ]);
 
    const next = {
      stats: statsRes.status === "fulfilled" ? (statsRes.value as ReceptionistStats) : (hit?.stats ?? null),
      volume: volRes.status === "fulfilled" ? (volRes.value as CallVolumeData) : (hit?.volume ?? null),
      intents: intentRes.status === "fulfilled" ? ((intentRes.value as { intents: IntentData[] }).intents ?? []) : (hit?.intents ?? []),
      calls: callsRes.status === "fulfilled" ? ((callsRes.value as { calls: CallRow[] }).calls ?? []) : (hit?.calls ?? []),
    };
    setStats(next.stats); setVolume(next.volume); setIntents(next.intents); setCalls(next.calls);
    cacheSet(ck, next);
 
    setLoading(false);
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps
 
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
 
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
 
  function handleExport() {
    const f = from.toISOString();
    const t = to.toISOString();
    window.location.href = `/api/export-calls?from=${f}&to=${t}&direction=inbound`;
  }
 
  const cur = stats?.current;
  const prev = stats?.previous;
  const metricCardShell = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    overflow: "hidden",
    background: "var(--bg-1)",
  } as const;
 
  const totalCallsDelta = cur && prev ? pctDelta(cur.total_calls, prev.total_calls, timeRange, false, undefined, isMobile) : undefined;
 
  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rangeLabel = timeRange === "today" ? `${MONTH_SHORT[to.getMonth()]} ${to.getDate()}` : `${MONTH_SHORT[from.getMonth()]} ${from.getDate()} – ${MONTH_SHORT[to.getMonth()]} ${to.getDate()}`;
 
  const inboundOnlyVolume: CallVolumeData = volume
    ? { unit: volume.unit, dates: volume.dates, inbound: volume.inbound, outbound: volume.dates.map(() => 0) }
    : { dates: [], inbound: [], outbound: [] };
 
  return (
    <div className="page-pad">
      {isMobile ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>
              Overview
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Overview
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            <button
              onClick={handleExport}
              style={{
                background: "var(--accent)", color: "var(--bg)", border: "none",
                height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </div>
      )}
 
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {[0,1,2,3].map((i) => (
            <div key={i} style={metricCardShell}>
              <div style={{ padding: "20px 24px" }}>
              <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: 60, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 8, width: 120 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={metricCardShell}>
            <MetricCard
              label="Total Calls"
              value={cur?.total_calls ?? 0}
              icon={<Phone size={14} />}
              delta={totalCallsDelta}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Leads Captured"
              shortLabel="Leads"
              value={cur?.lead_count ?? 0}
              icon={<ClipboardCheck size={14} />}
              delta={cur && prev ? countDelta(cur.lead_count, prev.lead_count, timeRange, false, isMobile) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Callbacks Requested"
              shortLabel="Callbacks"
              value={cur?.callback_count ?? 0}
              icon={<PhoneOutgoing size={14} />}
              delta={cur && prev ? countDelta(cur.callback_count, prev.callback_count, timeRange, false, isMobile) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="First-Time Callers"
              shortLabel="New Callers"
              value={cur?.first_time_callers ?? 0}
              icon={<UserPlus size={14} />}
              delta={cur && prev ? countDelta(cur.first_time_callers, prev.first_time_callers, timeRange, false, isMobile) : undefined}
            />
          </div>
        </div>
      )}
 
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(420px, 0.9fr)", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>Call Volume</span>
            </div>
          </div>
          <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
            {loading || !volume ? (
              <div className="skeleton" style={{ height: 220 }} />
            ) : (
              <CallVolumeChart data={inboundOnlyVolume} showOutbound={false} rangeLabel={rangeLabel} summary={cur ? { up: `${cur.conversation_count} real calls`, down: `${cur.filtered_count} spam or silent` } : undefined} />
            )}
          </div>
        </div>
 
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 0" }}>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>Call Intent</span>
          </div>
          <div style={{ padding: 20 }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[0,1,2,3,4,5].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 20 }} />
                ))}
              </div>
            ) : (
              <IntentChart intents={intents} />
            )}
          </div>
        </div>
      </div>
 
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Recent Calls</span>
          {calls.length > 0 && (
            <span style={{ fontSize: 12, fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", color: "var(--text-tertiary)", background: "var(--bg-3)", padding: "1px 6px", borderRadius: 4 }}>
              {calls.length}
            </span>
          )}
          <Link href="/dashboard/receptionist-call-history" style={{ marginLeft: "auto", fontSize: 13, color: "var(--blue)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>
 
        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, margin: "2px 16px", borderRadius: 4 }} />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
            <PhoneOff size={24} style={{ color: "var(--text-tertiary)", marginBottom: 10 }} />
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 4 }}>No calls recorded yet</div>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Call data will appear here automatically.</div>
          </div>
        ) : isMobile ? (
            <CallCardList calls={calls} getOutcome={getCallOutcome} getIntent={getCallIntent} onSelect={setSelectedCall} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-1)" }}>
                  {["Call ID","Date & Time","From","Duration","Outcome","Intent",""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => {
                  const outcome = getCallOutcome(call);
                  const intent = getCallIntent(call);
                  return (
                    <tr
                      key={call.id}
                      style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s", cursor: "pointer" }}
                      onClick={() => setSelectedCall(call)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-dim)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 16px", fontSize: 13, fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", color: "var(--text-primary)", fontWeight: 400, fontVariantNumeric: "normal", whiteSpace: "nowrap" }}>
                        {(call.call_id ?? call.id ?? "").slice(0, 8)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {call.started_at ? new Date(call.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatPhoneNumber(call.from_number)}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {formatDuration(call.duration_ms)}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", color: outcome.color, background: outcome.bg }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                          {outcome.label}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 13, color: "var(--text-secondary)", maxWidth: 160 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{intent}</span>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedCall(call); }} style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
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
      </div>
 
      <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
