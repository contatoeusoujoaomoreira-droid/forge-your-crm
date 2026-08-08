// useLeadTracker — captura e persiste parâmetros de tráfego (UTMs + click IDs)
// e devolve os campos prontos para anexar ao payload de criação do Lead.
import { useEffect, useRef } from "react";
import { captureTracking, type TrackingPayload } from "@/lib/tracking";

const LS_KEY = "omni_lead_tracker_v1";

export interface LeadTrackingFields {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_id: string | null;
  referring_url: string | null;
  fbc: string | null;
  fbp: string | null;
  ttclid: string | null;
  landing_url: string | null;
  referrer: string | null;
  user_agent: string | null;
}

export const toLeadFields = (t: TrackingPayload): LeadTrackingFields => ({
  utm_source: t.source,
  utm_medium: t.medium,
  utm_campaign: t.campaign,
  utm_content: t.content,
  utm_term: t.term,
  click_id: t.fbclid || t.gclid || t.ttclid || t.ctwa_clid || null,
  referring_url: t.referrer || null,
  fbc: t.fbc,
  fbp: t.fbp,
  ttclid: t.ttclid,
  landing_url: t.landing_url,
  referrer: t.referrer,
  user_agent: t.user_agent,
});

const persist = (fields: LeadTrackingFields) => {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(LS_KEY);
    const prev: Partial<LeadTrackingFields> = raw ? JSON.parse(raw) : {};
    // First-touch wins: só grava valores novos quando ainda não existirem
    const merged: LeadTrackingFields = { ...fields };
    (Object.keys(merged) as (keyof LeadTrackingFields)[]).forEach((k) => {
      if (!merged[k] && prev[k]) (merged as any)[k] = prev[k];
    });
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  } catch { /* ignore */ }
};

export const readStoredLeadFields = (): Partial<LeadTrackingFields> => {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/**
 * Captura o tráfego na montagem da página pública (form/quiz/checkout)
 * e expõe helpers para anexar os dados ao lead.
 */
export const useLeadTracker = () => {
  const ref = useRef<TrackingPayload | null>(null);

  useEffect(() => {
    const t = captureTracking();
    ref.current = t;
    persist(toLeadFields(t));
  }, []);

  const getTracking = (): TrackingPayload => {
    if (!ref.current) {
      ref.current = captureTracking();
      persist(toLeadFields(ref.current));
    }
    return ref.current;
  };

  const getLeadFields = (): LeadTrackingFields => {
    const live = toLeadFields(getTracking());
    const stored = readStoredLeadFields();
    const merged = { ...live };
    (Object.keys(merged) as (keyof LeadTrackingFields)[]).forEach((k) => {
      if (!merged[k] && stored[k]) (merged as any)[k] = stored[k];
    });
    return merged;
  };

  return { getTracking, getLeadFields };
};

export default useLeadTracker;
