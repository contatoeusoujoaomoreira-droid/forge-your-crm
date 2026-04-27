import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sanitizeBaseUrl = (u: string) => (u || '').replace(/\/$/, '').replace(/\/send-text$/, '').replace(/\/send-image$/, '');

async function sendWhatsApp(cfg: any, phone: string, content: string) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  let url = '', headers: any = { 'Content-Type': 'application/json', ...extra }, body: any = {};
  switch (cfg.api_type) {
    case 'z-api':
      url = baseUrl.includes('/instances/') ? `${baseUrl}/send-text` : `${baseUrl}/instances/${instance}/token/${token}/send-text`;
      body = { phone, message: content };
      break;
    case 'evolution':
      url = `${baseUrl}/message/sendText/${instance}`;
      headers.apikey = token;
      body = { number: phone, text: content };
      break;
    case 'ultramsg':
      url = `${baseUrl}/${instance}/messages/chat`;
      headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      body = new URLSearchParams({ token, to: phone, body: content }).toString();
      break;
    default:
      url = baseUrl;
      body = { phone, message: content };
  }
  const resp = await fetch(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { ok: resp.ok, status: resp.status };
}

const renderTemplate = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '');

const inBusinessHours = (cfg: any) => {
  if (!cfg) return true;
  const now = new Date();
  const day = now.getDay();
  if (Array.isArray(cfg.days) && !cfg.days.includes(day)) return false;
  const hh = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = (cfg.start || '09:00').split(':').map(Number);
  const [eh, em] = (cfg.end || '18:00').split(':').map(Number);
  return hh >= sh * 60 + sm && hh <= eh * 60 + em;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  try {
    // Find active campaigns
    const { data: campaigns } = await admin.from('prospecting_campaigns')
      .select('*').eq('status', 'active');

    let totalSent = 0;
    for (const camp of campaigns || []) {
      if (!inBusinessHours(camp.business_hours)) continue;

      // Daily limit guard
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: sentToday } = await admin
        .from('campaign_contacts').select('*', { count: 'exact', head: true })
        .eq('campaign_id', camp.id).gte('sent_at', today.toISOString());
      if ((sentToday || 0) >= (camp.daily_limit || 100)) continue;

      // Get whatsapp config of campaign owner
      const { data: cfg } = await admin.from('whatsapp_configs')
        .select('*').eq('user_id', camp.user_id).eq('is_active', true).maybeSingle();
      if (!cfg) continue;

      const remaining = (camp.daily_limit || 100) - (sentToday || 0);
      const batch = Math.min(remaining, 10); // process up to 10 per run

      const { data: pendings } = await admin
        .from('campaign_contacts')
        .select('*').eq('campaign_id', camp.id).eq('status', 'pending')
        .limit(batch);

      for (const c of pendings || []) {
        try {
          const text = renderTemplate(camp.message_template || 'Olá {{name}}', {
            name: c.name || '', phone: c.phone, email: c.email || '',
          });
          const r = await sendWhatsApp(cfg, c.phone, text);
          if (r.ok) {
            await admin.from('campaign_contacts').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', c.id);
            await admin.from('messages').insert({
              user_id: camp.user_id, campaign_id: camp.id,
              client_id: null, lead_id: c.lead_id, direction: 'outbound',
              channel: 'whatsapp', content: text, status: 'sent',
            });
            await admin.from('prospecting_campaigns').update({ total_sent: (camp.total_sent || 0) + 1 }).eq('id', camp.id);
            totalSent++;
          } else {
            await admin.from('campaign_contacts').update({ status: 'failed', failure_reason: `HTTP ${r.status}` }).eq('id', c.id);
          }
          // delay between sends
          const delay = (camp.delay_min_seconds || 30) + Math.floor(Math.random() * Math.max(1, (camp.delay_max_seconds || 120) - (camp.delay_min_seconds || 30)));
          await new Promise((res) => setTimeout(res, Math.min(delay * 1000, 8000)));
        } catch (err) {
          console.error('campaign send error', err);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('engine error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
