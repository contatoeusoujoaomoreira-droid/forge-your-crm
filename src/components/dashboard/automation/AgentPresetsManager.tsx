import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, FolderOpen, Trash2 } from "lucide-react";

type Preset = {
  id: string;
  name: string;
  scope: string;
  description: string | null;
  data: Record<string, any>;
};

const SCOPE_FIELDS: Record<string, string[]> = {
  identity: ["name", "display_name", "personality", "tone", "style"],
  voice: ["voice_enabled", "voice_provider", "voice_id", "reply_to_audio_with_audio", "simulate_recording", "transcribe_audio"],
  behavior: ["system_prompt", "rules", "examples", "objections", "temperature", "split_long_messages", "simulate_typing", "response_delay_seconds", "debounce_seconds", "group_messages", "respond_in_groups"],
  routing: ["routing_keywords", "routing_priority", "disable_on_human_takeover"],
  media: ["understand_images", "voice_enabled", "transcribe_audio"],
  full: ["name", "display_name", "personality", "tone", "style", "system_prompt", "rules", "examples", "objections", "temperature", "voice_enabled", "voice_provider", "voice_id", "reply_to_audio_with_audio", "transcribe_audio", "simulate_typing", "simulate_recording", "split_long_messages", "response_delay_seconds", "debounce_seconds", "group_messages", "respond_in_groups", "understand_images", "disable_on_human_takeover"],
};

const SCOPE_LABEL: Record<string, string> = {
  full: "Completo",
  identity: "Identidade",
  voice: "Voz",
  behavior: "Comportamento",
  routing: "Roteamento",
  media: "Mídia",
};

export default function AgentPresetsManager({
  agent,
  onApply,
}: {
  agent: any;
  onApply: (patch: Record<string, any>) => void;
}) {
  const { user } = useAuth();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [scope, setScope] = useState<string>("full");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("agent_presets" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPresets((data as any) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const save = async () => {
    if (!user || !name.trim() || !agent) { toast.error("Nome obrigatório"); return; }
    const fields = SCOPE_FIELDS[scope] || SCOPE_FIELDS.full;
    const data: Record<string, any> = {};
    fields.forEach((f) => { if (agent[f] !== undefined) data[f] = agent[f]; });
    const res = await supabase.from("agent_presets" as any).insert({ user_id: user.id, name, scope, description, data });
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Preset salvo");
    setSaveOpen(false); setName(""); setDescription(""); load();
  };

  const apply = (p: Preset) => {
    onApply(p.data || {});
    toast.success(`Preset "${p.name}" aplicado`);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir preset?")) return;
    await supabase.from("agent_presets" as any).delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium flex items-center gap-2"><FolderOpen className="h-4 w-4" />Presets de configuração</div>
          <p className="text-[11px] text-muted-foreground">Salve identidade, voz, comportamento etc. para reutilizar em outros agentes.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSaveOpen(true)} disabled={!agent}>
          <Save className="h-3.5 w-3.5 mr-1" />Salvar atual
        </Button>
      </div>
      {presets.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhum preset salvo ainda.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 border rounded-full pl-3 pr-1 py-1 bg-background">
              <span className="text-xs font-medium">{p.name}</span>
              <Badge variant="outline" className="text-[9px] px-1.5">{SCOPE_LABEL[p.scope] || p.scope}</Badge>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => apply(p)}>Aplicar</Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Salvar preset</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Vendas imóveis - tom premium" /></div>
            <div>
              <Label>Escopo</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCOPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Define quais campos serão incluídos no preset.</p>
            </div>
            <div><Label>Descrição (opcional)</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
