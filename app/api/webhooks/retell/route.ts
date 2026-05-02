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

    if (event === "call_ended") {
      await handleCallEnded(req, body);
    } else if (event === "call_analyzed") {
      await handleCallAnalyzed(body);
    } else if (body.call_id && body.client_id) {
      // Handle n8n-formatted AI-analyzed payload
      await handleN8nAnalyzedCall(req, body);
    }
  } catch (err) {
    console.error("[retell webhook] unhandled error:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCallEnded(req: NextRequest, body: Record<string, unknown>): Promise<void> {
  try {
    const call = body.call as Record<string, unknown> | undefined;
    if (!call) return;

    const url = new URL(req.url);
    const clientId = url.searchParams.get("client_id");

    if (!clientId) {
      console.error("[retell webhook] missing client_id in query params");
      return;
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
  } catch (err) {
    console.error("[retell webhook] handleCallEnded error:", err);
  }
}

async function handleCallAnalyzed(body: Record<string, unknown>): Promise<void> {
  try {
    const call = body.call as Record<string, unknown> | undefined;
    if (!call) return;

    const callId = call.call_id as string | undefined;
    if (!callId) return;

    const analysis = call.call_analysis as Record<string, unknown> | undefined;
    if (!analysis) return;

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
  } catch (err) {
    console.error("[retell webhook] handleCallAnalyzed error:", err);
  }
}

async function handleN8nAnalyzedCall(req: NextRequest, body: Record<string, unknown>): Promise<void> {
  try {
    const callId = body.call_id as string | undefined;
    const clientId = (new URL(req.url)).searchParams.get("client_id");

    if (!callId || !clientId) {
      console.error("[retell webhook] missing call_id or client_id in n8n payload");
      return;
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
        raw_payload: body,
      },
      { onConflict: "call_id" }
    );

    if (error) {
      console.error("[retell webhook] upsert error (n8n analyzed):", error.message);
    } else {
      console.log("[retell webhook] n8n analyzed call success for call_id:", callId);
    }
  } catch (err) {
    console.error("[retell webhook] handleN8nAnalyzedCall error:", err);
  }
}
