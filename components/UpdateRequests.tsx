"use client";

import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import { cardStyle } from "@/components/PageSection";

const CATEGORIES = [
  "Business hours or holidays",
  "Services or pricing",
  "Answers and FAQs",
  "Transfer numbers",
  "Greeting, name or voice",
  "Promotions",
  "Something else",
];

type Req = { id: string; category: string; message: string; status: "received" | "in_progress" | "done"; created_at: string };

const STATUS: Record<Req["status"], { label: string; color: string; bg: string }> = {
  received: { label: "Received", color: "var(--blue)", bg: "var(--blue-dim)" },
  in_progress: { label: "In progress", color: "var(--amber)", bg: "var(--amber-dim)" },
  done: { label: "Done", color: "var(--green)", bg: "var(--green-dim)" },
};

export default function UpdateRequests() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [requests, setRequests] = useState<Req[] | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/update-requests", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { requests: Req[] };
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    }
  }
  useEffect(() => { void load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/update-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, message }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string; request?: Req };
      if (!res.ok || !data.request) throw new Error(data.error || "Something went wrong. Please try again.");
      setRequests((r) => [data.request as Req, ...(r ?? [])]);
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const input: React.CSSProperties = { width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 14, color: "var(--text-primary)", outline: "none", fontFamily: "inherit" };

  return (
    <>
      <form onSubmit={submit} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>What do you want to change?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{ height: 32, padding: "0 12px", borderRadius: 16, fontSize: 13, fontWeight: 500, cursor: "pointer", border: `1px solid ${active ? "var(--btn-blue)" : "var(--border)"}`, background: active ? "var(--nav-active-bg)" : "var(--bg)", color: active ? "var(--nav-active-text)" : "var(--text-secondary)" }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label htmlFor="update-message" style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", marginBottom: 8 }}>Tell us exactly what to change</label>
          <textarea
            id="update-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="For example: we are closed on Friday, November 28. Please tell callers we reopen Monday at 8 AM."
            style={{ ...input, padding: "10px 12px", lineHeight: 1.5, resize: "vertical", minHeight: 110 }}
          />
        </div>
        {error && <div style={{ fontSize: 13, color: "var(--red)" }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={sending || message.trim().length < 5}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 16px", borderRadius: 6, border: "none", background: "var(--btn-blue)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: sending ? "default" : "pointer", opacity: sending || message.trim().length < 5 ? 0.55 : 1 }}
          >
            <Send size={14} /> {sending ? "Sending..." : "Send request"}
          </button>
          {sent ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--green)" }}><Check size={14} /> Request sent. We usually reply within 24 hours.</span>
          ) : (
            <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>We usually reply within 24 hours.</span>
          )}
        </div>
      </form>

      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: 4 }}>Your requests</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>Everything you have sent us and where it stands.</div>
        <div style={cardStyle}>
          {requests === null ? (
            <div className="skeleton" style={{ height: 64, margin: 12, borderRadius: 6 }} />
          ) : requests.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>No requests yet. Send your first one above.</div>
          ) : (
            requests.map((r, i) => {
              const st = STATUS[r.status] ?? STATUS.received;
              return (
                <div key={r.id} style={{ padding: "16px 20px", borderBottom: i === requests.length - 1 ? "none" : "1px solid var(--border)", display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>{r.category}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.message}</div>
                    <div className="num" style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                      {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", color: st.color, background: st.bg, flexShrink: 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                    {st.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
