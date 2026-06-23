// Client-side Meta Pixel injection + Conversions API trigger
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { fbq?: any; _fbq?: any; }
}

const injectedPixels = new Set<string>();

export const injectMetaPixel = (pixelId: string) => {
  if (typeof window === "undefined" || !pixelId) return;
  if (injectedPixels.has(pixelId)) return;
  injectedPixels.add(pixelId);

  // Standard Meta Pixel snippet
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return; const n: any = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    const t = b.createElement(e); t.async = !0; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
};

export const trackPixelEvent = (eventName: string, params?: Record<string, any>, eventId?: string) => {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) window.fbq("track", eventName, params || {}, { eventID: eventId });
  else window.fbq("track", eventName, params || {});
};

interface CapiArgs {
  user_id: string;
  source_type: "form" | "quiz" | "manual_test";
  source_id?: string;
  event_name: string;
  event_id: string;
  lead_id?: string | null;
  value?: number;
  currency?: string;
  user_data?: {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    fbc?: string | null;
    fbp?: string | null;
    client_ip?: string | null;
    client_user_agent?: string | null;
  };
  custom_data?: Record<string, any>;
  event_source_url?: string;
}

export const sendConversionsApi = async (args: CapiArgs) => {
  try {
    const { data, error } = await supabase.functions.invoke("meta-capi", { body: args });
    if (error) return { ok: false, error: error.message };
    return data;
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
};

export const newEventId = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "evt_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
};
