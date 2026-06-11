// Structured logger (Wave 4)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const sb = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

export async function log(level: "info" | "warn" | "error", category: string, message: string, meta: Record<string, any> = {}, ctx: { tenantId?: string; traceId?: string } = {}) {
  try {
    await sb().from("structured_logs").insert({ tenant_id: ctx.tenantId ?? null, trace_id: ctx.traceId ?? null, level, category, message, meta });
  } catch { /* never throw */ }
  console.log(JSON.stringify({ level, category, message, ...ctx, ...meta }));
}

export function newTraceId() {
  return crypto.randomUUID();
}
