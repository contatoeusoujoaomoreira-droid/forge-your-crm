/**
 * CRMIntelligence - Stage Triggers & CRM Automation Configuration
 * Sub-module inside AutomationHub for managing pipeline stage triggers
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Bell, GitBranch, Settings2, ArrowRight, Bot, CheckCircle2, Loader2 } from "lucide-react";

interface StageTrigger {
  id: string;
  stage_id: string;
  trigger_event: string;
  action_type: string;
  action_config: any;
  is_active: boolean;
}

export default function CRMIntelligence() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<StageTrigger[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New trigger form
  const [newTrigger, setNewTrigger] = useState({
    stage_id: "",
    trigger_event: "enter",
    action_type: "notify_whatsapp",
    action_config: { phone: "", message: "" } as any,
    is_active: true,
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: pls }, { data: sts }, { data: ags }, { data: trgs }] = await Promise.all([
      supabase.from("pipelines").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      supabase.from("ai_agents").select("id, name, is_active").eq("user_id", user.id),
      supabase.from("stage_triggers").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    setPipelines(pls || []);
    setStages(sts || []);
    setAgents(ags || []);
    setTriggers((trgs || []) as StageTrigger[]);
    if (!selectedPipeline && pls?.length) setSelectedPipeline(pls[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filteredStages = stages.filter((s) => s.pipeline_id === selectedPipeline || (!s.pipeline_id && !selectedPipeline));
  const filteredTriggers = triggers.filter((t) => filteredStages.some((s) => s.id === t.stage_id));

  const ACTION_TYPES = [
    { id: "notify_whatsapp", label: "📱 Notificar WhatsApp", icon: Bell },
    { id: "change_agent", label: "🤖 Trocar Agente IA", icon: Bot },
    { id: "move_stage", label: "📊 Mover para Etapa", icon: GitBranch },
    { id: "create_task", label: "📋 Criar Tarefa", icon: CheckCircle2 },
  ];

  const handleSaveTrigger = async () => {
    if (!user || !newTrigger.stage_id) {
      toast.error("Selecione a etapa para o gatilho");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("stage_triggers").insert({
      user_id: user.id,
      stage_id: newTrigger.stage_id,
      trigger_event: newTrigger.trigger_event,
      action_type: newTrigger.action_type,
      action_config: newTrigger.action_config as any,
      is_active: newTrigger.is_active,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Gatilho criado!");
    setNewTrigger({ stage_id: "", trigger_event: "enter", action_type: "notify_whatsapp", action_config: { phone: "", message: "" }, is_active: true });
    load();
  };

  const toggleTrigger = async (id: string, active: boolean) => {
    await supabase.from("stage_triggers").update({ is_active: active } as any).eq("id", id);
    setTriggers((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: active } : t)));
  };

  const deleteTrigger = async (id: string) => {
    await supabase.from("stage_triggers").delete().eq("id", id);
    setTriggers((prev) => prev.filter((t) => t.id !== id));
    toast.success("Gatilho removido");
  };

  const getStageName = (id: string) => stages.find((s) => s.id === id)?.name || "—";
  const getAgentName = (id: string) => agents.find((a) => a.id === id)?.name || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Inteligência CRM
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure gatilhos automáticos por etapa do pipeline. Movimentos de card (manuais ou via IA) disparam alertas e ações.
          </p>
        </div>
      </div>

      {pipelines.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {pipelines.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={selectedPipeline === p.id ? "default" : "outline"}
              onClick={() => setSelectedPipeline(p.id)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      )}

      {pipelines.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Crie um pipeline primeiro no CRM para configurar gatilhos.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredStages.map((stage) => {
              const count = triggers.filter((t) => t.stage_id === stage.id && t.is_active).length;
              return (
                <div
                  key={stage.id}
                  className="p-3 rounded-lg border text-center text-xs"
                  style={{ borderColor: stage.color + "60", backgroundColor: stage.color + "10" }}
                >
                  <div className="h-2 w-2 rounded-full mx-auto mb-1" style={{ backgroundColor: stage.color }} />
                  <p className="font-semibold text-foreground">{stage.name}</p>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-[9px] mt-1">
                      {count} gatilho{count > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          <Card className="p-4 space-y-4 border-primary/30">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Novo Gatilho de Etapa
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Etapa</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newTrigger.stage_id}
                  onChange={(e) => setNewTrigger({ ...newTrigger, stage_id: e.target.value })}
                >
                  <option value="">Selecione a etapa</option>
                  {filteredStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Evento</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newTrigger.trigger_event}
                  onChange={(e) => setNewTrigger({ ...newTrigger, trigger_event: e.target.value })}
                >
                  <option value="enter">Quando lead ENTRAR na etapa</option>
                  <option value="leave">Quando lead SAIR da etapa</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Ação</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newTrigger.action_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const defaults: Record<string, any> = {
                      notify_whatsapp: { phone: "", message: "" },
                      change_agent: { agent_id: "" },
                      move_stage: { target_stage_id: "" },
                      create_task: { description: "" },
                    };
                    setNewTrigger({ ...newTrigger, action_type: type, action_config: defaults[type] || {} });
                  }}
                >
                  {ACTION_TYPES.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {newTrigger.action_type === "notify_whatsapp" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">WhatsApp destino</Label>
                  <Input
                    value={newTrigger.action_config.phone || ""}
                    onChange={(e) => setNewTrigger({ ...newTrigger, action_config: { ...newTrigger.action_config, phone: e.target.value } })}
                    placeholder="5511999999999"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mensagem</Label>
                  <Input
                    value={newTrigger.action_config.message || ""}
                    onChange={(e) => setNewTrigger({ ...newTrigger, action_config: { ...newTrigger.action_config, message: e.target.value } })}
                    placeholder="Lead {nome} movido para {etapa}!"
                  />
                </div>
              </div>
            )}

            {newTrigger.action_type === "change_agent" && (
              <div>
                <Label className="text-xs">Trocar para Agente</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newTrigger.action_config.agent_id || ""}
                  onChange={(e) => setNewTrigger({ ...newTrigger, action_config: { agent_id: e.target.value } })}
                >
                  <option value="">Selecione</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {newTrigger.action_type === "move_stage" && (
              <div>
                <Label className="text-xs">Mover para Etapa</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newTrigger.action_config.target_stage_id || ""}
                  onChange={(e) => setNewTrigger({ ...newTrigger, action_config: { target_stage_id: e.target.value } })}
                >
                  <option value="">Selecione</option>
                  {filteredStages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {newTrigger.action_type === "create_task" && (
              <div>
                <Label className="text-xs">Descrição da Tarefa</Label>
                <Input
                  value={newTrigger.action_config.description || ""}
                  onChange={(e) => setNewTrigger({ ...newTrigger, action_config: { description: e.target.value } })}
                  placeholder="Fazer follow-up com {nome}"
                />
              </div>
            )}

            <Button onClick={handleSaveTrigger} disabled={saving || !newTrigger.stage_id}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Criar Gatilho
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">Gatilhos Ativos ({filteredTriggers.length})</h4>
            {filteredTriggers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum gatilho configurado para este pipeline.</p>
            ) : (
              <div className="space-y-2">
                {filteredTriggers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/10">
                    <Switch checked={t.is_active} onCheckedChange={(v) => toggleTrigger(t.id, v)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{getStageName(t.stage_id)}</Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge variant="secondary" className="text-[10px]">
                          {t.trigger_event === "enter" ? "Ao entrar" : "Ao sair"}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <Badge className="text-[10px]">
                          {ACTION_TYPES.find((a) => a.id === t.action_type)?.label || t.action_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {t.action_type === "notify_whatsapp" && `📱 ${t.action_config?.phone || "—"}: ${t.action_config?.message || "—"}`}
                        {t.action_type === "change_agent" && `🤖 Trocar para: ${getAgentName(t.action_config?.agent_id)}`}
                        {t.action_type === "move_stage" && `📊 Mover para: ${getStageName(t.action_config?.target_stage_id)}`}
                        {t.action_type === "create_task" && `📋 ${t.action_config?.description || "—"}`}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteTrigger(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
