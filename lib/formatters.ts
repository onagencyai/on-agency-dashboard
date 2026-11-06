import type { CallRow, BadgeProps, CallType } from "./types";

export function formatDuration(ms: number | null | undefined): string {
  if (!ms || ms === 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHoursFloor = Math.floor(diffHours);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
    }
    if (diffHoursFloor < 24) {
      return `${diffHoursFloor} hour${diffHoursFloor !== 1 ? "s" : ""} ago`;
    }
  }

  return formatShortDate(d);
}

function formatShortDate(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${month} ${day} at ${displayHours}:${displayMinutes} ${ampm}`;
}

export function formatFullDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${month} ${day}, ${year} at ${displayHours}:${displayMinutes} ${ampm}`;
}

/** Plain-language label and badge style for each kind of call. */
export const CALL_TYPE_INFO: Record<CallType, { label: string; variant: BadgeProps["variant"] }> = {
  lead: { label: "Lead captured", variant: "success" },
  booked: { label: "Appointment booked", variant: "success" },
  message: { label: "Message taken", variant: "info" },
  info: { label: "Team notified", variant: "info" },
  transferred: { label: "Transferred", variant: "info" },
  question: { label: "Question answered", variant: "neutral" },
  wants_person: { label: "Asked for someone", variant: "neutral" },
  support: { label: "Support request", variant: "info" },
  vendor: { label: "Sales pitch", variant: "spam" },
  wrong_number: { label: "Wrong number", variant: "neutral" },
  spam: { label: "Spam", variant: "spam" },
  no_conversation: { label: "No conversation", variant: "neutral" },
  other: { label: "Other", variant: "neutral" },
};

const VARIANT_COLORS: Record<BadgeProps["variant"], { color: string; bg: string }> = {
  success: { color: "var(--green)", bg: "var(--green-dim)" },
  failed: { color: "var(--red)", bg: "var(--red-dim)" },
  missed: { color: "var(--red)", bg: "var(--red-dim)" },
  voicemail: { color: "var(--amber)", bg: "var(--amber-dim)" },
  info: { color: "var(--blue)", bg: "var(--blue-dim)" },
  neutral: { color: "var(--text-secondary)", bg: "var(--bg-3)" },
  spam: { color: "var(--orange)", bg: "var(--orange-dim)" },
};

/** Outcome pill style for the call tables, driven by the call category. Null when the call has no category yet. */
export function getTypedOutcome(call: Pick<CallRow, "call_category">): { label: string; color: string; bg: string } | null {
  if (!call.call_category || !CALL_TYPE_INFO[call.call_category]) return null;
  const info = CALL_TYPE_INFO[call.call_category];
  return { label: info.label, ...VARIANT_COLORS[info.variant] };
}

/** Call types that are not real conversations with a customer. */
export const FILTERED_CALL_TYPES: CallType[] = ["spam", "no_conversation", "vendor", "wrong_number"];

export function getResultBadgeProps(call: Pick<CallRow, "disconnection_reason" | "call_successful" | "in_voicemail"> & { call_category?: CallType | null }): BadgeProps {
  if (call.call_category && CALL_TYPE_INFO[call.call_category]) {
    const info = CALL_TYPE_INFO[call.call_category];
    return { variant: info.variant, label: info.label };
  }
  if (call.in_voicemail) {
    return { variant: "voicemail", label: "Voicemail" };
  }
  if (call.disconnection_reason === "dial_no_answer") {
    return { variant: "missed", label: "No Answer" };
  }
  if (call.disconnection_reason === "dial_busy") {
    return { variant: "missed", label: "Busy" };
  }
  if (call.disconnection_reason === "call_transfer") {
    return { variant: "info", label: "Transferred" };
  }
  if (call.call_successful === true) {
    return { variant: "success", label: "Completed" };
  }
  if (call.call_successful === false) {
    return { variant: "failed", label: "Not Completed" };
  }
  return { variant: "neutral", label: "Ended" };
}

export function getSentimentBadgeProps(sentiment: string | null | undefined): BadgeProps {
  switch (sentiment) {
    case "Positive":
      return { variant: "success", label: "Positive" };
    case "Negative":
      return { variant: "failed", label: "Negative" };
    case "Neutral":
      return { variant: "neutral", label: "Neutral" };
    case "Spam":
      return { variant: "spam", label: "Spam" };
    default:
      return { variant: "neutral", label: "—" };
  }
}

export function getSentimentColor(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "Positive":
      return "var(--green)";
    case "Negative":
      return "var(--red)";
    case "Neutral":
      return "var(--amber)";
    case "Spam":
      return "var(--orange)";
    default:
      return "var(--text-tertiary)";
  }
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const n = cleaned.slice(1);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (!seconds || seconds === 0) return "—";
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function safePct(numerator: number, denominator: number): string {
  if (!denominator || denominator === 0) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}
