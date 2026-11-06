"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useState, useEffect } from "react";
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
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 12,
        boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ color: "var(--ink)", fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: "var(--text-secondary)", display: "flex", gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ color: "var(--text-primary)" }}>{p.value}</span>
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
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setIsMobile(mq.matches);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const gridStroke = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(13,51,63,0.10)";
  const axisColor = isDarkMode ? "#c2c0b5" : "#66737a";
  const barColor = isDarkMode ? "#6da7ec" : "#2f80ff";
  const barActive = isDarkMode ? "#8dbcf2" : "#0060f2";

  const CustomTick = ({ x, y, payload }: SVGProps<SVGTextElement> & { payload?: { value?: string } }) => {
    const value = payload?.value ?? "";
    const [month = "", day = ""] = value.split(" ");
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={16} textAnchor="middle" fill={axisColor} fontSize="11" fontWeight={600}>
          {month}
        </text>
        <text x={0} y={32} textAnchor="middle" fill={axisColor} fontSize="11" fontWeight={400}>
          {day}
        </text>
      </g>
    );
  };

  const rawData = data.dates.map((date, i) => ({
    date,
    inbound: data.inbound[i] ?? 0,
    outbound: data.outbound[i] ?? 0,
  }));

  // Mobile: 7d (≤10 bars) renders as-is. 30/60/90d bucket down to 9 bars — same density as 7d.
  const chartData = (() => {
    if (!isMobile || rawData.length <= 10) return rawData;
    const bucketSize = Math.ceil(rawData.length / 9);
    const buckets = [];
    for (let i = 0; i < rawData.length; i += bucketSize) {
      const slice = rawData.slice(i, i + bucketSize);
      buckets.push({
        date: slice[0].date,
        inbound: slice.reduce((s, r) => s + r.inbound, 0),
        outbound: slice.reduce((s, r) => s + r.outbound, 0),
      });
    }
    return buckets;
  })();

  const tickInterval = Math.max(0, Math.floor(chartData.length / 15) - 1);

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 226 }}>
    <div style={{ position: "absolute", inset: 0 }}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        barSize={Math.max(8, Math.min(20, 620 / (chartData.length || 1)))}
        margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="12%"
      >
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={<CustomTick />}
          height={52}
          interval={tickInterval}
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#707070", fontSize: 12 }}
          tickMargin={4}
          width={40}
          domain={[0, (dataMax: number) => Math.ceil((dataMax + 1) / 4) * 4]}
          allowDecimals={false}
          tickCount={5}
        />
        <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="0" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(13,51,63,0.05)" }} />
        <Bar
          dataKey={showOutbound ? "outbound" : "inbound"}
          name={showOutbound ? "Outbound" : "Inbound"}
          fill={barColor}
          radius={[4, 4, 4, 4]}
          activeBar={{ fill: barActive }}
        />
      </BarChart>
    </ResponsiveContainer>
    </div>
    </div>
  );
}
