"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { AlertCircle, PhoneOutgoing } from "lucide-react";
import type { CallRow, UserPublicMetadata, ClientCallStats } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase-client";
import Badge from "@/components/Badge";
import CallDetailDrawer from "@/components/CallDetailDrawer";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import {
  formatFullDate,
  formatDuration,
  getResultBadgeProps,
  getSentimentBadgeProps,
  formatPhoneNumber,
  safePct,
} from "@/lib/formatters";

export default function OutboundPage() {
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const clientId = metadata.client_id ?? "";

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [stats, setStats] = useState<ClientCallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(false);

    try {
      const [callsResult, statsResult] = await Promise.all([
        getSupabaseClient()
          .from("calls")
          .select("*")
          .eq("client_id", clientId)
          .eq("direction", "outbound")
          .order("started_at", { ascending: false })
          .limit(100),
        getSupabaseClient()
          .from("client_call_stats")
          .select("*")
          .eq("client_id", clientId)
          .eq("direction", "outbound")
          .single(),
      ]);

      if (callsResult.error) {
        setError(true);
      } else {
        setCalls((callsResult.data ?? []) as CallRow[]);
        if (!statsResult.error && statsResult.data) {
          setStats(statsResult.data as ClientCallStats);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const answerRate = stats
    ? safePct((stats.total_calls ?? 0) - (stats.no_answer_count ?? 0), stats.total_calls ?? 0)
    : "—";
  const successRate = stats
    ? safePct(stats.successful_calls ?? 0, stats.total_calls ?? 0)
    : "—";

  return (
    <div className="p-7">
      {/* Inline stats summary */}
      {stats && (
        <p className="text-[13px] text-[var(--text-secondary)] mb-5">
          {stats.calls_this_month} calls this month
          <span className="mx-2 text-[var(--text-tertiary)]">·</span>
          {answerRate} answer rate
          <span className="mx-2 text-[var(--text-tertiary)]">·</span>
          {successRate} success rate
        </p>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
        {error ? (
          <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-[var(--text-secondary)]">
            <AlertCircle size={16} className="text-[var(--red)] shrink-0" />
            Could not load data. Try refreshing the page.
          </div>
        ) : loading ? (
          <TableSkeleton rows={10} />
        ) : calls.length === 0 ? (
          <EmptyState
            icon={PhoneOutgoing}
            primary="No outbound calls yet"
            secondary="Outbound call data will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Date & Time", "To", "From", "Duration", "Result", "Sentiment", "Summary"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatFullDate(call.started_at)}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-primary)] whitespace-nowrap">
                      {formatPhoneNumber(call.to_number)}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatPhoneNumber(call.from_number)}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDuration(call.duration_ms)}
                    </td>
                    <td className="px-5 py-[13px]">
                      <Badge {...getResultBadgeProps(call)} />
                    </td>
                    <td className="px-5 py-[13px]">
                      <Badge {...getSentimentBadgeProps(call.user_sentiment)} />
                    </td>
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-secondary)] max-w-[240px]">
                      <span className="block truncate">
                        {call.call_summary
                          ? call.call_summary.length > 90
                            ? call.call_summary.slice(0, 90) + "…"
                            : call.call_summary
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}
