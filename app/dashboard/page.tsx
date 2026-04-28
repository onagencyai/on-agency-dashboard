"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Download, PhoneOff } from "lucide-react";
import Link from "next/link";
import type { TimeRange, UserPublicMetadata, ReceptionistStats, CallVolumeData, IntentData, CallRow } from "@/lib/types";
import { getDateRange, formatDateRange } from "@/lib/dateRange";
import { formatDuration, formatDurationSeconds } from "@/lib/formatters";
import TimeRangeDropdown from "@/components/TimeRangeDropdown";
import MetricCard from "@/components/MetricCard";
import SentimentBar from "@/components/SentimentBar";
import CallVolumeChart from "@/components/CallVolumeChart";
import IntentChart from "@/components/IntentChart";
import CallDetailModal from "@/components/CallDetailModal";

function pctDelta(current: number, previous: number, isMs = false): { value: string; direction: "up" | "down" | "neutral" } {
  if (!previous || previous === 0) return { value: "—", direction: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  if (isMs) {
    const diffSec = Math.abs((current - previous) / 1000);
    const m = Math.floor(diffSec / 60);
    const s = Math.floor(diffSec % 60);
    const label = m > 0 ? `${m}:${s.toString().padStart(2, "0")} vs last period` : `0:${s.toString().padStart(2, "0")} vs last period`;
    return { value: label, direction: current >= previous ? "up" : "down" };
  }
  const sign = pct >= 0 ? "up" : "down";
  return { value: `${Math.abs(pct).toFixed(1)}% vs last period`, direction: sign };
}

function sentimentScore(pos: number, neu: number, neg: number): string {
  const total = pos + neu + neg;
  if (!total) return "—";
  const score = (pos * 5 + neu * 3 + neg * 1) / total;
  return score.toFixed(1);
}

function formatTalkTime(ms: number): string {
  if (!ms) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

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

export default function ReceptionistOverviewPage() {
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const clientId = metadata.client_id ?? "";

  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [stats, setStats] = useState<ReceptionistStats | null>(null);
  const [volume, setVolume] = useState<CallVolumeData | null>(null);
  const [intents, setIntents] = useState<IntentData[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { from, to } = getDateRange(timeRange);
  const dateLabel = formatDateRange(from, to);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const f = from.toISOString();
    const t = to.toISOString();

    const [statsRes, volRes, intentRes, callsRes] = await Promise.allSettled([
      fetch(`/api/receptionist-stats?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/call-volume?from=${f}&to=${t}`).then((r) => r.json()),
      fetch(`/api/call-intents?from=${f}&to=${t}&direction=inbound`).then((r) => r.json()),
      fetch(`/api/calls?from=${f}&to=${t}&direction=inbound&page=1&limit=10`).then((r) => r.json()),
    ]);

    if (statsRes.status === "fulfilled") setStats(statsRes.value as ReceptionistStats);
    if (volRes.status === "fulfilled") setVolume(volRes.value as CallVolumeData);
    if (intentRes.status === "fulfilled") setIntents((intentRes.value as { intents: IntentData[] }).intents ?? []);
    if (callsRes.status === "fulfilled") setCalls((callsRes.value as { calls: CallRow[] }).calls ?? []);

    setLoading(false);
  }, [clientId, timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const totalCallsDelta = cur && prev ? pctDelta(cur.total_calls, prev.total_calls) : undefined;
  const avgDurationDelta = cur && prev ? pctDelta(cur.avg_duration_seconds * 1000, prev.avg_duration_seconds * 1000, true) : undefined;
  const talkTimeDelta = cur && prev ? pctDelta(cur.total_duration_ms, prev.total_duration_ms) : undefined;

  const curScore = cur ? parseFloat(sentimentScore(cur.positive_count, cur.neutral_count, cur.negative_count)) : 0;
  const prevScore = prev ? parseFloat(sentimentScore(prev.positive_count, prev.neutral_count, prev.negative_count)) : 0;
  const sentDelta: { value: string; direction: "up" | "down" | "neutral" } | undefined = cur && prev
    ? {
        value: `${Math.abs(curScore - prevScore).toFixed(1)} vs last period`,
        direction: curScore >= prevScore ? "up" : "down",
      }
    : undefined;

  return (
    <div style={{ padding: isMobile ? "18px 12px 20px" : "28px 24px 24px" }}>
      {/* Section header — title row like dashboard reference */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Overview
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
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "flex-end" : "initial" }}>
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
        <div
          style={{
            display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 1,
            background: "var(--border)", borderRadius: 12, overflow: "hidden",
            border: "1px solid var(--border)", marginBottom: 24,
          }}
        >
          {[0,1,2,3].map((i) => (
            <div key={i} style={{ background: "var(--bg-1)", padding: "20px 24px" }}>
              <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: 60, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 8, width: 120 }} />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 1,
            background: "var(--border)", borderRadius: 12, overflow: "hidden",
            border: "1px solid var(--border)", marginBottom: 24,
          }}
        >
          <MetricCard
            label="Total Calls"
            value={cur?.total_calls ?? 0}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M1 10h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            delta={totalCallsDelta}
          />
          <MetricCard
            label="Avg Duration"
            value={formatDurationSeconds(cur?.avg_duration_seconds)}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M6 4v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            delta={avgDurationDelta}
          />
          <MetricCard
            label="Sentiment Score"
            value={
              cur && (cur.positive_count + cur.neutral_count + cur.negative_count) > 0
                ? sentimentScore(cur.positive_count, cur.neutral_count, cur.negative_count)
                : "—"
            }
            valueSuffix={cur && (cur.positive_count + cur.neutral_count + cur.negative_count) > 0 ? "/5" : undefined}
            delta={sentDelta}
          >
            {cur && (
              <SentimentBar
                positive={cur.positive_count}
                neutral={cur.neutral_count}
                negative={cur.negative_count}
              />
            )}
          </MetricCard>
          <MetricCard
            label="Total Talk Time"
            value={formatTalkTime(cur?.total_duration_ms ?? 0)}
            icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h2M3 4v4M5 2v8M7 3v6M9 4v4M11 6h0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
            delta={talkTimeDelta}
          />
        </div>
      )}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, marginBottom: 16 }}>
        {/* Call Volume chart */}
        <div
          style={{
            background: "var(--bg-1)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
                Call Volume
              </span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>Daily</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(237,237,237,0.5)", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Inbound</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(59,130,246,0.7)", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Outbound</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {loading || !volume ? (
              <div className="skeleton" style={{ height: 220 }} />
            ) : (
              <CallVolumeChart data={volume} />
            )}
          </div>
        </div>

        {/* Call Intent chart */}
        <div
          style={{
            background: "var(--bg-1)", border: "1px solid var(--border)",
            borderRadius: 12, overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              Call Intent
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>By volume</span>
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

      {/* Recent Calls */}
      <div
        style={{
          background: "var(--bg-1)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", padding: "16px 20px",
            borderBottom: "1px solid var(--border)", gap: 10,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Recent Calls</span>
          {calls.length > 0 && (
            <span
              style={{
                fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)",
                color: "var(--text-tertiary)", background: "var(--bg-3)",
                padding: "1px 6px", borderRadius: 4,
              }}
            >
              {calls.length}
            </span>
          )}
          <Link
            href="/dashboard/calls"
            style={{
              marginLeft: "auto", fontSize: 12, color: "var(--blue)",
              textDecoration: "none",
            }}
          >
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
                      <td style={{ padding: "11px 16px", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", color: "var(--text-primary)", fontWeight: 500, whiteSpace: "nowrap" }}>
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
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 500,
                            fontFamily: "var(--font-geist-mono, monospace)",
                            color: outcome.color, background: outcome.bg,
                          }}
                        >
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
                          style={{
                            fontSize: 11, color: "var(--blue)", background: "none",
                            border: "none", cursor: "pointer", padding: 0,
                          }}
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
