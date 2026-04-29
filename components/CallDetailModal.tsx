"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CallRow } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";

interface TranscriptTurn {
  speaker: "agent" | "caller";
  text: string;
}

function parseTranscript(transcript: string): TranscriptTurn[] {
  // Try to parse as JSON array first (transcript_object format)
  try {
    const parsed = JSON.parse(transcript);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((turn: { role?: string; content?: string }) => ({
        speaker: turn.role === "agent" || turn.role === "assistant" ? "agent" : "caller",
        text: turn.content || "",
      }));
    }
  } catch {
    // Not JSON, fall through to text parsing
  }

  // Fall back to newline-separated text format
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

function getOutcomeLabel(call: CallRow): { label: string; color: string; bg: string } {
  if (call.in_voicemail) return { label: "Voicemail", color: "var(--text-secondary)", bg: "var(--bg-3)" };
  if (call.disconnection_reason === "call_transfer") return { label: "Transferred", color: "var(--blue)", bg: "var(--blue-dim)" };
  if (call.call_successful === true) return { label: "Resolved", color: "var(--green)", bg: "var(--green-dim)" };
  if (call.call_successful === false) return { label: "Dropped", color: "var(--red)", bg: "var(--red-dim)" };
  if (call.disconnection_reason === "dial_no_answer") return { label: "No Answer", color: "var(--amber)", bg: "var(--amber-dim)" };
  return { label: "Ended", color: "var(--text-secondary)", bg: "var(--bg-3)" };
}

function getIntent(call: CallRow): string {
  if (!call.custom_analysis_data) return "";
  const a = call.custom_analysis_data as Record<string, unknown>;
  const raw = a.call_reason ?? a.reason ?? a.intent;
  return typeof raw === "string" ? raw : "";
}

function Tag({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        background: "var(--bg-3)",
        border: "1px solid var(--border)",
        color: "var(--text-tertiary)",
        padding: "2px 6px",
        borderRadius: 4,
        fontFamily: "var(--font-geist-mono, monospace)",
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}:</span> {value}
    </span>
  );
}

function ModalContent({ call, onClose }: { call: CallRow; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const outcome = getOutcomeLabel(call);
  const transcriptTurns = call.transcript ? parseTranscript(call.transcript) : null;
  const intent = getIntent(call);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative",
          width: 480,
          maxWidth: "100vw",
          height: "100%",
          background: "var(--bg-1)",
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          outline: "none",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>
                {call.from_number ?? "Unknown"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {call.started_at ? new Date(call.started_at).toLocaleString() : "—"}
                {call.duration_ms ? ` · ${formatDuration(call.duration_ms)}` : ""}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, border: "none", background: "transparent",
                color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-3)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <X size={14} />
            </button>
          </div>
          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span
              style={{
                fontSize: 10, background: outcome.bg, color: outcome.color,
                padding: "2px 8px", borderRadius: 20, fontWeight: 500,
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              {outcome.label}
            </span>
            {call.user_sentiment && (
              <span
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  color: call.user_sentiment === "Positive" ? "var(--green)" : call.user_sentiment === "Negative" ? "var(--red)" : "var(--amber)",
                  background: call.user_sentiment === "Positive" ? "var(--green-dim)" : call.user_sentiment === "Negative" ? "var(--red-dim)" : "var(--amber-dim)",
                }}
              >
                {call.user_sentiment}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Metadata tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
            {intent && <Tag label="Intent" value={intent} />}
            {call.duration_ms && <Tag label="Duration" value={formatDuration(call.duration_ms)} />}
            {call.disconnection_reason && <Tag label="Disconnect" value={call.disconnection_reason.replace(/_/g, " ")} />}
            {call.direction && <Tag label="Direction" value={call.direction} />}
          </div>

          {/* Transcript */}
          <div>
            <div
              style={{
                fontSize: 10, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase",
                color: "var(--text-tertiary)", marginBottom: 12,
              }}
            >
              Transcript
            </div>
            {transcriptTurns ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {transcriptTurns.map((turn, i) => (
                  <div key={i}>
                    <div
                      style={{
                        fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em",
                        color: turn.speaker === "agent" ? "var(--blue)" : "var(--text-tertiary)",
                        marginBottom: 4,
                      }}
                    >
                      {turn.speaker === "agent" ? "Agent" : "Caller"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                      {turn.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>No transcript available.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CallDetailModal({ call, onClose }: { call: CallRow | null; onClose: () => void }) {
  if (!call) return null;
  return <ModalContent call={call} onClose={onClose} />;
}
