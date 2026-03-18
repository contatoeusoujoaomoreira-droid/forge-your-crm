import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, X, FileText, Copy, Pencil, Trash2, Eye, ExternalLink, BarChart3 } from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "number";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  is_active: boolean;
  is_published: boolean;
  fields: FormField[];
  settings: any;
  style: any;
  pipeline_id: string | null;
  stage_id: string | null;
  created_at: string;
  _responseCount?: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const fieldTypes = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção" },
  { value: "radio", label: "Múltipla escolha" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Número" },
];

const FormsList = () => {
  const [forms, setForms] = useState<FormData[]>([]);
  const [editing, setEditing] = useState<FormData | null>(null);
  const [showResponses, setShowResponses] = useState<string | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchForms = async () => {
    const { data } = await supabase.from("forms").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("form_responses").select("form_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.form_id] = (countMap[r.form_id] || 0) + 1; });
    setForms(data.map((f: any) => ({
      ...f,
      fields: Array.isArray(f.fields) ? f.fields as FormField[] : [],
      _responseCount: countMap[f.id] || 0,
    })));
  };

  useEffect(() => { fetchForms(); }, []);

  const startNew = () => setEditing({
    id: "", title: "", description: "", slug: "", is_active: true, is_published: false,
    fields: [
      { id: generateId(), type: "text", label: "Nome", placeholder: "Seu nome", required: true },
      { id: generateId(), type: "email", label: "E-mail", placeholder: "seu@email.com", required: true },
    ],
    settings: { submitText: "Enviar", successMessage: "Obrigado!" },
    style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", fontFamily: "Inter" },
    pipeline_id: null, stage_id: null, created_at: "",
  });

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) {
      toast({ title: "Preencha título e slug", variant: "destructive" });
      return;
    }
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
    toast({ title: "Formulário salvo!" });
    setEditing(null);
    fetchForms();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("forms").delete().eq("id", id);
    toast({ title: "Formulário excluído" });
    fetchForms();
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/form/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const fetchResponses = async (formId: string) => {
    setShowResponses(formId);
    const { data } = await supabase.from("form_responses").select("*").eq("form_id", formId).order("completed_at", { ascending: false });
    setResponses(data || []);
  };

  const addField = () => {
    if (!editing) return;
    setEditing({ ...editing, fields: [...editing.fields, { id: generateId(), type: "text", label: "", placeholder: "", required: false }] });
  };

  const updateField = (idx: number, updates: Partial<FormField>) => {
    if (!editing) return;
    const fields = [...editing.fields];
    fields[idx] = { ...fields[idx], ...updates };
    setEditing({ ...editing, fields });
  };

  const removeField = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== idx) });
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
          <div className="surface-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nenhuma resposta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((r: any) => (
              <div key={r.id} className="surface-card rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">{new Date(r.completed_at).toLocaleDateString("pt-BR")}</p>
                <div className="space-y-1">
                  {Object.entries(r.responses as Record<string, string>).map(([k, v]) => (
                    <p key={k} className="text-xs text-muted-foreground"><span className="text-foreground font-medium">{k}:</span> {v}</p>
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
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Formulário</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" placeholder="Formulário de contato" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
            <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" />
            <p className="text-[10px] text-muted-foreground mt-1">/form/{editing.slug || "..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
            <Label className="text-xs text-muted-foreground">Ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
            <Label className="text-xs text-muted-foreground">Publicado</Label>
          </div>
        </div>

        {/* Style */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: "bgColor", label: "Fundo" },
              { key: "textColor", label: "Texto" },
              { key: "accentColor", label: "Destaque" },
            ].map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <input type="color" value={editing.style[c.key] || "#000000"} onChange={(e) => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                <div>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground/60">{editing.style[c.key]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Campos ({editing.fields.length})</p>
            <Button variant="outline" size="sm" onClick={addField}><Plus className="h-3 w-3 mr-1" /> Campo</Button>
          </div>

          {editing.fields.map((field, idx) => (
            <div key={field.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Campo {idx + 1}</p>
                <Button variant="ghost" size="sm" onClick={() => removeField(idx)} className="text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Label</Label>
                  <Input value={field.label} onChange={(e) => updateField(idx, { label: e.target.value })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" />
                </div>
                <div>
                  <Label className="text-[10px]">Tipo</Label>
                  <select value={field.type} onChange={(e) => updateField(idx, { type: e.target.value as any })} className="w-full h-7 text-xs bg-secondary border border-border rounded px-2 mt-0.5 text-foreground">
                    {fieldTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <Input value={field.placeholder || ""} onChange={(e) => updateField(idx, { placeholder: e.target.value })} placeholder="Placeholder..." className="h-7 text-xs bg-secondary/50 border-border" />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={field.required || false} onChange={(e) => updateField(idx, { required: e.target.checked })} className="rounded" />
                <span className="text-xs text-muted-foreground">Obrigatório</span>
              </div>
              {(field.type === "select" || field.type === "radio") && (
                <div className="space-y-1 pl-3">
                  <Label className="text-[10px]">Opções (uma por linha)</Label>
                  <textarea
                    value={(field.options || []).join("\n")}
                    onChange={(e) => updateField(idx, { options: e.target.value.split("\n") })}
                    className="w-full text-xs bg-secondary/50 border border-border rounded px-2 py-1 text-foreground"
                    rows={3}
                  />
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
        <h2 className="text-xl font-bold text-foreground">Formulários</h2>
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo Form</Button>
      </div>

      {forms.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum formulário criado</p>
          <Button size="sm" onClick={startNew}>Criar Primeiro Formulário</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div key={form.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{form.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${form.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {form.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              {form.description && <p className="text-xs text-muted-foreground line-clamp-2">{form.description}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{form.fields.length} campos</span>
                <span>{form._responseCount} respostas</span>
              </div>
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
