import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Cpu, Save, Plus, Trash2 } from "lucide-react";

export default function ModelCostsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ provider: "lovable", model: "", label: "", credits_per_message: 1, notes: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("model_credit_costs").select("*").order("provider").order("credits_per_message");
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: any) => {
    const { error } = await supabase.from("model_credit_costs").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  const add = async () => {
    if (!draft.model || !draft.label) return toast.error("Provedor, model e label são obrigatórios");
    const { error } = await supabase.from("model_credit_costs").insert(draft as any);
    if (error) return toast.error(error.message);
    setDraft({ provider: "lovable", model: "", label: "", credits_per_message: 1, notes: "" });
    toast.success("Modelo adicionado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este custo de modelo?")) return;
    await supabase.from("model_credit_costs").delete().eq("id", id);
    load();
  };

  const grouped = items.reduce((acc: any, it) => {
    (acc[it.provider] ||= []).push(it);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Cpu className="h-5 w-5 text-primary mt-1" />
        <div>
          <h3 className="font-semibold">Custos de crédito por modelo de IA</h3>
          <p className="text-xs text-muted-foreground">Define quantos créditos cada modelo consome por mensagem. Quando o usuário escolhe um modelo no agente, o débito é multiplicado por este valor.</p>
        </div>
      </div>

      <Card className="p-4">
        <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Adicionar novo modelo</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input placeholder="provedor (ex.: openai)" value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} />
          <Input placeholder="model id (ex.: gpt-4o)" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
          <Input placeholder="Rótulo amigável" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input type="number" min={1} placeholder="Créditos/msg" value={draft.credits_per_message} onChange={(e) => setDraft({ ...draft, credits_per_message: Number(e.target.value) })} />
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
        </div>
        <Input className="mt-2" placeholder="Notas (opcional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : Object.entries(grouped).map(([provider, list]: any) => (
        <Card key={provider} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold capitalize">{provider}</h4>
            <Badge variant="outline">{list.length} modelos</Badge>
          </div>
          <div className="space-y-2">
            {list.map((it: any) => (
              <div key={it.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2 rounded-md border border-border">
                <div className="md:col-span-3"><code className="text-xs">{it.model}</code></div>
                <Input className="md:col-span-3 h-8 text-xs" defaultValue={it.label}
                  onBlur={(e) => e.target.value !== it.label && update(it.id, { label: e.target.value })} />
                <div className="md:col-span-2 flex items-center gap-1">
                  <Input type="number" min={1} className="h-8 text-xs w-20" defaultValue={it.credits_per_message}
                    onBlur={(e) => Number(e.target.value) !== it.credits_per_message && update(it.id, { credits_per_message: Number(e.target.value) })} />
                  <span className="text-[11px] text-muted-foreground">/ msg</span>
                </div>
                <Input className="md:col-span-2 h-8 text-xs" placeholder="Notas" defaultValue={it.notes || ""}
                  onBlur={(e) => e.target.value !== (it.notes || "") && update(it.id, { notes: e.target.value })} />
                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Switch checked={it.is_active} onCheckedChange={(v) => update(it.id, { is_active: v })} />
                  <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
