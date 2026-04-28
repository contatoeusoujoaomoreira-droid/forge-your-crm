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

const VOICE_PROVIDERS: Record<string, { label: string; voices: { id: string; label: string }[]; help?: string }> = {
  omni: {
    label: "Omni Audio (nativo Lovable — recomendado)",
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
  const [knTitle, setKnTitle] = useState("");
  const [knContent, setKnContent] = useState("");
  const [knType, setKnType] = useState<"text" | "url" | "file">("text");
  const [knUrl, setKnUrl] = useState("");
  const [testMessages, setTestMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testing, setTesting] = useState(false);

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
  });

  useEffect(() => {
    if (!user || !open) return;
    (async () => {
      const [pl, st, pr] = await Promise.all([
        supabase.from("pipelines").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("ai_provider_configs").select("*").eq("user_id", user.id),
      ]);
      setPipelines(pl.data || []);
      setStages(st.data || []);
      setProviders(pr.data || []);
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
        handoff_enabled: false, handoff_keywords: "", stop_words: "",
        inactivity_timeout_minutes: null, message_limit: null,
        business_hours: { enabled: false, start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5] },
        auto_close_enabled: false, auto_close_message: "", is_active: true,
        voice_enabled: false, voice_provider: "omni", voice_id: "alloy",
        reply_to_audio_with_audio: true, transcribe_audio: true, understand_images: true,
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
    if (!payload.ai_provider_config_id) payload.ai_provider_config_id = null;
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
    const item: any = {
      agent_id: agent.id,
      user_id: user.id,
      type: knType,
      title: knTitle || (knType === "url" ? knUrl : "Item"),
      content: knType === "url" ? knUrl : knContent,
      source_url: knType === "url" ? knUrl : null,
      status: knType === "url" ? "processing" : "ready",
    };
    const { data: row, error } = await supabase.from("agent_knowledge").insert(item as any).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success("Adicionado à base");
    if (knType === "url" && row) {
      supabase.functions.invoke("extract-knowledge", { body: { knowledge_id: (row as any).id } })
        .then(() => loadKnowledge(agent.id));
    }
    setKnTitle(""); setKnContent(""); setKnUrl("");
    loadKnowledge(agent.id);
  };

  const removeKnowledge = async (id: string) => {
    await supabase.from("agent_knowledge").delete().eq("id", id);
    if (agent?.id) loadKnowledge(agent.id);
  };

  const addRoutingRule = () => {
    setForm({ ...form, routing_rules: [...form.routing_rules, { keyword: "", stage_id: "", description: "" }] });
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
                  <option value="">Lovable AI (padrão — sem chave)</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.provider} {p.is_default && "⭐"}</option>)}
                </select>
              </div>
              <div>
                <Label>Modelo IA</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={normalizeModelForProvider(providerType, form.model)} onChange={(e) => setForm({ ...form, model: e.target.value })}>
                  {modelOptions.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
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
                        window.speechSynthesis.speak(u);
                        toast.success("Reproduzindo via voz nativa do navegador (Omni Audio)");
                      } else {
                        toast.error("Não foi possível gerar a prévia. Verifique o provedor e as chaves.");
                      }
                    } catch (e: any) { toast.error(e.message || "Erro ao gerar prévia"); }
                  }}>
                    <Play className="h-4 w-4 mr-1" /> Ouvir prévia da voz
                  </Button>
                  <div className="flex items-center justify-between border-t pt-3">
                    <Label className="text-sm">Responder áudio recebido com áudio</Label>
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
                <Label className="text-sm">✂️ Dividir respostas longas em mensagens menores</Label>
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
              {form.routing_rules.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <GitBranch className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma regra de roteamento</p>
                  <p className="text-xs text-muted-foreground">Adicione regras para mover o lead com base em palavras-chave, intenção ou qualificação.</p>
                </div>
              ) : form.routing_rules.map((r: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div>
                    <Label className="text-xs">Palavra-chave / intenção</Label>
                    <Input value={r.keyword} onChange={(e) => updateRoutingRule(i, { keyword: e.target.value })} placeholder="Ex: comprar, fechar, agendar" />
                  </div>
                  <div>
                    <Label className="text-xs">Mover para etapa</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={r.stage_id} onChange={(e) => updateRoutingRule(i, { stage_id: e.target.value })}>
                      <option value="">Selecione</option>
                      {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeRoutingRule(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
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
                  <div className="flex gap-2">
                    <Button size="sm" variant={knType === "text" ? "default" : "outline"} onClick={() => setKnType("text")}>
                      <FileText className="h-4 w-4 mr-1" />Texto
                    </Button>
                    <Button size="sm" variant={knType === "url" ? "default" : "outline"} onClick={() => setKnType("url")}>
                      <Globe className="h-4 w-4 mr-1" />URL / Site
                    </Button>
                    <Button size="sm" variant={knType === "file" ? "default" : "outline"} onClick={() => setKnType("file")}>
                      <ImageIcon className="h-4 w-4 mr-1" />Arquivo (PDF/IMG)
                    </Button>
                  </div>
                  <Input placeholder="Título" value={knTitle} onChange={(e) => setKnTitle(e.target.value)} />
                  {knType === "url" && (
                    <Input placeholder="https://..." value={knUrl} onChange={(e) => setKnUrl(e.target.value)} />
                  )}
                  {knType === "text" && (
                    <Textarea rows={4} placeholder="Cole aqui o texto, FAQ, política, descrição de produto..." value={knContent} onChange={(e) => setKnContent(e.target.value)} />
                  )}
                  {knType === "file" && (
                    <div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.md,.csv,.json,.mp4,.mp3,.wav,.webp" className="text-sm"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f || !user || !agent?.id) return;
                          setKnTitle(f.name);
                          toast.info(`Enviando ${f.name}...`);
                          // Upload to storage under user-id folder (any size)
                          const path = `${user.id}/${agent.id}/${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                          const { error: upErr } = await supabase.storage.from("agent-knowledge").upload(path, f, { upsert: false });
                          if (upErr) { toast.error(upErr.message); return; }
                          // Insert knowledge row marked as processing, then trigger extraction
                          const { data: row, error: insErr } = await supabase.from("agent_knowledge").insert({
                            agent_id: agent.id, user_id: user.id, type: "file",
                            title: f.name, content: "", file_path: path, file_size: f.size,
                            mime_type: f.type, status: "processing",
                          } as any).select().single();
                          if (insErr) { toast.error(insErr.message); return; }
                          await supabase.functions.invoke("extract-knowledge", { body: { knowledge_id: (row as any).id } });
                          toast.success("Arquivo processado! Conteúdo extraído.");
                          setKnTitle("");
                          loadKnowledge(agent.id);
                        }} />
                      <p className="text-xs text-muted-foreground mt-1">Aceita qualquer tamanho. PDFs e imagens são transcritos por IA. Vídeos/áudios são referenciados.</p>
                    </div>
                  )}
                  {knType !== "file" && <Button onClick={addKnowledge}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>}
                  {knType === "url" && (
                    <p className="text-xs text-muted-foreground">URLs são baixadas e o conteúdo da página é extraído automaticamente após adicionar.</p>
                  )}
                </Card>

                <Card className="p-4">
                  {knowledge.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhum item ainda</p> : (
                    <ul className="divide-y divide-border">
                      {knowledge.map(k => (
                        <li key={k.id} className="py-2 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{k.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px]">{k.type}</Badge>
                              {k.source_url && <a href={k.source_url} target="_blank" rel="noreferrer" className="underline truncate"><Link2 className="h-3 w-3 inline" /> {k.source_url}</a>}
                            </p>
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
