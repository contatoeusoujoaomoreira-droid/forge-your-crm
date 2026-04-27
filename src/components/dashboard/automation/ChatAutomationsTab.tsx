import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Workflow } from "lucide-react";

const TRIGGERS = [
  { id: "any_message", label: "Qualquer mensagem" },
  { id: "keyword", label: "Palavra-chave contém" },
  { id: "first_message", label: "Primeira mensagem do contato" },
  { id: "no_response_xh", label: "Sem resposta por X horas" },
  { id: "stage_entry", label: "Entrou em etapa" },
  { id: "off_hours", label: "Fora do horário comercial" },
];
const ACTIONS = [
  { id: "ai_agent", label: "Acionar agente IA" },
  { id: "auto_reply", label: "Responder automaticamente (texto)" },
  { id: "pause_agent", label: "Pausar agente" },
  { id: "add_tag", label: "Adicionar tag" },
  { id: "move_stage", label: "Mover de etapa" },
  { id: "assign_to", label: "Atribuir a usuário" },
];

export default function ChatAutomationsTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("chat_automations").select("*").eq("user_id", user.id).order("priority");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const newItem = () => setEditing({
    name: "", trigger_type: "keyword", trigger_value: { keywords: "" },
    actions: [{ type: "auto_reply", value: "" }], is_active: true, priority: 0,
  });

  const save = async () => {
    if (!user || !editing.name) { toast.error("Nome obrigatório"); return; }
    const payload: any = { ...editing, user_id: user.id };
    delete payload.created_at; delete payload.updated_at;
    const { error } = editing.id
      ? await supabase.from("chat_automations").update(payload).eq("id", editing.id)
      : await supabase.from("chat_automations").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Automação salva");
    setEditing(null); load();
  };

  if (editing) {
    return (
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} Automação</h3>
        <div>
          <Label>Nome</Label>
          <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gatilho</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.trigger_type} onChange={(e) => setEditing({ ...editing, trigger_type: e.target.value })}>
              {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Valor (palavras separadas por vírgula, horas, etc)</Label>
            <Input
              value={editing.trigger_value?.keywords || editing.trigger_value?.value || ""}
              onChange={(e) => setEditing({ ...editing, trigger_value: { ...editing.trigger_value, keywords: e.target.value, value: e.target.value } })}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Ações (em ordem)</Label>
          {(editing.actions || []).map((a: any, i: number) => (
            <div key={i} className="flex gap-2">
              <select className="h-10 px-3 rounded-md border border-input bg-background"
                value={a.type} onChange={(e) => {
                  const next = [...editing.actions]; next[i] = { ...next[i], type: e.target.value };
                  setEditing({ ...editing, actions: next });
                }}>
                {ACTIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
              <Input className="flex-1" placeholder="Valor (texto, tag, agent_id...)"
                value={a.value || ""} onChange={(e) => {
                  const next = [...editing.actions]; next[i] = { ...next[i], value: e.target.value };
                  setEditing({ ...editing, actions: next });
                }} />
              <Button size="icon" variant="ghost" onClick={() => {
                const next = editing.actions.filter((_: any, j: number) => j !== i);
                setEditing({ ...editing, actions: next });
              }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, actions: [...(editing.actions || []), { type: "auto_reply", value: "" }] })}>
            <Plus className="h-4 w-4 mr-1" />Adicionar ação
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
          <Label>Ativa</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>Salvar</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Automações do Chat</h3>
        </div>
        <Button size="sm" onClick={newItem}><Plus className="h-4 w-4 mr-1" />Nova regra</Button>
      </div>
      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma regra criada.</Card>
      ) : items.map((it) => (
        <Card key={it.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{it.name}</p>
            <p className="text-xs text-muted-foreground">Gatilho: {it.trigger_type} · {it.actions?.length || 0} ação(ões)</p>
            <Badge className="mt-1" variant={it.is_active ? "default" : "secondary"}>{it.is_active ? "Ativa" : "Inativa"}</Badge>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              await supabase.from("chat_automations").delete().eq("id", it.id); load();
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
