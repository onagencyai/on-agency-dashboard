export interface CallRow {
  id: string;
  client_id: string;
  call_id: string;
  agent_id: string | null;
  agent_name: string | null;
  call_type: string | null;
  call_status: string | null;
  direction: "inbound" | "outbound" | string | null;
  from_number: string | null;
  to_number: string | null;
  duration_ms: number | null;
  transcript: string | null;
  recording_url: string | null;
  disconnection_reason: string | null;
  call_summary: string | null;
  user_sentiment: "Positive" | "Negative" | "Neutral" | "Spam" | "Unknown" | null;
  call_successful: boolean | null;
  in_voicemail: boolean | null;
  custom_analysis_data: Record<string, unknown> | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
  raw_payload: Record<string, unknown> | null;
}

export interface ClientCallStats {
  client_id: string;
  direction: "inbound" | "outbound";
  total_calls: number;
  calls_this_month: number;
  calls_this_week: number;
  avg_duration_seconds: number;
  successful_calls: number;
  voicemail_count: number;
  positive_calls: number;
  negative_calls: number;
  neutral_calls: number;
  no_answer_count: number;
  avg_sentiment_score: number | null;
}

export interface UserPublicMetadata {
  client_id: string;
  services: ServiceType[];
  business_name: string;
}

export type ServiceType = "receptionist" | "outbound";

export type TimeRange = "today" | "7d" | "30d" | "60d" | "90d";

export interface BadgeProps {
  variant: "success" | "failed" | "missed" | "voicemail" | "info" | "neutral" | "spam";
  label: string;
}

export interface CallReasonData {
  reason: string;
  count: number;
  percentage: number;
}

export interface IntentData {
  label: string;
  count: number;
  percentage: number;
}

export interface ReceptionistStats {
  current: {
    total_calls: number;
    avg_duration_seconds: number;
    total_duration_ms: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    spam_count: number;
  };
  previous: {
    total_calls: number;
    avg_duration_seconds: number;
    total_duration_ms: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    spam_count: number;
  };
}

export interface OutboundStats {
  current: {
    total_calls: number;
    avg_duration_seconds: number;
    contacted_count: number;
    converted_count: number;
  };
  previous: {
    total_calls: number;
    avg_duration_seconds: number;
    contacted_count: number;
    converted_count: number;
  };
}

export interface CallVolumeData {
  dates: string[];
  inbound: number[];
  outbound: number[];
}
