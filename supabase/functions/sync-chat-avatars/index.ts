import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const normalizePhone = (value: string) => (value || '').replace(/\D/g, '');

function extractAvatarUrl(input: any): string | undefined {
  if (!input || typeof input !== 'object') return typeof input === 'string' && input.startsWith('http') ? input : undefined;
  const directKeys = ['photo', 'senderPhoto', 'profilePicUrl', 'profilePicture', 'profile_pic_url', 'avatarUrl', 'avatar_url', 'picture', 'link', 'url'];
  for (const key of directKeys) {
    const value = input?.[key];
    if (typeof value === 'string' && value.startsWith('http')) return value;
  }
  for (const value of Object.values(input)) {
    if (value && typeof value === 'object') {
      const nested = extractAvatarUrl(value);
      if (nested) return nested;
    }
  }
  return undefined;
}

const zapiRoot = (cfg: any) => {
  const baseUrl = (cfg.base_url || '').replace(/\/$/, '').replace(/\/(send-text|send-image|send-document|status|profile-picture).*$/, '');
  return baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${cfg.instance_id}/token/${cfg.api_token}`;
};

async function fetchZapiProfilePicture(cfg: any, phone: string): Promise<string | undefined> {
  try {
    if ((cfg?.api_type || '').toLowerCase() !== 'z-api') return undefined;
    const root = zapiRoot(cfg);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((cfg as any).extra_headers || {}) };
    const attempts = [
      () => fetch(`${root}/profile-picture?phone=${phone}`, { headers }),
      () => fetch(`${root}/profile-picture/${phone}`, { headers }),
      () => fetch(`${root}/profile-picture`, { method: 'POST', headers, body: JSON.stringify({ phone }) }),
    ];
    for (const attempt of attempts) {
      const response = await attempt().catch(() => null);
      if (!response?.ok) continue;
      const text = await response.text();
      const json = (() => { try { return JSON.parse(text); } catch { return text; } })();
      const avatar = extractAvatarUrl(json);
      if (avatar) return avatar;
    }
  } catch (_) { /* skip */ }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: configs } = await admin.from('whatsapp_configs')
      .select('api_type, base_url, api_token, instance_id, extra_headers, is_active, updated_at')
      .eq('user_id', user.id).eq('api_type', 'z-api')
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(5);

    const { data: logs } = await admin.from('webhook_logs')
      .select('payload, created_at')
      .eq('user_id', user.id).eq('source', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(1000);

    const avatarByPhone = new Map<string, string>();
    for (const log of logs || []) {
      const payload: any = (log as any).payload || {};
      const phone = normalizePhone(payload.phone || payload.from || payload.sender || payload.remoteJid || '');
      const avatar = extractAvatarUrl(payload);
      if (phone && avatar && !avatarByPhone.has(phone)) avatarByPhone.set(phone, avatar);
    }

    const { data: clients } = await admin.from('chat_clients')
      .select('id, phone, avatar_url, metadata').eq('user_id', user.id).limit(300);

    let updated = 0;
    for (const c of clients || []) {
      if (!c.phone) continue;
      try {
        const phone = normalizePhone(c.phone);
        const current = c.avatar_url || extractAvatarUrl((c as any).metadata);
        const fromLogs = avatarByPhone.get(phone);
        let link = fromLogs || current;
        if (!link) {
          for (const cfg of configs || []) {
            link = await fetchZapiProfilePicture(cfg, phone);
            if (link) break;
          }
        }
        if (link && link !== c.avatar_url) {
          const metadata = { ...((c as any).metadata || {}), profile_pic_url: link, avatar_source: fromLogs ? 'webhook_payload' : 'provider_lookup' };
          await admin.from('chat_clients').update({ avatar_url: link, metadata, updated_at: new Date().toISOString() }).eq('id', c.id);
          updated++;
        }
      } catch (_) { /* skip */ }
    }

    return new Response(JSON.stringify({ ok: true, scanned: clients?.length || 0, updated, configs: configs?.length || 0, webhook_photos: avatarByPhone.size }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
