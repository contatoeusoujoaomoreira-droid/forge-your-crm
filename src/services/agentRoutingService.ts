// Agent selection + handoff resolution helpers.
// Heavy logic lives in edge functions; this is the read surface for the UI.
import { supabase } from "@/integrations/supabase/client";

export interface AgentSummary {
  id: string;
  name: string;
  handoff_enabled: boolean | null;
  handoff_keywords: string | null;
}

export async function listAgents(userId: string): Promise<AgentSummary[]> {
  const { data } = await supabase
    .from("ai_agents")
    .select("id,name,handoff_enabled,handoff_keywords")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return ((data as unknown) as AgentSummary[]) || [];
}

export async function resolveAgentForClient(userId: string, clientId: string): Promise<AgentSummary | null> {
  const { data: cs } = await supabase
    .from("conversation_state")
    .select("assigned_agent_id")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();
  const assigned = (cs as any)?.assigned_agent_id;
  if (assigned) {
    const { data } = await supabase
      .from("ai_agents")
      .select("id,name,handoff_enabled,handoff_keywords")
      .eq("id", assigned)
      .maybeSingle();
    if (data) return (data as unknown) as AgentSummary;
  }
  const { data: any1 } = await supabase
    .from("ai_agents")
    .select("id,name,handoff_enabled,handoff_keywords")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return ((any1 as unknown) as AgentSummary) || null;
}

export async function setAgentActive(userId: string, clientId: string, active: boolean) {
  await supabase.from("conversation_state").upsert({
    user_id: userId,
    client_id: clientId,
    ai_paused: !active,
  } as any, { onConflict: "user_id,client_id" });
}
