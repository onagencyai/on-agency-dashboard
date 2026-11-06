"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, CheckCircle2, Copy, Download, MessageSquare, PhoneOff, Smile, X } from "lucide-react";
import type { CallRow } from "@/lib/types";
import { formatPhoneNumber, getInboundOutcome } from "@/lib/formatters";

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
  const typed = getInboundOutcome(call);
  if (typed) return typed;
  if (call.in_voicemail) return { label: "Voicemail", color: "var(--text-secondary)", bg: "var(--bg-3)" };
  if (call.disconnection_reason === "call_transfer") return { label: "Transferred", color: "var(--blue)", bg: "var(--blue-dim)" };
  if (call.call_successful === true) return { label: "Resolved", color: "var(--green)", bg: "var(--green-dim)" };
  if (call.call_successful === false) return { label: "Not resolved", color: "var(--red)", bg: "var(--red-dim)" };
  if (call.disconnection_reason === "dial_no_answer") return { label: "No Answer", color: "var(--amber)", bg: "var(--amber-dim)" };
  return { label: "Ended", color: "var(--text-secondary)", bg: "var(--bg-3)" };
}

function getIntent(call: CallRow): string {
  if (!call.custom_analysis_data) return "";
  const a = call.custom_analysis_data as Record<string, unknown>;
  const raw = a.call_reason ?? a.reason ?? a.intent;
  return typeof raw === "string" ? raw : "";
}

const HANGUP: Record<string, string> = {
  user_hangup: "Caller hung up",
  agent_hangup: "Agent ended the call",
  call_transfer: "Transferred to a person",
  dial_no_answer: "No answer",
  dial_busy: "Line was busy",
  voicemail_reached: "Voicemail",
  inactivity: "No response, call timed out",
  max_duration_reached: "Reached the time limit",
};

function humanDuration(ms: number | null): string {
  if (!ms) return "—";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function clock(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

function MetaLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 14, lineHeight: "22px", flexWrap: "wrap" }}>
      <span style={{ color: "var(--text-secondary)", minWidth: 84 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

function AnalysisRow({ icon, label, value, dot }: { icon: React.ReactNode; label: string; value: string; dot?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 0", fontSize: 14 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-primary)" }}>
        <span style={{ color: "var(--text-secondary)", display: "flex" }}>{icon}</span>
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", textAlign: "right" }}>
        {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{children}</div>
      {action}
    </div>
  );
}

function ModalContent({ call, onClose }: { call: CallRow; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const outcome = getOutcomeLabel(call);
  const transcriptTurns = call.transcript ? parseTranscript(call.transcript) : null;
  const intent = getIntent(call);
  const inbound = call.direction !== "outbound";
  const start = call.started_at ? new Date(call.started_at) : null;
  const end = call.ended_at ? call.ended_at : start && call.duration_ms ? new Date(start.getTime() + call.duration_ms).toISOString() : null;
  const sentimentDot = call.user_sentiment === "Positive" ? "var(--green)" : call.user_sentiment === "Negative" ? "var(--red)" : call.user_sentiment === "Neutral" ? "var(--amber-fill)" : undefined;

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

  function copyId() {
    void navigator.clipboard?.writeText(call.call_id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{
          position: "relative", width: 760, maxWidth: "100vw", height: "100%", background: "var(--bg-1)",
          borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", outline: "none",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px 0", flexShrink: 0 }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 32px" }}>
          {/* Title and facts, as plain text */}
          <div style={{ fontSize: 22, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ink)", marginBottom: 14 }}>
            {start ? start.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Call"}
            <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>
              {start ? ` · ${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""} · {call.call_type === "web_call" ? "Web call" : "Phone call"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <MetaLine label={inbound ? "Caller" : "Contact"}>
              <span className="num">{formatPhoneNumber(inbound ? call.from_number : call.to_number)}</span>
            </MetaLine>
            <MetaLine label="Duration">
              <span className="num">
                {humanDuration(call.duration_ms)}
                {start && end ? ` (${clock(call.started_at)} – ${clock(end)})` : ""}
              </span>
            </MetaLine>
          </div>

          {/* Recording */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 6px" }}>
            {call.recording_url ? (
              <>
                <audio controls preload="metadata" src={call.recording_url} style={{ flex: 1, maxWidth: 460, height: 44 }} />
                <a
                  href={call.recording_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download recording"
                  title="Download recording"
                  style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", background: "var(--bg-1)" }}
                >
                  <Download size={17} />
                </a>
              </>
            ) : (
              <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>No recording for this call.</span>
            )}
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {/* Analysis */}
          <SectionTitle>Call analysis</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <AnalysisRow icon={<CheckCircle2 size={16} />} label="Outcome" value={outcome.label} dot={outcome.color} />
            <AnalysisRow icon={<Smile size={16} />} label="Caller mood" value={call.user_sentiment ?? "Not rated"} dot={sentimentDot} />
            {intent && <AnalysisRow icon={<MessageSquare size={16} />} label="Intent" value={intent} />}
            <AnalysisRow icon={<PhoneOff size={16} />} label="How it ended" value={call.disconnection_reason ? (HANGUP[call.disconnection_reason] ?? call.disconnection_reason.replace(/_/g, " ")) : "—"} />
          </div>

          {call.call_summary && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />
              <SectionTitle>Summary</SectionTitle>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>{call.call_summary}</p>
            </>
          )}

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {/* Transcript */}
          <SectionTitle>Transcript</SectionTitle>
          {transcriptTurns ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {transcriptTurns.map((turn, i) => {
                const agent = turn.speaker === "agent";
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: agent ? "flex-start" : "flex-end" }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", margin: agent ? "0 0 4px 6px" : "0 6px 4px 0" }}>
                      {agent ? (call.agent_name || "Agent") : "Caller"}
                    </div>
                    <div
                      style={{
                        maxWidth: "82%", fontSize: 14, lineHeight: 1.5, padding: "9px 14px",
                        borderRadius: agent ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                        background: agent ? "var(--bg-3)" : "var(--blue)",
                        color: agent ? "var(--text-primary)" : "var(--on-blue)",
                      }}
                    >
                      {turn.text}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>No transcript available.</p>
          )}

          {/* Call ID, kept quiet for tracking a call down later */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 36, fontSize: 12, color: "var(--text-secondary)", opacity: 0.8 }}>
            <span>Call ID</span>
            <span className="num">{call.call_id}</span>
            <button onClick={copyId} aria-label="Copy call ID" style={{ border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", padding: 2, display: "flex" }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
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
