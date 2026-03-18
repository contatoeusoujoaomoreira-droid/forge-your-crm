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
import { Plus, X, FileText, Copy, Pencil, Trash2, Eye, Sparkles, ChevronUp, ChevronDown, BarChart3, ExternalLink, Users, TrendingUp, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import LeadViewer from "./LeadViewer";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "number" | "date" | "scale" | "file" | "nps";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

interface FormData {
  id: string; title: string; description: string | null; slug: string;
  is_active: boolean; is_published: boolean; fields: FormField[];
  settings: any; style: any; pipeline_id: string | null; stage_id: string | null;
  created_at: string; _responseCount?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const fieldTypes = [
  { value: "text", label: "Texto", icon: "✏️" }, { value: "email", label: "E-mail", icon: "📧" },
  { value: "phone", label: "Telefone", icon: "📱" }, { value: "textarea", label: "Texto longo", icon: "📝" },
  { value: "select", label: "Seleção", icon: "📋" }, { value: "radio", label: "Múltipla escolha", icon: "🔘" },
  { value: "checkbox", label: "Checkbox", icon: "☑️" }, { value: "number", label: "Número", icon: "🔢" },
  { value: "date", label: "Data", icon: "📅" }, { value: "scale", label: "Escala", icon: "📊" },
  { value: "nps", label: "NPS", icon: "⭐" },
];

const FORM_TEMPLATES = [
  {
    name: "Captação de Leads", icon: "🎯", description: "Formulário simples para captar leads qualificados",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome completo", placeholder: "Seu nome", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", placeholder: "seu@email.com", required: true },
      { id: generateId(), type: "phone" as const, label: "WhatsApp", placeholder: "(11) 99999-9999", required: true },
      { id: generateId(), type: "select" as const, label: "Como nos encontrou?", options: ["Instagram", "Google", "Indicação", "Outro"], required: false },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", fontFamily: "Inter" },
    settings: { submitText: "Quero saber mais", successMessage: "Obrigado! Entraremos em contato.", multiStep: true, showProgressBar: true },
  },
  {
    name: "Contato", icon: "💬", description: "Formulário de contato profissional",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome", placeholder: "Seu nome", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", placeholder: "email@empresa.com", required: true },
      { id: generateId(), type: "text" as const, label: "Assunto", placeholder: "Assunto da mensagem", required: true },
      { id: generateId(), type: "textarea" as const, label: "Mensagem", placeholder: "Sua mensagem...", required: true },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#3b82f6", fontFamily: "Inter" },
    settings: { submitText: "Enviar Mensagem", successMessage: "Mensagem enviada com sucesso!", multiStep: true, showProgressBar: true },
  },
  {
    name: "Pesquisa de Satisfação", icon: "📊", description: "NPS e feedback dos clientes",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome", placeholder: "Seu nome", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", placeholder: "email", required: true },
      { id: generateId(), type: "nps" as const, label: "De 0 a 10, quanto recomendaria?", min: 0, max: 10, required: true },
      { id: generateId(), type: "textarea" as const, label: "O que podemos melhorar?", placeholder: "Conte-nos...", required: false },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#f59e0b", fontFamily: "Inter" },
    settings: { submitText: "Enviar Feedback", successMessage: "Obrigado pelo seu feedback!", multiStep: true, showProgressBar: true },
  },
  {
    name: "Orçamento", icon: "💰", description: "Solicitação de orçamento detalhada",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome / Empresa", placeholder: "Nome ou empresa", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", placeholder: "email@empresa.com", required: true },
      { id: generateId(), type: "phone" as const, label: "Telefone", placeholder: "(11) 99999-9999", required: true },
      { id: generateId(), type: "select" as const, label: "Tipo de serviço", options: ["Consultoria", "Desenvolvimento", "Design", "Marketing", "Outro"], required: true },
      { id: generateId(), type: "textarea" as const, label: "Descreva seu projeto", placeholder: "Detalhes...", required: true },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#8b5cf6", fontFamily: "Inter" },
    settings: { submitText: "Solicitar Orçamento", successMessage: "Recebemos sua solicitação!", multiStep: true, showProgressBar: true },
  },
  {
    name: "Cadastro", icon: "📝", description: "Cadastro de usuários e membros",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome completo", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", required: true },
      { id: generateId(), type: "phone" as const, label: "Telefone", required: true },
      { id: generateId(), type: "date" as const, label: "Data de nascimento", required: false },
      { id: generateId(), type: "text" as const, label: "Empresa", required: false },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#10b981", fontFamily: "Inter" },
    settings: { submitText: "Cadastrar", successMessage: "Cadastro realizado com sucesso!", multiStep: true, showProgressBar: true },
  },
  {
    name: "Suporte", icon: "🛟", description: "Abertura de chamados e suporte",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", required: true },
      { id: generateId(), type: "select" as const, label: "Categoria", options: ["Bug", "Dúvida", "Sugestão", "Financeiro", "Outro"], required: true },
      { id: generateId(), type: "textarea" as const, label: "Descrição do problema", placeholder: "Descreva em detalhes...", required: true },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#ef4444", fontFamily: "Inter" },
    settings: { submitText: "Abrir Chamado", successMessage: "Chamado aberto!", multiStep: true, showProgressBar: true },
  },
];

