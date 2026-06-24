import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { measurement_id, api_secret, event_name, client_id, params, source_type, source_id } = body || {};
    if (!measurement_id || !api_secret || !event_name) {
      return new Response(JSON.stringify({ ok: false, error: 'missing_params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurement_id)}&api_secret=${encodeURIComponent(api_secret)}`;
    const payload = {
      client_id: client_id || crypto.randomUUID(),
      events: [{ name: event_name, params: { ...(params || {}), source_type, source_id } }],
    };
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload) });
    const text = await res.text().catch(() => '');
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: text.slice(0, 500) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
