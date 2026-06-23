// Enhanced tracking — UTM + click IDs + Meta cookies + session persistence
// Captures once on first visit, persists across pages within the session.

export interface TrackingPayload {
  // UTM
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  // Click IDs
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  ctwa_clid: string | null;
  // Meta cookies (from _fbc/_fbp set by Pixel)
  fbc: string | null;
  fbp: string | null;
  // Context
  landing_url: string | null;
  referrer: string | null;
  user_agent: string | null;
  // Session
  session_id: string;
}

const SS_KEY = "omni_tracking_v1";
const SID_KEY = "omni_sid_v1";

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
};

const genSid = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "sid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const getSessionId = (): string => {
  if (typeof sessionStorage === "undefined") return genSid();
  let sid = sessionStorage.getItem(SID_KEY);
  if (!sid) {
    sid = genSid();
    sessionStorage.setItem(SID_KEY, sid);
  }
  return sid;
};

export const captureTracking = (): TrackingPayload => {
  const sid = getSessionId();
  // 1. Try cached (sticky across navigations within session)
  let cached: Partial<TrackingPayload> = {};
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) cached = JSON.parse(raw);
    }
  } catch {}

  // 2. Read URL params (overwrite cache when present)
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pick = (k: string) => p.get(k) || (cached as any)[k] || null;

  // Generate fbc from fbclid if not present (Meta CAPI format: fb.1.{ts}.{fbclid})
  let fbc: string | null = readCookie("_fbc") || (cached.fbc as string | null) || null;
  const fbclid = p.get("fbclid") || (cached as any).fbclid || null;
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  const fbp = readCookie("_fbp") || (cached.fbp as string | null) || null;

  const payload: TrackingPayload = {
    source: p.get("utm_source") || (cached as any).source || null,
    medium: p.get("utm_medium") || (cached as any).medium || null,
    campaign: p.get("utm_campaign") || (cached as any).campaign || null,
    content: p.get("utm_content") || (cached as any).content || null,
    term: p.get("utm_term") || (cached as any).term || null,
    fbclid,
    gclid: pick("gclid"),
    ttclid: pick("ttclid"),
    ctwa_clid: pick("ctwa_clid"),
    fbc,
    fbp,
    landing_url: (cached as any).landing_url || (typeof window !== "undefined" ? window.location.href : null),
    referrer: (cached as any).referrer || (typeof document !== "undefined" ? document.referrer || null : null),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    session_id: sid,
  };

  // 3. Persist (sticky)
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SS_KEY, JSON.stringify(payload));
  } catch {}

  return payload;
};

export const trackingHasAttribution = (t: TrackingPayload): boolean =>
  !!(t.source || t.medium || t.campaign || t.content || t.term || t.fbclid || t.gclid || t.ttclid);
