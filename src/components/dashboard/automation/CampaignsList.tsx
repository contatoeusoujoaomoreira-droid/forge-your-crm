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
import { Megaphone, Play, Pause, Trash2, Plus, Users, Layers, Upload, Paperclip } from "lucide-react";
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
  const [lists, setLists] = useState<any[]>([]);
  const [showListPicker, setShowListPicker] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const formatSeconds = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), r = s % 60;
    return r ? `${m}min ${r}s` : `${m}min`;
  };

  const detectMediaType = (file: File) => {
    const m = (file.type || "").toLowerCase();
    if (m.startsWith("image/")) return "image";
    if (m.startsWith("video/")) return "video";
    if (m.startsWith("audio/")) return "audio";
    return "document";
  };

  const uploadMedia = async (file: File) => {
    if (!user) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Arquivo muito grande (máx. 25 MB)"); return; }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${user.id}/campaigns/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        contentType: file.type || "application/octet-stream", upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      setEditing((prev: any) => ({
        ...prev, media_url: data.publicUrl, media_type: detectMediaType(file), media_name: file.name,
      }));
      toast.success("Arquivo anexado");
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };


  const load = async () => {
    if (!user) return;
    const [c, a, p, s, f, l] = await Promise.all([
      supabase.from("prospecting_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("ai_agents").select("*").eq("user_id", user.id).eq("is_active", true),
      supabase.from("pipelines").select("*").eq("user_id", user.id),
      supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      supabase.from("conversation_flows").select("id,name,trigger_mode").eq("user_id", user.id).eq("is_active", true),
      supabase.from("imported_lists").select("id,name,total_contacts").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCampaigns(c.data || []);
    setAgents(a.data || []);
    setPipelines(p.data || []);
    setStages(s.data || []);
    setFlows(f.data || []);
    setLists(l.data || []);
  };

  useEffect(() => { load(); }, [user]);

  const newCampaign = () => setShowType(true);

  const startFromKind = (kind: "agent" | "flow" | "template" | "blank") => {
    setShowType(false);
    const base: any = {
      name: "", description: "", agent_id: "", flow_id: "", message_template: "Olá {{name}}, tudo bem?",
      daily_limit: 100, delay_min_seconds: 30, delay_max_seconds: 120, status: "draft", channel: "whatsapp",
      source_pipelines: [], target_pipeline_id: "", target_stage_id: "", _kind: kind,
      audience_mode: "all", audience_limit: 50,
      post_send_action: "keep", post_send_pipeline_id: "", post_send_stage_id: "",
      media_url: null, media_type: null, media_name: null,
    };
    if (kind === "flow") {
      setEditing({ ...base, name: "Campanha com fluxo" });
    } else if (kind === "agent") {
      setEditing({ ...base, name: "Campanha com agente" });
    } else {
      setEditing({ ...base, name: "Campanha de disparo", agent_id: "", flow_id: "" });
    }
  };

  const save = async () => {
    if (!user || !editing.name) { toast.error("Nome obrigatório"); return; }
    const kind = editing._kind || (editing.flow_id ? "flow" : editing.agent_id ? "agent" : "blank");
    if (kind === "agent" && !editing.agent_id) { toast.error("Selecione um agente"); return; }
    if (kind === "flow" && !editing.flow_id) { toast.error("Selecione um fluxo"); return; }

    if (!editing.target_pipeline_id || !editing.target_stage_id) { toast.error("Selecione pipeline e etapa de destino"); return; }
    if (editing.audience_mode === "limit" && !(editing.audience_limit > 0)) { toast.error("Informe a quantidade de contatos da campanha"); return; }
    if (editing.post_send_action === "move" && !editing.post_send_stage_id) { toast.error("Escolha a etapa para mover após o primeiro disparo"); return; }
    const payload: any = { ...editing, user_id: user.id };
    delete payload._kind;
    if (!payload.agent_id) delete payload.agent_id;
    if (!payload.flow_id) delete payload.flow_id;
    if (!payload.post_send_pipeline_id) payload.post_send_pipeline_id = null;
    if (!payload.post_send_stage_id) payload.post_send_stage_id = null;
    if (payload.audience_mode !== "limit") payload.audience_limit = null;
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("prospecting_campaigns").update(payload).eq("id", editing.id)
      : await supabase.from("prospecting_campaigns").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Campanha salva");
    setEditing(null); load();
  };

  // A audiência é montada automaticamente pelo motor de disparo (etapas de origem do CRM).



  const runCampaign = async (c: any) => {
    if (c.status !== "active") {
      await supabase.from("prospecting_campaigns").update({ status: "active" }).eq("id", c.id);
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("prospecting-engine", { body: { campaign_id: c.id } });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`Disparados: ${data?.sent || 0}`);
    load();
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


  const runEngine = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("prospecting-engine", { body: {} });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success(`Engine: ${data?.sent || 0} mensagens disparadas`);
    load();
  };

  if (editing) {
    const dmin = Number(editing.delay_min_seconds ?? 30) || 30;
    const dmax = Math.max(Number(editing.delay_max_seconds ?? dmin) || dmin, dmin);
    const base = Math.max(1, Math.round((dmin + dmax) / 2));
    const rawVar = base > 0 ? Math.round(((dmax - base) / base) * 100) : 0;
    const variation = rawVar >= 38 ? 50 : rawVar >= 13 ? 25 : 0;
    const intervalUnit: "s" | "m" = base >= 60 && base % 60 === 0 ? "m" : "s";
    const intervalValue = intervalUnit === "m" ? base / 60 : base;
    const applyInterval = (value: number, unit: "s" | "m", varPct: number) => {
      const secs = Math.max(1, Math.round((value || 1) * (unit === "m" ? 60 : 1)));
      setEditing({
        ...editing,
        delay_min_seconds: Math.max(1, Math.round(secs * (1 - varPct / 100))),
        delay_max_seconds: Math.round(secs * (1 + varPct / 100)),
      });
    };

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
            <p className="text-[11px] text-muted-foreground mt-1">Máximo de mensagens por dia nesta campanha.</p>
          </div>
          <div className="col-span-2 rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Intervalo entre disparos</Label>
              <p className="text-[11px] text-muted-foreground">Tempo de espera de um contato para o outro. Intervalos maiores reduzem o risco de bloqueio no WhatsApp.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <Label className="text-xs">Esperar</Label>
                <Input type="number" min={1} value={intervalValue}
                  onChange={(e) => applyInterval(+e.target.value, intervalUnit, variation)} />
              </div>
              <div className="w-40">
                <Label className="text-xs">Unidade</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={intervalUnit}
                  onChange={(e) => applyInterval(intervalValue, e.target.value as "s" | "m", variation)}>
                  <option value="s">Segundos</option>
                  <option value="m">Minutos</option>
                </select>
              </div>
              <div className="w-56">
                <Label className="text-xs">Variação aleatória</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={String(variation)}
                  onChange={(e) => applyInterval(intervalValue, intervalUnit, +e.target.value)}>
                  <option value="0">Exato (sem variação)</option>
                  <option value="25">Leve (± 25%)</option>
                  <option value="50">Alta (± 50%) — recomendado</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Envios acontecerão a cada {formatSeconds(editing.delay_min_seconds || 0)}
              {(editing.delay_max_seconds || 0) > (editing.delay_min_seconds || 0) ? ` a ${formatSeconds(editing.delay_max_seconds || 0)}` : ""}.
            </p>
          </div>

          {/* Anexo do primeiro disparo */}
          <div className="col-span-2 rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Anexo do primeiro disparo (opcional)</Label>
            <p className="text-[11px] text-muted-foreground">Imagem, vídeo, áudio, PDF, planilha ou documento. A mensagem acima vai como legenda.</p>
            {editing.media_url ? (
              <div className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <a href={editing.media_url} target="_blank" rel="noreferrer" className="underline truncate max-w-[280px]">
                  {editing.media_name || "arquivo anexado"}
                </a>
                <Badge variant="secondary" className="text-[10px]">{editing.media_type || "arquivo"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...editing, media_url: null, media_type: null, media_name: null })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Input type="file" disabled={uploading}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip"
                onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
            )}
            {uploading && <p className="text-[11px] text-muted-foreground">Enviando arquivo…</p>}
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

        {/* Audiência */}
        <div className="border-t border-border pt-3 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Audiência da campanha</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Todos os leads das etapas de origem" },
              { id: "limit", label: "Selecionar quantidade" },
            ].map(o => (
              <button key={o.id} type="button"
                onClick={() => setEditing({ ...editing, audience_mode: o.id })}
                className={`text-xs px-3 py-1.5 rounded-full border ${(editing.audience_mode || "all") === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                {o.label}
              </button>
            ))}
          </div>
          {editing.audience_mode === "limit" && (
            <div className="w-48">
              <Label className="text-xs">Quantidade de contatos</Label>
              <Input type="number" min={1} value={editing.audience_limit || 0}
                onChange={(e) => setEditing({ ...editing, audience_limit: +e.target.value })} />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Use "Preencher da origem" na lista de campanhas para carregar os contatos conforme esta regra.
          </p>
        </div>

        {/* Após o primeiro disparo */}
        <div className="border-t border-border pt-3 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Após o primeiro disparo</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "keep", label: "Continuar na etapa atual" },
              { id: "move", label: "Mover para outra etapa" },
            ].map(o => (
              <button key={o.id} type="button"
                onClick={() => setEditing({ ...editing, post_send_action: o.id })}
                className={`text-xs px-3 py-1.5 rounded-full border ${(editing.post_send_action || "keep") === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                {o.label}
              </button>
            ))}
          </div>
          {editing.post_send_action === "move" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pipeline</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editing.post_send_pipeline_id || ""}
                  onChange={(e) => setEditing({ ...editing, post_send_pipeline_id: e.target.value, post_send_stage_id: "" })}>
                  <option value="">— Selecione —</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={editing.post_send_stage_id || ""}
                  onChange={(e) => setEditing({ ...editing, post_send_stage_id: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {stages.filter((s: any) => !editing.post_send_pipeline_id || s.pipeline_id === editing.post_send_pipeline_id).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge>{c.status}</Badge>
              <Badge variant="secondary">enviadas: {c.total_sent || 0}</Badge>
              <Badge variant="secondary">resp: {c.total_replied || 0}</Badge>
              <Badge variant="outline">
                {c.audience_mode === "limit" ? `audiência: ${c.audience_limit || 0}` : "audiência: todos da etapa"}
              </Badge>
              <Badge variant="outline">
                {c.post_send_action === "move"
                  ? `após 1º envio → ${stages.find((s: any) => s.id === c.post_send_stage_id)?.name || "etapa definida"}`
                  : "após 1º envio → mantém etapa"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={() => runCampaign(c)} disabled={loading}>
              <Play className="h-4 w-4 mr-1" />Executar
            </Button>
            {c.status === "active" ? (
              <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "paused")} title="Pausar">
                <Pause className="h-4 w-4 mr-1" />Pausar
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}

      <CampaignTypeModal open={showType} onOpenChange={setShowType} onPick={startFromKind} />
    </div>
  );
}
