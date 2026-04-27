import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
  { id: "lovable", label: "Lovable AI (default — sem chave)" },
  { id: "openai", label: "OpenAI" },
  { id: "groq", label: "Groq" },
  { id: "gemini", label: "Google Gemini" },
];

export default function AIProviderSettings() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("ai_provider_configs").select("*").eq("user_id", user.id);
    setItems(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const newItem = () => setEditing({ provider: "lovable", label: "", api_key_encrypted: "", default_model: "google/gemini-3-flash-preview", is_active: true, is_default: false });

  const save = async () => {
    if (!user || !editing.label) { toast.error("Label obrigatório"); return; }
    const payload: any = { ...editing, user_id: user.id };
    delete payload.created_at;
    const { error } = editing.id
      ? await supabase.from("ai_provider_configs").update(payload).eq("id", editing.id)
      : await supabase.from("ai_provider_configs").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null); load();
  };

  if (editing) {
    return (
      <Card className="p-6 space-y-3">
        <h3 className="font-semibold">{editing.id ? "Editar" : "Nova"} chave de IA</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Provedor</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
              value={editing.provider} onChange={(e) => setEditing({ ...editing, provider: e.target.value })}>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Label</Label>
            <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="ex: OpenAI Produção" />
          </div>
          <div className="col-span-2">
            <Label>API Key {editing.provider === "lovable" && "(opcional, já vem incluso)"}</Label>
            <Input type="password" value={editing.api_key_encrypted || ""} onChange={(e) => setEditing({ ...editing, api_key_encrypted: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Modelo padrão</Label>
            <Input value={editing.default_model || ""} onChange={(e) => setEditing({ ...editing, default_model: e.target.value })} />
          </div>
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
          <KeyRound className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Cofre de API Keys IA</h3>
        </div>
        <Button size="sm" onClick={newItem}><Plus className="h-4 w-4 mr-1" />Nova chave</Button>
      </div>
      <Card className="p-3 bg-primary/5 border-primary/30">
        <p className="text-sm flex items-center gap-2 text-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Lovable AI já está incluso e pronto para uso. Adicione chaves próprias só se quiser usar OpenAI/Groq/Gemini diretamente.
        </p>
      </Card>
      {items.map((it) => (
        <Card key={it.id} className="p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">{it.label}</p>
            <p className="text-xs text-muted-foreground">{it.provider} · {it.default_model}</p>
            {it.is_default && <Badge className="mt-1">Padrão</Badge>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(it)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={async () => {
              await supabase.from("ai_provider_configs").delete().eq("id", it.id); load();
            }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
