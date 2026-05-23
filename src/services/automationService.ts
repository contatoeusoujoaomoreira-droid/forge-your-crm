// Automation orchestration façade — followups, agent runs, prospecting, cron nudge.
// All UI code should funnel through here. Edge functions remain the executor today;
// when migrating to VPS we only swap the transport.
import { supabase } from "@/integrations/supabase/client";

export async function runAgent(opts: { conversationId?: string; clientId: string; agentId?: string; message: string }) {
  const { data, error } = await supabase.functions.invoke("ai-agent", { body: opts });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function triggerProspecting(opts: { listId: string; templateId?: string }) {
  const { data, error } = await supabase.functions.invoke("prospecting-engine", { body: opts });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function nudgeCronWorker() {
  const { data, error } = await supabase.functions.invoke("cron-worker", { body: {} });
  return { ok: !error, data, error: error?.message };
}
