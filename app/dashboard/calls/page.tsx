"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Search, AlertCircle, ChevronLeft, ChevronRight, PhoneOff } from "lucide-react";
import type { CallRow, UserPublicMetadata, ServiceType } from "@/lib/types";
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
} from "@/lib/formatters";

const PAGE_SIZE = 20;

type DirectionFilter = "all" | "inbound" | "outbound";
type SentimentFilter = "all" | "Positive" | "Neutral" | "Negative";

export default function CallHistoryPage() {
  const { user } = useUser();
  const metadata = (user?.publicMetadata ?? {}) as Partial<UserPublicMetadata>;
  const clientId = metadata.client_id ?? "";
  const services = (metadata.services ?? []) as ServiceType[];
  const hasBothServices = services.includes("receptionist") && services.includes("outbound");

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchCalls = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(false);

    try {
      let query = getSupabaseClient()
        .from("calls")
        .select("*", { count: "exact" })
        .eq("client_id", clientId)
        .order("started_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (directionFilter !== "all") {
        query = query.eq("direction", directionFilter);
      }
      if (sentimentFilter !== "all") {
        query = query.eq("user_sentiment", sentimentFilter);
      }
      if (debouncedSearch) {
        query = query.or(
          `from_number.ilike.%${debouncedSearch}%,call_summary.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        setError(true);
      } else {
        setCalls((data ?? []) as CallRow[]);
        setTotal(count ?? 0);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, directionFilter, sentimentFilter, debouncedSearch]);

  useEffect(() => {
    void fetchCalls();
  }, [fetchCalls]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const visiblePages = (): number[] => {
    const pages: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-7">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search calls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[7px] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--blue)] transition-colors"
            />
          </div>

          {hasBothServices && (
            <FilterSelect
              value={directionFilter}
              onChange={(v) => { setDirectionFilter(v as DirectionFilter); setPage(1); }}
              options={[
                { value: "all", label: "All Directions" },
                { value: "inbound", label: "Inbound" },
                { value: "outbound", label: "Outbound" },
              ]}
            />
          )}

          <FilterSelect
            value={sentimentFilter}
            onChange={(v) => { setSentimentFilter(v as SentimentFilter); setPage(1); }}
            options={[
              { value: "all", label: "All Sentiments" },
              { value: "Positive", label: "Positive" },
              { value: "Neutral", label: "Neutral" },
              { value: "Negative", label: "Negative" },
            ]}
          />
        </div>

        {/* Table */}
        {error ? (
          <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-[var(--text-secondary)]">
            <AlertCircle size={16} className="text-[var(--red)] shrink-0" />
            Could not load data. Try refreshing the page.
          </div>
        ) : loading ? (
          <TableSkeleton rows={10} />
        ) : calls.length === 0 ? (
          <EmptyState
            icon={PhoneOff}
            primary="No calls recorded yet"
            secondary="Call data will appear here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Date & Time", "From", "To", "Duration", "Result", "Sentiment", "Summary"].map((h) => (
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
                      {formatPhoneNumber(call.from_number)}
                    </td>
                    <td className="px-5 py-[13px] text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                      {formatPhoneNumber(call.to_number)}
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

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <div className="px-5 py-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--text-secondary)]">
              Showing {start}–{end} of {total} calls
            </span>
            <div className="flex items-center gap-1">
              <PaginationButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </PaginationButton>

              {visiblePages().map((p) => (
                <PaginationButton
                  key={p}
                  onClick={() => setPage(p)}
                  active={p === page}
                  aria-label={`Page ${p}`}
                >
                  {p}
                </PaginationButton>
              ))}

              <PaginationButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>

      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[7px] text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)] transition-colors cursor-pointer appearance-none pr-7"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-[6px] text-[12px] transition-colors
        ${active
          ? "bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium border border-[var(--border-strong)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
        }
        ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}
