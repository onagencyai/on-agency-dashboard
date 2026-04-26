"use client";

import { useState } from "react";
import type { CallRow } from "@/lib/types";
import Badge from "@/components/Badge";
import CallDetailDrawer from "@/components/CallDetailDrawer";
import { formatRelativeTime, formatDuration, getResultBadgeProps, getSentimentBadgeProps, formatPhoneNumber } from "@/lib/formatters";

interface CallsTableClientProps {
  calls: CallRow[];
}

export default function CallsTableClient({ calls }: CallsTableClientProps) {
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {["Time", "Number", "Duration", "Result", "Sentiment"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
                >
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
                  {formatRelativeTime(call.started_at)}
                </td>
                <td className="px-5 py-[13px] text-[13px] text-[var(--text-primary)] whitespace-nowrap">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </>
  );
}
