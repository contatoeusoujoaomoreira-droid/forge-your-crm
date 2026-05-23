// Agent selection + handoff resolution helpers used by Inbox / Automation UI.
// Heavy logic lives in the webhook-receiver / ai-agent edge functions; this module
// exposes the read-side queries the UI needs.
import { supabase } from "@/integrations/supabase/client";

export interface AgentSummary {
  id: string;
  name: string;
  is_default: boolean;
  handoff_enabled: boolean;
  handoff_keywords: string | null;
}

export async function listAgents(userId: string): Promise<AgentSummary[]> {
  const { data } = await supabase
    .from("ai_agents")
    .select("id,name,is_default,handoff_enabled,handoff_keywords")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as AgentSummary[];
}

export async function resolveAgentForClient(userId: string, clientId: string): Promise<AgentSummary | null> {
  const { data: cs } = await supabase
    .from("conversation_state")
    .select("assigned_agent_id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (cs?.assigned_agent_id) {
    const { data } = await supabase.from("ai_agents").select("id,name,is_default,handoff_enabled,handoff_keywords").eq("id", cs.assigned_agent_id).maybeSingle();
    if (data) return data as AgentSummary;
  }
  const { data: def } = await supabase.from("ai_agents").select("id,name,is_default,handoff_enabled,handoff_keywords").eq("user_id", userId).eq("is_default", true).maybeSingle();
  return (def as AgentSummary) || null;
}

export async function setAgentActive(userId: string, clientId: string, active: boolean) {
  await supabase.from("conversation_state").upsert({
    user_id: userId,
    client_id: clientId,
    ai_paused: !active,
  } as any, { onConflict: "user_id,client_id" });
}