const FormsList = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormData[]>([]);
  const [editing, setEditing] = useState<FormData | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchLeads = async () => {
    if (!user) return;
    const { data } = await supabase.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLeads((data || []).map((l: any) => ({ ...l, tags: Array.isArray(l.tags) ? l.tags : [] })));
  };

  const fetchForms = async () => {
    const { data } = await supabase.from("forms").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("form_responses").select("form_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.form_id] = (countMap[r.form_id] || 0) + 1; });
    setForms(data.map((f: any) => ({ ...f, fields: Array.isArray(f.fields) ? f.fields as FormField[] : [], _responseCount: countMap[f.id] || 0 })));
  };

  const fetchStages = async () => {
    if (!user) return;
    const { data } = await supabase.from("pipeline_stages").select("id, name").eq("user_id", user.id).order("position");
    if (data) setStages(data);
  };

  useEffect(() => { fetchForms(); fetchStages(); }, [user]);

  const startNew = () => setEditing({
    id: "", title: "", description: "", slug: "", is_active: true, is_published: false,
    fields: [
      { id: generateId(), type: "text", label: "Nome", placeholder: "Seu nome", required: true },
      { id: generateId(), type: "email", label: "E-mail", placeholder: "seu@email.com", required: true },
    ],
    settings: { submitText: "Enviar", successMessage: "Obrigado!", multiStep: true, showProgressBar: true },
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", fontFamily: "Inter" },
    pipeline_id: null, stage_id: null, created_at: "",
  });

  const startFromTemplate = (template: typeof FORM_TEMPLATES[0]) => {
    setEditing({
      id: "", title: template.name, description: template.description, slug: template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_active: true, is_published: false, fields: template.fields.map(f => ({ ...f, id: generateId() })),
      settings: template.settings, style: template.style,
      pipeline_id: null, stage_id: null, created_at: "",
    });
    setShowTemplates(false);
  };

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = {
      title: editing.title, description: editing.description, slug: editing.slug,
      is_active: editing.is_active, is_published: editing.is_published,
      fields: editing.fields as any, settings: editing.settings, style: editing.style,
      pipeline_id: editing.pipeline_id, stage_id: editing.stage_id,
    };
    if (editing.id) {
      const { error } = await supabase.from("forms").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("forms").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Formulário salvo!" }); setEditing(null); fetchForms();
  };

  const handleDelete = async (id: string) => { await supabase.from("forms").delete().eq("id", id); toast({ title: "Formulário excluído" }); fetchForms(); };
  const handleCopyLink = (slug: string) => { navigator.clipboard.writeText(`${window.location.origin}/form/${slug}`); toast({ title: "Link copiado!" }); };

  const fetchResponses = async (formId: string) => {
    setShowResponses(formId);
    const { data } = await supabase.from("form_responses").select("*").eq("form_id", formId).order("completed_at", { ascending: false });
    setResponses(data || []);
  };

  const addField = () => { if (!editing) return; setEditing({ ...editing, fields: [...editing.fields, { id: generateId(), type: "text", label: "", placeholder: "", required: false }] }); };
  const updateField = (idx: number, updates: Partial<FormField>) => { if (!editing) return; const f = [...editing.fields]; f[idx] = { ...f[idx], ...updates }; setEditing({ ...editing, fields: f }); };
  const removeField = (idx: number) => { if (!editing) return; setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== idx) }); };
  const moveField = (idx: number, dir: "up" | "down") => {
    if (!editing) return;
    const f = [...editing.fields];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= f.length) return;
    [f[idx], f[swap]] = [f[swap], f[idx]];
    setEditing({ ...editing, fields: f });
  };

  // Analytics View
  if (showAnalytics) {
    const totalResponses = forms.reduce((s, f) => s + (f._responseCount || 0), 0);
    const topForms = [...forms].sort((a, b) => (b._responseCount || 0) - (a._responseCount || 0)).slice(0, 6);
    const chartData = topForms.map(f => ({ name: f.title.substring(0, 15), respostas: f._responseCount || 0 }));
    const publishedCount = forms.filter(f => f.is_published).length;
    const convRate = forms.length > 0 ? ((totalResponses / Math.max(forms.length, 1)) * 100).toFixed(0) : "0";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">📊 Analytics de Formulários</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(false)}>← Voltar</Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Forms", value: forms.length, icon: FileText, color: "text-blue-400" },
            { label: "Publicados", value: publishedCount, icon: Eye, color: "text-primary" },
            { label: "Total Respostas", value: totalResponses, icon: Users, color: "text-emerald-400" },
            { label: "Média/Form", value: convRate, icon: TrendingUp, color: "text-purple-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">{m.label}</p><p className="text-2xl font-bold text-foreground mt-1">{m.value}</p></div><m.icon className={`h-8 w-8 ${m.color} opacity-60`} /></div></CardContent></Card>
          ))}
        </div>
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm">Forms mais respondidos</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={11} /><YAxis stroke="hsl(0 0% 45%)" fontSize={11} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }} /><Bar dataKey="respostas" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Responses view with LeadViewer
  if (showResponses) {
    const formLeads = leads.filter(l => l.source === `form`);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Respostas do Formulário</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button>
        </div>

        {/* Lead Viewer */}
        {stages.length > 0 && (
          <LeadViewer leads={leads} stages={stages.map((s: any) => ({ ...s, position: 0, color: "#84cc16" }))} onRefresh={fetchLeads} title="Leads do Formulário" />
        )}

        {responses.length === 0 ? (
          <div className="surface-card rounded-lg p-8 text-center"><p className="text-muted-foreground">Nenhuma resposta</p></div>
        ) : (
          <div className="space-y-3">
            {responses.map((r: any) => (
              <div key={r.id} className="surface-card rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">{new Date(r.completed_at).toLocaleString("pt-BR")}</p>
                <div className="space-y-1">
                  {Object.entries(r.responses as Record<string, string>).map(([k, v]) => (
                    <p key={k} className="text-xs"><span className="text-foreground font-medium">{k}:</span> <span className="text-muted-foreground">{v}</span></p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editor with Preview
  if (editing) {
    const previewStyle = editing.style || {};
    const previewBg = previewStyle.bgColor || "#000";
    const previewText = previewStyle.textColor || "#fff";
    const previewAccent = previewStyle.accentColor || "#84CC16";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Formulário</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> {showPreview ? "Ocultar" : "Preview"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
          {/* Editor Column */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
              <div><Label className="text-xs text-muted-foreground">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/form/{editing.slug || "..."}</p></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
              <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
              <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.multiStep ?? true} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, multiStep: v } })} /> Sequencial</label>
              <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.showProgressBar ?? true} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, showProgressBar: v } })} /> Barra de progresso</label>
            </div>

            {/* CRM Integration */}
            {stages.length > 0 && (
              <div className="surface-card rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🔗 Integração CRM</p>
                <div>
                  <Label className="text-[10px]">Enviar lead para etapa</Label>
                  <select value={editing.stage_id || ""} onChange={e => setEditing({ ...editing, stage_id: e.target.value || null })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                    <option value="">Nenhuma (não criar lead)</option>
                    {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Style */}
            <div className="surface-card rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[{ key: "bgColor", label: "Fundo" }, { key: "textColor", label: "Texto" }, { key: "accentColor", label: "Destaque" }].map(c => (
                  <div key={c.key} className="flex items-center gap-2">
                    <input type="color" value={editing.style[c.key] || "#000"} onChange={e => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                    <div><p className="text-[10px] text-muted-foreground">{c.label}</p></div>
                  </div>
                ))}
                <div>
                  <Label className="text-[10px] text-muted-foreground">Fonte</Label>
                  <select value={editing.style.fontFamily || "Inter"} onChange={e => setEditing({ ...editing, style: { ...editing.style, fontFamily: e.target.value } })} className="w-full h-8 text-xs bg-secondary border border-border rounded px-2 mt-1 text-foreground">
                    <option value="Inter">Inter</option><option value="system-ui">System UI</option><option value="Georgia">Georgia</option><option value="Courier New">Monospace</option>
                  </select>
                </div>
              </div>
              <div><Label className="text-[10px]">URL da Logo (opcional)</Label><Input value={editing.style.logoUrl || ""} onChange={e => setEditing({ ...editing, style: { ...editing.style, logoUrl: e.target.value } })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
            </div>

            {/* Settings */}
            <div className="surface-card rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚙️ Configurações</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Texto do botão</Label><Input value={editing.settings?.submitText || "Enviar"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, submitText: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                <div><Label className="text-[10px]">Mensagem de sucesso</Label><Input value={editing.settings?.successMessage || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, successMessage: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
              </div>
              <div><Label className="text-[10px]">Redirect pós-envio (URL)</Label><Input value={editing.settings?.redirectUrl || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, redirectUrl: e.target.value } })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold text-foreground">Campos ({editing.fields.length})</p><Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button></div>
              {editing.fields.map((field, idx) => (
                <div key={field.id} className="surface-card rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{fieldTypes.find(t => t.value === field.type)?.icon || "✏️"}</span>
                      <p className="text-xs font-semibold text-muted-foreground">Campo {idx + 1}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => moveField(idx, "up")} disabled={idx === 0} className="p-0.5 hover:bg-secondary rounded"><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => moveField(idx, "down")} disabled={idx === editing.fields.length - 1} className="p-0.5 hover:bg-secondary rounded"><ChevronDown className="h-3 w-3" /></button>
                      <Button variant="ghost" size="sm" onClick={() => removeField(idx)} className="text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-[10px]">Label</Label><Input value={field.label} onChange={e => updateField(idx, { label: e.target.value })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                    <div><Label className="text-[10px]">Tipo</Label>
                      <select value={field.type} onChange={e => updateField(idx, { type: e.target.value as any })} className="w-full h-7 text-xs bg-secondary border border-border rounded px-2 mt-0.5 text-foreground">
                        {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <Input value={field.placeholder || ""} onChange={e => updateField(idx, { placeholder: e.target.value })} placeholder="Placeholder..." className="h-7 text-xs bg-secondary/50 border-border" />
                  <div className="flex items-center gap-2"><input type="checkbox" checked={field.required || false} onChange={e => updateField(idx, { required: e.target.checked })} className="rounded" /><span className="text-xs text-muted-foreground">Obrigatório</span></div>
                  {(field.type === "select" || field.type === "radio") && (
                    <div className="pl-3"><Label className="text-[10px]">Opções (uma por linha)</Label><textarea value={(field.options || []).join("\n")} onChange={e => updateField(idx, { options: e.target.value.split("\n") })} className="w-full text-xs bg-secondary/50 border border-border rounded px-2 py-1 text-foreground mt-1" rows={3} /></div>
                  )}
                  {(field.type === "scale" || field.type === "nps") && (
                    <div className="grid grid-cols-2 gap-2 pl-3">
                      <div><Label className="text-[10px]">Mín</Label><Input type="number" value={field.min ?? 0} onChange={e => updateField(idx, { min: parseInt(e.target.value) })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                      <div><Label className="text-[10px]">Máx</Label><Input type="number" value={field.max ?? 10} onChange={e => updateField(idx, { max: parseInt(e.target.value) })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" /></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Column */}
          {showPreview && (
            <div className="rounded-xl border border-border overflow-hidden" style={{ background: previewBg }}>
              <div className="p-6 flex flex-col items-center justify-center min-h-[400px]" style={{ color: previewText, fontFamily: previewStyle.fontFamily || "Inter" }}>
                {previewStyle.logoUrl && <img src={previewStyle.logoUrl} alt="Logo" className="h-10 mb-4 object-contain" />}
                <h2 className="text-xl font-bold mb-1">{editing.title || "Título"}</h2>
                {editing.description && <p className="text-sm opacity-60 mb-6">{editing.description}</p>}
                {editing.settings?.showProgressBar && <div className="w-full max-w-sm h-1 rounded-full mb-6" style={{ background: `${previewText}10` }}><div className="h-full rounded-full" style={{ width: "33%", background: previewAccent }} /></div>}
                <div className="w-full max-w-sm space-y-4">
                  {editing.fields.slice(0, 3).map((f, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium mb-1.5">{f.label || "Campo"} {f.required && <span style={{ color: previewAccent }}>*</span>}</p>
                      <div className="rounded-xl px-4 py-3 text-sm" style={{ border: `1px solid ${previewText}15`, background: `${previewText}05` }}>
                        <span style={{ color: `${previewText}40` }}>{f.placeholder || "Digite aqui..."}</span>
                      </div>
                    </div>
                  ))}
                  {editing.fields.length > 3 && <p className="text-xs text-center" style={{ color: `${previewText}40` }}>+{editing.fields.length - 3} campos</p>}
                  <button className="w-full py-3 rounded-xl font-semibold text-sm" style={{ background: previewAccent, color: previewBg }}>
                    {editing.settings?.submitText || "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Templates modal
  if (showTemplates) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Templates de Formulários</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowTemplates(false)}>← Voltar</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FORM_TEMPLATES.map(t => (
            <button key={t.name} onClick={() => startFromTemplate(t)} className="surface-card rounded-lg p-5 text-left hover:border-primary/30 transition-colors space-y-2">
              <span className="text-3xl">{t.icon}</span>
              <h3 className="font-semibold text-foreground text-sm">{t.name}</h3>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <p className="text-[10px] text-primary">{t.fields.length} campos</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // List
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Formulários</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}><Sparkles className="h-4 w-4 mr-1" /> Templates</Button>
          <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo Form</Button>
        </div>
      </div>
      {forms.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum formulário criado</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>Usar Template</Button>
            <Button size="sm" onClick={startNew}>Criar do Zero</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div key={form.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{form.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${form.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{form.is_published ? "Publicado" : "Rascunho"}</span>
              </div>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{form.fields.length} campos</span><span>{form._responseCount} respostas</span></div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...form })}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(form.slug)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => fetchResponses(form.id)}><Eye className="h-3 w-3" /></Button>
                {form.is_published && (
                  <Button variant="ghost" size="sm" asChild><a href={`/form/${form.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(form.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormsList;
