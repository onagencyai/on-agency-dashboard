"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, PhoneOff, PhoneCall, UserCheck, Target, Clock3 } from "lucide-react";
import Link from "next/link";
import type { TimeRange, OutboundStats, CallVolumeData, IntentData, CallRow } from "@/lib/types";
import { getDateRange, formatDateRange } from "@/lib/dateRange";
import { formatDuration, formatDurationSeconds } from "@/lib/formatters";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import MetricCard from "@/components/MetricCard";
import CallVolumeChart from "@/components/CallVolumeChart";
import IntentChart from "@/components/IntentChart";
import CallDetailModal from "@/components/CallDetailModal";

function pctDelta(current: number, previous: number): { value: string; direction: "up" | "down" | "neutral" } {
  if (!previous || previous === 0) return { value: "—", direction: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(pct).toFixed(1)}% vs last period`,
    direction: pct >= 0 ? "up" : "down",
  };
}

function safePct(n: number, d: number): string {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

const OUTCOME_INTENTS: IntentData[] = [
  { label: "Converted", count: 0, percentage: 0 },
  { label: "Not Interested", count: 0, percentage: 0 },
  { label: "Voicemail", count: 0, percentage: 0 },
  { label: "No Answer", count: 0, percentage: 0 },
  { label: "Transferred", count: 0, percentage: 0 },
  { label: "Other", count: 0, percentage: 0 },
];

function buildOutcomeData(calls: CallRow[]): IntentData[] {
  if (!calls.length) return OUTCOME_INTENTS;
  const counts = { Converted: 0, "Not Interested": 0, Voicemail: 0, "No Answer": 0, Transferred: 0, Other: 0 };
  for (const c of calls) {
    if (c.call_successful === true) counts.Converted++;
    else if (c.in_voicemail) counts.Voicemail++;
    else if (c.disconnection_reason === "dial_no_answer") counts["No Answer"]++;
    else if (c.disconnection_reason === "call_transfer") counts.Transferred++;
    else if (c.call_successful === false) counts["Not Interested"]++;
    else counts.Other++;
  }
  const total = calls.length;
  return Object.entries(counts).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

function getCallOutcome(call: CallRow): { label: string; color: string; bg: string } {
  if (call.in_voicemail) return { label: "Voicemail", color: "var(--text-secondary)", bg: "var(--bg-3)" };
  if (call.disconnection_reason === "call_transfer") return { label: "Transferred", color: "var(--blue)", bg: "var(--blue-dim)" };
  if (call.call_successful === true) return { label: "Converted", color: "var(--green)", bg: "var(--green-dim)" };
  if (call.disconnection_reason === "dial_no_answer") return { label: "No Answer", color: "var(--amber)", bg: "var(--amber-dim)" };
  if (call.call_successful === false) return { label: "Not Interested", color: "var(--red)", bg: "var(--red-dim)" };
  return { label: "Ended", color: "var(--text-secondary)", bg: "var(--bg-3)" };
}

export default function OutboundOverviewPage() {
  const { isLoaded } = useUser();

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [stats, setStats] = useState<OutboundStats | null>(null);
  const [volume, setVolume] = useState<CallVolumeData | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { from, to } = getDateRange(timeRange);
  const dateLabel = formatDateRange(from, to);

  const fetchData = useCallback(async () => {
    if (!isLoaded) return;
    setLoading(true);
    const f = from.toISOString();
    const t = to.toISOString();

    const [statsRes, volRes, callsRes] = await Promise.allSettled([
      fetch(`/api/outbound-stats?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/call-volume?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/calls?from=${f}&to=${t}&direction=outbound&page=1&limit=10`).then((r) => r.json()),
    ]);

    if (statsRes.status === "fulfilled") setStats(statsRes.value as OutboundStats);
    if (volRes.status === "fulfilled") setVolume(volRes.value as CallVolumeData);
    if (callsRes.status === "fulfilled") setRecentCalls((callsRes.value as { calls: CallRow[] }).calls ?? []);

    setLoading(false);
  }, [isLoaded, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchData(); }, [fetchData]);

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
    window.location.href = `/api/export-calls?from=${f}&to=${t}&direction=outbound`;
  }

  const cur = stats?.current;
  const prev = stats?.previous;
  const metricCardShell = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    overflow: "hidden",
    background: "var(--bg-1)",
  } as const;

  const outboundVolume: CallVolumeData = volume
    ? { dates: volume.dates, inbound: volume.dates.map(() => 0), outbound: volume.outbound }
    : { dates: [], inbound: [], outbound: [] };

  const outcomeData = buildOutcomeData(recentCalls);

  return (
    <div style={{ padding: 28 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Outbound Overview
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px",
            borderRadius: 20,
            background: "var(--green-dim)",
            border: "1px solid rgba(34,197,94,0.28)",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: "var(--green)", fontFamily: "var(--font-geist-mono, monospace)" }}>{dateLabel}</span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
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
            Export
          </button>
        </div>
      </div>

      {/* Metric cards */}
      {loading ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}>
          {[0,1,2,3].map((i) => (
            <div key={i} style={metricCardShell}>
              <div style={{ padding: "20px 24px" }}>
              <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: 60 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={metricCardShell}>
            <MetricCard
              label="Total Calls Made"
              value={cur?.total_calls ?? 0}
              icon={<PhoneCall size={12} />}
              delta={cur && prev ? pctDelta(cur.total_calls, prev.total_calls) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Contact Rate"
              value={safePct(cur?.contacted_count ?? 0, cur?.total_calls ?? 0)}
              icon={<UserCheck size={12} />}
              delta={cur && prev ? pctDelta(
                cur.total_calls > 0 ? cur.contacted_count / cur.total_calls : 0,
                prev.total_calls > 0 ? prev.contacted_count / prev.total_calls : 0,
              ) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Conversion Rate"
              value={safePct(cur?.converted_count ?? 0, cur?.contacted_count ?? 0)}
              icon={<Target size={12} />}
              delta={cur && prev ? pctDelta(
                cur.contacted_count > 0 ? cur.converted_count / cur.contacted_count : 0,
                prev.contacted_count > 0 ? prev.converted_count / prev.contacted_count : 0,
              ) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Avg Duration"
              value={formatDurationSeconds(cur?.avg_duration_seconds)}
              icon={<Clock3 size={12} />}
              delta={cur && prev ? {
                value: `${formatDurationSeconds(Math.abs(cur.avg_duration_seconds - prev.avg_duration_seconds))} vs last period`,
                direction: cur.avg_duration_seconds >= prev.avg_duration_seconds ? "up" : "down",
              } : undefined}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.2fr) minmax(360px, 0.85fr)", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                Outbound Call Volume
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>Daily</span>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {loading ? (
              <div className="skeleton" style={{ height: 220 }} />
            ) : (
              <CallVolumeChart data={outboundVolume} />
            )}
          </div>
        </div>

        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              Call Outcomes
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>By volume</span>
          </div>
          <div style={{ padding: 20 }}>
            <IntentChart intents={outcomeData} />
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Recent Outbound Calls</span>
          <Link href="/dashboard/outbound-call-history" style={{ marginLeft: "auto", fontSize: 12, color: "var(--blue)", textDecoration: "none" }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "12px 0" }}>
            {[0,1,2,3,4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 44, margin: "2px 16px", borderRadius: 4 }} />
            ))}
          </div>
        ) : recentCalls.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
            <PhoneOff size={24} style={{ color: "var(--text-tertiary)", marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>No outbound calls yet</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Call data will appear here automatically.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  {["Call ID","Date & Time","Contact #","Duration","Outcome","Sentiment",""].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 500,
                      letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)",
                      borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => {
                  const outcome = getCallOutcome(call);
                  const sentiment = call.user_sentiment;
                  const sentColor = sentiment === "Positive" ? "var(--green)" : sentiment === "Negative" ? "var(--red)" : sentiment === "Neutral" ? "var(--amber)" : "var(--text-tertiary)";
                  return (
                    <tr key={call.id}
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
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {call.to_number ?? "—"}
                      </td>
                      <td style={{ padding: "11px 16px", fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", color: "var(--text-secondary)" }}>
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
                      <td style={{ padding: "11px 16px", fontSize: 12, color: sentColor }}>{sentiment ?? "—"}</td>
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
      </div>

      <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
