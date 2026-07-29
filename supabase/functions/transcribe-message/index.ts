// Resolve playable audio + transcription for a chat message (on demand, from the Inbox UI).
// - Baixa o áudio real (descriptografado) via /message/download da UAZAPI quando necessário
// - Salva no bucket `chat-media` para virar um link permanente e tocável no navegador
// - Transcreve com a cascata: Groq -> OpenAI -> ElevenLabs -> Lovable AI Gateway (Whisper)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

function sniff(buf: ArrayBuffer) {
  const head = new Uint8Array(buf.slice(0, 12));
  const s = String.fromCharCode(...head);
  const isOgg = s.startsWith('OggS');
  const isMp3 = s.startsWith('ID3') || (head[0] === 0xFF && (head[1] & 0xE0) === 0xE0);
  const isWav = s.startsWith('RIFF');
  const isM4a = s.slice(4, 8) === 'ftyp';
  if (isOgg) return { ok: true, ct: 'audio/ogg', ext: 'ogg' };
  if (isMp3) return { ok: true, ct: 'audio/mpeg', ext: 'mp3' };
  if (isWav) return { ok: true, ct: 'audio/wav', ext: 'wav' };
  if (isM4a) return { ok: true, ct: 'audio/mp4', ext: 'm4a' };
  return { ok: false, ct: 'application/octet-stream', ext: 'bin' };
}

