// Meta Conversions API (CAPI) dispatcher for CRM stage movements.
// Triggered by the DB trigger on leads.stage_id updates or manually (is_test: true).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const sha256 = async (raw: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

interface Payload {
  user_id: string;
  lead_id: string;
  stage_id: string;
  is_test?: boolean;
  event_source_url?: string;
  client_ip?: string | null;
  client_user_agent?: string | null;
  fbc?: string | null;
  fbp?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: Payload;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  if (!body?.user_id || !body?.lead_id || !body?.stage_id) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  const isTest = body.is_test === true;

  const [{ data: stage }, { data: lead }, { data: cfg }] = await Promise.all([
    supabase.from("pipeline_stages").select("*").eq("id", body.stage_id).maybeSingle(),
    supabase.from("leads").select("*").eq("id", body.lead_id).maybeSingle(),
    supabase.from("meta_ads_configs").select("pixel_id, capi_access_token, test_event_code, capi_enabled, is_active").eq("user_id", body.user_id).maybeSingle(),
  ]);

  const logFail = async (error: string, payloadSent: unknown = body) => {
    await supabase.from("meta_event_log").insert({
      user_id: body.user_id, source_type: "crm_stage", source_id: body.stage_id, stage_id: body.stage_id,
      event_name: (stage as any)?.capi_event_name || "Lead", event_id: `${body.lead_id}_${body.stage_id}_err`,
      lead_id: body.lead_id, status: "failed", error, payload: payloadSent as any, is_test: isTest,
    });
  };

  if (!stage) { await logFail("stage_not_found"); return json({ ok: false, error: "stage_not_found" }); }
  if (!lead) { await logFail("lead_not_found"); return json({ ok: false, error: "lead_not_found" }); }
  if (!isTest && !(stage as any).capi_event_active) return json({ ok: true, skipped: "stage_capi_disabled" });

  // Multi-pixel: credenciais do funil (pipeline) têm prioridade sobre a config global
  const pipelineId = (stage as any).pipeline_id || (lead as any).pipeline_id || null;
  let pipeline: any = null;
  if (pipelineId) {
    const { data } = await supabase
      .from("pipelines")
      .select("id, name, meta_pixel_id, meta_access_token, meta_test_event_code")
      .eq("id", pipelineId)
      .maybeSingle();
    pipeline = data;
  }

  const pixelId = pipeline?.meta_pixel_id || cfg?.pixel_id || null;
  const accessToken = pipeline?.meta_access_token || cfg?.capi_access_token || null;
  const testEventCode = pipeline?.meta_test_event_code || cfg?.test_event_code || null;
  if (!pixelId || !accessToken || (!pipeline?.meta_pixel_id && cfg?.capi_enabled === false)) {
    await logFail("capi_not_configured");
    return json({ ok: false, error: "capi_not_configured" });
  }


  // Deduplication: lead + stage + action timestamp
  const actionTs = Math.floor(Date.now() / 1000);
  const eventId = `${body.lead_id}_${body.stage_id}_${actionTs}`;
  const eventName = (stage as any).capi_event_name || "Lead";

  // Value: stage fixed value overrides lead value when set
  const stageValue = (stage as any).capi_event_value;
  const value = stageValue != null ? Number(stageValue) : Number((lead as any).value || 0);
  const currency = (stage as any).capi_currency || "BRL";

  // Advanced Matching (EMQ) — hashed PII
  const user_data: Record<string, unknown> = {};
  if ((stage as any).send_advanced_emq !== false) {
    if ((lead as any).email) user_data.em = [await sha256(String((lead as any).email))];
    if ((lead as any).phone) {
      const digits = String((lead as any).phone).replace(/\D/g, "");
      if (digits) user_data.ph = [await sha256(digits)];
    }
    if ((lead as any).name) {
      const parts = String((lead as any).name).trim().split(/\s+/);
      if (parts[0]) user_data.fn = [await sha256(parts[0])];
      if (parts.length > 1) user_data.ln = [await sha256(parts.slice(1).join(" "))];
    }
    const fbc = body.fbc || (lead as any).fbc || null;
    const fbp = body.fbp || (lead as any).fbp || null;
    if (fbc) user_data.fbc = fbc;
    if (fbp) user_data.fbp = fbp;
    const ip = body.client_ip || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    if (ip) user_data.client_ip_address = ip;
    const ua = body.client_user_agent || req.headers.get("user-agent") || null;
    if (ua) user_data.client_user_agent = ua;
  }
  if (Object.keys(user_data).length === 0) user_data.external_id = [await sha256(String(body.lead_id))];

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_time: actionTs,
    event_id: eventId,
    action_source: "system_generated",
    user_data,
    custom_data: {
      value,
      currency,
      lead_stage: (stage as any).name,
      content_name: (stage as any).name,
      ...(isTest ? { test_mode: true } : {}),
    },
  };
  if (body.event_source_url) event.event_source_url = body.event_source_url;

  const reqBody: Record<string, unknown> = { data: [event] };
  if (isTest && cfg?.test_event_code) reqBody.test_event_code = cfg.test_event_code;

  let httpStatus = 0; let respJson: any = null; let errText: string | null = null;
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reqBody),
    });
    httpStatus = r.status;
    respJson = await r.json().catch(() => null);
    if (!r.ok) errText = respJson?.error?.message || `http_${r.status}`;
  } catch (e) {
    errText = (e as Error)?.message || String(e);
  }

  const status = errText ? "failed" : "sent";
  await supabase.from("meta_event_log").insert({
    user_id: body.user_id, source_type: "crm_stage", source_id: body.stage_id, stage_id: body.stage_id,
    event_name: eventName, event_id: eventId, lead_id: body.lead_id, pixel_id: pixelId,
    status, http_status: httpStatus, response: respJson || {}, is_test: isTest,
    payload: reqBody as any, error: errText,
  });

  return json({ ok: status === "sent", status, http_status: httpStatus, error: errText, event_id: eventId, response: respJson });
});
