import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, FileText, Copy, Pencil, Trash2, Eye, Sparkles, GripVertical, ChevronUp, ChevronDown } from "lucide-react";

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
    settings: { submitText: "Quero saber mais", successMessage: "Obrigado! Entraremos em contato.", multiStep: false },
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
    settings: { submitText: "Enviar Mensagem", successMessage: "Mensagem enviada com sucesso!" },
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
    settings: { submitText: "Enviar Feedback", successMessage: "Obrigado pelo seu feedback!" },
  },
  {
    name: "Orçamento", icon: "💰", description: "Solicitação de orçamento detalhada",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome / Empresa", placeholder: "Nome ou empresa", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", placeholder: "email@empresa.com", required: true },
      { id: generateId(), type: "phone" as const, label: "Telefone", placeholder: "(11) 99999-9999", required: true },
      { id: generateId(), type: "select" as const, label: "Tipo de serviço", options: ["Consultoria", "Desenvolvimento", "Design", "Marketing", "Outro"], required: true },
      { id: generateId(), type: "textarea" as const, label: "Descreva seu projeto", placeholder: "Detalhes...", required: true },
      { id: generateId(), type: "select" as const, label: "Orçamento estimado", options: ["Até R$ 5.000", "R$ 5.000 - R$ 15.000", "R$ 15.000 - R$ 50.000", "Acima de R$ 50.000"], required: false },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#8b5cf6", fontFamily: "Inter" },
    settings: { submitText: "Solicitar Orçamento", successMessage: "Recebemos sua solicitação!" },
  },
  {
    name: "Cadastro", icon: "📝", description: "Cadastro de usuários e membros",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome completo", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", required: true },
      { id: generateId(), type: "phone" as const, label: "Telefone", required: true },
      { id: generateId(), type: "date" as const, label: "Data de nascimento", required: false },
      { id: generateId(), type: "text" as const, label: "Empresa", required: false },
      { id: generateId(), type: "select" as const, label: "Cargo", options: ["CEO", "Diretor", "Gerente", "Analista", "Outro"], required: false },
    ],
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#10b981", fontFamily: "Inter" },
    settings: { submitText: "Cadastrar", successMessage: "Cadastro realizado com sucesso!" },
  },
  {
    name: "Suporte", icon: "🛟", description: "Abertura de chamados e suporte",
    fields: [
      { id: generateId(), type: "text" as const, label: "Nome", required: true },
      { id: generateId(), type: "email" as const, label: "E-mail", required: true },
      { id: generateId(), type: "select" as const, label: "Categoria", options: ["Bug", "Dúvida", "Sugestão", "Financeiro", "Outro"], required: true },
      { id: generateId(), type: "select" as const, label: "Prioridade", options: ["Baixa", "Média", "Alta", "Urgente"], required: true },
      { id: generateId(), type: "textarea" as const, label: "Descrição do problema", placeholder: "Descreva em detalhes...", required: true },
    ],
    style: { bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#ef4444", fontFamily: "Inter" },
    settings: { submitText: "Abrir Chamado", successMessage: "Chamado aberto! Responderemos em breve." },
  },
];

const FormsList = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormData[]>([]);
  const [editing, setEditing] = useState<FormData | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();

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
    settings: { submitText: "Enviar", successMessage: "Obrigado!", multiStep: false },
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

  // Responses view
  if (showResponses) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Respostas do Formulário</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowResponses(null)}>← Voltar</Button>
        </div>
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

  // Editor
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Formulário</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" /></div>
          <div><Label className="text-xs text-muted-foreground">Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" /><p className="text-[10px] text-muted-foreground mt-1">/form/{editing.slug || "..."}</p></div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Descrição</Label><Textarea value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1 bg-secondary/50 border-border" rows={2} /></div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Ativo</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Publicado</label>
          <label className="flex items-center gap-2 text-xs"><Switch checked={editing.settings?.multiStep || false} onCheckedChange={v => setEditing({ ...editing, settings: { ...editing.settings, multiStep: v } })} /> Multi-step</label>
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
