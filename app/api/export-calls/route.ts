import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { CallRow } from "@/lib/types";
import { resolveClientId } from "@/lib/resolve-client-id";

function getOutcome(call: CallRow): string {
  if (call.in_voicemail) return "Voicemail";
  if (call.disconnection_reason === "call_transfer") return "Transferred";
  if (call.call_successful === true) return "Resolved";
  if (call.call_successful === false) return "Dropped";
  if (call.disconnection_reason === "dial_no_answer") return "No Answer";
  return "Unknown";
}

function getIntent(call: CallRow): string {
  if (!call.custom_analysis_data) return "";
  const analysis = call.custom_analysis_data as Record<string, unknown>;
  const raw = analysis.call_reason ?? analysis.reason ?? analysis.intent;
  return typeof raw === "string" ? raw : "";
}

function formatTranscriptForExport(transcript: string | null): string {
  if (!transcript) return "";

  // Try to parse as JSON array (transcript_object format)
  try {
    const parsed = JSON.parse(transcript);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((turn: { role?: string; content?: string }) => {
          const speaker = turn.role === "agent" || turn.role === "assistant" ? "Agent" : "Caller";
          return `${speaker}: ${turn.content || ""}`;
        })
        .join("\n");
    }
  } catch {
    // Not JSON, return as-is
  }

  return transcript;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const clientId = await resolveClientId(user);
  if (!clientId) return new NextResponse("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();
  const direction = searchParams.get("direction");
  // Strip characters that could escape the Content-Disposition header value.
  const rawLabel = searchParams.get("label") ?? "export";
  const label = rawLabel.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 50) || "export";

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("calls")
    .select("*")
    .eq("client_id", clientId)
    .gte("started_at", from)
    .lte("started_at", to)
    .gte("started_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order("started_at", { ascending: false });

  if (direction) query = query.eq("direction", direction);

  const { data, error } = await query;
  if (error) return new NextResponse("Internal server error", { status: 500 });

  const calls = (data ?? []) as CallRow[];

  const header = "Date/Time,From Number,To Number,Duration (seconds),Full Transcript,Disconnection Reason,Sentiment,Intent,Outcome";
  const rows = calls.map((call) => {
    const cols = [
      call.started_at ? new Date(call.started_at).toLocaleString() : "",
      call.from_number ?? "",
      call.to_number ?? "",
      call.duration_ms ? Math.floor(call.duration_ms / 1000) : "",
      formatTranscriptForExport(call.transcript),
      call.disconnection_reason ?? "",
      call.user_sentiment ?? "",
      getIntent(call),
      getOutcome(call),
    ];
    return cols.map(escapeCsv).join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="calls-${label}.csv"`,
    },
  });
}
