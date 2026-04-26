"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CallReasonData } from "@/lib/types";
import EmptyState from "@/components/EmptyState";
import { BarChart2 } from "lucide-react";

interface TopCallReasonsProps {
  data: CallReasonData[];
}

export default function TopCallReasons({ data }: TopCallReasonsProps) {
  return (
    <section>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Top call reasons
          </h2>
        </div>

        {data.length === 0 ? (
          <EmptyState
            icon={BarChart2}
            primary="No call reason data"
            secondary="Call reason data will appear after calls are analyzed."
          />
        ) : (
          <div className="px-5 py-5">
            <ResponsiveContainer width="100%" height={data.length * 44}>
              <BarChart
                layout="vertical"
                data={data}
                margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
                barSize={12}
              >
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={180}
                  tick={{ fill: "var(--text-secondary)", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--text-primary)",
                  }}
                  formatter={(value) => [`${String(value)}%`, "Share"]}
                />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "var(--text-tertiary)", fontSize: 12, formatter: (v: unknown) => `${String(v ?? "")}%` }}>
                  {data.map((_, index) => (
                    <Cell key={index} fill="var(--blue)" fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
