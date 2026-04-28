import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Key, Bot, Zap, Copy, CheckCircle2, AlertCircle, Upload, Megaphone, Workflow, KeyRound, Send, Plus, Pencil, GitBranch } from "lucide-react";
import LeadImporter from "./automation/LeadImporter";
import CampaignsList from "./automation/CampaignsList";
import ChatAutomationsTab from "./automation/ChatAutomationsTab";
import AIProviderSettings from "./automation/AIProviderSettings";
import AgentBuilder from "./automation/AgentBuilder";
import FlowsBuilder from "./automation/FlowsBuilder";

const PROVIDERS = [
  { id: "z-api", label: "Z-API · z-api.io" },
  { id: "botconversa", label: "BotConversa · botconversa.com.br" },
  { id: "evolution", label: "Evolution API" },
  { id: "ultramsg", label: "UltraMsg" },
  { id: "custom", label: "Custom" },
];

const PROVIDER_HINTS: Record<string, { base: string; tokenLabel: string; instanceLabel: string; helpUrl?: string; helpText?: string }> = {
  "z-api": {
    base: "https://api.z-api.io/instances/SEU_INSTANCE/token/SEU_TOKEN",
    tokenLabel: "Token (da URL da instância)",
    instanceLabel: "Instance ID",
    helpUrl: "https://app.z-api.io",
    helpText: "Painel Z-API → sua instância → copie a URL completa da API (já contém Instance ID e Token).",
  },
  botconversa: {
    base: "https://backend.botconversa.com.br/api/v1",
    tokenLabel: "API Key (X-API-Key do BotConversa)",
    instanceLabel: "Subscriber/Bot ID (opcional)",
    helpUrl: "https://app.botconversa.com.br",
    helpText: "Painel BotConversa → Integrações → API → copie a API Key.",
  },
  evolution: { base: "https://sua-evolution.com", tokenLabel: "API Key", instanceLabel: "Instance Name" },
  ultramsg: { base: "https://api.ultramsg.com", tokenLabel: "Token", instanceLabel: "Instance ID (instanceXXXX)" },
  custom: { base: "https://...", tokenLabel: "Bearer Token", instanceLabel: "Identificador" },
};