async function fetchAudioBytes(admin: any, msg: any, waCfg: any, openaiKey: string) {
  const url: string = msg.media_url || '';
  let buf: ArrayBuffer | null = null;
  let nativeTranscript = '';

  if (msg.external_message_id && waCfg?.api_token && waCfg?.base_url) {
    try {
      const root = String(waCfg.base_url).replace(/\/+$/, '').replace(/\/(send-text|send-image|send-document|status|profile-picture|chat).*$/, '');
      const body: any = {
        id: msg.external_message_id, messageid: msg.external_message_id, messageId: msg.external_message_id,
        generate_mp3: true, return_link: true, return_base64: true, transcribe: true,
      };
      if (openaiKey) body.openai_apikey = openaiKey;
      const dl = await fetch(`${root}/message/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: waCfg.api_token, apikey: waCfg.api_token },
        body: JSON.stringify(body),
      });
      if (dl.ok) {
        const j = await dl.json().catch(() => null);
        nativeTranscript = (j?.transcription || j?.transcript || '').toString().trim();
        const b64 = j?.fileBase64 || j?.base64 || j?.base64Data || j?.file || j?.data || j?.audio;
        if (typeof b64 === 'string' && b64.length > 500) {
          const clean = b64.includes(',') ? b64.split(',').pop()! : b64;
          const bin = atob(clean);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          buf = bytes.buffer;
        } else if (j?.fileURL) {
          const fr = await fetch(j.fileURL);
          if (fr.ok) buf = await fr.arrayBuffer();
        }
      }
    } catch (_) { /* segue para o download direto */ }
  }

  if (!buf && url && !/\.enc(\?|$)/i.test(url)) {
    const headers: Record<string, string> = {};
    if (waCfg?.api_token) { headers['token'] = waCfg.api_token; headers['apikey'] = waCfg.api_token; }
    let r = await fetch(url, { headers }).catch(() => null);
    if ((!r || !r.ok) && Object.keys(headers).length) r = await fetch(url).catch(() => null);
    if (r?.ok) buf = await r.arrayBuffer();
  }

  return { buf, nativeTranscript };
}

async function transcribe(blob: Blob, ext: string, keys: { groq?: string; openai?: string; eleven?: string }) {
  if (keys.groq) {
    const fd = new FormData();
    fd.append('file', blob, `audio.${ext}`); fd.append('model', 'whisper-large-v3-turbo');
    fd.append('language', 'pt'); fd.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${keys.groq}` }, body: fd });
    if (r.ok) { const j = await r.json(); if (j.text) return String(j.text).trim(); }
  }
  if (keys.openai) {
    const fd = new FormData();
    fd.append('file', blob, `audio.${ext}`); fd.append('model', 'whisper-1');
    fd.append('language', 'pt'); fd.append('response_format', 'json');
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${keys.openai}` }, body: fd });
    if (r.ok) { const j = await r.json(); if (j.text) return String(j.text).trim(); }
  }
  if (keys.eleven) {
    const fd = new FormData();
    fd.append('file', blob, `audio.${ext}`); fd.append('model_id', 'scribe_v1'); fd.append('language_code', 'por');
    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': keys.eleven }, body: fd });
    if (r.ok) { const j = await r.json(); if (j.text) return String(j.text).trim(); }
  }
  const lk = Deno.env.get('LOVABLE_API_KEY') || '';
  if (lk) {
    const fd = new FormData();
    fd.append('file', blob, `audio.${ext}`); fd.append('model', 'openai/gpt-4o-transcribe');
    const r = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${lk}` }, body: fd });
    if (r.ok) { const j = await r.json().catch(() => null); const t = (j?.text || '').toString().trim(); if (t) return t; }
    else console.error('[STT] gateway', r.status, (await r.text()).slice(0, 200));
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { message_id, mode = 'full' } = await req.json().catch(() => ({}));
    if (!message_id || typeof message_id !== 'string') return json({ error: 'message_id obrigatório' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: msg } = await admin.from('messages').select('*').eq('id', message_id).eq('user_id', user.id).maybeSingle();
    if (!msg) return json({ error: 'Mensagem não encontrada' }, 404);
    if (msg.media_type !== 'audio' || !msg.media_url) return json({ error: 'Mensagem não é de áudio' }, 400);

    const meta: any = msg.metadata || {};
    const already = { audio_url: meta.playable_url as string | undefined, transcript: meta.transcript as string | undefined };
    if (already.audio_url && (already.transcript || mode === 'audio')) {
      return json({ audio_url: already.audio_url, transcript: already.transcript || null, cached: true });
    }

    const { data: waCfg } = await admin.from('whatsapp_configs').select('*').eq('user_id', user.id).limit(1).maybeSingle();
    const { data: cfgs } = await admin.from('ai_provider_configs').select('provider, api_key_encrypted').eq('user_id', user.id).not('api_key_encrypted', 'is', null);
    const keyOf = (p: string) => (cfgs || []).find((c: any) => c.provider === p)?.api_key_encrypted || '';
    const keys = { groq: keyOf('groq'), openai: keyOf('openai'), eleven: keyOf('elevenlabs') };

    let audioUrl = already.audio_url || '';
    let transcript = already.transcript || '';
    let blob: Blob | null = null;
    let ext = 'mp3';

    if (!audioUrl || (!transcript && mode === 'full')) {
      const { buf, nativeTranscript } = await fetchAudioBytes(admin, msg, waCfg, keys.openai);
      if (nativeTranscript && nativeTranscript.length > 1) transcript = nativeTranscript;
      if (buf && buf.byteLength > 1500) {
        const s = sniff(buf);
        if (s.ok) {
          ext = s.ext;
          blob = new Blob([buf], { type: s.ct });
          if (!audioUrl) {
            const path = `${user.id}/audio/${msg.id}.${s.ext}`;
            const { error: upErr } = await admin.storage.from('chat-media').upload(path, new Uint8Array(buf), { contentType: s.ct, upsert: true, cacheControl: '31536000' });
            if (!upErr) {
              const { data: pub } = admin.storage.from('chat-media').getPublicUrl(path);
              audioUrl = pub?.publicUrl || '';
            }
          }
        }
      }
    }

    if (mode === 'full' && !transcript && blob) {
      transcript = await transcribe(blob, ext, keys);
    }

    const patch: any = { ...meta };
    if (audioUrl) patch.playable_url = audioUrl;
    if (transcript) patch.transcript = transcript;
    if (audioUrl || transcript) await admin.from('messages').update({ metadata: patch }).eq('id', msg.id);

    if (!audioUrl && !transcript) return json({ error: 'Não foi possível recuperar o áudio desta mensagem.' }, 422);
    return json({ audio_url: audioUrl || null, transcript: transcript || null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
