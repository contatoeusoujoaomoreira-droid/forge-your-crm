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
import { Plus, X, FileText, Copy, Pencil, Trash2, Eye, Sparkles, ChevronUp, ChevronDown, BarChart3, ExternalLink, Users, TrendingUp, Target, MessageCircle, Link2 } from "lucide-react";
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
  conditionalField?: string;
  conditionalValue?: string;
}

interface FormData {
  id: string; title: string; description: string | null; slug: string;
  is_active: boolean; is_published: boolean; fields: FormField[];
  settings: any; style: any; pipeline_id: string | null; stage_id: string | null;
  whatsapp_redirect: string | null; whatsapp_message: string | null;
  created_at: string; _responseCount?: number;
}

interface Pipeline { id: string; name: string; }

const generateId = () => Math.random().toString(36).substring(2, 9);

const fieldTypes = [
  { value: "text", label: "Texto", icon: "✏️" }, { value: "email", label: "E-mail", icon: "📧" },
  { value: "phone", label: "Telefone", icon: "📱" }, { value: "textarea", label: "Texto longo", icon: "📝" },
  { value: "select", label: "Seleção", icon: "📋" }, { value: "radio", label: "Múltipla escolha", icon: "🔘" },
  { value: "checkbox", label: "Checkbox", icon: "☑️" }, { value: "number", label: "Número", icon: "🔢" },
  { value: "date", label: "Data", icon: "📅" }, { value: "scale", label: "Escala", icon: "📊" },
  { value: "nps", label: "NPS", icon: "⭐" },
];