export default function AutomationHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState("whatsapp");
  const [waConfigs, setWaConfigs] = useState<any[]>([]);
  const [waCfg, setWaCfg] = useState<any>({ api_type: "z-api", base_url: "", api_token: "", instance_id: "", is_active: true, auto_create_lead: true, label: "Principal" });
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [providerKeys, setProviderKeys] = useState<any[]>([]);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  // agent form state moved to AgentBuilder modal
  const [testing, setTesting] = useState(false);
  const [agentBuilderOpen, setAgentBuilderOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [testMsgOpen, setTestMsgOpen] = useState(false);
  const [testMsgPhone, setTestMsgPhone] = useState("");
  const [testMsgContent, setTestMsgContent] = useState("Olá! Esta é uma mensagem de teste do meu CRM. ✅");
  const [testMsgSending, setTestMsgSending] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);

  const webhookUrl = `https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/webhook-receiver`;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cfg, keys, ags, providers, pls, sts] = await Promise.all([
        supabase.from("whatsapp_configs").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_provider_configs").select("*").eq("user_id", user.id),
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      ]);
      if (cfg.data) setWaCfg(cfg.data);
      setApiKeys(keys.data || []);
      setAgents(ags.data || []);
      setProviderKeys(providers.data || []);
      setPipelines(pls.data || []);
      setStages(sts.data || []);
    })();
  }, [user]);

  const saveWa = async () => {
    if (!user) return;
    const payload = { ...waCfg, user_id: user.id };
    delete payload.created_at;
    delete payload.updated_at;
    const { error } = waCfg.id
      ? await supabase.from("whatsapp_configs").update(payload).eq("id", waCfg.id)
      : await supabase.from("whatsapp_configs").insert(payload).select().single().then((r) => { if (r.data) setWaCfg(r.data); return r; });
    if (error) toast.error(error.message);
    else {
      toast.success("Configuração salva!");
      if (payload.api_type === "z-api" && payload.is_active) configureWebhook(payload, false);
    }
  };

  const configureWebhook = async (config = waCfg, showSuccess = true) => {
    setConfiguringWebhook(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", {
      body: { mode: "configure_webhook", config, webhook_url: webhookUrl },
    });
    setConfiguringWebhook(false);
    if (error) { toast.error(error.message); return; }
    if (data?.ok) {
      if (showSuccess) toast.success("Webhook de recebimento configurado na Z-API!");
    } else {
      toast.error(`Webhook não configurado: ${data?.body || data?.error || "erro"}`);
    }
  };

  const testWa = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", { body: waCfg });
    setTesting(false);
    if (error) toast.error(error.message);
    else if (data?.ok) toast.success("Conexão OK!");
    else toast.error(`Falhou: ${data?.body || data?.error || "erro"}`);
  };

  const sendTestMessage = async () => {
    if (!testMsgPhone || !testMsgContent) { toast.error("Preencha telefone e mensagem"); return; }
    setTestMsgSending(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", {
      body: { mode: "send_test", config: waCfg, phone: testMsgPhone, message: testMsgContent },
    });
    setTestMsgSending(false);
    if (error) { toast.error(error.message); return; }
    if (data?.ok) { toast.success("Mensagem enviada com sucesso! Verifique o WhatsApp."); setTestMsgOpen(false); }
    else toast.error(`Falhou: ${data?.body || data?.error || "erro desconhecido"}`);
  };

  const reloadAgents = async () => {
    if (!user) return;
    const { data } = await supabase.from("ai_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAgents(data || []);
  };

  const createApiKey = async () => {
    if (!user || !newKeyLabel) return;
    const raw = `obc_${crypto.randomUUID().replace(/-/g, "")}`;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id, label: newKeyLabel, key_hash: hash, key_preview: raw.slice(0, 12) + "..." + raw.slice(-4),
    });
    if (error) { toast.error(error.message); return; }
    setNewKeyValue(raw);
    setNewKeyLabel("");
    const { data } = await supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApiKeys(data || []);
    toast.success("Chave criada! Copie agora — não será exibida novamente.");
  };

  // createAgent removed — replaced by AgentBuilder modal

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-primary" /> Automação</h2>
        <p className="text-sm text-muted-foreground">Conecte WhatsApp, configure agentes IA e dispare campanhas de prospecção ativa.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</TabsTrigger>
          <TabsTrigger value="apikeys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="h-4 w-4 mr-1" />Agentes IA</TabsTrigger>
          <TabsTrigger value="flows"><GitBranch className="h-4 w-4 mr-1" />Fluxos</TabsTrigger>
          <TabsTrigger value="aikeys"><KeyRound className="h-4 w-4 mr-1" />Provedores</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="h-4 w-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="chatauto"><Workflow className="h-4 w-4 mr-1" />Auto. Chat</TabsTrigger>
          <TabsTrigger value="chatauto"><Workflow className="h-4 w-4 mr-1" />Auto. Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Provedor WhatsApp</h3>
                <p className="text-xs text-muted-foreground">Conecte qualquer API de WhatsApp (Z-API, BotConversa, Evolution, UltraMsg ou Custom).</p>
              </div>
              {PROVIDER_HINTS[waCfg.api_type]?.helpUrl && (
                <a href={PROVIDER_HINTS[waCfg.api_type].helpUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline shrink-0">Abrir painel do provedor →</a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de API</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={waCfg.api_type} onChange={(e) => setWaCfg({ ...waCfg, api_type: e.target.value })}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                {PROVIDER_HINTS[waCfg.api_type]?.helpText && (
                  <p className="text-xs text-muted-foreground mt-1">{PROVIDER_HINTS[waCfg.api_type].helpText}</p>
                )}
              </div>
              <div>
                <Label>{PROVIDER_HINTS[waCfg.api_type]?.instanceLabel || "Instance ID"}</Label>
                <Input value={waCfg.instance_id || ""} onChange={(e) => setWaCfg({ ...waCfg, instance_id: e.target.value })} placeholder="3ABC..." />
              </div>
              <div className="col-span-2">
                <Label>URL Base da API</Label>
                <Input value={waCfg.base_url || ""} onChange={(e) => setWaCfg({ ...waCfg, base_url: e.target.value })} placeholder={PROVIDER_HINTS[waCfg.api_type]?.base} />
                {waCfg.api_type === "z-api" && (
                  <p className="text-xs text-muted-foreground mt-1">Cole a URL completa da "API da instância mobile" (já contém Instance ID e Token).</p>
                )}
              </div>
              <div className="col-span-2">
                <Label>{PROVIDER_HINTS[waCfg.api_type]?.tokenLabel || "Token / API Key"}</Label>
                <Input type="password" value={waCfg.api_token || ""} onChange={(e) => setWaCfg({ ...waCfg, api_token: e.target.value })} />
              </div>

              {waCfg.api_type === "z-api" && (
                <div className="col-span-2">
                  <Label>Client-Token (Segurança Z-API — obrigatório)</Label>
                  <Input
                    type="password"
                    value={(typeof waCfg.extra_headers === "object" ? waCfg.extra_headers?.["Client-Token"] : "") || ""}
                    onChange={(e) => {
                      const cur = typeof waCfg.extra_headers === "object" ? { ...waCfg.extra_headers } : {};
                      cur["Client-Token"] = e.target.value;
                      setWaCfg({ ...waCfg, extra_headers: cur });
                    }}
                    placeholder="Fa1234567890abcdef..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Painel Z-API → sua instância → aba "Segurança" → copie o Client-Token.</p>
                </div>
              )}

              <div>
                <Label>Pipeline padrão para novos leads</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={waCfg.default_pipeline_id || ""}
                  onChange={(e) => setWaCfg({ ...waCfg, default_pipeline_id: e.target.value || null, default_stage_id: null })}
                >
                  <option value="">Pipeline padrão</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Etapa inicial</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={waCfg.default_stage_id || ""}
                  onChange={(e) => setWaCfg({ ...waCfg, default_stage_id: e.target.value || null })}
                >
                  <option value="">Primeira etapa</option>
                  {stages.filter(s => !waCfg.default_pipeline_id || s.pipeline_id === waCfg.default_pipeline_id).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch checked={waCfg.auto_create_lead} onCheckedChange={(v) => setWaCfg({ ...waCfg, auto_create_lead: v })} />
                <Label>Criar lead automaticamente ao receber primeira mensagem</Label>
              </div>

              <div className="col-span-2 p-3 rounded-md border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex flex-col">
                    <span className="font-semibold">🤖 Resposta automática por IA</span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Quando ativo, o agente abaixo responde automaticamente toda mensagem recebida no WhatsApp.
                    </span>
                  </Label>
                  <Switch
                    checked={waCfg.ai_auto_reply !== false}
                    onCheckedChange={(v) => setWaCfg({ ...waCfg, ai_auto_reply: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Agente IA padrão para responder</Label>
                  <select
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={waCfg.default_agent_id || ""}
                    onChange={(e) => setWaCfg({ ...waCfg, default_agent_id: e.target.value || null })}
                  >
                    <option value="">Primeiro agente ativo</option>
                    {agents.filter(a => a.is_active).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                    ))}
                  </select>
                  {agents.filter(a => a.is_active).length === 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      ⚠ Nenhum agente IA ativo. Crie e ative um agente na aba "Agentes IA".
                    </p>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <Label>Headers extras (JSON, opcional)</Label>
                <Textarea rows={2} value={typeof waCfg.extra_headers === "object" ? JSON.stringify(waCfg.extra_headers) : (waCfg.extra_headers || "")} onChange={(e) => { try { setWaCfg({ ...waCfg, extra_headers: JSON.parse(e.target.value || "{}") }); } catch { setWaCfg({ ...waCfg, extra_headers: e.target.value }); } }} placeholder='{"Client-Token":"..."}' />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={waCfg.is_active} onCheckedChange={(v) => setWaCfg({ ...waCfg, is_active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={saveWa}>Salvar</Button>
              <Button variant="outline" onClick={testWa} disabled={testing}>{testing ? "Testando..." : "Testar Conexão"}</Button>
              <Button variant="outline" onClick={() => configureWebhook()} disabled={configuringWebhook || waCfg.api_type !== "z-api"}>
                {configuringWebhook ? "Configurando..." : "Sincronizar recebimento Z-API"}
              </Button>
              <Button variant="outline" onClick={() => setTestMsgOpen(true)}><Send className="h-4 w-4 mr-1" />Enviar mensagem teste</Button>
            </div>
          </Card>

          {testMsgOpen && (
            <Card className="p-4 space-y-3 border-primary/40">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Disparar mensagem de teste</h3>
                <Button size="sm" variant="ghost" onClick={() => setTestMsgOpen(false)}>Fechar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Envia uma mensagem real através do provedor configurado. Use seu próprio número para validar.</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label>Número (com DDI+DDD, só dígitos)</Label>
                  <Input value={testMsgPhone} onChange={(e) => setTestMsgPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div>
                  <Label>Mensagem</Label>
                  <Textarea rows={2} value={testMsgContent} onChange={(e) => setTestMsgContent(e.target.value)} />
                </div>
                <Button onClick={sendTestMessage} disabled={testMsgSending}>
                  {testMsgSending ? "Enviando..." : "Disparar agora"}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-6 space-y-3 border-primary/30">
            <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" />Webhook de Recebimento</h3>
            <p className="text-sm text-muted-foreground">No Z-API, o webhook "Ao receber" precisa apontar para a URL abaixo. Use o botão “Sincronizar recebimento Z-API” para configurar automaticamente.</p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Quando o WhatsApp receber uma mensagem, ela será salva no Chat em tempo real e o agente ativo responderá se a IA estiver ligada.</p>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold">Criar nova API Key</h3>
            <div className="flex gap-2">
              <Input placeholder="Ex: WhatsApp Z-API" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} />
              <Button onClick={createApiKey}>Gerar</Button>
            </div>
            {newKeyValue && (
              <div className="p-3 rounded-md bg-primary/10 border border-primary space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Copie agora — não será exibida novamente:</p>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 rounded bg-background text-xs font-mono break-all">{newKeyValue}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(newKeyValue)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
          <Card className="p-4">
            {apiKeys.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma chave criada</p> : (
              <ul className="divide-y divide-border">
                {apiKeys.map(k => (
                  <li key={k.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{k.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{k.key_preview}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={k.is_active ? "default" : "secondary"}>{k.is_active ? "Ativa" : "Inativa"}</Badge>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await supabase.from("api_keys").delete().eq("id", k.id);
                        setApiKeys(apiKeys.filter(x => x.id !== k.id));
                      }}>Excluir</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Agentes de IA</h3>
              <p className="text-xs text-muted-foreground">Crie agentes especializados (atendimento, prospecção, SDR, closer) com identidade, comportamento, roteamento de funil e base de conhecimento.</p>
            </div>
            <Button onClick={() => { setEditingAgent(null); setAgentBuilderOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Novo Agente
            </Button>
          </div>
          <Card className="p-4">
            {agents.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum agente criado ainda</p>
                <Button className="mt-3" onClick={() => { setEditingAgent(null); setAgentBuilderOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Criar primeiro agente
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {agents.map(a => (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.name} {a.display_name && <span className="text-muted-foreground">({a.display_name})</span>}</p>
                      <p className="text-xs text-muted-foreground">{a.type} · {a.model} · tokens: {a.total_tokens_used || 0}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Ativo" : "Inativo"}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingAgent(a); setAgentBuilderOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir agente?")) return;
                        await supabase.from("ai_agents").delete().eq("id", a.id);
                        setAgents(agents.filter(x => x.id !== a.id));
                      }}>Excluir</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="flows"><FlowsBuilder /></TabsContent>
        <TabsContent value="aikeys"><AIProviderSettings /></TabsContent>
        <TabsContent value="import"><LeadImporter /></TabsContent>
        <TabsContent value="campaigns"><CampaignsList /></TabsContent>
        <TabsContent value="chatauto"><ChatAutomationsTab /></TabsContent>
      </Tabs>

      <AgentBuilder
        open={agentBuilderOpen}
        onOpenChange={setAgentBuilderOpen}
        agent={editingAgent}
        onSaved={() => { reloadAgents(); setAgentBuilderOpen(false); }}
      />
    </div>
  );
}
