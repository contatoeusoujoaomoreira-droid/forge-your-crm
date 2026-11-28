import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'

const CF_API = 'https://api.cloudflare.com/client/v4'
const Body = z.object({ action: z.enum(['create', 'check', 'delete']), domain_id: z.string().uuid() })
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function cf(path: string, init: RequestInit = {}) {
  const r = await fetch(`${CF_API}/zones/${Deno.env.get('CLOUDFLARE_ZONE_ID')}${path}`, {
    ...init,
    redirect: 'error',
    headers: { Authorization: `Bearer ${Deno.env.get('CLOUDFLARE_API_TOKEN')}`, 'Content-Type': 'application/json' },
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok || !data.success) {
    const msg = data?.errors?.[0]?.message || `Cloudflare ${r.status}`
    const err = new Error(r.status === 403 ? `Sem permissão na Cloudflare (${msg})` : msg) as Error & { status?: number }
    err.status = r.status
    throw err
  }
  return data.result
}

const summarize = (h: any) => {
  const ssl = h?.ssl?.status || 'pending'
  const active = h?.status === 'active' && ssl === 'active'
  return { status: active ? 'verified' : 'pending', ssl_status: ssl, hostname_status: h?.status }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (!Deno.env.get('CLOUDFLARE_API_TOKEN') || !Deno.env.get('CLOUDFLARE_ZONE_ID')) return json({ error: 'Cloudflare não configurada' }, 500)
    const auth = req.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
    const { data: u } = await userClient.auth.getUser()
    if (!u?.user) return json({ error: 'Não autenticado' }, 401)
    const parsed = Body.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const { action, domain_id } = parsed.data

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: d } = await admin.from('custom_domains').select('*').eq('id', domain_id).eq('user_id', u.user.id).maybeSingle()
    if (!d) return json({ error: 'Domínio não encontrado' }, 404)

    if (action === 'delete') {
      if (d.cf_hostname_id) {
        try { await cf(`/custom_hostnames/${d.cf_hostname_id}`, { method: 'DELETE' }) }
        catch (e) { if ((e as any).status !== 404) throw e }
      }
      await admin.from('custom_domains').update({ cf_hostname_id: null, ssl_status: null }).eq('id', d.id)
      return json({ ok: true })
    }

    let h: any
    if (d.cf_hostname_id) {
      try { h = await cf(`/custom_hostnames/${d.cf_hostname_id}`) } catch (e) { if ((e as any).status !== 404) throw e }
    }
    if (!h) {
      // reuse only a hostname exactly matching this owned domain
      const host = String(d.domain).trim().toLowerCase().replace(/\.$/, '')
      const lookup = async () => {
        const found = await cf(`/custom_hostnames?hostname=${encodeURIComponent(host)}`)
        return Array.isArray(found) ? found.find((x: any) => String(x.hostname).toLowerCase() === host) : null
      }
      h = await lookup()
      if (h) {
        // only reuse if no other account claims this hostname
        const { data: others } = await admin.from('custom_domains').select('id').ilike('domain', host).neq('user_id', u.user.id).limit(1)
        if (others?.length) return json({ error: 'Este domínio já está em uso por outra conta.' }, 409)
      }
      if (!h && action === 'create') {
        try {
          h = await cf('/custom_hostnames', {
            method: 'POST',
            body: JSON.stringify({ hostname: host, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } }),
          })
        } catch (e) {
          if (!/duplicate/i.test((e as Error).message)) throw e
          h = await lookup()
          if (!h) return json({ error: 'Este domínio já está cadastrado na Cloudflare. Clique em Verificar conexão em alguns segundos.' }, 409)
        }
      }
    }
    if (!h) return json({ error: 'Domínio ainda não registrado. Clique em Ativar.' }, 404)
    const s = summarize(h)
    await admin.from('custom_domains').update({
      cf_hostname_id: h.id, ssl_status: s.ssl_status, status: s.status, cf_error: h?.verification_errors?.[0] || null,
      verified_at: s.status === 'verified' ? new Date().toISOString() : null,
    }).eq('id', d.id)
    return json({ ok: true, ...s, errors: h?.verification_errors || [] })
  } catch (e) {
    console.error('cloudflare-domain', e)
    return json({ error: (e as Error).message }, (e as any).status === 403 ? 403 : 500)
  }
})