const leadSourceOptions = [
  { value: "form", label: "Formulário" }, { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" }, { value: "google", label: "Google" },
  { value: "indicacao", label: "Indicação" }, { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
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
  const [stages, setStages] = useState<{ id: string; name: string; pipeline_id?: string | null }[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [editorTab, setEditorTab] = useState<"editor" | "crm" | "appearance" | "templates" | "forms">("editor");
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
    const { data } = await supabase.from("pipeline_stages").select("id, name, pipeline_id").eq("user_id", user.id).order("position");
    if (data) setStages(data);
  };

  const fetchPipelines = async () => {
    if (!user) return;
    const { data } = await supabase.from("pipelines").select("id, name").eq("user_id", user.id).order("created_at");
    if (data) setPipelines(data);
  };

  useEffect(() => { fetchForms(); fetchStages(); fetchLeads(); fetchPipelines(); }, [user]);

  const startNew = () => {
    setEditing({
      id: "", title: "", description: "", slug: "", is_active: true, is_published: false,
      fields: [
        { id: generateId(), type: "text", label: "Nome", placeholder: "Seu nome", required: true },
        { id: generateId(), type: "email", label: "E-mail", placeholder: "seu@email.com", required: true },
      ],
      settings: { submitText: "Enviar", successMessage: "Obrigado!", multiStep: true, showProgressBar: true, leadSource: "form", autoTags: [], notifyOnLead: false },
      style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", fontFamily: "Inter" },
      pipeline_id: null, stage_id: null, whatsapp_redirect: null, whatsapp_message: null, created_at: "",
    });
    setEditorTab("editor");
  };

  const startFromTemplate = (template: typeof FORM_TEMPLATES[0]) => {
    setEditing({
      id: "", title: template.name, description: template.description, slug: template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_active: true, is_published: false, fields: template.fields.map(f => ({ ...f, id: generateId() })),
      settings: { ...template.settings, leadSource: "form", autoTags: [], notifyOnLead: false }, style: template.style,
      pipeline_id: null, stage_id: null, whatsapp_redirect: null, whatsapp_message: null, created_at: "",
    });
    setShowTemplates(false);
    setEditorTab("editor");
  };

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const payload = {
      title: editing.title, description: editing.description, slug: editing.slug,
      is_active: editing.is_active, is_published: editing.is_published,
      fields: editing.fields as any, settings: editing.settings, style: editing.style,
      pipeline_id: editing.pipeline_id, stage_id: editing.stage_id,
      whatsapp_redirect: editing.whatsapp_redirect, whatsapp_message: editing.whatsapp_message,
    };
    if (editing.id) {
      const { error } = await supabase.from("forms").update(payload as any).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("forms").insert(payload as any);
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
    const formLeads = leads.filter(l => l.source?.startsWith("form"));
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Respostas do Formulário</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button>
        </div>
        {stages.length > 0 && (
          <LeadViewer leads={formLeads} stages={stages.map((s: any) => ({ ...s, position: 0, color: "#84cc16" }))} onRefresh={fetchLeads} title="Leads do Formulário" />
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

  // Editor with Tabs
  if (editing) {
    const previewStyle = editing.style || {};
    const previewBg = previewStyle.bgColor || "#000";
    const previewText = previewStyle.textColor || "#fff";
    const previewAccent = previewStyle.accentColor || "#84CC16";
    const selectedPipelineStages = editing.pipeline_id ? stages.filter(s => s.pipeline_id === editing.pipeline_id) : stages;

    const editorTabs = [
      { id: "templates" as const, label: "Templates", icon: "📋" },
      { id: "editor" as const, label: "Editor", icon: "⚙️" },
      { id: "crm" as const, label: "CRM", icon: "👥" },
      { id: "appearance" as const, label: "Aparência", icon: "🎨" },
      { id: "forms" as const, label: `Meus Forms (${forms.length})`, icon: "👁️" },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Formulários</h2>
            <p className="text-xs text-muted-foreground">Crie formulários personalizados que alimentam automaticamente seu CRM</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
          {editorTabs.map(tab => (
            <button key={tab.id} onClick={() => {
              if (tab.id === "forms") { setEditing(null); return; }
              if (tab.id === "templates") { setShowTemplates(true); setEditing(null); return; }
              setEditorTab(tab.id);
            }} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${editorTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Editor Tab */}
        {editorTab === "editor" && (
          <div className={`grid ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-4`}>
            <div className="space-y-4">
              <div className="surface-card rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">⚙️ Configuração</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><Label className="text-xs">Nome do Formulário *</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
                  <div><Label className="text-xs">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/form/{editing.slug || "..."}</p></div>
                </div>
                <div><Label className="text-xs">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>

                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.multiStep ?? true} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, multiStep: v } })} /> Sequencial</label>
                  <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.showProgressBar ?? true} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, showProgressBar: v } })} /> Barra de progresso</label>
                </div>

                {/* WhatsApp Redirect */}
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-primary" /> Redirecionamento WhatsApp</p>
                  <div><Label className="text-[10px]">Número do WhatsApp (com DDD+país)</Label><Input value={editing.whatsapp_redirect || ""} onChange={e => setEditing({ ...editing, whatsapp_redirect: e.target.value })} placeholder="5511999999999" className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                  <div><Label className="text-[10px]">Mensagem personalizada (use {"{nome}"}, {"{email}"}, {"{telefone}"})</Label><Textarea value={editing.whatsapp_message || ""} onChange={e => setEditing({ ...editing, whatsapp_message: e.target.value })} placeholder="Olá {nome}! Recebemos seu formulário. Vamos conversar?" className="text-xs bg-secondary/50 border-border mt-1" rows={3} /></div>
                  {editing.whatsapp_redirect && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Link2 className="h-3.5 w-3.5 text-primary" />
                      <p className="text-[10px] text-primary">Após envio, o lead será redirecionado para wa.me/{editing.whatsapp_redirect}</p>
                    </div>
                  )}
                </div>

                {/* Settings */}
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-[10px]">Texto do botão</Label><Input value={editing.settings?.submitText || "Enviar"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, submitText: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                    <div><Label className="text-[10px]">Mensagem de sucesso</Label><Input value={editing.settings?.successMessage || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, successMessage: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                  </div>
                  <div><Label className="text-[10px]">Redirect pós-envio (URL)</Label><Input value={editing.settings?.redirectUrl || ""} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, redirectUrl: e.target.value } })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                </div>
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
                    {/* Conditional logic */}
                    {idx > 0 && (
                      <div className="border-t border-border/50 pt-2 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground">Lógica condicional</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select value={field.conditionalField || ""} onChange={e => updateField(idx, { conditionalField: e.target.value || undefined })} className="h-7 text-[10px] bg-secondary border border-border rounded px-1 text-foreground">
                            <option value="">Sempre visível</option>
                            {editing.fields.slice(0, idx).map(f => <option key={f.id} value={f.id}>Se "{f.label}"</option>)}
                          </select>
                          {field.conditionalField && (
                            <Input value={field.conditionalValue || ""} onChange={e => updateField(idx, { conditionalValue: e.target.value })} placeholder="= valor" className="h-7 text-[10px] bg-secondary/50 border-border" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Preview ao Vivo</p>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-7 text-xs">
                  <Eye className="h-3 w-3 mr-1" /> {showPreview ? "Ocultar" : "Preview"}
                </Button>
              </div>
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
        )}

        {/* CRM Tab */}
        {editorTab === "crm" && (
          <div className="space-y-4">
            <div className="surface-card rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Integração com CRM</h3>
                  <p className="text-xs text-muted-foreground">Configure como os leads serão criados automaticamente no seu CRM</p>
                </div>
              </div>

              {stages.length > 0 && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-bold text-primary">Integração Ativa</p>
                      <p className="text-[10px] text-muted-foreground">Todos os formulários criam leads automaticamente no CRM com base nas configurações abaixo.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold">Pipeline de Destino</Label>
                  <select value={editing.pipeline_id || ""} onChange={e => setEditing({ ...editing, pipeline_id: e.target.value || null, stage_id: null })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                    <option value="">Selecione o pipeline...</option>
                    {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold">Etapa Inicial</Label>
                  <select value={editing.stage_id || ""} onChange={e => setEditing({ ...editing, stage_id: e.target.value || null })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                    <option value="">Selecione a etapa...</option>
                    {selectedPipelineStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Origem do Lead</Label>
                <select value={editing.settings?.leadSource || "form"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, leadSource: e.target.value } })} className="w-full h-10 text-sm bg-secondary border border-border rounded-md px-3 mt-1 text-foreground">
                  {leadSourceOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold">Tags Automáticas</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={(editing.settings?.autoTags || []).join(", ")} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, autoTags: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) } })} placeholder="Adicionar tag..." className="bg-secondary/50 border-border" />
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => {}}><Plus className="h-4 w-4" /></Button>
                </div>
                {(editing.settings?.autoTags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(editing.settings.autoTags as string[]).map((tag: string) => (
                      <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                <div>
                  <p className="text-xs font-bold text-foreground">Notificar ao receber lead</p>
                  <p className="text-[10px] text-muted-foreground">Receba uma notificação quando um lead preencher o formulário</p>
                </div>
                <Switch checked={editing.settings?.notifyOnLead || false} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, notifyOnLead: v } })} />
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {editorTab === "appearance" && (
          <div className="space-y-4">
            <div className="surface-card rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo Visual</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[{ key: "bgColor", label: "Cor de Fundo" }, { key: "textColor", label: "Cor do Texto" }, { key: "accentColor", label: "Cor de Destaque" }].map(c => (
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
              <div><Label className="text-[10px]">URL da Imagem de Fundo (opcional)</Label><Input value={editing.style.bgImageUrl || ""} onChange={e => setEditing({ ...editing, style: { ...editing.style, bgImageUrl: e.target.value } })} placeholder="https://..." className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
            </div>

            <div className="surface-card rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Botões de Ação</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Texto "Próximo"</Label><Input value={editing.settings?.nextText || "Próximo →"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, nextText: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
                <div><Label className="text-[10px]">Texto "Enviar"</Label><Input value={editing.settings?.submitText || "Enviar"} onChange={e => setEditing({ ...editing, settings: { ...editing.settings, submitText: e.target.value } })} className="h-8 text-xs bg-secondary/50 border-border mt-1" /></div>
              </div>
            </div>
          </div>
        )}
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
                <div className="flex items-center gap-1">
                  {form.whatsapp_redirect && <MessageCircle className="h-3 w-3 text-primary" />}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${form.is_published ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{form.is_published ? "Publicado" : "Rascunho"}</span>
                </div>
              </div>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground"><span>{form.fields.length} campos</span><span>{form._responseCount} respostas</span></div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditing({ ...form }); setEditorTab("editor"); }}><Pencil className="h-3 w-3" /></Button>
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
