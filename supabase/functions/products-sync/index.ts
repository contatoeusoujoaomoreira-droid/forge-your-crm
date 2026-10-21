// Recebe produtos de ERPs externos (Bling, Tiny, etc.) e faz upsert por SKU.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const n = (v: unknown) => { if (v === null || v === undefined || v === "") return null; const x = Number(String(v).replace(",", ".")); return isNaN(x) ? null : x; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  const key = req.headers.get("x-api-key") || "";
  if (!key) return json({ error: "x-api-key ausente" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data: k } = await sb.from("api_keys").select("id,user_id").eq("key_hash", hash).eq("is_active", true).maybeSingle();
  if (!k) return json({ error: "Chave inválida" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.products) ? body.products : [body];
  if (list.length > 1000) return json({ error: "Máximo 1000 produtos por envio" }, 400);

  let created = 0, updated = 0; const errors: string[] = [];
  for (const p of list) {
    const name = String(p.nome ?? p.name ?? "").trim().slice(0, 300);
    const sku = String(p.sku ?? p.codigo ?? "").trim().slice(0, 100) || null;
    if (!name && !sku) { errors.push("item sem nome/sku"); continue; }
    const row: Record<string, unknown> = {
      name: name || undefined, sku,
      price: n(p.preco ?? p.price), wholesale_price: n(p.preco_atacado ?? p.wholesale_price),
      wholesale_min_qty: n(p.qtd_minima_atacado ?? p.wholesale_min_qty),
      stock_qty: n(p.estoque ?? p.stock), category: p.categoria ?? p.category ?? null,
      unit: p.unidade ?? p.unit ?? undefined, description: p.descricao ?? p.description ?? null,
      images: Array.isArray(p.imagens ?? p.images) ? (p.imagens ?? p.images) : undefined,
    };
    Object.keys(row).forEach((x) => (row[x] === null || row[x] === undefined) && delete row[x]);
    const ex = sku ? (await sb.from("products_services").select("id").eq("user_id", k.user_id).eq("sku", sku).maybeSingle()).data : null;
    const res = ex
      ? await sb.from("products_services").update(row).eq("id", ex.id)
      : name ? await sb.from("products_services").insert({ ...row, name, user_id: k.user_id }) : { error: { message: "sku não encontrado e sem nome" } };
    if (res.error) errors.push(`${sku || name}: ${res.error.message}`); else ex ? updated++ : created++;
  }
  await sb.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", k.id);
  return json({ ok: true, created, updated, errors });
});
