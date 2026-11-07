"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { Download, PhoneCall, UserCheck, Target, Clock3 } from "lucide-react";
import type { TimeRange, OutboundStats, CallVolumeData, IntentData, CallRow } from "@/lib/types";
import { getDateRange } from "@/lib/dateRange";
import { formatDurationSeconds } from "@/lib/formatters";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import MetricCard from "@/components/MetricCard";
import CallVolumeChart from "@/components/CallVolumeChart";
import IntentChart from "@/components/IntentChart";
import { cacheGet, cacheSet } from "@/lib/page-cache";
import OutboundCallHistory from "@/components/OutboundCallHistory";

function periodLabel(range: TimeRange): string {
  switch (range) {
    case "today": return "vs yesterday";
    case "7d":    return "vs 7 days ago";
    case "30d":   return "vs 30 days ago";
    case "60d":   return "vs 60 days ago";
    case "90d":   return "vs 90 days ago";
  }
}

function pctDelta(current: number, previous: number, range: TimeRange): { value: string; direction: "up" | "down" | "neutral" } {
  if (!previous || previous === 0) return { value: "—", direction: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(pct).toFixed(1)}% ${periodLabel(range)}`,
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

export default function OutboundOverviewPage() {

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [stats, setStats] = useState<OutboundStats | null>(null);
  const [volume, setVolume] = useState<CallVolumeData | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const { from, to } = getDateRange(timeRange);

  const fetchData = useCallback(async () => {
    const ck = `outbound:${timeRange}`;
    const hit = cacheGet<{ stats: OutboundStats | null; volume: CallVolumeData | null; recentCalls: CallRow[] }>(ck);
    if (hit) {
      setStats(hit.stats); setVolume(hit.volume); setRecentCalls(hit.recentCalls);
      setLoading(false);
    } else {
      setLoading(true);
    }
    const f = from.toISOString();
    const t = to.toISOString();
    const tPlusOne = new Date(to.getTime() + 86400000).toISOString();

    const [statsRes, volRes, callsRes] = await Promise.allSettled([
      fetch(`/api/outbound-stats?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/call-volume?from=${f}&to=${tPlusOne}${timeRange === "today" ? `&hourly=1&tz=${new Date().getTimezoneOffset()}` : ""}`).then((r) => r.json()),
      fetch(`/api/calls?from=${f}&to=${t}&direction=outbound&page=1&limit=10`).then((r) => r.json()),
    ]);

    const next = {
      stats: statsRes.status === "fulfilled" ? (statsRes.value as OutboundStats) : (hit?.stats ?? null),
      volume: volRes.status === "fulfilled" ? (volRes.value as CallVolumeData) : (hit?.volume ?? null),
      recentCalls: callsRes.status === "fulfilled" ? ((callsRes.value as { calls: CallRow[] }).calls ?? []) : (hit?.recentCalls ?? []),
    };
    setStats(next.stats); setVolume(next.volume); setRecentCalls(next.recentCalls);
    cacheSet(ck, next);

    setLoading(false);
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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
    ? { unit: volume.unit, dates: volume.dates, inbound: volume.dates.map(() => 0), outbound: volume.outbound }
    : { dates: [], inbound: [], outbound: [] };

  const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const rangeLabel = timeRange === "today" ? `${MONTH_SHORT[to.getMonth()]} ${to.getDate()}` : `${MONTH_SHORT[from.getMonth()]} ${from.getDate()} – ${MONTH_SHORT[to.getMonth()]} ${to.getDate()}`;

  const outcomeData = buildOutcomeData(recentCalls);

  return (
    <div className="page-pad">
      {isMobile ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Outbound</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 25, lineHeight: "31px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)" }}>Outbound</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
            <button onClick={handleExport}
              style={{ background: "var(--accent)", color: "var(--bg)", border: "none", whiteSpace: "nowrap", flexShrink: 0, height: 36, padding: "0 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "opacity 0.15s", display: "flex", alignItems: "center", gap: 6 }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Download size={12} /> Export
            </button>
          </div>
        </div>
      )}

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
              shortLabel="Calls Made"
              value={cur?.total_calls ?? 0}
              icon={<PhoneCall size={12} />}
              delta={cur && prev ? pctDelta(cur.total_calls, prev.total_calls, timeRange) : undefined}
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
                timeRange,
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
                timeRange,
              ) : undefined}
            />
          </div>
          <div style={metricCardShell}>
            <MetricCard
              label="Avg Duration"
              value={formatDurationSeconds(cur?.avg_duration_seconds)}
              icon={<Clock3 size={12} />}
              delta={cur && prev ? {
                value: `${formatDurationSeconds(Math.abs(cur.avg_duration_seconds - prev.avg_duration_seconds))} ${periodLabel(timeRange)}`,
                direction: cur.avg_duration_seconds >= prev.avg_duration_seconds ? "up" : "down",
              } : undefined}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) minmax(420px, 0.9fr)", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                Outbound Call Volume
              </span>
            </div>
          </div>
          <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
            {loading ? (
              <div className="skeleton" style={{ height: 220 }} />
            ) : (
              <CallVolumeChart data={outboundVolume} rangeLabel={rangeLabel} />
            )}
          </div>
        </div>

        <div style={{ background: "var(--bg-1)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 0" }}>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
              Call Outcomes
            </span>
          </div>
          <div style={{ padding: 20 }}>
            <IntentChart intents={outcomeData} />
          </div>
        </div>
      </div>

      <OutboundCallHistory timeRange={timeRange} />
    </div>
  );
}
