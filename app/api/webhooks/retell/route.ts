import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function toIsoFromEpoch(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  // Retell payloads can vary between epoch seconds and epoch milliseconds.
  const ms = value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.RETELL_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — reject all requests to prevent unauthenticated writes.
    console.error("[retell webhook] RETELL_WEBHOOK_SECRET is not set; rejecting request");
    return false;
  }
  // Accept the secret via the Authorization header (Bearer <secret>) or
  // as a ?secret= query param (for Retell dashboard URL configuration).
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const urlSecret = new URL(req.url).searchParams.get("secret");
  return urlSecret === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const event = body.event as string | undefined;

    let ok = true;
    if (event === "call_ended") {
      ok = await handleCallEnded(req, body);
    } else if (event === "call_analyzed") {
      ok = await handleCallAnalyzed(body);
    } else if (body.call_id && body.client_id) {
      // Handle n8n-formatted AI-analyzed payload
      ok = await handleN8nAnalyzedCall(req, body);
    }
    // A failed database write must not look like success: the sender (Retell or n8n)
    // retries and the n8n error alert fires, instead of the call silently disappearing.
    if (!ok) return NextResponse.json({ received: false, error: "write failed" }, { status: 500 });
  } catch (err) {
    console.error("[retell webhook] unhandled error:", err);
    return NextResponse.json({ received: false, error: "unhandled error" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCallEnded(req: NextRequest, body: Record<string, unknown>): Promise<boolean> {
  try {
    const call = body.call as Record<string, unknown> | undefined;
    if (!call) return true;

    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");

    if (!clientId) {
      console.error("[retell webhook] missing client_id in query params");
      return false;
    }

    const startTs = call.start_timestamp;
    const endTs = call.end_timestamp;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("calls").upsert(
      {
        call_id: call.call_id as string,
        client_id: clientId,
        agent_id: (call.agent_id as string) ?? null,
        agent_name: (call.agent_name as string) ?? null,
        call_type: (call.call_type as string) ?? null,
        call_status: (call.call_status as string) ?? null,
        direction: (call.direction as string) ?? null,
        from_number: (call.from_number as string) ?? null,
        to_number: (call.to_number as string) ?? null,
        duration_ms: (call.duration_ms as number) ?? null,
        transcript: (call.transcript as string) ?? null,
        recording_url: (call.recording_url as string) ?? null,
        disconnection_reason: (call.disconnection_reason as string) ?? null,
        started_at: toIsoFromEpoch(startTs),
        ended_at: toIsoFromEpoch(endTs),
        raw_payload: body,
      },
      { onConflict: "call_id" }
    );

    if (error) {
      console.error("[retell webhook] upsert error (call_ended):", error.message);
    } else {
      console.log("[retell webhook] call_ended success for call_id:", call.call_id);
    }
    return !error;
  } catch (err) {
    console.error("[retell webhook] handleCallEnded error:", err);
    return false;
  }
}

async function handleCallAnalyzed(body: Record<string, unknown>): Promise<boolean> {
  try {
    const call = body.call as Record<string, unknown> | undefined;
    if (!call) return true;

    const callId = call.call_id as string | undefined;
    if (!callId) return true;

    const analysis = call.call_analysis as Record<string, unknown> | undefined;
    if (!analysis) return true;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("calls")
      .update({
        call_summary: (analysis.call_summary as string) ?? null,
        user_sentiment: (analysis.user_sentiment as string) ?? null,
        call_successful: (analysis.call_successful as boolean) ?? null,
        in_voicemail: (analysis.in_voicemail as boolean) ?? null,
        custom_analysis_data: (analysis.custom_analysis_data as Record<string, unknown>) ?? null,
      })
      .eq("call_id", callId);

    if (error) {
      console.error("[retell webhook] update error (call_analyzed):", error.message);
    } else {
      console.log("[retell webhook] call_analyzed success for call_id:", callId);
    }
    return !error;
  } catch (err) {
    console.error("[retell webhook] handleCallAnalyzed error:", err);
    return false;
  }
}

async function handleN8nAnalyzedCall(req: NextRequest, body: Record<string, unknown>): Promise<boolean> {
  try {
    const callId = body.call_id as string | undefined;
    const clientId = (new URL(req.url)).searchParams.get("client_id") ?? (body.client_id as string) ?? null;

    if (!callId || !clientId) {
      console.error("[retell webhook] missing call_id or client_id in n8n payload");
      return false;
    }

    const startTs = body.started_at;
    const endTs = body.ended_at;

    // Extract transcript and custom_analysis_data
    const customAnalysisData = body.custom_analysis_data as Record<string, unknown> | undefined;

    // Extract transcript from transcript_object inside custom_analysis_data
    let transcript: string | null = null;
    if (customAnalysisData?.transcript_object) {
      const transcriptObj = customAnalysisData.transcript_object;
      if (Array.isArray(transcriptObj)) {
        transcript = JSON.stringify(transcriptObj);
      } else if (typeof transcriptObj === "string") {
        transcript = transcriptObj;
      }
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("calls").upsert(
      {
        call_id: callId,
        client_id: clientId,
        agent_id: (body.agent_id as string) ?? null,
        agent_name: (body.agent_name as string) ?? null,
        call_type: (body.call_type as string) ?? null,
        call_status: (body.call_status as string) ?? null,
        direction: (body.direction as string) ?? null,
        from_number: (body.phone_number as string) ?? null,
        to_number: (body.to_number as string) ?? null,
        duration_ms: (body.duration_ms as number) ?? null,
        transcript,
        recording_url: (body.recording_url as string) ?? null,
        disconnection_reason: (body.disconnection_reason as string) ?? null,
        started_at: toIsoFromEpoch(startTs),
        ended_at: toIsoFromEpoch(endTs),
        call_summary: (body.call_summary as string) ?? null,
        user_sentiment: (body.user_sentiment as string) ?? null,
        call_successful: (body.call_successful as boolean) ?? null,
        in_voicemail: (body.in_voicemail as boolean) ?? null,
        custom_analysis_data: customAnalysisData ?? null,
        call_category: (body.call_category as string) ?? null,
        tools_used: Array.isArray(body.tools_used) ? (body.tools_used as string[]) : [],
        caller_words: typeof body.caller_words === "number" ? body.caller_words : null,
        raw_payload: body,
      },
      { onConflict: "call_id" }
    );

    if (error) {
      console.error("[retell webhook] upsert error (n8n analyzed):", error.message);
    } else {
      console.log("[retell webhook] n8n analyzed call success for call_id:", callId);
    }
    if (error) return false;

    // Leads, messages and bookings captured by the agent's tools on this call.
    if (Array.isArray(body.leads) && body.leads.length > 0) {
      const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
      const rows = (body.leads as Record<string, unknown>[])
        .filter((l) => ["lead", "booked", "message", "info"].includes(String(l.kind)))
        .map((l) => ({
          client_id: clientId,
          call_id: callId,
          kind: String(l.kind),
          name: str(l.name),
          phone: str(l.phone),
          caller_id: str(l.caller_id),
          email: str(l.email),
          company: str(l.company),
          summary: str(l.summary),
          details: str(l.details),
          location: str(l.location),
          extra: (l.extra && typeof l.extra === "object" ? l.extra : {}) as Record<string, unknown>,
          ...(toIsoFromEpoch(startTs) ? { created_at: toIsoFromEpoch(startTs) as string } : {}),
        }));
      if (rows.length > 0) {
        // status is deliberately not sent, so a re-sent call never resets "contacted" back to "new".
        const { error: leadErr } = await supabase.from("leads").upsert(rows, { onConflict: "call_id,kind" });
        if (leadErr) {
          console.error("[retell webhook] upsert error (leads):", leadErr.message);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.error("[retell webhook] handleN8nAnalyzedCall error:", err);
    return false;
  }
}
