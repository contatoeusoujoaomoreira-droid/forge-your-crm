import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { voice = 'alloy', text = 'Olá!' } = await req.json();

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: cfg } = await admin.from('ai_provider_configs')
      .select('api_key_encrypted')
      .eq('user_id', userData.user.id).eq('provider', 'openai')
      .not('api_key_encrypted', 'is', null).limit(1).maybeSingle();

    if (!cfg?.api_key_encrypted) {
      return new Response(JSON.stringify({ error: 'Configure uma chave OpenAI em Provedores primeiro.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.api_key_encrypted}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice, input: String(text).slice(0, 1000), response_format: 'mp3' }),
    });
    if (!r.ok) {
      const err = await r.text();
      return new Response(JSON.stringify({ error: `OpenAI TTS ${r.status}: ${err.slice(0, 300)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) binary += String.fromCharCode(...buf.subarray(i, i + chunk));
    const audio = `data:audio/mpeg;base64,${btoa(binary)}`;
    return new Response(JSON.stringify({ audio }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
