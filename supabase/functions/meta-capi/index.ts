// Meta Conversions API dispatcher
// Sends a server-side event to Meta and logs the result in meta_event_log.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sha256 = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

interface Payload {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let body: Payload;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

  if (!body?.user_id || !body?.event_name || !body?.event_id) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Pull pixel + access token from meta_ads_configs
  const { data: cfg } = await supabase
    .from("meta_ads_configs")
    .select("pixel_id, capi_access_token, test_event_code, capi_enabled")
    .eq("user_id", body.user_id)
    .maybeSingle();

  if (!cfg?.pixel_id || !cfg?.capi_access_token || cfg?.capi_enabled === false) {
    await supabase.from("meta_event_log").insert({
      user_id: body.user_id, source_type: body.source_type, source_id: body.source_id || null,
      event_name: body.event_name, event_id: body.event_id, lead_id: body.lead_id || null,
      status: "failed", error: "capi_not_configured", payload: body as any,
    });
    return new Response(JSON.stringify({ ok: false, error: "capi_not_configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Build user_data with hashed PII per Meta spec
  const ud: any = {};
  if (body.user_data?.email) ud.em = [await sha256(body.user_data.email)];
  if (body.user_data?.phone) {
    const digits = body.user_data.phone.replace(/\D/g, "");
    if (digits) ud.ph = [await sha256(digits)];
  }
  if (body.user_data?.name) {
    const parts = body.user_data.name.trim().split(/\s+/);
    if (parts[0]) ud.fn = [await sha256(parts[0])];
    if (parts.length > 1) ud.ln = [await sha256(parts.slice(1).join(" "))];
  }
  if (body.user_data?.fbc) ud.fbc = body.user_data.fbc;
  if (body.user_data?.fbp) ud.fbp = body.user_data.fbp;
  if (body.user_data?.client_ip) ud.client_ip_address = body.user_data.client_ip;
  if (body.user_data?.client_user_agent) ud.client_user_agent = body.user_data.client_user_agent;

  const event: any = {
    event_name: body.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: body.event_id,
    action_source: "website",
    user_data: ud,
    custom_data: {
      ...(body.custom_data || {}),
      ...(body.value != null ? { value: body.value } : {}),
      ...(body.currency ? { currency: body.currency } : { currency: "BRL" }),
    },
  };
  if (body.event_source_url) event.event_source_url = body.event_source_url;

  const url = `https://graph.facebook.com/v19.0/${cfg.pixel_id}/events?access_token=${encodeURIComponent(cfg.capi_access_token)}`;
  const reqBody: any = { data: [event] };
  if (cfg.test_event_code) reqBody.test_event_code = cfg.test_event_code;

  let httpStatus = 0; let respJson: any = null; let errText: string | null = null;
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
    httpStatus = r.status;
    respJson = await r.json().catch(() => null);
    if (!r.ok) errText = respJson?.error?.message || `http_${r.status}`;
  } catch (e: any) {
    errText = e?.message || String(e);
  }

  const status = errText ? "failed" : "sent";
  await supabase.from("meta_event_log").insert({
    user_id: body.user_id, source_type: body.source_type, source_id: body.source_id || null,
    event_name: body.event_name, event_id: body.event_id, lead_id: body.lead_id || null,
    pixel_id: cfg.pixel_id, status, http_status: httpStatus,
    response: respJson || {}, payload: { event, test_event_code: cfg.test_event_code || null } as any,
    error: errText,
  });

  return new Response(JSON.stringify({ ok: status === "sent", status, http_status: httpStatus, error: errText, response: respJson }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
