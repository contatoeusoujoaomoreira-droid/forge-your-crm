import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";

interface LeadTag {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  is_active: boolean;
}

const SEED: Array<Pick<LeadTag, "name" | "color" | "emoji">> = [
  { name: "Quente", color: "#ef4444", emoji: "🔥" },
  { name: "Alto Padrão", color: "#a855f7", emoji: "🏠" },
  { name: "Investidor", color: "#eab308", emoji: "💰" },
  { name: "Retornar", color: "#3b82f6", emoji: "📞" },
  { name: "Documentação", color: "#f97316", emoji: "⚠️" },
  { name: "VIP", color: "#facc15", emoji: "⭐" },
  { name: "Novo", color: "#22c55e", emoji: "🟢" },
  { name: "Urgente", color: "#dc2626", emoji: "🔴" },
];

export default function TagsPanel() {
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#84cc16");
  const [emoji, setEmoji] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("lead_tags").select("*").order("created_at", { ascending: true });
    setTags((data as LeadTag[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = SEED.map(s => ({ ...s, user_id: u.user!.id }));
    const { error } = await supabase.from("lead_tags").upsert(rows, { onConflict: "user_id,name" });
    if (error) { toast.error(error.message); return; }
    toast.success("Tags padrão criadas");
    load();
  };

  const create = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("lead_tags").insert({
      user_id: u.user.id, name: name.trim(), color, emoji: emoji || null,
    });
    if (error) { toast.error(error.message); return; }
    setName(""); setEmoji("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("lead_tags").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const toggle = async (t: LeadTag) => {
    await supabase.from("lead_tags").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TagIcon className="h-4 w-4" /> Catálogo de Tags
        </div>
        {tags.length === 0 && (
          <Button variant="outline" size="sm" onClick={seed}>Criar tags padrão</Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_100px_auto] gap-2">
          <Input placeholder="Nome da tag (ex: Investidor)" value={name} onChange={e => setName(e.target.value)} />
          <Input type="color" value={color} onChange={e => setColor(e.target.value)} />
          <Input placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4} />
          <Button onClick={create}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && tags.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2">Nenhuma tag criada ainda. Use "Criar tags padrão" para começar.</p>
        )}
        {tags.map(t => (
          <Card key={t.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.emoji && <span>{t.emoji}</span>}{t.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={t.is_active} onCheckedChange={() => toggle(t)} />
              <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
