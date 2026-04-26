"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CallRow } from "@/lib/types";
import Badge from "./Badge";
import { formatFullDate, formatDuration, getResultBadgeProps, getSentimentBadgeProps, formatPhoneNumber } from "@/lib/formatters";

interface CallDetailDrawerProps {
  call: CallRow | null;
  onClose: () => void;
}

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

function DrawerContent({ call, onClose }: { call: CallRow; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const resultBadge = getResultBadgeProps(call);
  const sentimentBadge = getSentimentBadgeProps(call.user_sentiment);
  const transcriptTurns = call.transcript ? parseTranscript(call.transcript) : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    drawerRef.current?.focus();
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="relative w-full md:w-[480px] h-full bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col overflow-hidden shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-label="Call details"
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <span className="text-[16px] font-medium text-[var(--text-primary)]">
              {formatPhoneNumber(call.from_number)}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[var(--text-secondary)]">
              {formatFullDate(call.started_at)}
            </span>
            {call.duration_ms !== null && call.duration_ms > 0 && (
              <>
                <span className="text-[var(--text-tertiary)]">·</span>
                <span className="text-[12px] text-[var(--text-secondary)]">
                  {formatDuration(call.duration_ms)}
                </span>
              </>
            )}
            <Badge {...resultBadge} />
            <Badge {...sentimentBadge} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          {/* Summary */}
          {call.call_summary && (
            <section>
              <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-3">
                Summary
              </h3>
              <div className="bg-[var(--bg-subtle)] rounded-[8px] p-4">
                <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                  {call.call_summary}
                </p>
              </div>
            </section>
          )}

          {/* Transcript */}
          <section>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-3">
              Transcript
            </h3>
            {transcriptTurns ? (
              <div className="flex flex-col gap-2">
                {transcriptTurns.map((turn, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 ${turn.speaker === "caller" ? "items-end" : "items-start"}`}
                  >
                    <span
                      className={`text-[11px] uppercase font-medium tracking-wide ${
                        turn.speaker === "agent"
                          ? "text-[var(--blue)]"
                          : "text-[var(--text-secondary)]"
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
              <p className="text-[13px] text-[var(--text-secondary)]">
                No transcript available for this call.
              </p>
            )}
          </section>

          {/* Recording */}
          {call.recording_url && (
            <section>
              <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-3">
                Recording
              </h3>
              <audio
                controls
                src={call.recording_url}
                className="w-full h-10 rounded-[7px]"
                style={{ accentColor: "var(--blue)" }}
              />
            </section>
          )}

          {/* Details */}
          <section>
            <h3 className="text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-3">
              Details
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                { label: "Direction", value: call.direction ? capitalize(call.direction) : "—" },
                { label: "Status", value: call.call_status ? capitalize(call.call_status) : "—" },
                { label: "Disconnect Reason", value: call.disconnection_reason ? formatDisconnectReason(call.disconnection_reason) : "—" },
                { label: "Agent", value: call.agent_name || call.agent_id || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[12px] text-[var(--text-secondary)] mb-0.5">{label}</div>
                  <div className="text-[13px] text-[var(--text-primary)]">{value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function formatDisconnectReason(reason: string): string {
  const map: Record<string, string> = {
    dial_no_answer: "No answer",
    dial_busy: "Busy",
    call_transfer: "Transferred",
    agent_hangup: "Agent ended",
    user_hangup: "Caller ended",
    voicemail_reached: "Voicemail",
  };
  return map[reason] ?? capitalize(reason);
}

export default function CallDetailDrawer({ call, onClose }: CallDetailDrawerProps) {
  if (!call) return null;
  return <DrawerContent call={call} onClose={onClose} />;
}
