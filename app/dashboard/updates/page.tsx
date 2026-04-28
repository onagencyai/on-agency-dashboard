"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { TrendingUp, Phone, CheckCircle2, AlertCircle } from "lucide-react";

interface CallStats {
  total_calls: number;
  calls_this_month: number;
  calls_this_week: number;
  avg_duration_seconds: number;
  successful_calls: number;
  voicemail_count: number;
  positive_calls: number;
  negative_calls: number;
  neutral_calls: number;
  no_answer_count: number;
}

interface CallData {
  id: string;
  call_id: string;
  from_number: string;
  to_number: string;
  direction: string;
  call_status: string;
  duration_ms: number;
  call_successful: boolean;
  user_sentiment: string;
  started_at: string;
}

export default function DashboardPage() {
  const { isLoaded } = useAuth();
  const [stats, setStats] = useState<CallStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch call stats from your API
        const statsRes = await fetch("/api/calls?limit=1");
        if (!statsRes.ok) {
          throw new Error(`Stats fetch failed: ${statsRes.status}`);
        }
        const statsData = await statsRes.json();
        
        // For now, calculate stats from the calls data
        // In production, create a dedicated /api/stats endpoint
        if (statsData.calls && statsData.calls.length > 0) {
          const calls = statsData.calls;
          const stats: CallStats = {
            total_calls: statsData.total || 0,
            calls_this_month: calls.length, // This is simplified
            calls_this_week: calls.filter((c: CallData) => {
              const callDate = new Date(c.started_at);
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              return callDate >= weekAgo;
            }).length,
            avg_duration_seconds: Math.round(
              calls.reduce((sum: number, c: CallData) => sum + (c.duration_ms / 1000), 0) / calls.length
            ),
            successful_calls: calls.filter((c: CallData) => c.call_successful).length,
            voicemail_count: calls.filter((c: CallData) => c.direction === 'inbound').length,
            positive_calls: calls.filter((c: CallData) => c.user_sentiment === 'Positive').length,
            negative_calls: calls.filter((c: CallData) => c.user_sentiment === 'Negative').length,
            neutral_calls: calls.filter((c: CallData) => c.user_sentiment === 'Neutral').length,
            no_answer_count: 0,
          };
          setStats(stats);
        }

        // Fetch recent calls
        const callsRes = await fetch("/api/calls?limit=10&page=1");
        if (!callsRes.ok) {
          throw new Error(`Calls fetch failed: ${callsRes.status}`);
        }
        const callsData = await callsRes.json();
        setRecentCalls(callsData.calls || []);

      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(message);
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isLoaded]);

  if (loading) {
    return (
      <div style={{ padding: "28px", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "28px" }}>
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          color: "var(--red, #ef4444)"
        }}>
          <p style={{ margin: 0, fontSize: "14px" }}>Error loading data: {error}</p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", opacity: 0.8 }}>Check your connection or try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const sentimentData = stats ? [
    { name: "Positive", value: stats.positive_calls, fill: "var(--green, #10b981)" },
    { name: "Neutral", value: stats.neutral_calls, fill: "var(--gray, #6b7280)" },
    { name: "Negative", value: stats.negative_calls, fill: "var(--red, #ef4444)" },
  ].filter(d => d.value > 0) : [];

  return (
    <div style={{ padding: "28px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "600", margin: "0 0 8px 0", color: "var(--text-primary)" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
          Last 30 days
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px"
      }}>
        <StatCard
          label="Total Calls"
          value={stats?.total_calls || 0}
          icon={<Phone size={20} style={{ color: "var(--text-secondary)" }} />}
        />
        <StatCard
          label="Successful"
          value={stats?.successful_calls || 0}
          icon={<CheckCircle2 size={20} style={{ color: "var(--green, #10b981)" }} />}
        />
        <StatCard
          label="Avg Duration"
          value={`${stats?.avg_duration_seconds || 0}s`}
          icon={<TrendingUp size={20} style={{ color: "var(--text-secondary)" }} />}
        />
        <StatCard
          label="This Week"
          value={stats?.calls_this_week || 0}
          icon={<AlertCircle size={20} style={{ color: "var(--text-secondary)" }} />}
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "32px" }}>
        {/* Sentiment Pie Chart */}
        {sentimentData.length > 0 && (
          <div style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 16px 0", color: "var(--text-primary)" }}>
              Call Sentiment
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Call Success Rate */}
        {stats && (
          <div style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px"
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 16px 0", color: "var(--text-primary)" }}>
              Success Rate
            </h3>
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "48px", fontWeight: "700", color: "var(--green, #10b981)", marginBottom: "8px" }}>
                {stats.total_calls > 0 ? Math.round((stats.successful_calls / stats.total_calls) * 100) : 0}%
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
                {stats.successful_calls} of {stats.total_calls} calls
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Calls */}
      <div style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden"
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
            Recent Calls
          </h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%",
            fontSize: "13px",
            borderCollapse: "collapse"
          }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: "500" }}>From</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: "500" }}>Direction</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: "500" }}>Duration</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: "500" }}>Sentiment</th>
                <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-secondary)", fontWeight: "500" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.length > 0 ? (
                recentCalls.map((call) => (
                  <tr key={call.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", color: "var(--text-primary)" }}>{call.from_number}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{call.direction}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      {Math.round(call.duration_ms / 1000)}s
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: call.user_sentiment === "Positive" ? "rgba(16, 185, 129, 0.1)" : 
                                   call.user_sentiment === "Negative" ? "rgba(239, 68, 68, 0.1)" :
                                   "rgba(107, 114, 128, 0.1)",
                        color: call.user_sentiment === "Positive" ? "var(--green, #10b981)" :
                               call.user_sentiment === "Negative" ? "var(--red, #ef4444)" :
                               "var(--text-secondary)"
                      }}>
                        {call.user_sentiment || "Unknown"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        background: call.call_successful ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: call.call_successful ? "var(--green, #10b981)" : "var(--red, #ef4444)"
                      }}>
                        {call.call_successful ? "Success" : "Failed"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-secondary)" }}>
                    No calls yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bg-1)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "16px"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "500" }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}
