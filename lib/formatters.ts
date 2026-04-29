import type { CallRow, BadgeProps } from "./types";

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

export function getResultBadgeProps(call: Pick<CallRow, "disconnection_reason" | "call_successful" | "in_voicemail">): BadgeProps {
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
      return { variant: "neutral", label: "Spam" };
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
