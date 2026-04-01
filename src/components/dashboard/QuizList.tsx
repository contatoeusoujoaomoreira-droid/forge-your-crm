import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X, FileQuestion, Copy, Pencil, Trash2, Eye, Sparkles, BarChart3, ExternalLink, Users, TrendingUp, MessageCircle, Link2, Image } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Question {
  id: string; text: string; type: "text" | "multiple_choice";
  options?: string[]; scores?: number[]; imageUrls?: string[];
  stageMapping?: Record<string, string>; // option index -> stage_id
}

interface QuizResult {
  id: string; title: string; description: string; minScore: number; maxScore: number;
  stageId?: string; // CRM stage for this result
  whatsappMessage?: string; // custom message for this result
}

interface Quiz {
  id: string; title: string; description: string | null; slug: string;
  is_active: boolean; is_published: boolean; questions: Question[];
  style: any; settings: any; created_at: string; _responseCount?: number;
  whatsapp_redirect?: string | null; whatsapp_message?: string | null;
}

interface Pipeline { id: string; name: string; }

const generateId = () => Math.random().toString(36).substring(2, 9);

const QUIZ_TEMPLATES = [
  { name: "Quiz de Perfil", icon: "🧠", description: "Descubra qual perfil mais combina com você",
    questions: [
      { id: generateId(), text: "Como você prefere trabalhar?", type: "multiple_choice" as const, options: ["Sozinho", "Em equipe", "Ambos"], scores: [1, 2, 3] },
      { id: generateId(), text: "Qual sua maior habilidade?", type: "multiple_choice" as const, options: ["Criatividade", "Análise", "Comunicação", "Liderança"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "O que te motiva?", type: "multiple_choice" as const, options: ["Desafios", "Reconhecimento", "Impacto", "Autonomia"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    settings: { showScore: true, showProgressBar: true, results: [{ id: generateId(), title: "Perfil Criativo", description: "Você tem um perfil criativo e inovador!", minScore: 0, maxScore: 5 }, { id: generateId(), title: "Perfil Analítico", description: "Você é metódico e detalhista.", minScore: 6, maxScore: 12 }] },
  },
  { name: "Diagnóstico", icon: "🔬", description: "Diagnóstico do nível de maturidade do negócio",
    questions: [
      { id: generateId(), text: "Você tem um processo de vendas definido?", type: "multiple_choice" as const, options: ["Não", "Parcialmente", "Sim"], scores: [0, 1, 2] },
      { id: generateId(), text: "Usa CRM para gerenciar leads?", type: "multiple_choice" as const, options: ["Não", "Sim, planilha", "Sim, ferramenta"], scores: [0, 1, 2] },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#3b82f6" },
    settings: { showScore: true, showProgressBar: true, results: [{ id: generateId(), title: "Iniciante", description: "Hora de começar!", minScore: 0, maxScore: 2 }, { id: generateId(), title: "Avançado", description: "Seu negócio está maduro!", minScore: 3, maxScore: 4 }] },
  },
  { name: "Lead Scoring", icon: "🎯", description: "Pontue e qualifique seus leads automaticamente",
    questions: [
      { id: generateId(), text: "Cargo na empresa?", type: "multiple_choice" as const, options: ["Estagiário", "Analista", "Gerente", "Diretor/CEO"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Tamanho da empresa?", type: "multiple_choice" as const, options: ["1-10", "11-50", "51-200", "+200"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Orçamento mensal?", type: "multiple_choice" as const, options: ["Até R$1k", "R$1k-5k", "R$5k-20k", "+R$20k"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#3b82f6" },
    settings: { showScore: true, showProgressBar: true, results: [{ id: generateId(), title: "Lead Frio ❄️", description: "Precisa de nutrição.", minScore: 0, maxScore: 4 }, { id: generateId(), title: "Lead Morno 🔥", description: "Potencial médio.", minScore: 5, maxScore: 8 }, { id: generateId(), title: "Lead Quente 🔥🔥", description: "Pronto para abordar!", minScore: 9, maxScore: 12 }] },
  },
  { name: "Calculadora", icon: "🧮", description: "Calcule o potencial de receita",
    questions: [
      { id: generateId(), text: "Quantos leads você gera por mês?", type: "multiple_choice" as const, options: ["0-50", "50-200", "200-500", "+500"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Qual seu ticket médio?", type: "multiple_choice" as const, options: ["Até R$ 500", "R$ 500-2.000", "R$ 2.000-10.000", "+R$ 10.000"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#f59e0b" },
    settings: { showScore: true, showProgressBar: true, results: [] },
  },
  { name: "Recomendação de Produto", icon: "🛒", description: "Qual produto ideal para o cliente",
    questions: [{ id: generateId(), text: "Qual seu objetivo principal?", type: "multiple_choice" as const, options: ["Mais vendas", "Mais leads", "Automação", "Branding"], scores: [1, 2, 3, 4] }],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#8b5cf6" },
    settings: { showScore: true, showProgressBar: true, results: [] },
  },
  { name: "Pesquisa de Satisfação", icon: "😊", description: "CSAT e NPS dos seus clientes",
    questions: [{ id: generateId(), text: "Quão satisfeito você está?", type: "multiple_choice" as const, options: ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"], scores: [1, 2, 3, 4, 5] }],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#ef4444" },
    settings: { showScore: false, showProgressBar: true, results: [] },
  },
  { name: "Onboarding", icon: "🚀", description: "Conheça seu novo cliente",
    questions: [{ id: generateId(), text: "Qual seu principal desafio?", type: "multiple_choice" as const, options: ["Captar clientes", "Organizar processos", "Escalar vendas", "Reter clientes"], scores: [1, 2, 3, 4] }],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    settings: { showScore: false, showProgressBar: true, results: [] },
  },
  { name: "Triagem", icon: "🏥", description: "Qualificação rápida de leads",
    questions: [{ id: generateId(), text: "Qual o tamanho da sua empresa?", type: "multiple_choice" as const, options: ["MEI", "PME", "Médio porte", "Grande empresa"], scores: [1, 2, 3, 4] }],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#10b981" },
    settings: { showScore: true, showProgressBar: true, results: [] },
  },
  { name: "Avaliação de Conhecimento", icon: "📚", description: "Teste de conhecimento",
    questions: [{ id: generateId(), text: "O que é CRM?", type: "multiple_choice" as const, options: ["Rede social", "Gestão de relacionamento", "Tipo de anúncio"], scores: [0, 1, 0] }],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#f59e0b" },
    settings: { showScore: true, showProgressBar: true, results: [] },
  },
];

const QuizList = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string; pipeline_id?: string | null }[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [editorTab, setEditorTab] = useState<"questions" | "results" | "crm" | "style" | "whatsapp">("questions");
  const { toast } = useToast();

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("quiz_responses").select("quiz_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.quiz_id] = (countMap[r.quiz_id] || 0) + 1; });
    setQuizzes(data.map((q: any) => ({ ...q, questions: Array.isArray(q.questions) ? q.questions : [], style: q.style || {}, settings: q.settings || {}, is_published: q.is_published ?? false, _responseCount: countMap[q.id] || 0 })));
  };

  const fetchStages = async () => {
    if (!user) return;
    const { data } = await supabase.from("pipeline_stages").select("id, name, pipeline_id").eq("user_id", user.id).order("position");
    if (data) setStages(data);
  };

  const fetchPipelines = async () => {
    if (!user) return;
    const { data } = await supabase.from("pipelines").select("id, name").eq("user_id", user.id).order("created_at");
    if (data) setPipelines(data);
  };

  useEffect(() => { fetchQuizzes(); fetchStages(); fetchPipelines(); }, [user]);

  const startNew = () => {
    setEditing({
      id: "", title: "", description: "", slug: "", is_active: true, is_published: false,
      questions: [{ id: generateId(), text: "", type: "multiple_choice", options: ["", ""], scores: [0, 0] }],
      style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
      settings: { showScore: false, showProgressBar: true, results: [], stageId: null, pipelineId: null, leadSource: "quiz", autoTags: [] },
      created_at: "", whatsapp_redirect: null, whatsapp_message: null,
    });
    setEditorTab("questions");
  };

  const startFromTemplate = (t: typeof QUIZ_TEMPLATES[0]) => {
    setEditing({
      id: "", title: t.name, description: t.description, slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_active: true, is_published: false, questions: t.questions.map(q => ({ ...q, id: generateId() })),
      style: t.style, settings: { ...t.settings, pipelineId: null, leadSource: "quiz", autoTags: [] }, created_at: "",
      whatsapp_redirect: null, whatsapp_message: null,
    });
    setShowTemplates(false);
    setEditorTab("questions");
  };

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = {
      title: editing.title, description: editing.description, slug: editing.slug,
      is_active: editing.is_active, is_published: editing.is_published,
      questions: editing.questions as any, style: editing.style as any, settings: editing.settings as any,
      pipeline_id: editing.settings?.pipelineId || null, stage_id: editing.settings?.stageId || null,
      whatsapp_redirect: editing.whatsapp_redirect, whatsapp_message: editing.whatsapp_message,
    };
    if (editing.id) {
      const { error } = await supabase.from("quizzes").update(payload as any).eq("id", editing.id);
      if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("quizzes").insert(payload as any);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Quiz salvo!" }); setEditing(null); fetchQuizzes();
  };

  const handleDelete = async (id: string) => { await supabase.from("quizzes").delete().eq("id", id); toast({ title: "Quiz excluído" }); fetchQuizzes(); };
  const handleCopyLink = (slug: string) => { navigator.clipboard.writeText(`${window.location.origin}/quiz/${slug}`); toast({ title: "Link copiado!" }); };
  const fetchResponses = async (quizId: string) => { setShowResponses(quizId); const { data } = await supabase.from("quiz_responses").select("*").eq("quiz_id", quizId).order("completed_at", { ascending: false }); setResponses(data || []); };

  const addQuestion = () => { if (!editing) return; setEditing({ ...editing, questions: [...editing.questions, { id: generateId(), text: "", type: "multiple_choice", options: ["", ""], scores: [0, 0] }] }); };
  const updateQuestion = (idx: number, field: string, value: any) => { if (!editing) return; const q = [...editing.questions]; (q[idx] as any)[field] = value; setEditing({ ...editing, questions: q }); };
  const removeQuestion = (idx: number) => { if (!editing) return; setEditing({ ...editing, questions: editing.questions.filter((_, i) => i !== idx) }); };
  const addOption = (qIdx: number) => { if (!editing) return; const q = [...editing.questions]; q[qIdx].options = [...(q[qIdx].options || []), ""]; q[qIdx].scores = [...(q[qIdx].scores || []), 0]; if (q[qIdx].imageUrls) q[qIdx].imageUrls = [...(q[qIdx].imageUrls || []), ""]; setEditing({ ...editing, questions: q }); };
  const updateOption = (qIdx: number, oIdx: number, value: string) => { if (!editing) return; const q = [...editing.questions]; const opts = [...(q[qIdx].options || [])]; opts[oIdx] = value; q[qIdx].options = opts; setEditing({ ...editing, questions: q }); };
  const updateScore = (qIdx: number, oIdx: number, value: number) => { if (!editing) return; const q = [...editing.questions]; const s = [...(q[qIdx].scores || [])]; s[oIdx] = value; q[qIdx].scores = s; setEditing({ ...editing, questions: q }); };
  const updateImageUrl = (qIdx: number, oIdx: number, value: string) => { if (!editing) return; const q = [...editing.questions]; const imgs = [...(q[qIdx].imageUrls || (q[qIdx].options || []).map(() => ""))]; imgs[oIdx] = value; q[qIdx].imageUrls = imgs; setEditing({ ...editing, questions: q }); };
  const removeOption = (qIdx: number, oIdx: number) => { if (!editing) return; const q = [...editing.questions]; q[qIdx].options = (q[qIdx].options || []).filter((_, i) => i !== oIdx); q[qIdx].scores = (q[qIdx].scores || []).filter((_, i) => i !== oIdx); if (q[qIdx].imageUrls) q[qIdx].imageUrls = q[qIdx].imageUrls!.filter((_, i) => i !== oIdx); setEditing({ ...editing, questions: q }); };

  const addResult = () => { if (!editing) return; const results = [...(editing.settings?.results || []), { id: generateId(), title: "", description: "", minScore: 0, maxScore: 0, stageId: "", whatsappMessage: "" }]; setEditing({ ...editing, settings: { ...editing.settings, results } }); };
  const updateResult = (idx: number, updates: Partial<QuizResult>) => { if (!editing) return; const r = [...(editing.settings?.results || [])]; r[idx] = { ...r[idx], ...updates }; setEditing({ ...editing, settings: { ...editing.settings, results: r } }); };
  const removeResult = (idx: number) => { if (!editing) return; setEditing({ ...editing, settings: { ...editing.settings, results: (editing.settings?.results || []).filter((_: any, i: number) => i !== idx) } }); };

  const selectedPipelineStages = editing?.settings?.pipelineId ? stages.filter(s => s.pipeline_id === editing.settings.pipelineId) : stages;

  // Analytics
  if (showAnalytics) {
    const totalResp = quizzes.reduce((s, q) => s + (q._responseCount || 0), 0);
    const topQ = [...quizzes].sort((a, b) => (b._responseCount || 0) - (a._responseCount || 0)).slice(0, 6);
    const chartData = topQ.map(q => ({ name: q.title.substring(0, 15), respostas: q._responseCount || 0 }));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">📊 Analytics de Quiz</h2><Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>← Voltar</Button></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Quiz", value: quizzes.length, icon: FileQuestion, color: "text-blue-400" },
            { label: "Publicados", value: quizzes.filter(q => q.is_published).length, icon: Eye, color: "text-primary" },
            { label: "Total Respostas", value: totalResp, icon: Users, color: "text-emerald-400" },
            { label: "Média/Quiz", value: quizzes.length > 0 ? Math.round(totalResp / quizzes.length) : 0, icon: TrendingUp, color: "text-purple-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-bold text-foreground mt-1">{m.value}</p></div><m.icon className={`h-8 w-8 ${m.color} opacity-60`} /></div></CardContent></Card>
          ))}
        </div>
        <Card className="surface-card border-border"><CardHeader><CardTitle className="text-sm">Quiz mais respondidos</CardTitle></CardHeader><CardContent>
          {chartData.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={11} /><YAxis stroke="hsl(0 0% 45%)" fontSize={11} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /><Bar dataKey="respostas" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
        </CardContent></Card>
      </div>
    );
  }

  if (showResponses) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">Respostas do Quiz</h2><Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button></div>
        {responses.length === 0 ? <div className="surface-card rounded-lg p-8 text-center"><p className="text-muted-foreground">Nenhuma resposta</p></div> : (
          <div className="space-y-3">{responses.map((r: any) => (
            <div key={r.id} className="surface-card rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{new Date(r.completed_at).toLocaleString("pt-BR")}</p>
                {r.responses?._score !== undefined && <span className="text-xs font-bold text-primary">Score: {r.responses._score}</span>}
              </div>
              <div className="space-y-1">{Object.entries(r.responses as Record<string, string>).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (<p key={k} className="text-xs"><span className="text-foreground font-medium">{k}:</span> <span className="text-muted-foreground">{String(v)}</span></p>))}</div>
              {r.responses?._name && <p className="text-xs mt-2 text-primary">👤 {r.responses._name} — {r.responses._email}</p>}
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  if (editing) {
    const ps = editing.style || {};
    const pBg = ps.bgColor || "#000";
    const pText = ps.textColor || "#fff";
    const pAccent = ps.accentColor || "#84CC16";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Quiz</h2>
            <p className="text-xs text-muted-foreground">Configure perguntas, pontuação, CRM e WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}><Eye className="h-3.5 w-3.5 mr-1" /> Preview</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/quiz/{editing.slug || "..."}</p></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
            <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.showScore || false} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, showScore: v } })} /> Score</label>
          </div>
        </div>
        <div><Label className="text-xs">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>

        {/* Editor Tabs */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          {[
            { id: "questions" as const, label: "Perguntas", icon: "❓" },
            { id: "results" as const, label: "Resultados", icon: "🏆" },
            { id: "crm" as const, label: "CRM", icon: "👥" },
            { id: "whatsapp" as const, label: "WhatsApp", icon: "💬" },
            { id: "style" as const, label: "Estilo", icon: "🎨" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setEditorTab(tab.id)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${editorTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
          <div className="space-y-4">
            {/* Questions Tab */}
            {editorTab === "questions" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">Perguntas ({editing.questions.length})</p><Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Pergunta</Button></div>
                {editing.questions.map((q, qIdx) => (
                  <div key={q.id} className="surface-card rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between"><p className="text-xs font-semibold text-primary">Pergunta {qIdx + 1}</p><Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button></div>
                    <Input value={q.text} onChange={e => updateQuestion(qIdx, "text", e.target.value)} placeholder="Qual é a sua pergunta?" className="bg-secondary/50 border-border" />
                    <select value={q.type} onChange={e => updateQuestion(qIdx, "type", e.target.value)} className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground"><option value="multiple_choice">Múltipla escolha</option><option value="text">Texto livre</option></select>
                    {q.type === "multiple_choice" && (
                      <div className="space-y-2 pl-3">
                        {(q.options || []).map((opt, oIdx) => (
                          <div key={oIdx} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Opção ${oIdx + 1}`} className="bg-secondary/50 border-border text-sm h-8 flex-1" />
                              {editing.settings?.showScore && (
                                <Input type="number" value={(q.scores || [])[oIdx] ?? 0} onChange={e => updateScore(qIdx, oIdx, parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs bg-secondary/50 border-border" placeholder="Pts" />
                              )}
                              <Button variant="ghost" size="sm" onClick={() => removeOption(qIdx, oIdx)} className="h-6 w-6 p-0 text-destructive"><X className="h-3 w-3" /></Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Image className="h-3 w-3 text-muted-foreground" />
                              <Input value={(q.imageUrls || [])[oIdx] || ""} onChange={e => updateImageUrl(qIdx, oIdx, e.target.value)} placeholder="URL da imagem (opcional)" className="h-6 text-[10px] bg-secondary/50 border-border flex-1" />
                            </div>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)} className="text-xs text-primary"><Plus className="h-3 w-3 mr-1" /> Opção</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Results Tab */}
            {editorTab === "results" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">Resultados por Score</p><Button variant="outline" size="sm" onClick={addResult}><Plus className="h-3 w-3 mr-1" /> Resultado</Button></div>
                <p className="text-xs text-muted-foreground">Configure qual resultado aparece para cada faixa de pontuação. Cada resultado pode enviar o lead para uma etapa diferente do CRM.</p>
                {(editing.settings?.results || []).map((r: QuizResult, idx: number) => (
                  <div key={r.id} className="surface-card rounded-lg p-4 space-y-2 relative">
                    <Button variant="ghost" size="sm" onClick={() => removeResult(idx)} className="absolute top-2 right-2 text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                    <Input value={r.title} onChange={e => updateResult(idx, { title: e.target.value })} placeholder="Título do resultado (ex: Lead Quente 🔥)" className="h-8 text-xs bg-secondary/50 border-border" />
                    <Textarea value={r.description} onChange={e => updateResult(idx, { description: e.target.value })} placeholder="Descrição..." className="text-xs bg-secondary/50 border-border" rows={2} />
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px]">Score mín</Label><Input type="number" value={r.minScore} onChange={e => updateResult(idx, { minScore: parseInt(e.target.value) || 0 })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                      <div><Label className="text-[10px]">Score máx</Label><Input type="number" value={r.maxScore} onChange={e => updateResult(idx, { maxScore: parseInt(e.target.value) || 0 })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                    </div>
                    <div>
                      <Label className="text-[10px]">Etapa CRM para este resultado</Label>
                      <select value={r.stageId || ""} onChange={e => updateResult(idx, { stageId: e.target.value })} className="w-full h-7 text-xs bg-secondary border border-border rounded px-2 mt-0.5 text-foreground">
                        <option value="">Usar etapa padrão</option>
                        {selectedPipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Mensagem WhatsApp personalizada (opcional)</Label>
                      <Input value={r.whatsappMessage || ""} onChange={e => updateResult(idx, { whatsappMessage: e.target.value })} placeholder="Olá {nome}! Seu resultado foi: {resultado}" className="h-7 text-[10px] bg-secondary/50 border-border mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CRM Tab */}
            {editorTab === "crm" && (
              <div className="space-y-4">
                <div className="surface-card rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Integração com CRM</h3>
                      <p className="text-xs text-muted-foreground">Configure como os leads do quiz serão qualificados e roteados no CRM</p>
                    </div>
                  </div>

                  {stages.length > 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <p className="text-xs font-bold text-primary">Integração Ativa — leads serão criados automaticamente</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Pipeline de Destino</Label>
                      <select value={editing.settings?.pipelineId || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, pipelineId: e.target.value || null, stageId: null } })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                        <option value="">Selecione o pipeline...</option>
                        {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Etapa Inicial (padrão)</Label>
                      <select value={editing.settings?.stageId || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, stageId: e.target.value || null } })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                        <option value="">Selecione a etapa...</option>
                        {selectedPipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Origem do Lead</Label>
                    <select value={editing.settings?.leadSource || "quiz"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, leadSource: e.target.value } })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                      <option value="quiz">Quiz</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="google">Google</option>
                      <option value="indicacao">Indicação</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Tags Automáticas</Label>
                    <Input value={(editing.settings?.autoTags || []).join(", ")} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, autoTags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) } })} placeholder="tag1, tag2, tag3" className="mt-1 bg-secondary/50 border-border" />
                  </div>

                  <p className="text-xs text-muted-foreground">💡 Cada resultado pode ter uma etapa CRM diferente. Configure na aba "Resultados".</p>
                </div>
              </div>
            )}

            {/* WhatsApp Tab */}
            {editorTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="surface-card rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Redirecionamento WhatsApp</h3>
                      <p className="text-xs text-muted-foreground">Após completar o quiz, redirecione o lead para o WhatsApp com mensagem personalizada</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Número do WhatsApp (com DDD+país)</Label>
                    <Input value={editing.whatsapp_redirect || ""} onChange={e => setEditing({ ...editing, whatsapp_redirect: e.target.value })} placeholder="5511999999999" className="mt-1 bg-secondary/50 border-border" />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Mensagem personalizada</Label>
                    <p className="text-[10px] text-muted-foreground mb-1">Use variáveis: {"{nome}"}, {"{email}"}, {"{score}"}, {"{resultado}"}</p>
                    <Textarea value={editing.whatsapp_message || ""} onChange={e => setEditing({ ...editing, whatsapp_message: e.target.value })} placeholder="Olá {nome}! Você completou nosso quiz e seu resultado foi: {resultado}. Vamos conversar?" className="bg-secondary/50 border-border" rows={4} />
                  </div>

                  {editing.whatsapp_redirect && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> Após o quiz, o lead será redirecionado para wa.me/{editing.whatsapp_redirect}</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">💡 Cada resultado também pode ter sua própria mensagem WhatsApp personalizada. Configure na aba "Resultados".</p>
                </div>
              </div>
            )}

            {/* Style Tab */}
            {editorTab === "style" && (
              <div className="surface-card rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
                <div className="grid grid-cols-3 gap-3">
                  {[{ key: "bgColor", label: "Fundo" }, { key: "textColor", label: "Texto" }, { key: "accentColor", label: "Destaque" }].map(c => (
                    <div key={c.key} className="flex items-center gap-2">
                      <input type="color" value={editing.style?.[c.key] || "#000"} onChange={e => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                      <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div><Label className="text-[10px]">URL da Logo (opcional)</Label><Input value={editing.style?.logoUrl || ""} onChange={e => setEditing({ ...editing, style: { ...editing.style, logoUrl: e.target.value } })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.showProgressBar ?? true} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, showProgressBar: v } })} /> Barra de progresso</label>
              </div>
            )}
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: pBg }}>
              <div className="p-6 flex flex-col items-center justify-center min-h-[400px]" style={{ color: pText, fontFamily: "Inter" }}>
                {ps.logoUrl && <img src={ps.logoUrl} alt="Logo" className="h-10 mb-4 object-contain" />}
                {editing.settings?.showProgressBar && <div className="w-full max-w-sm h-1 rounded-full mb-6" style={{ background: `${pText}10` }}><div className="h-full rounded-full" style={{ width: "40%", background: pAccent }} /></div>}
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: pAccent }}>PERGUNTA 1 DE {editing.questions.length}</p>
                <h2 className="text-xl font-bold mb-6 text-center">{editing.questions[0]?.text || "Sua pergunta aqui"}</h2>
                <div className="w-full max-w-sm space-y-2">
                  {(editing.questions[0]?.options || ["Opção 1", "Opção 2"]).map((opt, i) => {
                    const imgUrl = (editing.questions[0]?.imageUrls || [])[i];
                    return (
                      <div key={i} className="rounded-xl px-4 py-3 text-sm cursor-pointer flex items-center gap-3" style={{ border: `1px solid ${pText}15`, background: i === 0 ? `${pAccent}12` : `${pText}05`, color: i === 0 ? pAccent : pText }}>
                        {imgUrl && <img src={imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                        {opt || `Opção ${i + 1}`}
                      </div>
                    );
                  })}
                </div>
                <button className="mt-6 px-8 py-3 rounded-xl font-bold text-sm" style={{ background: pAccent, color: pBg }}>Próxima →</button>
                {editing.whatsapp_redirect && (
                  <p className="mt-4 text-[10px] flex items-center gap-1" style={{ color: `${pText}40` }}><MessageCircle className="h-3 w-3" /> Redireciona para WhatsApp ao finalizar</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showTemplates) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">Templates de Quiz</h2><Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>← Voltar</Button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUIZ_TEMPLATES.map(t => (
            <button key={t.name} onClick={() => startFromTemplate(t)} className="surface-card rounded-lg p-5 text-left hover:border-primary/30 transition-colors space-y-2">
              <span className="text-3xl">{t.icon}</span>
              <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <p className="text-[10px] text-primary">{t.questions.length} perguntas</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Quiz</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}><Sparkles className="h-4 w-4 mr-1" /> Templates</Button>
          <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo Quiz</Button>
        </div>
      </div>
      {quizzes.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum quiz criado</p>
          <div className="flex gap-2 justify-center"><Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>Usar Template</Button><Button size="sm" onClick={startNew}>Criar do Zero</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                <div className="flex items-center gap-1">
                  {quiz.whatsapp_redirect && <MessageCircle className="h-3 w-3 text-primary" />}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${quiz.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{quiz.is_published ? "Publicado" : "Rascunho"}</span>
                </div>
              </div>
              {quiz.description && <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{quiz.questions.length} perguntas</span><span>{quiz._responseCount} respostas</span></div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing({ ...quiz }); setEditorTab("questions"); }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(quiz.slug)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => fetchResponses(quiz.id)}><Eye className="h-3 w-3" /></Button>
                {quiz.is_published && (
                  <Button variant="ghost" size="sm" asChild><a href={`/quiz/${quiz.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(quiz.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizList;
