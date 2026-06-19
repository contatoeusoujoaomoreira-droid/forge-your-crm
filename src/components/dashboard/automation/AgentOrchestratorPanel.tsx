import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, GitBranch, ArrowUp, ArrowDown } from "lucide-react";

interface Agent { id: string; name: string; }
interface Rule {
  id: string;
  name: string;
  agent_id: string;
  priority: number;
  enabled: boolean;
  match_type: string;
  utm_filters: Record<string, string>;
  keywords: string[];
  tag_names: string[];
  meta_campaign: string | null;
  meta_adset: string | null;
  meta_creative: string | null;
}

const empty = (): Partial<Rule> => ({
  name: "", agent_id: "", priority: 100, enabled: true, match_type: "any",
  utm_filters: {}, keywords: [], tag_names: [],
  meta_campaign: null, meta_adset: null, meta_creative: null,
});

export default function AgentOrchestratorPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<Rule>>(empty());
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, a] = await Promise.all([
      supabase.from("agent_routing_rules").select("*").order("priority", { ascending: true }),
      supabase.from("ai_agents").select("id,name").eq("is_active", true),
    ]);
    setRules((r.data as Rule[]) || []);
    setAgents((a.data as Agent[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!draft.name || !draft.agent_id) {
      toast.error("Nome e agente são obrigatórios");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload: any = {
      user_id: u.user.id,
      name: draft.name,
      agent_id: draft.agent_id,
      priority: draft.priority ?? 100,
      enabled: draft.enabled ?? true,
      match_type: draft.match_type ?? "any",
      utm_filters: draft.utm_filters ?? {},
      keywords: draft.keywords ?? [],
      tag_names: draft.tag_names ?? [],
      meta_campaign: draft.meta_campaign || null,
      meta_adset: draft.meta_adset || null,
      meta_creative: draft.meta_creative || null,
    };
    const { error } = await supabase.from("agent_routing_rules").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra criada");
    setDraft(empty());
    setShowForm(false);
    load();
  };

  const toggle = async (r: Rule) => {
    await supabase.from("agent_routing_rules").update({ enabled: !r.enabled }).eq("id", r.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("agent_routing_rules").delete().eq("id", id);
    load();
  };
  const move = async (r: Rule, dir: -1 | 1) => {
    await supabase.from("agent_routing_rules").update({ priority: Math.max(1, r.priority + dir * 10) }).eq("id", r.id);
    load();
  };

  const setUtm = (k: string, v: string) => {
    const cur = { ...(draft.utm_filters || {}) };
    if (v) cur[k] = v; else delete cur[k];
    setDraft({ ...draft, utm_filters: cur });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="h-4 w-4" /> Orquestrador de Agentes
        </div>
        <Button onClick={() => setShowForm(s => !s)} size="sm">
          <Plus className="h-4 w-4 mr-1" />Nova regra
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Ordem de decisão: 1) Agente já ativo na conversa, 2) Fluxos ativos, 3) Regras aqui (por prioridade),
        4) Palavras-chave, 5) Tags, 6) Pipeline/Etapa, 7) Agente padrão.
      </p>

      {showForm && (
        <Card className="p-4 space-y-3 border-primary/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome da regra</Label>
              <Input value={draft.name || ""} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Campanha Alto Padrão" />
            </div>
            <div>
              <Label>Agente especialista</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.agent_id || ""} onChange={e => setDraft({ ...draft, agent_id: e.target.value })}>
                <option value="">— escolher —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Prioridade (menor = primeiro)</Label>
              <Input type="number" value={draft.priority ?? 100} onChange={e => setDraft({ ...draft, priority: parseInt(e.target.value) || 100 })} />
            </div>
            <div>
              <Label>Tipo de match</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.match_type} onChange={e => setDraft({ ...draft, match_type: e.target.value })}>
                <option value="any">Qualquer condição</option>
                <option value="all">Todas as condições</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>UTM Source</Label><Input value={draft.utm_filters?.utm_source || ""} onChange={e => setUtm("utm_source", e.target.value)} /></div>
            <div><Label>UTM Medium</Label><Input value={draft.utm_filters?.utm_medium || ""} onChange={e => setUtm("utm_medium", e.target.value)} /></div>
            <div><Label>UTM Campaign</Label><Input value={draft.utm_filters?.utm_campaign || ""} onChange={e => setUtm("utm_campaign", e.target.value)} /></div>
            <div><Label>UTM Content</Label><Input value={draft.utm_filters?.utm_content || ""} onChange={e => setUtm("utm_content", e.target.value)} /></div>
            <div><Label>Meta Campaign</Label><Input value={draft.meta_campaign || ""} onChange={e => setDraft({ ...draft, meta_campaign: e.target.value })} /></div>
            <div><Label>Meta Adset</Label><Input value={draft.meta_adset || ""} onChange={e => setDraft({ ...draft, meta_adset: e.target.value })} /></div>
          </div>

          <div>
            <Label>Palavras-chave (separadas por vírgula)</Label>
            <Input value={(draft.keywords || []).join(", ")} onChange={e => setDraft({ ...draft, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="financiamento, alto padrão, investidor" />
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={(draft.tag_names || []).join(", ")} onChange={e => setDraft({ ...draft, tag_names: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="VIP, Investidor" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button onClick={save}>Salvar regra</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setDraft(empty()); }}>Cancelar</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && rules.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma regra. Crie uma para rotear leads para agentes especializados.</p>
        )}
        {rules.map(r => {
          const agent = agents.find(a => a.id === r.agent_id);
          return (
            <Card key={r.id} className="p-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary font-bold">#{r.priority}</span>
                  <span className="font-bold text-sm">{r.name}</span>
                  <span className="text-xs text-muted-foreground">→ {agent?.name || "(agente removido)"}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                  {Object.entries(r.utm_filters || {}).map(([k, v]) => (
                    <span key={k} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600">{k}={v}</span>
                  ))}
                  {(r.keywords || []).map(k => (
                    <span key={k} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600">kw:{k}</span>
                  ))}
                  {(r.tag_names || []).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">tag:{t}</span>
                  ))}
                  {r.meta_campaign && <span className="px-2 py-0.5 rounded bg-pink-500/10 text-pink-600">meta:{r.meta_campaign}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(r, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(r, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Switch checked={r.enabled} onCheckedChange={() => toggle(r)} />
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
