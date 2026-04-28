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
  showOutbound?: boolean;
}

export default function CallVolumeChart({ data, showOutbound = true }: CallVolumeChartProps) {
  const formatTick = (value: string) => {
    const parts = value.split(" ");
    const day = parts[parts.length - 1];
    return day || value;
  };

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
          tick={{ fill: "#707070", fontSize: 11 }}
          tickFormatter={formatTick}
          minTickGap={18}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#707070", fontSize: 11 }}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey="inbound"
          name="Inbound"
          stackId="a"
          fill="#4f7ff7"
          radius={[5, 5, 5, 5]}
          background={{ fill: "rgba(79,127,247,0.12)", radius: 5 }}
        />
        {showOutbound && (
          <Bar
            dataKey="outbound"
            name="Outbound"
            stackId="a"
            fill="#3f6dea"
            radius={[5, 5, 5, 5]}
            background={{ fill: "rgba(79,127,247,0.12)", radius: 5 }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
