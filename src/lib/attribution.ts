// Shared UTM / ad-click attribution helpers for public pages
import { supabase } from "@/integrations/supabase/client";

export interface UtmParams {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  fbclid: string | null;
  gclid: string | null;
  ctwa_clid: string | null;
}

export const readUtmFromUrl = (): UtmParams => {
  if (typeof window === "undefined") {
    return { source: null, medium: null, campaign: null, content: null, term: null, fbclid: null, gclid: null, ctwa_clid: null };
  }
  const p = new URLSearchParams(window.location.search);
  const pick = (k: string) => p.get(k) || null;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    content: pick("utm_content"),
    term: pick("utm_term"),
    fbclid: pick("fbclid"),
    gclid: pick("gclid"),
    ctwa_clid: pick("ctwa_clid"),
  };
};

export const hasAnyUtm = (u: UtmParams) =>
  !!(u.source || u.medium || u.campaign || u.content || u.term || u.fbclid || u.gclid || u.ctwa_clid);

export interface InsertTouchpointArgs {
  user_id: string;
  lead_id?: string | null;
  channel: "form" | "quiz" | "checkout" | "schedule" | "page" | "whatsapp";
  conversion_value?: number;
  meta?: Record<string, any>;
}

export const insertTouchpoint = async (utm: UtmParams, args: InsertTouchpointArgs) => {
  try {
    await supabase.from("attribution_touchpoints").insert({
      user_id: args.user_id,
      lead_id: args.lead_id || null,
      source: utm.source,
      medium: utm.medium,
      campaign: utm.campaign,
      content: utm.content,
      term: utm.term,
      fbclid: utm.fbclid,
      gclid: utm.gclid,
      ctwa_clid: utm.ctwa_clid,
      landing_url: typeof window !== "undefined" ? window.location.href : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      channel: args.channel,
      conversion_value: args.conversion_value || 0,
      meta: args.meta || {},
    } as any);
  } catch (_) { /* silent */ }
};
