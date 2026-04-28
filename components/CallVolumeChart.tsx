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
import type { SVGProps } from "react";

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
      {payload.filter((p) => p.name !== "Capacity").map((p) => (
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
  const CustomTick = ({ x, y, payload }: SVGProps<SVGTextElement> & { payload?: { value?: string } }) => {
    const value = payload?.value ?? "";
    const [month = "", day = ""] = value.split(" ");
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={12} textAnchor="middle" fill="#8b8b8b" fontSize="11" fontWeight={600}>
          {month}
        </text>
        <text x={0} y={36} textAnchor="middle" fill="#b2b2b2" fontSize="11" fontWeight={500}>
          {day}
        </text>
      </g>
    );
  };

  const chartData = data.dates.map((date, i) => ({
    date,
    inbound: data.inbound[i] ?? 0,
    outbound: data.outbound[i] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={214}>
      <BarChart
        data={chartData}
        barSize={Math.max(5, Math.min(10, 360 / (data.dates.length || 1)))}
        margin={{ top: 2, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="18%"
      >
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={<CustomTick />}
          height={60}
          minTickGap={24}
          interval="preserveStartEnd"
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#707070", fontSize: 11 }}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey={showOutbound ? "outbound" : "inbound"}
          name={showOutbound ? "Outbound" : "Inbound"}
          fill="#4f7ff7"
          radius={[8, 8, 8, 8]}
          background={{ fill: "rgba(79,127,247,0.14)", radius: 8 }}
          activeBar={{ fill: "#6b95ff", stroke: "rgba(79,127,247,0.2)", strokeWidth: 1 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
