import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function bufToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

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

    const { provider = 'omni', voice = 'alloy', text = 'Olá!' } = await req.json();
    const input = String(text).slice(0, 1000);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Omni Audio = native. Tries user's OpenAI key first (real audio).
    // If unavailable, signals the browser to render via SpeechSynthesis (no error).
    if (provider === 'omni') {
      const { data: cfg } = await admin.from('ai_provider_configs').select('api_key_encrypted')
        .eq('user_id', userData.user.id).eq('provider', 'openai').not('api_key_encrypted', 'is', null).limit(1).maybeSingle();
      if (cfg?.api_key_encrypted) {
        const r = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.api_key_encrypted}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'tts-1', voice, input, response_format: 'mp3' }),
        });
        if (r.ok) {
          const audio = `data:audio/mpeg;base64,${bufToBase64(await r.arrayBuffer())}`;
          return new Response(JSON.stringify({ audio, engine: 'openai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      // Native browser fallback — never fails
      return new Response(JSON.stringify({ engine: 'browser', text: input, voice }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (provider === 'elevenlabs') {
      const { data: cfg } = await admin.from('ai_provider_configs').select('api_key_encrypted')
        .eq('user_id', userData.user.id).eq('provider', 'elevenlabs').not('api_key_encrypted', 'is', null).limit(1).maybeSingle();
      const key = cfg?.api_key_encrypted || Deno.env.get('ELEVENLABS_API_KEY');
      if (!key) return new Response(JSON.stringify({ error: 'Configure ElevenLabs em Provedores.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) return new Response(JSON.stringify({ error: `ElevenLabs ${r.status}: ${(await r.text()).slice(0,200)}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const audio = `data:audio/mpeg;base64,${bufToBase64(await r.arrayBuffer())}`;
      return new Response(JSON.stringify({ audio }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Default: openai (user key)
    const { data: cfg } = await admin.from('ai_provider_configs').select('api_key_encrypted')
      .eq('user_id', userData.user.id).eq('provider', 'openai').not('api_key_encrypted', 'is', null).limit(1).maybeSingle();
    if (!cfg?.api_key_encrypted) {
      return new Response(JSON.stringify({ error: 'Configure uma chave OpenAI em Provedores primeiro.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.api_key_encrypted}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice, input, response_format: 'mp3' }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: `OpenAI TTS ${r.status}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const audio = `data:audio/mpeg;base64,${bufToBase64(await r.arrayBuffer())}`;
    return new Response(JSON.stringify({ audio }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
