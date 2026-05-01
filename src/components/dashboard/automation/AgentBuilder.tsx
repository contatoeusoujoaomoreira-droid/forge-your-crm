import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle, Zap, User, Brain, GitBranch, BookOpen, FlaskConical,
  Plus, Trash2, Link2, FileText, Image as ImageIcon, Globe, Send, Loader2, Mic, Play
} from "lucide-react";
import AgentRoutingAdvanced from "./AgentRoutingAdvanced";

const VOICE_PROVIDERS: Record<string, { label: string; voices: { id: string; label: string }[]; help?: string }> = {
  omni: {
    label: "Omni Audio (nativo — recomendado)",
    help: "Provedor nativo do sistema. Não requer chaves externas — usa créditos da plataforma.",
    voices: [
      { id: "alloy", label: "Alloy (neutra, equilibrada)" },
      { id: "echo", label: "Echo (masculina, suave)" },
      { id: "fable", label: "Fable (masculina, expressiva)" },
      { id: "onyx", label: "Onyx (masculina, grave)" },
      { id: "nova", label: "Nova (feminina, jovem)" },
      { id: "shimmer", label: "Shimmer (feminina, calorosa)" },
    ],
  },
  openai: {
    label: "OpenAI TTS",
    help: "Requer chave OpenAI configurada em 'Provedores de IA'.",
    voices: [
      { id: "alloy", label: "Alloy" },
      { id: "echo", label: "Echo" },
      { id: "fable", label: "Fable" },
      { id: "onyx", label: "Onyx" },
      { id: "nova", label: "Nova" },
      { id: "shimmer", label: "Shimmer" },
    ],
  },
  elevenlabs: {
    label: "ElevenLabs (vozes premium em PT-BR)",
    help: "Requer chave ElevenLabs em 'Provedores'. Vozes top em português brasileiro.",
    voices: [
      { id: "JBFqnCBsd6RMkjVDRZzb", label: "George (masculina, séria)" },
      { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (feminina, jovem)" },
      { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (feminina, suave)" },
      { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (masculina, jovem)" },
      { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice (feminina, expressiva)" },
      { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica (feminina, calorosa)" },
    ],
  },
};

const AGENT_TYPES = [
  { id: "atendimento", label: "Atendimento", icon: "🎧" },
  { id: "prospeccao", label: "Prospecção", icon: "🎯" },
  { id: "sdr", label: "SDR (Qualificação)", icon: "🧲" },
  { id: "closer", label: "Closer (Fechamento)", icon: "💼" },
  { id: "suporte", label: "Suporte", icon: "🛠️" },
];

const PERSONALITIES = ["Profissional", "Empático", "Direto", "Consultivo", "Amigável", "Formal"];
const STYLES = ["Consultivo", "Direto", "Educativo", "Persuasivo", "Conversacional"];
const TONES = ["Cordial", "Casual", "Formal", "Entusiasta", "Sério"];

const MODEL_OPTIONS_BY_PROVIDER: Record<string, { id: string; label: string }[]> = {
  lovable: [
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido — recomendado)" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (alta qualidade)" },
    { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { id: "openai/gpt-5", label: "GPT-5 (premium)" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B (rápido)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
};

const normalizeModelForProvider = (provider: string, model?: string | null) => {
  const raw = (model || "").trim();
  if (raw === "google/gemini-3-flash-preview") return provider === "groq" ? "llama-3.3-70b-versatile" : provider === "openai" ? "gpt-4o-mini" : provider === "gemini" ? "gemini-2.0-flash" : "google/gemini-2.5-flash";
  if (raw === "gemini-2.0-flash-exp") return "gemini-2.0-flash";
  const ids = (MODEL_OPTIONS_BY_PROVIDER[provider] || []).map((m) => m.id);
  return ids.includes(raw) ? raw : (ids[0] || "google/gemini-2.5-flash");
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent?: any;
  onSaved: () => void;
}

export default function AgentBuilder({ open, onOpenChange, agent, onSaved }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState("identidade");
  const [saving, setSaving] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [knTitle, setKnTitle] = useState("");
  const [knContent, setKnContent] = useState("");
  const [knType, setKnType] = useState<"text" | "site" | "link" | "document" | "image">("text");
  const [knUrl, setKnUrl] = useState("");
  const [knCategory, setKnCategory] = useState("");
  const [knDescription, setKnDescription] = useState("");
  const [knKeywords, setKnKeywords] = useState("");
  const [knMediaUrls, setKnMediaUrls] = useState<string[]>([]);
  const [knLinks, setKnLinks] = useState<{ title: string; url: string }[]>([]);
  const [knNewLinkTitle, setKnNewLinkTitle] = useState("");
  const [knNewLinkUrl, setKnNewLinkUrl] = useState("");
  const [knUploading, setKnUploading] = useState(false);
  const [testMessages, setTestMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);
  const [elevenKeyInput, setElevenKeyInput] = useState("");
  const [elevenSaving, setElevenSaving] = useState(false);
  const [elevenConnected, setElevenConnected] = useState(false);

  const [form, setForm] = useState<any>({
    type: "atendimento",
    name: "",
    display_name: "",
    personality: "Profissional",
    style: "Consultivo",
    tone: "Cordial",
    response_delay_seconds: 15,
    ai_provider_config_id: "",
    model: "google/gemini-2.5-flash",
    system_prompt: "",
    rules: "",
    examples: "",
    objections: "",
    pipeline_id: "",
    stage_id: "",
    routing_rules: [],
    handoff_enabled: false,
    handoff_keywords: "",
    handoff_mode: "pause",
    handoff_pause_minutes: 30,
    stop_words: "",
    inactivity_timeout_minutes: null,
    message_limit: null,
    business_hours: { enabled: false, start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
    auto_close_enabled: false,
    auto_close_message: "",
    is_active: true,
    voice_enabled: false,
    voice_provider: "omni",
    voice_id: "alloy",
    reply_to_audio_with_audio: true,
    transcribe_audio: true,
    understand_images: true,
    notification_phone: "",
    followup_enabled: false,
    followup_max_attempts: 3,
    followup_interval_minutes: 120,
    followup_rescue_message: "",
    linked_schedule_id: null,
    schedule_can_query: false,
    schedule_can_book: false,
    schedule_keywords: "",
    intent_routing_rules: [],
  });

  const [modelCosts, setModelCosts] = useState<any[]>([]);
  const [ownKeys, setOwnKeys] = useState<any[]>([]);
  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const [pl, st, pr, mc, uk, sch, ag] = await Promise.all([
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("ai_provider_configs").select("*").eq("user_id", user.id),
        supabase.from("model_credit_costs").select("*").eq("is_active", true),
        supabase.from("user_api_keys").select("provider,scope,label,is_active").eq("user_id", user.id).eq("is_active", true),
        supabase.from("schedules").select("id, title").order("created_at", { ascending: false }),
        supabase.from("ai_agents").select("id, name, is_active").eq("user_id", user.id).eq("is_active", true),
      ]);
      // Synthesize provider entries from own keys (so user can pick "use my OpenAI key")
      const synthetic = (uk.data || [])
        .filter((k: any) => {
          const sc = (k.scope || "all").split(",").map((s: string) => s.trim());
          return sc.includes("all") || sc.includes("chat");
        })
        .map((k: any) => ({
          id: `own:${k.provider}`,
          provider: k.provider,
          label: `Minha chave (${k.provider})`,
          is_default: false,
          is_own_key: true,
        }));
      const all = [...(pr.data || []), ...synthetic];
      setProviders(all);
      setOwnKeys(uk.data || []);
      setPipelines(pl.data || []);
      setStages(st.data || []);
      setModelCosts(mc.data || []);
      setSchedules(sch.data || []);
      setAllAgents(ag.data || []);
      setElevenConnected((pr.data || []).some((p: any) => p.provider === 'elevenlabs' && p.api_key_encrypted));
    })();
  }, [user, open]);

  useEffect(() => {
    if (agent) {
      setForm({
        ...agent,
        routing_rules: agent.routing_rules || [],
        business_hours: agent.business_hours || { enabled: false, start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
      });
      loadKnowledge(agent.id);
    } else {
      setForm({
        type: "atendimento", name: "", display_name: "", personality: "Profissional",
        style: "Consultivo", tone: "Cordial", response_delay_seconds: 15,
        ai_provider_config_id: "", model: "google/gemini-2.5-flash",
        system_prompt: "", rules: "", examples: "", objections: "",
        pipeline_id: "", stage_id: "", routing_rules: [],
        handoff_enabled: false, handoff_keywords: "", handoff_mode: "pause", handoff_pause_minutes: 30,
        stop_words: "",
        inactivity_timeout_minutes: null, message_limit: null,
        business_hours: { enabled: false, start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
        auto_close_enabled: false, auto_close_message: "", is_active: true,
        voice_enabled: false, voice_provider: "omni", voice_id: "alloy",
        reply_to_audio_with_audio: true, transcribe_audio: true, understand_images: true,
        notification_phone: "", followup_enabled: false, followup_max_attempts: 3,
        followup_interval_minutes: 120, followup_rescue_message: "",
        linked_schedule_id: null, schedule_can_query: false, schedule_can_book: false,
        schedule_keywords: "", intent_routing_rules: [],
      });
      setKnowledge([]);
    }
    setTab("identidade");
    setTestMessages([]);
  }, [agent, open]);

  const loadKnowledge = async (agentId: string) => {
    const { data } = await supabase.from("agent_knowledge").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
    setKnowledge(data || []);
  };

  const currentProvider = providers.find((p) => p.id === form.ai_provider_config_id);
  const providerType = currentProvider?.provider || "lovable";
  const modelOptions = MODEL_OPTIONS_BY_PROVIDER[providerType] || MODEL_OPTIONS_BY_PROVIDER.lovable;

  const save = async () => {
    if (!user || !form.name) {
      toast.error("Nome do agente é obrigatório");
      return;
    }
    setSaving(true);
    const payload: any = { ...form, user_id: user.id, model: normalizeModelForProvider(providerType, form.model) };
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.total_tokens_used;
    delete payload.is_own_key;
    // synthetic "own:<provider>" provider id isn't a real FK — store provider type as model prefix instead
    if (!payload.ai_provider_config_id || String(payload.ai_provider_config_id).startsWith("own:")) {
      payload.ai_provider_config_id = null;
    }
    if (!payload.pipeline_id) payload.pipeline_id = null;
    if (!payload.stage_id) payload.stage_id = null;

    const result = agent?.id
      ? await supabase.from("ai_agents").update(payload).eq("id", agent.id).select().single()
      : await supabase.from("ai_agents").insert(payload).select().single();
    setSaving(false);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(agent ? "Agente atualizado!" : "Agente criado!");
    if (!agent && result.data) {
      // Switch to editing mode for the new agent so knowledge can be added
      onSaved();
      return;
    }
    onSaved();
  };

  const addKnowledge = async () => {
    if (!agent?.id) { toast.error("Salve o agente primeiro"); return; }
    if (!user) return;
    const keywordsArr = knKeywords.split(",").map(s => s.trim()).filter(Boolean);

    // Validation per type
    if (knType === "text" && !knContent.trim()) { toast.error("Conteúdo de texto obrigatório"); return; }
    if (knType === "site" && !knUrl.trim()) { toast.error("Informe a URL do site"); return; }
    if (knType === "link" && knLinks.length === 0) { toast.error("Adicione ao menos um link"); return; }
    if (knType === "image" && knMediaUrls.length === 0) { toast.error("Anexe ao menos uma imagem"); return; }

    // Image type: create one knowledge item per image so each can have its own description
    if (knType === "image") {
      for (const url of knMediaUrls) {
        await supabase.from("agent_knowledge").insert({
          agent_id: agent.id, user_id: user.id, type: "image",
          title: knTitle || "Imagem", content: knDescription || "",
          source_url: url, status: "ready",
          category: knCategory || null, description: knDescription || null,
          keywords: keywordsArr, media_urls: [url], external_links: [],
        } as any);
      }
      toast.success(`${knMediaUrls.length} imagem(ns) adicionada(s)`);
    } else {
      const item: any = {
        agent_id: agent.id,
        user_id: user.id,
        type: knType === "site" ? "url" : knType, // keep DB compat: site stored as 'url'
        title: knTitle || (knType === "site" ? knUrl : knType === "link" ? "Coleção de links" : "Item"),
        content: knType === "site" ? knUrl : knContent,
        source_url: knType === "site" ? knUrl : null,
        status: knType === "site" ? "processing" : "ready",
        category: knCategory || null,
        description: knDescription || null,
        keywords: keywordsArr,
        media_urls: knMediaUrls,
        external_links: knLinks,
      };
      const { data: row, error } = await supabase.from("agent_knowledge").insert(item as any).select().single();
      if (error) { toast.error(error.message); return; }
      toast.success("Adicionado à base");
      if (knType === "site" && row) {
        supabase.functions.invoke("extract-knowledge", { body: { knowledge_id: (row as any).id } })
          .then(() => loadKnowledge(agent.id));
      }
    }

    setKnTitle(""); setKnContent(""); setKnUrl("");
    setKnCategory(""); setKnDescription(""); setKnKeywords("");
    setKnMediaUrls([]); setKnLinks([]);
    loadKnowledge(agent.id);
  };

  const removeKnowledge = async (id: string) => {
    await supabase.from("agent_knowledge").delete().eq("id", id);
    if (agent?.id) loadKnowledge(agent.id);
  };

  const saveElevenLabsKey = async () => {
    if (!user || !elevenKeyInput.trim()) { toast.error("Informe sua API Key do ElevenLabs"); return; }
    setElevenSaving(true);
    try {
      const { error } = await supabase.from("ai_provider_configs").insert({
        user_id: user.id,
        provider: "elevenlabs",
        label: "ElevenLabs",
        api_key_encrypted: elevenKeyInput.trim(),
        is_active: true,
      });
      if (error) throw error;
      toast.success("ElevenLabs conectado!");
      setElevenKeyInput("");
      setElevenConnected(true);
    } catch (e: any) { toast.error(e.message || "Erro ao salvar chave"); }
    finally { setElevenSaving(false); }
  };

  const addRoutingRule = () => {
    setForm({ ...form, routing_rules: [...form.routing_rules, { keyword: "", pipeline_id: "", stage_id: "", description: "" }] });
  };
  const updateRoutingRule = (i: number, patch: any) => {
    const next = [...form.routing_rules]; next[i] = { ...next[i], ...patch };
    setForm({ ...form, routing_rules: next });
  };
  const removeRoutingRule = (i: number) => {
    setForm({ ...form, routing_rules: form.routing_rules.filter((_: any, idx: number) => idx !== i) });
  };

  const sendTest = async () => {
    if (!testInput.trim()) return;
    if (!form.system_prompt) { toast.error("Configure a Instrução Principal em Comportamento"); return; }
    const userMsg = { role: "user" as const, content: testInput };
    const next = [...testMessages, userMsg];
    setTestMessages(next);
    setTestInput("");
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: {
          agent_id: agent?.id,
          messages: next.map(m => ({ role: m.role, content: m.content })),
          mode: "reply",
        },
      });
      if (error) throw error;
      setTestMessages([...next, { role: "assistant", content: data?.content || "(sem resposta)" }]);
    } catch (e: any) {
      toast.error(e.message || "Erro no teste");
    } finally {
      setTesting(false);
    }
  };

  const stageOptions = stages.filter(s => !form.pipeline_id || s.pipeline_id === form.pipeline_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            {agent ? "Editar Agente" : "Novo Agente"}
          </DialogTitle>
          <DialogDescription>Configure identidade, comportamento, roteamento de funil e base de conhecimento.</DialogDescription>
        </DialogHeader>

        <Card className="p-3 bg-amber-500/10 border-amber-500/30">
          <p className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <strong>~5–10 créditos por conversa</strong>
            <span className="text-muted-foreground">· Cada resposta do agente consome créditos de IA automaticamente.</span>
          </p>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="identidade"><User className="h-4 w-4 mr-1" />Identidade</TabsTrigger>
            <TabsTrigger value="comportamento"><Brain className="h-4 w-4 mr-1" />Comportamento</TabsTrigger>
            <TabsTrigger value="voz"><Mic className="h-4 w-4 mr-1" />Voz & Mídia</TabsTrigger>
            <TabsTrigger value="roteamento"><GitBranch className="h-4 w-4 mr-1" />Roteamento</TabsTrigger>
            <TabsTrigger value="conhecimento"><BookOpen className="h-4 w-4 mr-1" />Conhecimento</TabsTrigger>
            <TabsTrigger value="testar"><FlaskConical className="h-4 w-4 mr-1" />Testar</TabsTrigger>
          </TabsList>

          {/* IDENTIDADE */}
          <TabsContent value="identidade" className="space-y-4">
            <div>
              <Label>Tipo de Agente</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {AGENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do Agente</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Atendente Noturno" />
              </div>
              <div>
                <Label>Nome de Apresentação</Label>
                <Input value={form.display_name || ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Ex: Ana, Carlos..." />
                <p className="text-xs text-muted-foreground mt-1">Como o agente se apresenta nas conversas</p>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="font-semibold mb-2">Personalidade</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Personalidade</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })}>
                    {PERSONALITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Estilo</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.style || ""} onChange={(e) => setForm({ ...form, style: e.target.value })}>
                    {STYLES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Tom</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <Label>Tempo de resposta (segundos)</Label>
              <Input type="number" min={0} max={300} value={form.response_delay_seconds || 0}
                onChange={(e) => setForm({ ...form, response_delay_seconds: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">Simula digitação (aparência humana)</p>
            </div>

            <div className="border-t pt-3 space-y-3">
              <h4 className="font-semibold">Provedor & Modelo IA</h4>
              <div>
                <Label>Provedor</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={form.ai_provider_config_id || ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    const prov = providers.find(p => p.id === id);
                    const ptype = prov?.provider || "lovable";
                    const defaultModel = MODEL_OPTIONS_BY_PROVIDER[ptype]?.[0]?.id || form.model;
                    setForm({ ...form, ai_provider_config_id: id, model: normalizeModelForProvider(ptype, prov?.default_model || defaultModel) });
                  }}>
                  <option value="">Padrão do sistema (sem chave) — usa créditos da plataforma</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.is_own_key ? "🔑 " : ""}{p.label || p.provider} {p.is_default && "⭐"} {p.is_own_key ? "(sua chave — só 1 crédito por mensagem)" : ""}
                    </option>
                  ))}
                </select>
                {currentProvider?.is_own_key && (
                  <p className="text-[11px] text-primary mt-1">✓ Usando sua chave de API — você paga direto ao provedor. Cobramos apenas 1 crédito de roteamento por mensagem.</p>
                )}
              </div>
              <div>
                <Label>Modelo IA <span className="text-[10px] text-muted-foreground font-normal">(custo em créditos por mensagem)</span></Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={normalizeModelForProvider(providerType, form.model)} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                  {modelOptions.map(m => {
                    const mc = modelCosts.find((c) => c.provider === providerType && c.model === m.id);
                    const cost = currentProvider?.is_own_key ? 1 : (mc?.credits_per_message || 1);
                    return <option key={m.id} value={m.id}>{m.label} — {cost} {cost === 1 ? "crédito" : "créditos"}/msg</option>;
                  })}
                </select>
                {(() => {
                  const cur = modelCosts.find((c) => c.provider === providerType && c.model === normalizeModelForProvider(providerType, form.model));
                  const credits = currentProvider?.is_own_key ? 1 : (cur?.credits_per_message || 1);
                  return (
                    <div className="mt-2 text-xs flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <span>💰 Custo estimado:</span>
                      <Badge variant="secondary">{credits} {credits === 1 ? "crédito" : "créditos"}</Badge>
                      <span className="text-muted-foreground">por mensagem do agente</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          {/* COMPORTAMENTO */}
          <TabsContent value="comportamento" className="space-y-4">
            <Card className="p-4 space-y-2">
              <Label className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">1</span> Instrução Principal</Label>
              <p className="text-xs text-muted-foreground">Descreva o objetivo principal do agente, o que ele deve fazer e como deve se comportar.</p>
              <Textarea rows={5} value={form.system_prompt}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="Ex: Você é um assistente de vendas da empresa X. Seu objetivo é qualificar leads, entender suas necessidades e direcionar para a solução ideal..." />
              <p className="text-xs text-muted-foreground">Variáveis disponíveis: {"{nome}"}, {"{empresa}"}, {"{telefone}"}, {"{email}"}</p>
            </Card>

            <Card className="p-4 space-y-2">
              <Label className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">2</span> Regras e Restrições</Label>
              <p className="text-xs text-muted-foreground">O que o agente NÃO deve fazer? Quais limites ele deve respeitar?</p>
              <Textarea rows={4} value={form.rules || ""}
                onChange={(e) => setForm({ ...form, rules: e.target.value })}
                placeholder="Ex: Nunca forneça descontos sem autorização. Não compartilhe preços de concorrentes. Sempre direcione para WhatsApp quando pedirem contato..." />
            </Card>

            <Card className="p-4 space-y-2">
              <Label className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">3</span> Exemplos de Conversa</Label>
              <p className="text-xs text-muted-foreground">Forneça exemplos de como o agente deve responder em situações reais. Isso melhora muito a qualidade.</p>
              <Textarea rows={5} value={form.examples || ""}
                onChange={(e) => setForm({ ...form, examples: e.target.value })}
                placeholder="Cliente: Qual o preço do plano?&#10;Agente: Temos planos a partir de R$99/mês! Qual seria a sua necessidade..." />
            </Card>

            <Card className="p-4 space-y-2">
              <Label className="flex items-center gap-2"><span className="bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">4</span> Objeções e Respostas</Label>
              <p className="text-xs text-muted-foreground">Liste objeções comuns e como o agente deve responder. Isso ajuda a converter mais.</p>
              <Textarea rows={4} value={form.objections || ""}
                onChange={(e) => setForm({ ...form, objections: e.target.value })}
                placeholder="Objeção: Está caro&#10;Resposta: Entendo. Considere que o investimento se paga em..." />
            </Card>
          </TabsContent>

          {/* VOZ & MIDIA */}
          <TabsContent value="voz" className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2"><Mic className="h-4 w-4" /> Resposta por voz (TTS)</Label>
                  <p className="text-xs text-muted-foreground">Quando o lead enviar áudio, o agente responde em áudio com a voz escolhida.</p>
                </div>
                <Switch checked={form.voice_enabled} onCheckedChange={(v) => setForm({ ...form, voice_enabled: v })} />
              </div>
              {form.voice_enabled && (() => {
                const provKey = form.voice_provider || "omni";
                const provDef = VOICE_PROVIDERS[provKey] || VOICE_PROVIDERS.omni;
                return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Provedor de voz</Label>
                      <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={provKey} onChange={(e) => {
                          const next = e.target.value;
                          const firstVoice = VOICE_PROVIDERS[next]?.voices?.[0]?.id || "alloy";
                          setForm({ ...form, voice_provider: next, voice_id: firstVoice });
                        }}>
                        {Object.entries(VOICE_PROVIDERS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      {provDef.help && <p className="text-[11px] text-muted-foreground mt-1">{provDef.help}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Voz</Label>
                      <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={form.voice_id || provDef.voices[0]?.id} onChange={(e) => setForm({ ...form, voice_id: e.target.value })}>
                        {provDef.voices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {provKey === 'elevenlabs' && (
                    elevenConnected ? (
                      <div className="flex items-center gap-2 text-xs text-primary border border-primary/30 bg-primary/5 rounded-md p-2">
                        ✓ ElevenLabs conectado. Usando sua chave para gerar voz premium.
                      </div>
                    ) : (
                      <div className="border border-dashed border-primary/40 rounded-md p-3 space-y-2">
                        <div className="text-xs font-medium">Conectar ElevenLabs</div>
                        <p className="text-[11px] text-muted-foreground">
                          Cole sua API Key do ElevenLabs (obtenha em{" "}
                          <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noreferrer" className="underline">elevenlabs.io → Settings → API Keys</a>).
                        </p>
                        <div className="flex gap-2">
                          <Input type="password" placeholder="sk_..." value={elevenKeyInput}
                            onChange={(e) => setElevenKeyInput(e.target.value)} />
                          <Button size="sm" onClick={saveElevenLabsKey} disabled={elevenSaving}>
                            {elevenSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      const text = `Olá! Eu sou ${form.display_name || form.name || "seu agente"}. Como posso ajudar?`;
                      const { data, error } = await supabase.functions.invoke("tts-preview", {
                        body: { provider: provKey, voice: form.voice_id || provDef.voices[0]?.id, text },
                      });
                      if (error) throw error;
                      if (data?.audio) {
                        const a = new Audio(data.audio); a.play();
                      } else if (data?.engine === "browser" && "speechSynthesis" in window) {
                        const u = new SpeechSynthesisUtterance(data.text || text);
                        u.lang = "pt-BR";
                        // Pick browser voice matching gender hint of the selected voice id
                        const femaleIds = ["nova", "shimmer", "alloy"];
                        const wantFemale = femaleIds.includes(form.voice_id);
                        const pickVoice = () => {
                          const voices = window.speechSynthesis.getVoices().filter(v => /pt(-|_)?BR|portuguese/i.test(v.lang) || /portugu/i.test(v.name));
                          const list = voices.length ? voices : window.speechSynthesis.getVoices();
                          const femaleHints = /female|fem|maria|luciana|joana|helena|sofia|google português do brasil|microsoft maria|google.*female/i;
                          const maleHints = /male|masc|ricardo|daniel|google.*male|microsoft daniel/i;
                          const matched = list.find(v => wantFemale ? femaleHints.test(v.name) : maleHints.test(v.name));
                          return matched || list[0];
                        };
                        const apply = () => {
                          const v = pickVoice();
                          if (v) u.voice = v;
                          window.speechSynthesis.speak(u);
                        };
                        if (window.speechSynthesis.getVoices().length === 0) {
                          window.speechSynthesis.onvoiceschanged = () => apply();
                        } else apply();
                        toast.success(`Reproduzindo voz ${wantFemale ? 'feminina' : 'masculina'} (nativa do navegador)`);
                      } else {
                        toast.error("Não foi possível gerar a prévia. Verifique o provedor e as chaves.");
                      }
                    } catch (e: any) { toast.error(e.message || "Erro ao gerar prévia"); }
                  }}>
                    <Play className="h-4 w-4 mr-1" /> Ouvir prévia da voz
                  </Button>
                  <div className="flex items-center justify-between border-t pt-3">
                    <div>
                      <Label className="text-sm">Responder áudio recebido com áudio</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Desativado: o agente transcreve o áudio do lead e responde por <b>texto</b>.
                      </p>
                    </div>
                    <Switch checked={form.reply_to_audio_with_audio !== false}
                      onCheckedChange={(v) => setForm({ ...form, reply_to_audio_with_audio: v })} />
                  </div>
                </>
                );
              })()}
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="font-semibold">Compreensão multimídia</h4>
              <div className="flex items-center justify-between">
                <Label className="text-sm">📜 Transcrever áudios recebidos (Whisper)</Label>
                <Switch checked={form.transcribe_audio !== false}
                  onCheckedChange={(v) => setForm({ ...form, transcribe_audio: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">🖼️ Interpretar imagens recebidas (Visão)</Label>
                <Switch checked={form.understand_images !== false}
                  onCheckedChange={(v) => setForm({ ...form, understand_images: v })} />
              </div>
              <p className="text-[11px] text-muted-foreground">A transcrição/visão usa o provedor selecionado em "Modelo de IA" (Groq Whisper, Gemini Vision ou OpenAI). O custo é descontado da sua chave do próprio provedor.</p>
            </Card>

            <Card className="p-4 space-y-3">
              <h4 className="font-semibold">Comportamento humano</h4>
              <div className="flex items-center justify-between">
                <Label className="text-sm">⌨️ Simular "digitando..."</Label>
                <Switch checked={form.simulate_typing !== false}
                  onCheckedChange={(v) => setForm({ ...form, simulate_typing: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">🎙️ Simular "gravando áudio..."</Label>
                <Switch checked={form.simulate_recording !== false}
                  onCheckedChange={(v) => setForm({ ...form, simulate_recording: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">✂️ Dividir respostas longas em várias mensagens</Label>
                <Switch checked={form.split_long_messages !== false}
                  onCheckedChange={(v) => setForm({ ...form, split_long_messages: v })} />
              </div>
              <p className="text-[11px] text-muted-foreground">Deixa a conversa mais natural — o agente "digita" antes de mandar e quebra textos longos em partes.</p>
            </Card>
          </TabsContent>

          {/* ROTEAMENTO */}
          <TabsContent value="roteamento" className="space-y-4">
            <Card className="p-4 space-y-3 border-primary/30">
              <h4 className="font-semibold flex items-center gap-2 text-primary">→ Entrada no funil (quando o atendimento inicia)</h4>
              <p className="text-xs text-muted-foreground">Pipeline e etapa onde o lead entra quando este agente começa a atender.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pipeline</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.pipeline_id || ""} onChange={(e) => setForm({ ...form, pipeline_id: e.target.value, stage_id: "" })}>
                    <option value="">Nenhum</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Etapa inicial</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.stage_id || ""} onChange={(e) => setForm({ ...form, stage_id: e.target.value })}>
                    <option value="">Nenhuma</option>
                    {stageOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold flex items-center gap-2"><GitBranch className="h-4 w-4" />Roteamento por conversa</h4>
                  <p className="text-xs text-muted-foreground">Mova o lead para diferentes etapas conforme a conversa evolui.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addRoutingRule}><Plus className="h-4 w-4 mr-1" />Adicionar regra</Button>
              </div>
              <div className="text-xs p-2 rounded-md bg-muted/40 border border-dashed leading-relaxed">
                <strong>Como o sistema escolhe o agente:</strong> 1) agente já vinculado à conversa → 2) regra de roteamento por palavra-chave (abaixo) → 3) pipeline/etapa atual do lead → 4) agente padrão da conexão WhatsApp. Permite ter vários agentes ativos no mesmo número, cada um especializado.
              </div>
              {form.routing_rules.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <GitBranch className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma regra de roteamento</p>
                  <p className="text-xs text-muted-foreground">Adicione regras para mover o lead com base em palavras-chave, intenção ou qualificação.</p>
                </div>
              ) : form.routing_rules.map((r: any, i: number) => {
                const ruleStages = stages.filter((s: any) => !r.pipeline_id || s.pipeline_id === r.pipeline_id);
                return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end p-2 rounded-md border border-border/60">
                  <div>
                    <Label className="text-xs">Palavra-chave / intenção</Label>
                    <Input value={r.keyword} onChange={(e) => updateRoutingRule(i, { keyword: e.target.value })} placeholder="Ex: comprar, fechar, agendar" />
                  </div>
                  <div>
                    <Label className="text-xs">Pipeline</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={r.pipeline_id || ""} onChange={(e) => updateRoutingRule(i, { pipeline_id: e.target.value, stage_id: "" })}>
                      <option value="">Selecione</option>
                      {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Etapa</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={r.stage_id || ""} onChange={(e) => updateRoutingRule(i, { stage_id: e.target.value })}
                      disabled={!r.pipeline_id}>
                      <option value="">{r.pipeline_id ? "Selecione" : "Escolha pipeline"}</option>
                      {ruleStages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeRoutingRule(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                );
              })}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">🤝 Transferência para humano</Label>
                <Switch checked={form.handoff_enabled} onCheckedChange={(v) => setForm({ ...form, handoff_enabled: v })} />
              </div>
              {form.handoff_enabled && (
                <Input placeholder="Palavras-chave (separe por vírgula): atendente, humano, gerente"
                  value={form.handoff_keywords || ""} onChange={(e) => setForm({ ...form, handoff_keywords: e.target.value })} />
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">⛔ Palavras de parada</Label>
              <Input placeholder="Ex: cancelar, sair, parar (separe por vírgula)"
                value={form.stop_words || ""} onChange={(e) => setForm({ ...form, stop_words: e.target.value })} />
            </Card>

            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">⏱️ Timeout por inatividade (minutos)</Label>
              <Input type="number" placeholder="Ex: 30 (deixe vazio para desabilitar)"
                value={form.inactivity_timeout_minutes || ""}
                onChange={(e) => setForm({ ...form, inactivity_timeout_minutes: e.target.value ? Number(e.target.value) : null })} />
            </Card>

            <Card className="p-4 space-y-3">
              <Label className="flex items-center gap-2">📊 Limite de mensagens por conversa</Label>
              <Input type="number" placeholder="Ex: 20 (deixe vazio para sem limite)"
                value={form.message_limit || ""}
                onChange={(e) => setForm({ ...form, message_limit: e.target.value ? Number(e.target.value) : null })} />
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>🕒 Horário de funcionamento</Label>
                <Switch checked={form.business_hours.enabled}
                  onCheckedChange={(v) => setForm({ ...form, business_hours: { ...form.business_hours, enabled: v } })} />
              </div>
              {form.business_hours.enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="time" value={form.business_hours.start}
                    onChange={(e) => setForm({ ...form, business_hours: { ...form.business_hours, start: e.target.value } })} />
                  <Input type="time" value={form.business_hours.end}
                    onChange={(e) => setForm({ ...form, business_hours: { ...form.business_hours, end: e.target.value } })} />
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>🔚 Encerramento automático</Label>
                <Switch checked={form.auto_close_enabled}
                  onCheckedChange={(v) => setForm({ ...form, auto_close_enabled: v })} />
              </div>
              {form.auto_close_enabled && (
                <Textarea rows={2} placeholder="Mensagem de encerramento (ex: Obrigado pelo contato! Volte sempre.)"
                  value={form.auto_close_message || ""}
                  onChange={(e) => setForm({ ...form, auto_close_message: e.target.value })} />
              )}
            </Card>
          </TabsContent>

          {/* CONHECIMENTO */}
          <TabsContent value="conhecimento" className="space-y-4">
            {!agent?.id ? (
              <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                <p className="text-sm">💡 Salve o agente primeiro para adicionar itens à base de conhecimento.</p>
              </Card>
            ) : (
              <>
                <Card className="p-4 space-y-3">
                  <h4 className="font-semibold">Adicionar à base</h4>
                  <p className="text-xs text-muted-foreground">
                    Organize os conteúdos por <strong>categoria</strong> (ex: produtos, serviços, planos, FAQ, cardápio, imóveis, cursos, peças, agendamentos…).
                    Quando o cliente perguntar sobre algo relacionado, o agente busca pela categoria/palavras-chave e
                    pode enviar imagens e links automaticamente — funciona para qualquer segmento.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant={knType === "text" ? "default" : "outline"} onClick={() => setKnType("text")}>
                      <FileText className="h-4 w-4 mr-1" />Texto
                    </Button>
                    <Button size="sm" variant={knType === "site" ? "default" : "outline"} onClick={() => setKnType("site")}>
                      <Globe className="h-4 w-4 mr-1" />Site (crawl)
                    </Button>
                    <Button size="sm" variant={knType === "link" ? "default" : "outline"} onClick={() => setKnType("link")}>
                      <Link2 className="h-4 w-4 mr-1" />Links
                    </Button>
                    <Button size="sm" variant={knType === "document" ? "default" : "outline"} onClick={() => setKnType("document")}>
                      <FileText className="h-4 w-4 mr-1" />Documentos
                    </Button>
                    <Button size="sm" variant={knType === "image" ? "default" : "outline"} onClick={() => setKnType("image")}>
                      <ImageIcon className="h-4 w-4 mr-1" />Imagens
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input placeholder="Título (ex: Plano Pro / Pizza Margherita / Curso Avançado)" value={knTitle} onChange={(e) => setKnTitle(e.target.value)} />
                    <Input placeholder="Categoria (ex: planos, cardápio, cursos, serviços)" value={knCategory} onChange={(e) => setKnCategory(e.target.value)} />
                  </div>
                  <Input
                    placeholder="Palavras-chave separadas por vírgula (ex: preço, orçamento, horário, entrega)"
                    value={knKeywords}
                    onChange={(e) => setKnKeywords(e.target.value)}
                  />
                  <Textarea
                    rows={2}
                    placeholder="Descrição — o agente usa para apresentar a opção ao cliente (em Imagens/Documentos vira a legenda enviada junto)"
                    value={knDescription}
                    onChange={(e) => setKnDescription(e.target.value)}
                  />

                  {/* SITE — para crawl/extração */}
                  {knType === "site" && (
                    <div className="space-y-2">
                      <Label className="text-xs">URL do site (será lida e indexada pela IA)</Label>
                      <Input placeholder="https://seusite.com/pagina" value={knUrl} onChange={(e) => setKnUrl(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground">A IA fará o crawl da página e armazenará o conteúdo extraído.</p>
                    </div>
                  )}

                  {/* TEXTO */}
                  {knType === "text" && (
                    <Textarea rows={6} placeholder="Cole aqui o texto, FAQ, política, descrição completa, especificações..." value={knContent} onChange={(e) => setKnContent(e.target.value)} />
                  )}

                  {/* LINKS — só armazena URLs nomeadas */}
                  {knType === "link" && (
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1"><Link2 className="h-3 w-3" /> Links externos (Drive, catálogo, vídeo, formulário, WhatsApp…)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2">
                        <Input placeholder="Nome (ex: Catálogo Drive)" value={knNewLinkTitle} onChange={(e) => setKnNewLinkTitle(e.target.value)} />
                        <Input placeholder="https://drive.google.com/..." value={knNewLinkUrl} onChange={(e) => setKnNewLinkUrl(e.target.value)} />
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          if (!knNewLinkTitle || !knNewLinkUrl) return;
                          setKnLinks([...knLinks, { title: knNewLinkTitle, url: knNewLinkUrl }]);
                          setKnNewLinkTitle(""); setKnNewLinkUrl("");
                        }}><Plus className="h-3 w-3 mr-1" />Adicionar</Button>
                      </div>
                      {knLinks.length > 0 && (
                        <ul className="text-xs space-y-1">
                          {knLinks.map((l, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 bg-muted/50 rounded px-2 py-1">
                              <span className="truncate"><strong>{l.title}</strong> — {l.url}</span>
                              <button type="button" onClick={() => setKnLinks(knLinks.filter((_, idx) => idx !== i))} className="text-destructive">×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] text-muted-foreground">Apenas referências — a IA envia o link ao cliente quando relevante. Não baixa o conteúdo.</p>
                    </div>
                  )}

                  {/* DOCUMENTOS — PDF, DOC, planilhas */}
                  {knType === "document" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Arquivo (PDF, Word, Excel, CSV, TXT…) — descrição é obrigatória</Label>
                      <input type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xls,.xlsx,.ods,.odt,.ppt,.pptx,.rtf"
                        className="text-sm block"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f || !user || !agent?.id) return;
                          const finalTitle = knTitle || f.name;
                          toast.info(`Enviando ${f.name}...`);
                          const path = `${user.id}/${agent.id}/docs/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                          const { error: upErr } = await supabase.storage.from("agent-knowledge").upload(path, f, { upsert: false });
                          if (upErr) { toast.error(upErr.message); return; }
                          const keywordsArr = knKeywords.split(",").map(s => s.trim()).filter(Boolean);
                          const { data: row, error: insErr } = await supabase.from("agent_knowledge").insert({
                            agent_id: agent.id, user_id: user.id, type: "file",
                            title: finalTitle, content: "", file_path: path, file_size: f.size,
                            mime_type: f.type, status: "processing",
                            category: knCategory || null, description: knDescription || null,
                            keywords: keywordsArr, media_urls: [], external_links: [],
                          } as any).select().single();
                          if (insErr) { toast.error(insErr.message); return; }
                          supabase.functions.invoke("extract-knowledge", { body: { knowledge_id: (row as any).id } })
                            .then(() => loadKnowledge(agent.id));
                          toast.success("Documento enviado e em processamento");
                          setKnTitle(""); setKnCategory(""); setKnDescription(""); setKnKeywords("");
                          loadKnowledge(agent.id);
                          (e.target as HTMLInputElement).value = "";
                        }} />
                      <p className="text-[11px] text-muted-foreground">Cada documento é salvo separadamente, com sua própria descrição e categoria. Suporta PDF, Word, planilhas (.xlsx/.xls/.csv) e mais.</p>
                    </div>
                  )}

                  {/* IMAGENS — múltiplas, qualquer tamanho/formato */}
                  {knType === "image" && (
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Imagens (selecione várias — qualquer formato/tamanho)</Label>
                      <input type="file" accept="image/*" multiple disabled={knUploading} className="text-sm block"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length || !user || !agent?.id) return;
                          setKnUploading(true);
                          const uploaded: string[] = [];
                          for (const f of files) {
                            const path = `${user.id}/${agent.id}/media/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                            const { error: upErr } = await supabase.storage.from("agent-knowledge").upload(path, f, { upsert: false });
                            if (upErr) { toast.error(upErr.message); continue; }
                            const { data: pub } = supabase.storage.from("agent-knowledge").getPublicUrl(path);
                            uploaded.push(pub.publicUrl);
                          }
                          setKnMediaUrls((prev) => [...prev, ...uploaded]);
                          setKnUploading(false);
                          toast.success(`${uploaded.length} imagem(ns) anexada(s) — clique em "Adicionar à base" para salvar`);
                        }} />
                      {knMediaUrls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {knMediaUrls.map((u, i) => (
                            <div key={i} className="relative group">
                              <img src={u} className="h-24 w-full object-cover rounded border" alt={`Preview ${i + 1}`} />
                              <button type="button" onClick={() => setKnMediaUrls(knMediaUrls.filter((_, idx) => idx !== i))}
                                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">Cada imagem vira um item separado na base com a descrição/categoria/palavras-chave informadas. O agente envia ao cliente quando perguntarem por fotos do assunto.</p>
                    </div>
                  )}

                  {knType !== "document" && (
                    <Button onClick={addKnowledge} disabled={knUploading}>
                      <Plus className="h-4 w-4 mr-1" />
                      {knType === "image" ? `Adicionar ${knMediaUrls.length || ""} imagem(ns) à base` : "Adicionar à base"}
                    </Button>
                  )}
                </Card>

                <Card className="p-4">
                  {knowledge.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum item ainda</p> : (
                    <ul className="divide-y divide-border">
                      {knowledge.map(k => (
                        <li key={k.id} className="py-2 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{k.title}</p>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px]">{k.type}</Badge>
                              {k.category && <Badge variant="secondary" className="text-[10px]">📂 {k.category}</Badge>}
                              {Array.isArray(k.keywords) && k.keywords.slice(0, 4).map((kw: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                              ))}
                              {Array.isArray(k.media_urls) && k.media_urls.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">🖼 {k.media_urls.length}</Badge>
                              )}
                              {Array.isArray(k.external_links) && k.external_links.length > 0 && (
                                <Badge variant="outline" className="text-[10px]">🔗 {k.external_links.length}</Badge>
                              )}
                            </div>
                            {k.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{k.description}</p>}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeKnowledge(k.id)}><Trash2 className="h-4 w-4" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </>
            )}
          </TabsContent>

          {/* TESTAR */}
          <TabsContent value="testar" className="space-y-4">
            {!form.system_prompt ? (
              <div className="text-center py-12">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">Configure o prompt do agente primeiro</p>
                <p className="text-xs text-muted-foreground">Vá na aba <strong>Comportamento</strong> para definir as instruções.</p>
              </div>
            ) : (
              <>
                <Card className="p-4 h-[300px] overflow-y-auto space-y-2 bg-muted/30">
                  {testMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Envie uma mensagem para testar o agente</p>}
                  {testMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {testing && <div className="flex justify-start"><div className="bg-card border rounded-lg px-3 py-2 text-sm flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> digitando...</div></div>}
                </Card>
                <div className="flex gap-2">
                  <Input placeholder="Digite uma mensagem..." value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !testing && sendTest()} />
                  <Button onClick={sendTest} disabled={testing || !testInput.trim()}><Send className="h-4 w-4" /></Button>
                </div>
                {!agent?.id && (
                  <p className="text-xs text-muted-foreground">💡 Salve o agente primeiro para usar a base de conhecimento durante o teste.</p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-1" />}
            {agent ? "Salvar" : "Criar Agente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
