"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Search, AlertCircle, FileText, ChevronDown } from "lucide-react";
import type { CallRow } from "@/lib/types";
import { getSupabaseClient } from "@/lib/supabase-client";
import Badge from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import { TranscriptCardSkeleton } from "@/components/Skeleton";
import { formatFullDate, formatDuration, getSentimentBadgeProps, formatPhoneNumber } from "@/lib/formatters";

interface TranscriptTurn {
  speaker: "agent" | "caller";
  text: string;
}

function parseTranscript(transcript: string): TranscriptTurn[] {
  const lines = transcript.split("\n").filter(Boolean);
  const turns: TranscriptTurn[] = [];

  for (const line of lines) {
    const agentMatch = line.match(/^(?:Agent|assistant|AI):\s*(.+)/i);
    const callerMatch = line.match(/^(?:Caller|User|Customer|Human):\s*(.+)/i);

    if (agentMatch) {
      turns.push({ speaker: "agent", text: agentMatch[1] });
    } else if (callerMatch) {
      turns.push({ speaker: "caller", text: callerMatch[1] });
    } else if (turns.length > 0) {
      turns[turns.length - 1].text += " " + line;
    }
  }

  return turns.length > 0 ? turns : [{ speaker: "agent", text: transcript }];
}

function TranscriptCard({ call }: { call: CallRow }) {
  const [expanded, setExpanded] = useState(false);
  const turns = call.transcript ? parseTranscript(call.transcript) : null;
  const preview = call.transcript ? call.transcript.replace(/^(Agent|Caller|User|AI|Human|assistant):\s*/gim, "").slice(0, 140) : "";

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden">
      <button
        className="w-full text-left px-5 py-4 hover:bg-[var(--bg-subtle)] transition-colors"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-[13px] text-[var(--text-secondary)]">
            {formatFullDate(call.started_at)}
          </span>
          <div className="flex items-center gap-2">
            <Badge {...getSentimentBadgeProps(call.user_sentiment)} />
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {formatDuration(call.duration_ms)}
            </span>
            <ChevronDown
              size={13}
              className={`text-[var(--text-tertiary)] transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <div className="text-[13px] text-[var(--text-secondary)] mb-1.5">
          {formatPhoneNumber(call.from_number)}
        </div>
        {!expanded && (
          <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2">
            {preview}
            {(call.transcript?.length ?? 0) > 140 && "…"}
          </p>
        )}
      </button>

      {/* Expanded transcript */}
      <div
        className={`overflow-hidden transition-all duration-300 ${expanded ? "max-h-[2000px]" : "max-h-0"}`}
      >
        <div className="px-5 pb-5 border-t border-[var(--border)] pt-4">
          {turns ? (
            <div className="flex flex-col gap-2">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-1 ${turn.speaker === "caller" ? "items-end" : "items-start"}`}
                >
                  <span
                    className={`text-[11px] uppercase font-medium tracking-wide ${
                      turn.speaker === "agent" ? "text-[var(--blue)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {turn.speaker === "agent" ? "Agent" : "Caller"}
                  </span>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-[8px] text-[14px] leading-relaxed ${
                      turn.speaker === "agent"
                        ? "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                        : "bg-[var(--blue-bg)] text-[var(--text-primary)]"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[var(--text-secondary)]">No transcript content.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TranscriptsPage() {
  const { user, isLoaded } = useUser();
  const [clientId, setClientId] = useState<string>("");

  const [calls, setCalls] = useState<CallRow[]>([]);
  const [filtered, setFiltered] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const metadataClientId =
      typeof user?.publicMetadata === "object" &&
      user?.publicMetadata &&
      "client_id" in user.publicMetadata &&
      typeof (user.publicMetadata as { client_id?: unknown }).client_id === "string"
        ? ((user.publicMetadata as { client_id?: string }).client_id ?? "")
        : "";

    if (metadataClientId) {
      setClientId(metadataClientId);
      return;
    }

    void fetch("/api/client-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.client_id && typeof data.client_id === "string") {
          setClientId(data.client_id);
        } else {
          setClientId("");
          setLoading(false);
        }
      })
      .catch(() => {
        setClientId("");
        setLoading(false);
      });
  }, [isLoaded, user]);

  const fetchTranscripts = useCallback(async () => {
    if (!isLoaded || !clientId) return;
    setLoading(true);
    setError(false);

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from("calls")
        .select("*")
        .eq("client_id", clientId)
        .not("transcript", "is", null)
        .neq("transcript", "")
        .order("started_at", { ascending: false })
        .limit(100);

      if (fetchError) {
        setError(true);
      } else {
        const result = (data ?? []) as CallRow[];
        setCalls(result);
        setFiltered(result);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId, isLoaded]);

  useEffect(() => {
    void fetchTranscripts();
  }, [fetchTranscripts]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!search.trim()) {
        setFiltered(calls);
        return;
      }
      const q = search.toLowerCase();
      setFiltered(
        calls.filter(
          (c) =>
            c.transcript?.toLowerCase().includes(q) ||
            c.from_number?.toLowerCase().includes(q)
        )
      );
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, calls]);

  return (
    <div className="p-7">
      {/* Search */}
      <div className="relative max-w-xs mb-6">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Search transcripts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[7px] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--blue)] transition-colors"
        />
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <AlertCircle size={16} className="text-[var(--red)] shrink-0" />
          Could not load data. Try refreshing the page.
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <TranscriptCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          primary="No transcripts available"
          secondary="Transcripts appear after each call ends."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((call) => (
            <TranscriptCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}
