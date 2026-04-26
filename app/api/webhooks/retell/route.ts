import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as Record<string, unknown>;
    const event = body.event as string | undefined;

    if (event === "call_ended") {
      await handleCallEnded(body);
    } else if (event === "call_analyzed") {
      await handleCallAnalyzed(body);
    }
  } catch (err) {
    console.error("[retell webhook] unhandled error:", err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleCallEnded(body: Record<string, unknown>): Promise<void> {
  try {
    const call = body.call as Record<string, unknown> | undefined;
    if (!call) return;

    const metadata = call.metadata as Record<string, unknown> | undefined;
    const clientId = metadata?.client_id as string | undefined;

    const startTs = call.start_timestamp as number | undefined;
    const endTs = call.end_timestamp as number | undefined;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("calls").upsert(
      {
        call_id: call.call_id as string,
        client_id: clientId ?? null,
        agent_id: call.agent_id as string | null ?? null,
        agent_name: call.agent_name as string | null ?? null,
        call_type: call.call_type as string | null ?? null,
        call_status: call.call_status as string | null ?? null,
        direction: call.direction as string | null ?? null,
        from_number: call.from_number as string | null ?? null,
        to_number: call.to_number as string | null ?? null,
        duration_ms: call.duration_ms as number | null ?? null,
        transcript: call.transcript as string | null ?? null,
        recording_url: call.recording_url as string | null ?? null,
        disconnection_reason: call.disconnection_reason as string | null ?? null,
        started_at: startTs ? new Date(startTs).toISOString() : null,
        ended_at: endTs ? new Date(endTs).toISOString() : null,
        raw_payload: body,
      },
      { onConflict: "call_id" }
    );

    if (error) {
      console.error("[retell webhook] upsert error (call_ended):", error.message);
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
        call_summary: analysis.call_summary as string | null ?? null,
        user_sentiment: analysis.user_sentiment as string | null ?? null,
        call_successful: analysis.call_successful as boolean | null ?? null,
        in_voicemail: analysis.in_voicemail as boolean | null ?? null,
        custom_analysis_data: analysis.custom_analysis_data as Record<string, unknown> | null ?? null,
      })
      .eq("call_id", callId);

    if (error) {
      console.error("[retell webhook] update error (call_analyzed):", error.message);
    }
  } catch (err) {
    console.error("[retell webhook] handleCallAnalyzed error:", err);
  }
}
