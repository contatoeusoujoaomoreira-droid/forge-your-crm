import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, Play, Pause, Trash2, Plus, Users } from "lucide-react";
import CampaignTypeModal, { CAMPAIGN_TEMPLATES } from "./CampaignTypeModal";

export default function CampaignsList() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showLeads, setShowLeads] = useState<string | null>(null);
  const [leadsAvail, setLeadsAvail] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showType, setShowType] = useState(false);
  const [flows, setFlows] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const [c, a, p, s, f] = await Promise.all([
      supabase.from("prospecting_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ai_agents").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("pipelines").select("*").eq("user_id", user.id),
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      supabase.from("conversation_flows").select("id,name,trigger_mode").eq("user_id", user.id).eq("is_active", true),
    ]);
    setCampaigns(c.data || []);
    setAgents(a.data || []);
    setPipelines(p.data || []);
    setStages(s.data || []);
    setFlows(f.data || []);
  };
  useEffect(() => { load(); }, [user]);

  const newCampaign = () => setShowType(true);

  const startFromKind = (kind: "agent" | "flow" | "template" | "blank") => {
    setShowType(false);
    const base: any = {
      name: "", description: "", agent_id: "", flow_id: "", message_template: "Olá {{name}}, tudo bem?",
      daily_limit: 100, delay_min_seconds: 30, delay_max_seconds: 120, status: "draft", channel: "whatsapp",
      source_pipelines: [], target_pipeline_id: "", target_stage_id: "",
    };
    if (kind === "template") {
      const tpl = CAMPAIGN_TEMPLATES.prospect[0];
      setEditing({ ...base, name: tpl.name, description: tpl.description, message_template: tpl.message_template });
    } else if (kind === "flow") {
      setEditing({ ...base, name: "Campanha com fluxo" });
    } else if (kind === "agent") {
      setEditing({ ...base, name: "Campanha com agente" });
    } else {
      setEditing(base);
    }
  };

  const save = async () => {
    if (!user || !editing.name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...editing, user_id: user.id };
    if (!payload.agent_id) delete payload.agent_id;
    if (!payload.flow_id) delete payload.flow_id;
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("prospecting_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("prospecting_campaigns").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha salva");
    setEditing(null); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("prospecting_campaigns").update({ status }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir campanha?")) return;
    await supabase.from("prospecting_campaigns").delete().eq("id", id);
    load();
  };

  const openLeadsPicker = async (campaignId: string) => {
    if (!user) return;
    setShowLeads(campaignId);
    const { data } = await supabase.from("leads").select("id,name,phone,email").eq("user_id", user.id).limit(500);
    setLeadsAvail(data || []);
  };

  const addLeads = async (campaignId: string, leadIds: string[]) => {
    if (!user) return;
    setLoading(true);
    const rows = leadIds.map((leadId) => {
      const lead = leadsAvail.find((l) => l.id === leadId);
      return {
        user_id: user.id, campaign_id: campaignId, lead_id: leadId,
        name: lead?.name, phone: lead?.phone, email: lead?.email, status: "pending",
      };
    });
    const { error } = await supabase.from("campaign_contacts").insert(rows);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`${rows.length} contatos adicionados`);
    setShowLeads(null);
  };

  const runEngine = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("prospecting-engine", { body: {} });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`Engine: ${data?.sent || 0} mensagens disparadas`);
    load();
  };

  if (editing) {
    return (
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} Campanha</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nome</Label>
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label>Agente IA</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.agent_id || ""} onChange={(e) => setEditing({ ...editing, agent_id: e.target.value })}>
              <option value="">— Sem IA (template estático) —</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
            </select>
          </div>
          <div>
            <Label>Fluxo de conversa (opcional)</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.flow_id || ""} onChange={(e) => setEditing({ ...editing, flow_id: e.target.value })}>
              <option value="">— Não usar fluxo —</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}{f.trigger_mode === "campaign_only" ? " (exclusivo de campanha)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Quando o lead responder, este fluxo continua a conversa automaticamente. Use fluxos com modo "campanha" para isolar do chat geral.
            </p>
          </div>
          <div>
            <Label>Templates de mensagem</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value="" onChange={(e) => {
                const tpl = CAMPAIGN_TEMPLATES.prospect.find((t) => t.name === e.target.value);
                if (tpl) setEditing({ ...editing, message_template: tpl.message_template });
              }}>
              <option value="">— Aplicar template pronto —</option>
              {CAMPAIGN_TEMPLATES.prospect.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <Label>Descrição</Label>
            <Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Mensagem (use {"{{name}}"} e {"{{phone}}"})</Label>
            <Textarea rows={4} value={editing.message_template || ""} onChange={(e) => setEditing({ ...editing, message_template: e.target.value })} />
          </div>
          <div>
            <Label>Limite diário</Label>
            <Input type="number" value={editing.daily_limit} onChange={(e) => setEditing({ ...editing, daily_limit: +e.target.value })} />
          </div>
          <div>
            <Label>Delay min (s)</Label>
            <Input type="number" value={editing.delay_min_seconds} onChange={(e) => setEditing({ ...editing, delay_min_seconds: +e.target.value })} />
          </div>
          <div>
            <Label>Delay max (s)</Label>
            <Input type="number" value={editing.delay_max_seconds} onChange={(e) => setEditing({ ...editing, delay_max_seconds: +e.target.value })} />
          </div>
        </div>

        {/* Source pipelines */}
        <div className="border-t border-border pt-3 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pipelines/Etapas de origem (leads que entram na campanha)</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border border-border p-2 bg-secondary/20">
            {pipelines.length === 0 && <p className="text-xs text-muted-foreground p-2">Crie pipelines no CRM primeiro.</p>}
            {pipelines.map(p => {
              const pStages = stages.filter((s: any) => s.pipeline_id === p.id);
              const sourceArr: any[] = Array.isArray(editing.source_pipelines) ? editing.source_pipelines : [];
              const entry = sourceArr.find((x: any) => x.pipeline_id === p.id);
              const checked = !!entry;
              const stageIds: string[] = entry?.stage_ids || [];
              return (
                <div key={p.id} className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      const next = e.target.checked
                        ? [...sourceArr.filter((x: any) => x.pipeline_id !== p.id), { pipeline_id: p.id, stage_ids: pStages.map((s: any) => s.id) }]
                        : sourceArr.filter((x: any) => x.pipeline_id !== p.id);
                      setEditing({ ...editing, source_pipelines: next });
                    }} />
                    {p.name}
                  </label>
                  {checked && pStages.length > 0 && (
                    <div className="ml-6 flex flex-wrap gap-1">
                      {pStages.map((s: any) => {
                        const on = stageIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const newStages = on ? stageIds.filter(x => x !== s.id) : [...stageIds, s.id];
                              const next = sourceArr.map((x: any) => x.pipeline_id === p.id ? { ...x, stage_ids: newStages } : x);
                              setEditing({ ...editing, source_pipelines: next });
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(editing.source_pipelines || []).reduce((acc: number, x: any) => acc + (x.stage_ids?.length || 0), 0)} etapa(s) selecionada(s)
          </p>
        </div>

        {/* Target pipeline/stage */}
        <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Pipeline destino (após resposta)</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={editing.target_pipeline_id || ""}
              onChange={(e) => setEditing({ ...editing, target_pipeline_id: e.target.value, target_stage_id: "" })}>
              <option value="">— Manter atual —</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Etapa destino</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={editing.target_stage_id || ""}
              onChange={(e) => setEditing({ ...editing, target_stage_id: e.target.value })}>
              <option value="">— Primeira da pipeline —</option>
              {stages.filter((s: any) => !editing.target_pipeline_id || s.pipeline_id === editing.target_pipeline_id).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Campanhas de Prospecção</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runEngine} disabled={loading}>
            <Play className="h-4 w-4 mr-1" />Executar agora
          </Button>
          <Button size="sm" onClick={newCampaign}><Plus className="h-4 w-4 mr-1" />Nova campanha</Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma campanha. Crie a primeira.</Card>
      ) : campaigns.map((c) => (
        <Card key={c.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.description}</p>
            <div className="flex gap-2 mt-1">
              <Badge>{c.status}</Badge>
              <Badge variant="secondary">enviadas: {c.total_sent || 0}</Badge>
              <Badge variant="secondary">resp: {c.total_replied || 0}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => openLeadsPicker(c.id)}><Users className="h-4 w-4" /></Button>
            {c.status === "active" ? (
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")}><Pause className="h-4 w-4" /></Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "active")}><Play className="h-4 w-4" /></Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}

      {showLeads && (
        <Card className="p-4 fixed inset-4 z-50 overflow-auto bg-background border shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Adicionar leads à campanha ({leadsAvail.length} disponíveis)</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowLeads(null)}>Fechar</Button>
          </div>
          <LeadPicker leads={leadsAvail} onAdd={(ids) => addLeads(showLeads, ids)} />
        </Card>
      )}
      <CampaignTypeModal open={showType} onOpenChange={setShowType} onPick={startFromKind} />
    </div>
  );
}

function LeadPicker({ leads, onAdd }: { leads: any[]; onAdd: (ids: string[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Button size="sm" variant="outline" onClick={() => setSel(new Set(leads.map((l) => l.id)))}>Todos</Button>
        <Button size="sm" variant="outline" onClick={() => setSel(new Set())}>Nenhum</Button>
        <Button size="sm" onClick={() => onAdd([...sel])} disabled={sel.size === 0}>Adicionar {sel.size}</Button>
      </div>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {leads.map((l) => (
          <label key={l.id} className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer">
            <input type="checkbox" checked={sel.has(l.id)} onChange={(e) => {
              const n = new Set(sel); e.target.checked ? n.add(l.id) : n.delete(l.id); setSel(n);
            }} />
            <span className="text-sm">{l.name}</span>
            <span className="text-xs text-muted-foreground">{l.phone}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
