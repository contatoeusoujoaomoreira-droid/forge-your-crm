import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, FileQuestion, Copy, Pencil, Trash2, Eye } from "lucide-react";

interface Question {
  id: string;
  text: string;
  type: "text" | "multiple_choice";
  options?: string[];
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  questions: Question[];
  created_at: string;
  _responseCount?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const QuizList = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("quiz_responses").select("quiz_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.quiz_id] = (countMap[r.quiz_id] || 0) + 1; });
    setQuizzes(data.map((q: any) => ({ ...q, questions: Array.isArray(q.questions) ? q.questions as Question[] : [], _responseCount: countMap[q.id] || 0 })));
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const startNew = () => setEditing({ id: "", title: "", description: "", slug: "", is_active: true, questions: [{ id: generateId(), text: "", type: "multiple_choice", options: ["", ""] }], created_at: "" });
  const startEdit = (quiz: Quiz) => setEditing({ ...quiz });

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = { title: editing.title, description: editing.description, slug: editing.slug, is_active: editing.is_active, questions: editing.questions as any };
    if (editing.id) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("quizzes").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Quiz salvo!" });
    setEditing(null);
    fetchQuizzes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("quizzes").delete().eq("id", id);
    toast({ title: "Quiz excluído" });
    fetchQuizzes();
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const fetchResponses = async (quizId: string) => {
    setShowResponses(quizId);
    const { data } = await supabase.from("quiz_responses").select("*").eq("quiz_id", quizId).order("completed_at", { ascending: false });
    setResponses(data || []);
  };

  const addQuestion = () => {
    if (!editing) return;
    setEditing({ ...editing, questions: [...editing.questions, { id: generateId(), text: "", type: "multiple_choice", options: ["", ""] }] });
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    if (!editing) return;
    const q = [...editing.questions];
    (q[idx] as any)[field] = value;
    setEditing({ ...editing, questions: q });
  };

  const removeQuestion = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, questions: editing.questions.filter((_, i) => i !== idx) });
  };

  const addOption = (qIdx: number) => {
    if (!editing) return;
    const q = [...editing.questions];
    q[qIdx].options = [...(q[qIdx].options || []), ""];
    setEditing({ ...editing, questions: q });
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    if (!editing) return;
    const q = [...editing.questions];
    const opts = [...(q[qIdx].options || [])];
    opts[oIdx] = value;
    q[qIdx].options = opts;
    setEditing({ ...editing, questions: q });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    if (!editing) return;
    const q = [...editing.questions];
    q[qIdx].options = (q[qIdx].options || []).filter((_, i) => i !== oIdx);
    setEditing({ ...editing, questions: q });
  };

  // Responses view
  if (showResponses) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Respostas do Quiz</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button>
        </div>
        {responses.length === 0 ? (
          <div className="surface-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nenhuma resposta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((r: any) => (
              <div key={r.id} className="surface-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground">{r.lead?.name || "Anônimo"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.completed_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="space-y-1">
                  {Object.entries(r.responses as Record<string, string>).map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground"><span className="text-foreground">{k}:</span> {v}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editor view
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Quiz</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar Quiz</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" placeholder="Descubra seu perfil..." />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
            <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" />
            <p className="text-[10px] text-muted-foreground mt-1">/quiz/{editing.slug || "..."}</p>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
          <Label className="text-xs text-muted-foreground">Ativo</Label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Perguntas ({editing.questions.length})</p>
            <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Pergunta</Button>
          </div>

          {editing.questions.map((q, qIdx) => (
            <div key={q.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Pergunta {qIdx + 1}</p>
                <Button variant="ghost" size="sm" onClick={() => removeQuestion(qIdx)} className="text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
              </div>
              <Input value={q.text} onChange={(e) => updateQuestion(qIdx, "text", e.target.value)} placeholder="Qual é a sua pergunta?" className="bg-secondary/50 border-border" />
              <select value={q.type} onChange={(e) => updateQuestion(qIdx, "type", e.target.value)} className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground">
                <option value="multiple_choice">Múltipla escolha</option>
                <option value="text">Texto livre</option>
              </select>
              {q.type === "multiple_choice" && (
                <div className="space-y-2 pl-3">
                  {(q.options || []).map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <Input value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Opção ${oIdx + 1}`} className="bg-secondary/50 border-border text-sm h-8" />
                      <Button variant="ghost" size="sm" onClick={() => removeOption(qIdx, oIdx)} className="h-6 w-6 p-0 text-destructive"><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addOption(qIdx)} className="text-xs text-primary"><Plus className="h-3 w-3 mr-1" /> Opção</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Quizzes</h2>
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo Quiz</Button>
      </div>

      {quizzes.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum quiz criado</p>
          <Button size="sm" onClick={startNew}>Criar Primeiro Quiz</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${quiz.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {quiz.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              {quiz.description && <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{quiz.questions.length} perguntas</span>
                <span>{quiz._responseCount} respostas</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(quiz)}><Pencil className="h-3 w-3" /></Button>
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
