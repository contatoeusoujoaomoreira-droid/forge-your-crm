import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, FileQuestion, Copy, Pencil, Trash2, Eye, Sparkles } from "lucide-react";

interface Question {
  id: string; text: string; type: "text" | "multiple_choice";
  options?: string[]; scores?: number[];
}

interface QuizResult {
  id: string; title: string; description: string; minScore: number; maxScore: number;
}

interface Quiz {
  id: string; title: string; description: string | null; slug: string;
  is_active: boolean; is_published: boolean; questions: Question[];
  style: any; settings: any; created_at: string; _responseCount?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const QUIZ_TEMPLATES = [
  { name: "Quiz de Perfil", icon: "🧠", description: "Descubra qual perfil mais combina com você",
    questions: [
      { id: generateId(), text: "Como você prefere trabalhar?", type: "multiple_choice" as const, options: ["Sozinho", "Em equipe", "Ambos"], scores: [1, 2, 3] },
      { id: generateId(), text: "Qual sua maior habilidade?", type: "multiple_choice" as const, options: ["Criatividade", "Análise", "Comunicação", "Liderança"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "O que te motiva?", type: "multiple_choice" as const, options: ["Desafios", "Reconhecimento", "Impacto", "Autonomia"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Perfil Criativo", description: "Você tem um perfil criativo e inovador!", minScore: 0, maxScore: 5 }, { id: generateId(), title: "Perfil Analítico", description: "Você é metódico e detalhista.", minScore: 6, maxScore: 12 }] },
  },
  { name: "Diagnóstico", icon: "🔬", description: "Diagnóstico do nível de maturidade do negócio",
    questions: [
      { id: generateId(), text: "Você tem um processo de vendas definido?", type: "multiple_choice" as const, options: ["Não", "Parcialmente", "Sim"], scores: [0, 1, 2] },
      { id: generateId(), text: "Usa CRM para gerenciar leads?", type: "multiple_choice" as const, options: ["Não", "Sim, planilha", "Sim, ferramenta"], scores: [0, 1, 2] },
      { id: generateId(), text: "Faz marketing digital?", type: "multiple_choice" as const, options: ["Nunca", "Às vezes", "Sempre"], scores: [0, 1, 2] },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#3b82f6" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Iniciante", description: "Você está começando. Vamos te ajudar!", minScore: 0, maxScore: 2 }, { id: generateId(), title: "Intermediário", description: "Bom progresso!", minScore: 3, maxScore: 4 }, { id: generateId(), title: "Avançado", description: "Seu negócio está maduro!", minScore: 5, maxScore: 6 }] },
  },
  { name: "Calculadora", icon: "🧮", description: "Calcule o potencial de receita",
    questions: [
      { id: generateId(), text: "Quantos leads você gera por mês?", type: "multiple_choice" as const, options: ["0-50", "50-200", "200-500", "+500"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Qual seu ticket médio?", type: "multiple_choice" as const, options: ["Até R$ 500", "R$ 500-2.000", "R$ 2.000-10.000", "+R$ 10.000"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Qual sua taxa de conversão atual?", type: "multiple_choice" as const, options: ["< 1%", "1-3%", "3-5%", "> 5%"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#f59e0b" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Fase Inicial", description: "Potencial de crescimento enorme!", minScore: 0, maxScore: 4 }, { id: generateId(), title: "Crescimento", description: "Você está no caminho certo!", minScore: 5, maxScore: 8 }, { id: generateId(), title: "Escala", description: "Pronto para escalar!", minScore: 9, maxScore: 12 }] },
  },
  { name: "Recomendação de Produto", icon: "🛒", description: "Qual produto ideal para o cliente",
    questions: [
      { id: generateId(), text: "Qual seu objetivo principal?", type: "multiple_choice" as const, options: ["Mais vendas", "Mais leads", "Automação", "Branding"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Qual seu orçamento mensal?", type: "multiple_choice" as const, options: ["Até R$ 500", "R$ 500-2.000", "R$ 2.000-5.000", "+R$ 5.000"], scores: [1, 2, 3, 4] },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#8b5cf6" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Plano Starter", description: "Ideal para quem está começando.", minScore: 0, maxScore: 3 }, { id: generateId(), title: "Plano Pro", description: "Para negócios em crescimento.", minScore: 4, maxScore: 8 }] },
  },
  { name: "Triagem", icon: "🏥", description: "Qualificação rápida de leads",
    questions: [
      { id: generateId(), text: "Qual o tamanho da sua empresa?", type: "multiple_choice" as const, options: ["MEI", "PME", "Médio porte", "Grande empresa"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Quando pretende implementar?", type: "multiple_choice" as const, options: ["Imediatamente", "1-3 meses", "3-6 meses", "Apenas pesquisando"], scores: [4, 3, 2, 1] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#10b981" },
    settings: { showScore: true, results: [] },
  },
  { name: "Pesquisa de Satisfação", icon: "😊", description: "CSAT e NPS dos seus clientes",
    questions: [
      { id: generateId(), text: "Quão satisfeito você está com nosso serviço?", type: "multiple_choice" as const, options: ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"], scores: [1, 2, 3, 4, 5] },
      { id: generateId(), text: "Recomendaria para um amigo?", type: "multiple_choice" as const, options: ["Não", "Talvez", "Sim", "Com certeza"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "O que podemos melhorar?", type: "text" as const },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#ef4444" },
    settings: { showScore: false, results: [] },
  },
  { name: "Onboarding", icon: "🚀", description: "Conheça seu novo cliente",
    questions: [
      { id: generateId(), text: "Qual seu principal desafio?", type: "multiple_choice" as const, options: ["Captar clientes", "Organizar processos", "Escalar vendas", "Reter clientes"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Quais ferramentas você usa?", type: "text" as const },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    settings: { showScore: false, results: [] },
  },
  { name: "Lead Scoring", icon: "🎯", description: "Pontue e qualifique seus leads automaticamente",
    questions: [
      { id: generateId(), text: "Cargo na empresa?", type: "multiple_choice" as const, options: ["Estagiário", "Analista", "Gerente", "Diretor/CEO"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Tamanho da empresa?", type: "multiple_choice" as const, options: ["1-10", "11-50", "51-200", "+200"], scores: [1, 2, 3, 4] },
      { id: generateId(), text: "Orçamento disponível?", type: "multiple_choice" as const, options: ["Sem orçamento", "Limitado", "Definido", "Flexível"], scores: [0, 1, 3, 4] },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#3b82f6" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Lead Frio", description: "Precisa de nutrição.", minScore: 0, maxScore: 4 }, { id: generateId(), title: "Lead Morno", description: "Potencial interessante.", minScore: 5, maxScore: 8 }, { id: generateId(), title: "Lead Quente", description: "Pronto para abordar!", minScore: 9, maxScore: 12 }] },
  },
  { name: "Avaliação de Conhecimento", icon: "📚", description: "Teste de conhecimento com gabarito",
    questions: [
      { id: generateId(), text: "O que é CRM?", type: "multiple_choice" as const, options: ["Rede social", "Gestão de relacionamento", "Tipo de anúncio", "E-mail marketing"], scores: [0, 1, 0, 0] },
      { id: generateId(), text: "O que é funil de vendas?", type: "multiple_choice" as const, options: ["Tipo de software", "Etapas do processo comercial", "Ferramenta de design", "Método de atendimento"], scores: [0, 1, 0, 0] },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#f59e0b" },
    settings: { showScore: true, results: [{ id: generateId(), title: "Iniciante", description: "Hora de aprender mais!", minScore: 0, maxScore: 0 }, { id: generateId(), title: "Expert", description: "Você domina o assunto!", minScore: 1, maxScore: 2 }] },
  },
];

const QuizList = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
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
    const { data } = await supabase.from("pipeline_stages").select("id, name").eq("user_id", user.id).order("position");
    if (data) setStages(data);
  };

  useEffect(() => { fetchQuizzes(); fetchStages(); }, [user]);

  const startNew = () => setEditing({
    id: "", title: "", description: "", slug: "", is_active: true, is_published: false,
    questions: [{ id: generateId(), text: "", type: "multiple_choice", options: ["", ""], scores: [0, 0] }],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    settings: { showScore: false, results: [], stageId: null },
    created_at: "",
  });

  const startFromTemplate = (t: typeof QUIZ_TEMPLATES[0]) => {
    setEditing({
      id: "", title: t.name, description: t.description, slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_active: true, is_published: false, questions: t.questions.map(q => ({ ...q, id: generateId() })),
      style: t.style, settings: t.settings, created_at: "",
    });
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = {
      title: editing.title, description: editing.description, slug: editing.slug,
      is_active: editing.is_active, is_published: editing.is_published,
      questions: editing.questions as any, style: editing.style as any, settings: editing.settings as any,
    };
    if (editing.id) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("quizzes").insert(payload);
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
  const addOption = (qIdx: number) => { if (!editing) return; const q = [...editing.questions]; q[qIdx].options = [...(q[qIdx].options || []), ""]; q[qIdx].scores = [...(q[qIdx].scores || []), 0]; setEditing({ ...editing, questions: q }); };
  const updateOption = (qIdx: number, oIdx: number, value: string) => { if (!editing) return; const q = [...editing.questions]; const opts = [...(q[qIdx].options || [])]; opts[oIdx] = value; q[qIdx].options = opts; setEditing({ ...editing, questions: q }); };
  const updateScore = (qIdx: number, oIdx: number, value: number) => { if (!editing) return; const q = [...editing.questions]; const s = [...(q[qIdx].scores || [])]; s[oIdx] = value; q[qIdx].scores = s; setEditing({ ...editing, questions: q }); };
  const removeOption = (qIdx: number, oIdx: number) => { if (!editing) return; const q = [...editing.questions]; q[qIdx].options = (q[qIdx].options || []).filter((_, i) => i !== oIdx); q[qIdx].scores = (q[qIdx].scores || []).filter((_, i) => i !== oIdx); setEditing({ ...editing, questions: q }); };

  const addResult = () => { if (!editing) return; const results = [...(editing.settings?.results || []), { id: generateId(), title: "", description: "", minScore: 0, maxScore: 0 }]; setEditing({ ...editing, settings: { ...editing.settings, results } }); };
  const updateResult = (idx: number, updates: Partial<QuizResult>) => { if (!editing) return; const r = [...(editing.settings?.results || [])]; r[idx] = { ...r[idx], ...updates }; setEditing({ ...editing, settings: { ...editing.settings, results: r } }); };
  const removeResult = (idx: number) => { if (!editing) return; setEditing({ ...editing, settings: { ...editing.settings, results: (editing.settings?.results || []).filter((_: any, i: number) => i !== idx) } }); };

  if (showResponses) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">Respostas do Quiz</h2><Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button></div>
        {responses.length === 0 ? <div className="surface-card rounded-lg p-8 text-center"><p className="text-muted-foreground">Nenhuma resposta</p></div> : (
          <div className="space-y-3">{responses.map((r: any) => (
            <div key={r.id} className="surface-card rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2">{new Date(r.completed_at).toLocaleString("pt-BR")}</p>
              <div className="space-y-1">{Object.entries(r.responses as Record<string, string>).map(([k, v]) => (<p key={k} className="text-xs"><span className="text-foreground font-medium">{k}:</span> <span className="text-muted-foreground">{v}</span></p>))}</div>
            </div>
          ))}</div>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Quiz</h2><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button><Button size="sm" onClick={handleSave}>Salvar</Button></div></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/quiz/{editing.slug || "..."}</p></div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.showScore || false} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, showScore: v } })} /> Mostrar pontuação</label>
        </div>

        {/* Style */}
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
        </div>

        {/* CRM Integration */}
        {stages.length > 0 && (
          <div className="surface-card rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🔗 Integração CRM</p>
            <div><Label className="text-[10px]">Enviar lead para etapa</Label>
              <select value={editing.settings?.stageId || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, stageId: e.target.value || null } })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                <option value="">Nenhuma</option>{stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Questions */}
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
                    <div key={oIdx} className="flex items-center gap-2">
                      <Input value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Opção ${oIdx + 1}`} className="bg-secondary/50 border-border text-sm h-8 flex-1" />
                      {editing.settings?.showScore && (
                        <Input type="number" value={(q.scores || [])[oIdx] ?? 0} onChange={e => updateScore(qIdx, oIdx, parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs bg-secondary/50 border-border" placeholder="Pts" />
                      )}
                      <Button variant="ghost" size="sm" onClick={() => removeOption(qIdx, oIdx)} className="h-6 w-6 p-0 text-destructive"><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)} className="text-xs text-primary"><Plus className="h-3 w-3 mr-1" /> Opção</Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        {editing.settings?.showScore && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">Resultados por Score</p><Button variant="outline" size="sm" onClick={addResult}><Plus className="h-3 w-3 mr-1" /> Resultado</Button></div>
            {(editing.settings?.results || []).map((r: QuizResult, idx: number) => (
              <div key={r.id} className="surface-card rounded-lg p-4 space-y-2 relative">
                <Button variant="ghost" size="sm" onClick={() => removeResult(idx)} className="absolute top-2 right-2 text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                <Input value={r.title} onChange={e => updateResult(idx, { title: e.target.value })} placeholder="Título do resultado" className="h-8 text-xs bg-secondary/50 border-border" />
                <Textarea value={r.description} onChange={e => updateResult(idx, { description: e.target.value })} placeholder="Descrição..." className="text-xs bg-secondary/50 border-border" rows={2} />
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Score mín</Label><Input type="number" value={r.minScore} onChange={e => updateResult(idx, { minScore: parseInt(e.target.value) || 0 })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                  <div><Label className="text-[10px]">Score máx</Label><Input type="number" value={r.maxScore} onChange={e => updateResult(idx, { maxScore: parseInt(e.target.value) || 0 })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${quiz.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{quiz.is_published ? "Publicado" : "Rascunho"}</span>
              </div>
              {quiz.description && <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{quiz.questions.length} perguntas</span><span>{quiz._responseCount} respostas</span></div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...quiz })}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(quiz.slug)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => fetchResponses(quiz.id)}><Eye className="h-3 w-3" /></Button>
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
