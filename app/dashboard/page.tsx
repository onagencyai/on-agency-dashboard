export const dynamic = "force-dynamic";

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, PhoneOff } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ServiceType, ClientCallStats, CallRow, CallReasonData } from "@/lib/types";
// ClientCallStats and CallReasonData used in async functions below
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import CallsTableClient from "./CallsTableClient";
import TopCallReasons from "./TopCallReasons";
import {
  formatDurationSeconds,
  safePct,
} from "@/lib/formatters";
import { StatCardGridSkeleton, TableSkeleton } from "@/components/Skeleton";

async function fetchStats(clientId: string, direction: "inbound" | "outbound"): Promise<ClientCallStats | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_call_stats")
    .select("*")
    .eq("client_id", clientId)
    .eq("direction", direction)
    .single();

  if (error || !data) return null;
  return data as ClientCallStats;
}

async function fetchRecentCalls(clientId: string): Promise<{ calls: CallRow[]; error: boolean }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("client_id", clientId)
    .order("started_at", { ascending: false })
    .limit(10);

  if (error) return { calls: [], error: true };
  return { calls: (data ?? []) as CallRow[], error: false };
}

async function fetchCallReasons(clientId: string): Promise<CallReasonData[]> {
  const supabase = createServerSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("calls")
    .select("custom_analysis_data")
    .eq("client_id", clientId)
    .eq("direction", "inbound")
    .gte("started_at", thirtyDaysAgo)
    .not("custom_analysis_data", "is", null);

  if (error || !data) return [];

  const reasonCounts: Record<string, number> = {};
  for (const row of data) {
    const analysis = row.custom_analysis_data as Record<string, unknown> | null;
    if (!analysis) continue;
    const reason = analysis.call_reason ?? analysis.reason ?? analysis.intent;
    if (typeof reason === "string" && reason.trim()) {
      reasonCounts[reason.trim()] = (reasonCounts[reason.trim()] ?? 0) + 1;
    }
  }

  const total = Object.values(reasonCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }));
}

interface OverviewDataProps {
  clientId: string;
  services: ServiceType[];
}

async function OverviewData({ clientId, services }: OverviewDataProps) {
  const [inboundStats, outboundStats, { calls, error: callsError }, callReasons] = await Promise.all([
    services.includes("receptionist") ? fetchStats(clientId, "inbound") : Promise.resolve(null),
    services.includes("outbound") ? fetchStats(clientId, "outbound") : Promise.resolve(null),
    fetchRecentCalls(clientId),
    services.includes("receptionist") ? fetchCallReasons(clientId) : Promise.resolve([]),
  ]);

  const hasBoth = services.includes("receptionist") && services.includes("outbound");

  return (
    <div className="flex flex-col gap-7">
      {/* Receptionist stats */}
      {services.includes("receptionist") && (
        <section>
          {hasBoth && (
            <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-4">
              AI Receptionist
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Calls this month"
              value={inboundStats?.calls_this_month ?? 0}
            />
            <StatCard
              label="Avg Duration"
              value={formatDurationSeconds(inboundStats?.avg_duration_seconds)}
            />
            <StatCard
              label="Success Rate"
              value={safePct(inboundStats?.successful_calls ?? 0, inboundStats?.total_calls ?? 0)}
              subtext="of connected calls"
            />
            <StatCard
              label="Positive Calls"
              value={safePct(inboundStats?.positive_calls ?? 0, inboundStats?.total_calls ?? 0)}
              subtext="caller sentiment"
            />
          </div>
        </section>
      )}

      {/* Outbound stats */}
      {services.includes("outbound") && (
        <section>
          {hasBoth && (
            <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-4">
              AI Outbound
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Calls Made"
              value={outboundStats?.calls_this_month ?? 0}
            />
            <StatCard
              label="Answer Rate"
              value={safePct(
                (outboundStats?.total_calls ?? 0) - (outboundStats?.no_answer_count ?? 0),
                outboundStats?.total_calls ?? 0
              )}
              subtext="calls connected"
            />
            <StatCard
              label="Success Rate"
              value={safePct(outboundStats?.successful_calls ?? 0, outboundStats?.total_calls ?? 0)}
              subtext="of answered calls"
            />
            <StatCard
              label="Voicemails"
              value={outboundStats?.voicemail_count ?? 0}
              subtext="this month"
            />
          </div>
        </section>
      )}

      {/* Recent calls */}
      <section>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              Recent calls
            </h2>
          </div>

          {callsError ? (
            <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-[var(--text-secondary)]">
              <AlertCircle size={16} className="text-[var(--red)] shrink-0" />
              Could not load data. Try refreshing the page.
            </div>
          ) : calls.length === 0 ? (
            <EmptyState
              icon={PhoneOff}
              primary="No calls recorded yet"
              secondary="Call data will appear here automatically."
            />
          ) : (
            <CallsTableClient calls={calls} />
          )}
        </div>
      </section>

      {/* Top call reasons */}
      {services.includes("receptionist") && (
        <TopCallReasons data={callReasons} />
      )}
    </div>
  );
}

export default async function OverviewPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Query Supabase to find the client for this user
  const supabase = createServerSupabaseClient();
  const { data: clientRecord, error } = await supabase
    .from("clients")
    .select("client_id, services")
    .eq("clerk_user_id", user.id)
    .single();

  if (error || !clientRecord) {
    return (
      <div className="p-7">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <AlertCircle size={16} className="text-[var(--red)] shrink-0" />
          Account not configured. Contact your On Agency representative.
        </div>
      </div>
    );
  }

  const clientId = clientRecord.client_id;
  const services = (clientRecord.services ?? []) as ServiceType[];

  return (
    <div className="p-7">
      <Suspense
        fallback={
          <div className="flex flex-col gap-7">
            <StatCardGridSkeleton />
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <div className="h-3 w-24 skeleton-shimmer rounded" />
              </div>
              <TableSkeleton rows={8} />
            </div>
          </div>
        }
      >
        <OverviewData clientId={clientId} services={services} />
      </Suspense>
    </div>
  );
}
