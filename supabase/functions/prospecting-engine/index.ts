import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sanitizeBaseUrl = (u: string) => (u || '').replace(/\/$/, '').replace(/\/send-text$/, '').replace(/\/send-image$/, '');

const mediaKind = (t?: string, url?: string): 'image' | 'video' | 'audio' | 'document' => {
  const m = (t || '').toLowerCase();
  if (m.startsWith('image') || m === 'image') return 'image';
  if (m.startsWith('video') || m === 'video') return 'video';
  if (m.startsWith('audio') || m === 'audio' || m === 'ptt') return 'audio';
  if (m === 'document') return 'document';
  const u = (url || '').toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(u)) return 'image';
  if (/\.(mp4|mov|webm)$/.test(u)) return 'video';
  if (/\.(mp3|ogg|opus|m4a|wav)$/.test(u)) return 'audio';
  return 'document';
};

async function sendWhatsApp(cfg: any, phone: string, content: string, media?: { url?: string; type?: string; name?: string }) {
  const baseUrl = sanitizeBaseUrl(cfg.base_url || '');
  const token = cfg.api_token || '';
  const instance = cfg.instance_id || '';
  const extra = cfg.extra_headers || {};
  const hasMedia = !!media?.url;
  const kind = hasMedia ? mediaKind(media?.type, media?.url) : null;
  let url = '', headers: any = { 'Content-Type': 'application/json', ...extra }, body: any = {};
  switch (cfg.api_type) {
    case 'z-api': {
      const root = baseUrl.includes('/instances/') ? baseUrl : `${baseUrl}/instances/${instance}/token/${token}`;
      if (hasMedia) {
        const path = kind === 'image' ? 'send-image' : kind === 'video' ? 'send-video' : kind === 'audio' ? 'send-audio' : 'send-document';
        url = `${root}/${path}`;
        body = kind === 'image' ? { phone, image: media!.url, caption: content }
          : kind === 'video' ? { phone, video: media!.url, caption: content }
          : kind === 'audio' ? { phone, audio: media!.url }
          : { phone, document: media!.url, fileName: media?.name || 'arquivo', caption: content };
      } else {
        url = `${root}/send-text`;
        body = { phone, message: content };
      }
      break;
    }
    case 'evolution':
      headers.apikey = token;
      if (hasMedia) {
        url = `${baseUrl}/message/sendMedia/${instance}`;
        body = { number: phone, mediatype: kind, media: media!.url, caption: content, fileName: media?.name || 'arquivo' };
      } else {
        url = `${baseUrl}/message/sendText/${instance}`;
        body = { number: phone, text: content };
      }
      break;
    case 'ultramsg':
      headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
      if (hasMedia) {
        const path = kind === 'image' ? 'image' : kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : 'document';
        url = `${baseUrl}/${instance}/messages/${path}`;
        const params: any = { token, to: phone, [kind === 'audio' ? 'audio' : kind === 'image' ? 'image' : kind === 'video' ? 'video' : 'document']: media!.url };
        if (kind !== 'audio') params.caption = content;
        if (kind === 'document') params.filename = media?.name || 'arquivo';
        body = new URLSearchParams(params).toString();
      } else {
        url = `${baseUrl}/${instance}/messages/chat`;
        body = new URLSearchParams({ token, to: phone, body: content }).toString();
      }
      break;
    case 'omniconect':
      headers = { 'Content-Type': 'application/json', token, ...extra };
      if (hasMedia) {
        url = `${baseUrl}/send/media`;
        body = { number: phone, type: kind, file: media!.url, text: content, docName: media?.name || 'arquivo' };
      } else {
        url = `${baseUrl}/send/text`;
        body = { number: phone, text: content };
      }
      break;
    default:
      url = baseUrl;
      body = hasMedia ? { phone, message: content, media: media!.url } : { phone, message: content };
  }
  const resp = await fetch(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const responseText = (await resp.text()).slice(0, 1000);
  let externalMessageId: string | null = null;
  try {
    const parsed = JSON.parse(responseText);
    externalMessageId = parsed?.id || parsed?.messageID || parsed?.messageId || parsed?.message?.id || parsed?.key?.id || null;
  } catch { /* provider returned a non-JSON body */ }
  return { ok: resp.ok, status: resp.status, body: responseText, externalMessageId };
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

  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization') || '';
    const hdr = req.headers.get('x-cron-secret') || '';
    const ok = auth === `Bearer ${CRON_SECRET}` || hdr === CRON_SECRET || auth === `Bearer ${SUPABASE_SERVICE}`;
    if (!ok) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  try {
    let bodyJson: any = {};
    try { bodyJson = await req.json(); } catch (_) {}
    const targetCampaignId = bodyJson?.campaign_id || null;

    // Find active campaigns (or a specific one if provided)
    let q = admin.from('prospecting_campaigns').select('*').eq('status', 'active');
    if (targetCampaignId) q = admin.from('prospecting_campaigns').select('*').eq('id', targetCampaignId);
    const { data: campaigns } = await q;

    let totalSent = 0;
    let reason: string | null = null;
    for (const camp of campaigns || []) {
      // Janela de envio: quando invocado manualmente (campaign_id), ignora a janela
      if (!targetCampaignId && !inBusinessHours(camp.business_hours)) {
        console.log('[CAMPAIGN] fora do horário comercial, aguardando', camp.id, camp.business_hours);
        continue;
      }


      // Respeita o intervalo configurado entre disparos (ignorado no Executar manual)
      if (!targetCampaignId && camp.next_send_at && new Date(camp.next_send_at).getTime() > Date.now()) {
        console.log('[CAMPAIGN] aguardando intervalo entre disparos', camp.id, camp.next_send_at);
        continue;
      }

      // Daily limit guard
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { count: sentToday } = await admin
        .from('campaign_contacts').select('*', { count: 'exact', head: true })
        .eq('campaign_id', camp.id).gte('sent_at', today.toISOString());
      if ((sentToday || 0) >= (camp.daily_limit || 100)) { reason = 'limite diário atingido'; continue; }

      // Conexão WhatsApp ativa MAIS RECENTE do dono da campanha
      const { data: cfgs } = await admin.from('whatsapp_configs')
        .select('*').eq('user_id', camp.user_id).eq('is_active', true)
        .order('updated_at', { ascending: false }).limit(1);
      const cfg = cfgs?.[0];
      if (!cfg) {
        console.error('[CAMPAIGN] no active whatsapp config for user', camp.user_id, 'campaign', camp.id);
        await admin.from('webhook_logs').insert({
          user_id: camp.user_id, direction: 'outbound', source: 'campaign',
          payload: { campaign_id: camp.id }, error: 'no_active_whatsapp_config', status_code: 424,
        });
        reason = 'nenhuma conexão de WhatsApp ativa';
        continue;
      }



      // === AUDIÊNCIA AUTOMÁTICA ===
      // Monta a fila de contatos a partir das etapas de origem escolhidas na campanha,
      // sem precisar de nenhuma ação manual na interface. Nunca repete quem já recebeu.
      try {
        const sources: any[] = Array.isArray(camp.source_pipelines) ? camp.source_pipelines : [];
        const stageIds: string[] = sources.flatMap((s: any) => s?.stage_ids || []).filter(Boolean);
        if (stageIds.length === 0) {
          console.log('[CAMPAIGN] sem etapas de origem definidas', camp.id);
          reason = 'nenhum funil/etapa de origem selecionado na campanha';
        } else {
          const limitMode = camp.audience_mode === 'limit' && (camp.audience_limit || 0) > 0;
          const { count: alreadyCount } = await admin.from('campaign_contacts')
            .select('id', { count: 'exact', head: true }).eq('campaign_id', camp.id);
          const need = limitMode ? (camp.audience_limit || 0) - (alreadyCount || 0) : 2000;
          if (need > 0) {
            const { data: existing } = await admin.from('campaign_contacts')
              .select('lead_id, phone').eq('campaign_id', camp.id).limit(5000);
            const seenLeads = new Set((existing || []).map((x: any) => x.lead_id).filter(Boolean));
            const seenPhones = new Set((existing || []).map((x: any) => String(x.phone || '').replace(/\D/g, '')).filter(Boolean));

            // Quem já recebeu disparo em qualquer campanha deste usuário não entra novamente
            const { data: sentElsewhere } = await admin.from('campaign_contacts')
              .select('phone').eq('user_id', camp.user_id).in('status', ['sent', 'replied', 'converted']).limit(5000);
            (sentElsewhere || []).forEach((x: any) => {
              const d = String(x.phone || '').replace(/\D/g, '');
              if (d) seenPhones.add(d);
            });

            const { data: stageLeads } = await admin.from('leads')
              .select('id,name,phone,email').eq('user_id', camp.user_id)
              .in('stage_id', stageIds).not('phone', 'is', null)
              .order('created_at', { ascending: true }).limit(need + 500);

            const rows: any[] = [];
            for (const l of stageLeads || []) {
              const digits = String(l.phone || '').replace(/\D/g, '');
              if (!digits || seenLeads.has(l.id) || seenPhones.has(digits)) continue;
              seenLeads.add(l.id); seenPhones.add(digits);
              rows.push({
                user_id: camp.user_id, campaign_id: camp.id, lead_id: l.id,
                name: l.name, phone: l.phone, email: l.email, status: 'pending',
              });
              if (rows.length >= need) break;
            }
            if (rows.length) {
              const { error: syncErr } = await admin.from('campaign_contacts').insert(rows);
              if (syncErr) { console.error('[CAMPAIGN] falha ao montar audiência', camp.id, syncErr.message); reason = `falha ao montar audiência: ${syncErr.message}`; }
              else console.log('[CAMPAIGN] audiência sincronizada', camp.id, rows.length);
            } else if (!(stageLeads || []).length) {
              reason = 'as etapas de origem não têm leads com telefone';
            } else {
              reason = 'todos os leads dessas etapas já receberam disparo';
            }
          }
        }
      } catch (syncEx) {
        console.error('[CAMPAIGN] erro na sincronização da audiência', camp.id, String(syncEx));
      }

      const remaining = (camp.daily_limit || 100) - (sentToday || 0);
      // Quantidade escolhida na campanha manda; o pacing abaixo continua respeitando o intervalo
      const wanted = camp.audience_mode === 'limit' && (camp.audience_limit || 0) > 0 ? camp.audience_limit : 50;
      const batch = Math.max(1, Math.min(remaining, wanted));

      const { data: pendings } = await admin
        .from('campaign_contacts')
        .select('*').eq('campaign_id', camp.id).eq('status', 'pending')
        .limit(batch);

      const runStarted = Date.now();
      for (const c of pendings || []) {
        try {
          const text = renderTemplate(camp.message_template || 'Olá {{name}}', {
            name: c.name || '', phone: c.phone, email: c.email || '',
          });
          const media = camp.media_url ? { url: camp.media_url, type: camp.media_type, name: camp.media_name } : undefined;
          const r = await sendWhatsApp(cfg, c.phone, text, media);
          if (r.ok) {
            const sentAt = new Date().toISOString();

            // Ensure a chat_clients record exists for this contact so the flow/agent can engage on reply.
            const phoneDigits = (c.phone || '').replace(/\D/g, '');
            let chatClientId: string | null = null;
            if (phoneDigits) {
              const { data: existingClient } = await admin.from('chat_clients')
                .select('id').eq('user_id', camp.user_id).eq('phone', phoneDigits).maybeSingle();
              if (existingClient) {
                chatClientId = existingClient.id;
                await admin.from('chat_clients').update({ updated_at: new Date().toISOString() }).eq('id', existingClient.id);
              } else {
                const { data: createdClient } = await admin.from('chat_clients').insert({
                  user_id: camp.user_id, phone: phoneDigits, name: c.name || null,
                  lead_id: c.lead_id || null, source: 'campaign',
                  metadata: { campaign_id: camp.id },
                }).select('id').single();
                chatClientId = createdClient?.id || null;
              }
            }

            // Isolation: bind the conversation to the campaign's chosen agent.
            // Without a chosen agent, keep the AI off so the main agent never answers campaign leads.
            if (chatClientId) {
              await admin.from('conversation_state').upsert({
                user_id: camp.user_id,
                client_id: chatClientId,
                ai_active: !!camp.agent_id,
                mode: camp.agent_id ? 'ai' : 'human',
                assigned_agent_id: camp.agent_id || null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'client_id' });
            }

            const { error: contactUpdateError } = await admin.from('campaign_contacts').update({
              status: 'sent', sent_at: sentAt, client_id: chatClientId,
            }).eq('id', c.id);
            if (contactUpdateError) throw contactUpdateError;


            // If the campaign uses a flow, start a flow session so the next inbound message advances it
            if (chatClientId && camp.flow_id) {
              const { data: flowDef } = await admin.from('conversation_flows')
                .select('id, nodes').eq('id', camp.flow_id).maybeSingle();
              if (flowDef) {
                const startNode = (flowDef.nodes || []).find((n: any) => n.id === 'start') || (flowDef.nodes || [])[0];
                const { data: existingSession } = await admin.from('conversation_flow_sessions')
                  .select('id').eq('client_id', chatClientId).eq('flow_id', flowDef.id).eq('status', 'active').maybeSingle();
                if (!existingSession && startNode) {
                  await admin.from('conversation_flow_sessions').insert({
                    user_id: camp.user_id, client_id: chatClientId, flow_id: flowDef.id,
                    current_node_id: startNode.id, variables: { campaign_id: camp.id }, status: 'active',
                  });
                }
              }
            }

            await admin.from('messages').insert({
              user_id: camp.user_id, campaign_id: camp.id,
              client_id: chatClientId, lead_id: c.lead_id, direction: 'outbound',
              channel: 'whatsapp', content: text, status: 'sent',
              media_url: camp.media_url || null, media_type: camp.media_url ? camp.media_type : null,
              agent_id: camp.agent_id || null,
              sender_phone: phoneDigits || c.phone,
              external_message_id: r.externalMessageId,
              metadata: { campaign_contact_id: c.id, provider_status: r.status },
            });

            // Após o primeiro disparo: manter na etapa atual ou mover para a etapa configurada
            if (c.lead_id && camp.post_send_action === 'move' && camp.post_send_stage_id) {
              const upd: any = { stage_id: camp.post_send_stage_id, updated_at: new Date().toISOString() };
              if (camp.post_send_pipeline_id) upd.pipeline_id = camp.post_send_pipeline_id;
              const { error: mvErr } = await admin.from('leads').update(upd).eq('id', c.lead_id).eq('user_id', camp.user_id);
              if (mvErr) throw mvErr;
            }

            const { count: sentCount } = await admin.from('campaign_contacts')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', camp.id).in('status', ['sent', 'replied', 'converted']);
            await admin.from('prospecting_campaigns').update({ total_sent: sentCount || 0 }).eq('id', camp.id);
            totalSent++;

          } else {
            console.error('[CAMPAIGN] send failed', { campaign: camp.id, contact: c.id, status: r.status, body: r.body?.slice(0, 300) });
            await admin.from('campaign_contacts').update({
              status: 'failed',
              failure_reason: `HTTP ${r.status}: ${(r.body || '').slice(0, 200)}`,
            }).eq('id', c.id);
            await admin.from('webhook_logs').insert({
              user_id: camp.user_id, direction: 'outbound', source: 'campaign',
              payload: { campaign_id: camp.id, contact_id: c.id, phone: c.phone, provider: cfg.api_type },
              error: `send_failed HTTP ${r.status}: ${(r.body || '').slice(0, 300)}`, status_code: r.status,
            });
          }
          // Intervalo entre disparos: espera dentro da execução quando curto,
          // ou agenda o próximo envio para a próxima rodada do cron quando longo.
          const dmin = Math.max(1, camp.delay_min_seconds || 30);
          const dmax = Math.max(dmin, camp.delay_max_seconds || dmin);
          const delay = dmin + Math.floor(Math.random() * (dmax - dmin + 1));
          await admin.from('prospecting_campaigns')
            .update({ next_send_at: new Date(Date.now() + delay * 1000).toISOString() })
            .eq('id', camp.id);
          if (delay <= 45 && Date.now() - runStarted < 40000) {
            await new Promise((res) => setTimeout(res, delay * 1000));
          } else {
            break;
          }
        } catch (err) {
          // Nunca deixar o contato em "pending" silencioso
          console.error('[CAMPAIGN] send error', { campaign: camp.id, contact: c.id, err: String(err) });
          await admin.from('campaign_contacts').update({
            status: 'failed', failure_reason: String(err).slice(0, 200),
          }).eq('id', c.id).eq('status', 'pending');
          await admin.from('webhook_logs').insert({
            user_id: camp.user_id, direction: 'outbound', source: 'campaign',
            payload: { campaign_id: camp.id, contact_id: c.id, phone: c.phone },
            error: `exception: ${String(err).slice(0, 300)}`, status_code: 500,
          });
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
