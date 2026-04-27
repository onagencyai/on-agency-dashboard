"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CallVolumeData } from "@/lib/types";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1c1c1c",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8,
        padding: 10,
        fontSize: 12,
      }}
    >
      <div style={{ color: "#ededed", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: "#888", display: "flex", gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ color: "#ededed" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

interface CallVolumeChartProps {
  data: CallVolumeData;
}

export default function CallVolumeChart({ data }: CallVolumeChartProps) {
  const chartData = data.dates.map((date, i) => ({
    date,
    inbound: data.inbound[i] ?? 0,
    outbound: data.outbound[i] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={Math.max(4, Math.min(24, 600 / (data.dates.length || 1)))}>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#444", fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#444", fontSize: 10 }}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="inbound" name="Inbound" stackId="a" fill="rgba(237,237,237,0.18)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="outbound" name="Outbound" stackId="a" fill="rgba(59,130,246,0.45)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
