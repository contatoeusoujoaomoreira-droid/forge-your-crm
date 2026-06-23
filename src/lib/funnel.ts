// Funnel instrumentation for forms & quizzes
import { supabase } from "@/integrations/supabase/client";
import type { TrackingPayload } from "./tracking";

export type FunnelEventType = "view" | "start" | "step" | "complete" | "abandon";

interface LogArgs {
  user_id: string;
  source_type: "form" | "quiz";
  source_id: string;
  event_type: FunnelEventType;
  step_index?: number;
  step_label?: string;
  tracking: TrackingPayload;
  meta?: Record<string, any>;
}

export const logFunnelEvent = async (args: LogArgs) => {
  try {
    await supabase.from("funnel_events").insert({
      user_id: args.user_id,
      source_type: args.source_type,
      source_id: args.source_id,
      session_id: args.tracking.session_id,
      event_type: args.event_type,
      step_index: args.step_index ?? null,
      step_label: args.step_label || null,
      utm_source: args.tracking.source,
      utm_medium: args.tracking.medium,
      utm_campaign: args.tracking.campaign,
      utm_content: args.tracking.content,
      utm_term: args.tracking.term,
      fbclid: args.tracking.fbclid,
      gclid: args.tracking.gclid,
      ttclid: args.tracking.ttclid,
      referrer: args.tracking.referrer,
      landing_url: args.tracking.landing_url,
      meta: args.meta || {},
    } as any);
  } catch (_) { /* silent */ }
};
