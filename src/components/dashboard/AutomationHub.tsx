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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { MessageCircle, Key, Bot, Zap, Copy, CheckCircle2, AlertCircle, Upload, Megaphone, Workflow, KeyRound, Send, Plus, Pencil, GitBranch, Info, Eye, EyeOff, ChevronDown, ChevronRight, Trash2, Save, FlaskConical, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import LeadImporter from "./automation/LeadImporter";
import ImportedListsViewer from "./automation/ImportedListsViewer";
import CreditsBadge from "./automation/CreditsBadge";
import AgentTemplatesModal, { AgentTemplate } from "./automation/AgentTemplatesModal";
import CampaignsList from "./automation/CampaignsList";
import AIProviderSettings from "./automation/AIProviderSettings";
import AgentBuilder from "./automation/AgentBuilder";
import FlowsBuilder from "./automation/FlowsBuilder";

// Reusable info tooltip with step-by-step content (hover or focus to view)
function InfoHint({ title, steps }: { title: string; steps: string[] }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`Ajuda: ${title}`} className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm text-left">
          <p className="font-semibold text-xs mb-1">{title}</p>
          <ol className="list-decimal list-inside text-xs space-y-1">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Sensitive input with show/hide toggle + copy button
function SecretInput({ value, onChange, placeholder, allowCopy = true }: { value: string; onChange: (v: string) => void; placeholder?: string; allowCopy?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-1">
      <Input type={show ? "text" : "password"} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
      <Button type="button" size="icon" variant="outline" onClick={() => setShow(s => !s)} title={show ? "Esconder" : "Mostrar"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
      {allowCopy && value && (
        <Button type="button" size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copiado!"); }} title="Copiar">
          <Copy className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

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
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [testMsgOpen, setTestMsgOpen] = useState(false);
  const [testMsgPhone, setTestMsgPhone] = useState("");
  const [testMsgContent, setTestMsgContent] = useState("Olá! Esta é uma mensagem de teste do meu CRM. ✅");
  const [testMsgSending, setTestMsgSending] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [expandedConn, setExpandedConn] = useState<string | null>(null);
  const [draftConn, setDraftConn] = useState<any | null>(null); // unsaved new connection
  const [savingId, setSavingId] = useState<string | null>(null);

  const webhookUrl = `https://jdsomjwynxetccrcdszt.supabase.co/functions/v1/webhook-receiver`;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [cfgs, keys, ags, providers, pls, sts] = await Promise.all([
        supabase.from("whatsapp_configs").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ai_provider_configs").select("*").eq("user_id", user.id),
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      ]);
      const list = cfgs.data || [];
      setWaConfigs(list);
      if (list[0]) setWaCfg(list[0]);
      setApiKeys(keys.data || []);
      setAgents(ags.data || []);
      setProviderKeys(providers.data || []);
      setPipelines(pls.data || []);
      setStages(sts.data || []);
    })();
  }, [user]);

  const reloadWaConfigs = async () => {
    if (!user) return;
    const { data } = await supabase.from("whatsapp_configs").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    setWaConfigs(data || []);
    if (data && waCfg?.id) {
      const found = data.find((c: any) => c.id === waCfg.id);
      if (found) setWaCfg(found);
    }
  };

  const newConnection = () => {
    setWaCfg({ api_type: "z-api", base_url: "", api_token: "", instance_id: "", is_active: true, auto_create_lead: true, ai_auto_reply: true, label: `Conexão ${waConfigs.length + 1}` });
  };

  const deleteConnection = async (id: string) => {
    if (!confirm("Excluir esta conexão WhatsApp?")) return;
    const { error } = await supabase.from("whatsapp_configs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Conexão excluída");
    const remaining = waConfigs.filter(c => c.id !== id);
    setWaConfigs(remaining);
    if (waCfg?.id === id) setWaCfg(remaining[0] || { api_type: "z-api", base_url: "", api_token: "", instance_id: "", is_active: true, auto_create_lead: true, label: "Principal" });
  };

  const toggleConnectionActive = async (cfg: any) => {
    const { error } = await supabase.from("whatsapp_configs").update({ is_active: !cfg.is_active }).eq("id", cfg.id);
    if (error) { toast.error(error.message); return; }
    reloadWaConfigs();
  };

  const saveWa = async () => {
    if (!user) return;
    // Validate duplicate instance_id (a single Z-API instance cannot route to two CRM accounts)
    if (waCfg.instance_id) {
      const { data: dup } = await supabase
        .from("whatsapp_configs")
        .select("id, user_id")
        .eq("instance_id", waCfg.instance_id)
        .eq("is_active", true);
      const conflict = (dup || []).find((d: any) => d.id !== waCfg.id);
      if (conflict) {
        toast.error("Este Instance ID já está ativo em outra conexão. Desative-a antes ou use outra instância.");
        return;
      }
    }
    const payload = { ...waCfg, user_id: user.id };
    delete payload.created_at;
    delete payload.updated_at;
    let error: any = null;
    if (waCfg.id) {
      const r = await supabase.from("whatsapp_configs").update(payload).eq("id", waCfg.id);
      error = r.error;
    } else {
      const r = await supabase.from("whatsapp_configs").insert(payload).select().single();
      error = r.error;
      if (r.data) setWaCfg(r.data);
    }
    if (error) toast.error(error.message);
    else {
      toast.success("Conexão salva!");
      await reloadWaConfigs();
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

  // ===== Per-config (inline) helpers =====
  const updateLocalConn = (id: string | null, patch: any) => {
    if (id === null) {
      setDraftConn((d: any) => ({ ...d, ...patch }));
    } else {
      setWaConfigs(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    }
  };

  const saveConn = async (cfg: any) => {
    if (!user) return;
    setSavingId(cfg.id || "__draft__");
    try {
      if (cfg.instance_id) {
        const { data: dup } = await supabase.from("whatsapp_configs").select("id, user_id").eq("instance_id", cfg.instance_id).eq("is_active", true);
        const conflict = (dup || []).find((d: any) => d.id !== cfg.id);
        if (conflict) { toast.error("Este Instance ID já está ativo em outra conexão."); return; }
      }
      const payload = { ...cfg, user_id: user.id };
      delete payload.created_at; delete payload.updated_at;
      if (cfg.id) {
        const { error } = await supabase.from("whatsapp_configs").update(payload).eq("id", cfg.id);
        if (error) { toast.error(error.message); return; }
        toast.success("Conexão salva!");
      } else {
        const { data, error } = await supabase.from("whatsapp_configs").insert(payload).select().single();
        if (error) { toast.error(error.message); return; }
        toast.success("Conexão criada!");
        setDraftConn(null);
        if (data) setExpandedConn(data.id);
      }
      await reloadWaConfigs();
      if (cfg.api_type === "z-api" && cfg.is_active) configureWebhook(cfg, false);
    } finally { setSavingId(null); }
  };

  const testConn = async (cfg: any) => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", { body: cfg });
    setTesting(false);
    if (error) toast.error(error.message);
    else if (data?.ok) toast.success("Conexão OK!");
    else toast.error(`Falhou: ${data?.body || data?.error || "erro"}`);
  };

  const sendTestFor = async (cfg: any) => {
    if (!testMsgPhone || !testMsgContent) { toast.error("Preencha telefone e mensagem"); return; }
    setTestMsgSending(true);
    const { data, error } = await supabase.functions.invoke("test-whatsapp", {
      body: { mode: "send_test", config: cfg, phone: testMsgPhone, message: testMsgContent },
    });
    setTestMsgSending(false);
    if (error) { toast.error(error.message); return; }
    if (data?.ok) { toast.success("Mensagem enviada!"); setTestMsgOpen(false); }
    else toast.error(`Falhou: ${data?.body || data?.error || "erro"}`);
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
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-primary" /> Automação</h2>
          <p className="text-sm text-muted-foreground">Conecte WhatsApp, configure agentes IA e dispare campanhas de prospecção ativa.</p>
        </div>
        <CreditsBadge />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 mr-1" />WhatsApp</TabsTrigger>
          <TabsTrigger value="apikeys"><Key className="h-4 w-4 mr-1" />API Keys</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="h-4 w-4 mr-1" />Agentes IA</TabsTrigger>
          <TabsTrigger value="flows"><GitBranch className="h-4 w-4 mr-1" />Fluxos</TabsTrigger>
          <TabsTrigger value="aikeys"><KeyRound className="h-4 w-4 mr-1" />Provedores</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="h-4 w-4 mr-1" />Campanhas</TabsTrigger>
          <TabsTrigger value="import"><Upload className="h-4 w-4 mr-1" />Importar Leads</TabsTrigger>
          <TabsTrigger value="imported"><CheckCircle2 className="h-4 w-4 mr-1" />Importados</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />Conexões WhatsApp
                  <InfoHint title="Como conectar um WhatsApp" steps={[
                    "Clique em 'Nova conexão' e dê um nome (ex: Comercial).",
                    "Escolha o provedor (Z-API recomendado) e cole a URL completa da instância no campo 'URL Base'.",
                    "Cole o Token e (Z-API) o Client-Token da aba Segurança.",
                    "Escolha o agente IA padrão e o pipeline para novos leads.",
                    "Clique em Salvar — o webhook é configurado automaticamente.",
                    "Teste com 'Enviar mensagem teste' usando seu próprio número.",
                    "Cada Instance ID só pode estar ATIVO em uma conta por vez.",
                  ]} />
                </h3>
                <p className="text-xs text-muted-foreground">Cada conexão é independente, com seu próprio agente, pipeline e tokens.</p>
              </div>
              <Button size="sm" onClick={() => {
                if (draftConn) return;
                const fresh = { id: null, api_type: "z-api", base_url: "", api_token: "", instance_id: "", is_active: true, auto_create_lead: true, ai_auto_reply: true, label: `Conexão ${waConfigs.length + 1}`, extra_headers: {} };
                setDraftConn(fresh);
                setExpandedConn("__draft__");
              }}>
                <Plus className="h-4 w-4 mr-1" />Nova conexão
              </Button>
            </div>

            {(waConfigs.length === 0 && !draftConn) ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma conexão criada. Clique em "Nova conexão" para começar.</p>
            ) : (
              <div className="space-y-2">
                {[...(draftConn ? [draftConn] : []), ...waConfigs].map((c: any) => {
                  const key = c.id || "__draft__";
                  const isOpen = expandedConn === key;
                  const isDraft = !c.id;
                  const hint = PROVIDER_HINTS[c.api_type] || PROVIDER_HINTS["z-api"];
                  return (
                    <Collapsible key={key} open={isOpen} onOpenChange={(o) => setExpandedConn(o ? key : null)}>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-secondary/30">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 flex-1 text-left">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {c.label || "(sem nome)"} {isDraft && <span className="text-[10px] text-amber-600 ml-1">• não salva</span>}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">{c.api_type} · {c.instance_id ? `ID: ${c.instance_id.slice(0, 6)}...` : (c.base_url || "—")}</p>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <div className="flex items-center gap-2">
                            {!isDraft && (
                              <>
                                <Switch checked={c.is_active} onCheckedChange={() => toggleConnectionActive(c)} />
                                <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">{c.is_active ? "Ativa" : "Inativa"}</Badge>
                                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteConnection(c.id); }} title="Excluir">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            {isDraft && (
                              <Button size="sm" variant="ghost" onClick={() => { setDraftConn(null); setExpandedConn(null); }}>Cancelar</Button>
                            )}
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="p-4 space-y-3 bg-background border-t border-border">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="col-span-2">
                                <Label className="text-xs">Nome desta conexão</Label>
                                <Input value={c.label || ""} onChange={(e) => updateLocalConn(c.id, { label: e.target.value })} placeholder="Ex: Comercial · 11 9999-9999" />
                              </div>
                              <div>
                                <Label className="text-xs">Tipo de API</Label>
                                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={c.api_type} onChange={(e) => updateLocalConn(c.id, { api_type: e.target.value })}>
                                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">{hint?.instanceLabel || "Instance ID"}</Label>
                                <Input value={c.instance_id || ""} onChange={(e) => updateLocalConn(c.id, { instance_id: e.target.value })} placeholder="3ABC..." className="font-mono text-xs" />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs">URL Base da API</Label>
                                <Input value={c.base_url || ""} onChange={(e) => updateLocalConn(c.id, { base_url: e.target.value })} placeholder={hint?.base} className="font-mono text-xs" />
                                {c.api_type === "z-api" && (
                                  <p className="text-[11px] text-muted-foreground mt-1">💡 Cole a URL completa da "API da instância mobile" — o sistema extrai Instance ID e Token automaticamente.</p>
                                )}
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs flex items-center gap-1">{hint?.tokenLabel || "Token / API Key"} <Eye className="h-3 w-3 text-muted-foreground" /></Label>
                                <SecretInput value={c.api_token || ""} onChange={(v) => updateLocalConn(c.id, { api_token: v })} placeholder="Token..." />
                              </div>
                              {c.api_type === "z-api" && (
                                <div className="col-span-2">
                                  <Label className="text-xs">Client-Token (Segurança Z-API)</Label>
                                  <SecretInput
                                    value={(typeof c.extra_headers === "object" ? c.extra_headers?.["Client-Token"] : "") || ""}
                                    onChange={(v) => {
                                      const cur = typeof c.extra_headers === "object" ? { ...c.extra_headers } : {};
                                      cur["Client-Token"] = v;
                                      updateLocalConn(c.id, { extra_headers: cur });
                                    }}
                                    placeholder="Fa1234567890abcdef..."
                                  />
                                  <p className="text-[11px] text-muted-foreground mt-1">Painel Z-API → sua instância → aba "Segurança" → copie o Client-Token.</p>
                                </div>
                              )}

                              <div>
                                <Label className="text-xs">Pipeline padrão</Label>
                                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={c.default_pipeline_id || ""} onChange={(e) => updateLocalConn(c.id, { default_pipeline_id: e.target.value || null, default_stage_id: null })}>
                                  <option value="">— Padrão —</option>
                                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">Etapa inicial</Label>
                                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={c.default_stage_id || ""} onChange={(e) => updateLocalConn(c.id, { default_stage_id: e.target.value || null })}>
                                  <option value="">Primeira etapa</option>
                                  {stages.filter(s => !c.default_pipeline_id || s.pipeline_id === c.default_pipeline_id).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-2 flex items-center gap-2">
                                <Switch checked={c.auto_create_lead} onCheckedChange={(v) => updateLocalConn(c.id, { auto_create_lead: v })} />
                                <Label className="text-xs">Criar lead automaticamente ao receber primeira mensagem</Label>
                              </div>

                              <div className="col-span-2 p-3 rounded-md border border-primary/30 bg-primary/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="flex flex-col">
                                    <span className="font-semibold text-sm">🤖 Resposta automática por IA</span>
                                    <span className="text-[11px] text-muted-foreground font-normal">Agente abaixo responde toda mensagem recebida.</span>
                                  </Label>
                                  <Switch checked={c.ai_auto_reply !== false} onCheckedChange={(v) => updateLocalConn(c.id, { ai_auto_reply: v })} />
                                </div>
                                <div>
                                  <Label className="text-xs">Agente IA desta conexão</Label>
                                  <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={c.default_agent_id || ""} onChange={(e) => updateLocalConn(c.id, { default_agent_id: e.target.value || null })}>
                                    <option value="">Primeiro agente ativo</option>
                                    {agents.filter(a => a.is_active).map(a => (
                                      <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                                    ))}
                                  </select>
                                  {agents.filter(a => a.is_active).length === 0 && (
                                    <p className="text-[11px] text-amber-600 mt-1">⚠ Nenhum agente IA ativo. Crie um na aba "Agentes IA".</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
                              <Button size="sm" onClick={() => saveConn(c)} disabled={savingId === (c.id || "__draft__")}>
                                <Save className="h-4 w-4 mr-1" />{savingId === (c.id || "__draft__") ? "Salvando..." : "Salvar"}
                              </Button>
                              {!isDraft && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => testConn(c)} disabled={testing}>
                                    <FlaskConical className="h-4 w-4 mr-1" />{testing ? "Testando..." : "Testar"}
                                  </Button>
                                  {c.api_type === "z-api" && (
                                    <Button size="sm" variant="outline" onClick={() => configureWebhook(c)} disabled={configuringWebhook}>
                                      {configuringWebhook ? "..." : "Sincronizar webhook"}
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => { setWaCfg(c); setTestMsgOpen(true); }}>
                                    <Send className="h-4 w-4 mr-1" />Mensagem teste
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </Card>

          {testMsgOpen && (
            <Card className="p-4 space-y-3 border-primary/40">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Disparar mensagem de teste</h3>
                <Button size="sm" variant="ghost" onClick={() => setTestMsgOpen(false)}>Fechar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Envia mensagem real através de <strong>{waCfg?.label || "conexão selecionada"}</strong>. Use seu próprio número.</p>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label>Número (com DDI+DDD, só dígitos)</Label>
                  <Input value={testMsgPhone} onChange={(e) => setTestMsgPhone(e.target.value)} placeholder="5511999999999" />
                </div>
                <div>
                  <Label>Mensagem</Label>
                  <Textarea rows={2} value={testMsgContent} onChange={(e) => setTestMsgContent(e.target.value)} />
                </div>
                <Button onClick={() => sendTestFor(waCfg)} disabled={testMsgSending}>
                  {testMsgSending ? "Enviando..." : "Disparar agora"}
                </Button>
              </div>
            </Card>
          )}

          <Card className="p-6 space-y-3 border-primary/30">
            <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" />Webhook de Recebimento</h3>
            <p className="text-sm text-muted-foreground">No Z-API, o webhook "Ao receber" precisa apontar para a URL abaixo. Use o botão "Sincronizar webhook" em cada conexão para configurar automaticamente.</p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-4">
          <Card className="p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              Criar nova API Key
              <InfoHint title="Para que serve uma API Key?" steps={[
                "Permite que sistemas externos (n8n, Zapier, Make, scripts próprios) enviem dados para o seu CRM com segurança.",
                "Use no header 'x-api-key' ao chamar o webhook-receiver para entregar mensagens/leads em nome da sua conta.",
                "Não é necessária se você só usa Z-API (a instância já identifica sua conta).",
                "Crie uma chave por integração para poder revogar individualmente.",
                "A chave aparece UMA única vez — copie e guarde em local seguro.",
              ]} />
            </h3>
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
              <h3 className="font-semibold flex items-center gap-2">
                Agentes de IA
                <InfoHint title="Como criar um Agente IA" steps={[
                  "Clique em 'Novo Agente' e dê um nome + função (atendimento, SDR, closer, etc).",
                  "Defina personalidade, tom de voz e o prompt do sistema (instruções de comportamento).",
                  "Escolha o provedor de IA (Lovable, OpenAI, Groq, Gemini) e o modelo.",
                  "Em 'Voz & Mídia' habilite transcrição de áudio, leitura de imagens e voz para responder.",
                  "Adicione base de conhecimento (textos/PDFs) para respostas contextuais.",
                  "Ative o agente e vincule a uma conexão WhatsApp para começar a responder automaticamente.",
                ]} />
              </h3>
              <p className="text-xs text-muted-foreground">Crie agentes especializados (atendimento, prospecção, SDR, closer) com identidade, comportamento, roteamento de funil e base de conhecimento.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1" />Templates prontos
              </Button>
              <Button onClick={() => { setEditingAgent(null); setAgentBuilderOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Novo Agente
              </Button>
            </div>
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

        <TabsContent value="flows" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            Fluxos de conversa
            <InfoHint title="Como usar Fluxos" steps={[
              "Fluxos são roteiros automáticos: ao receber certas palavras-chave, o sistema segue passos pré-definidos.",
              "Crie nós (mensagem, pergunta, condição, ação) e conecte-os arrastando.",
              "Vincule a um agente IA para que ele assuma após o fluxo terminar.",
              "Use para qualificação inicial, FAQ, agendamentos ou coleta de dados.",
            ]} />
          </div>
          <FlowsBuilder />
        </TabsContent>
        <TabsContent value="aikeys" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            Provedores de IA
            <InfoHint title="Como cadastrar um Provedor" steps={[
              "Adicione chaves de IA externas (OpenAI, Groq, Gemini) ou use a Lovable AI (sem chave).",
              "Defina um modelo padrão (ex: gpt-4o-mini, llama-3.3-70b, gemini-2.0-flash).",
              "Marque um como padrão — será usado pelos agentes que não tiverem provedor próprio.",
              "Cada agente pode escolher seu provedor + modelo na aba 'Agentes IA'.",
            ]} />
          </div>
          <AIProviderSettings />
        </TabsContent>
        <TabsContent value="import"><LeadImporter /></TabsContent>
        <TabsContent value="imported"><ImportedListsViewer /></TabsContent>
        <TabsContent value="campaigns" className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            Campanhas de prospecção
            <InfoHint title="Como rodar uma Campanha" steps={[
              "Importe contatos no módulo CRM → Importar (lista CSV ou números manuais).",
              "Crie uma campanha, escolha o agente IA que conduzirá a conversa e o template inicial.",
              "Defina horário comercial, intervalo entre disparos e limite diário (evita banimento).",
              "Ative follow-ups automáticos para reativar quem não respondeu.",
              "Acompanhe métricas: enviadas, respondidas, convertidas em leads quentes.",
            ]} />
          </div>
          <CampaignsList />
        </TabsContent>
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
