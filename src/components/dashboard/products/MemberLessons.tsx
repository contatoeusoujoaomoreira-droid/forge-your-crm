import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Lesson = { id?: string; title: string; description?: string | null; video_url?: string | null; position: number };

export default function MemberLessons({ productId, userId }: { productId: string; userId: string }) {
  const [rows, setRows] = useState<Lesson[]>([]);
  const [students, setStudents] = useState(0);
  const load = async () => {
    const { data } = await supabase.from("member_lessons").select("*").eq("product_id", productId).order("position");
    setRows(data || []);
    const { count } = await supabase.from("member_access").select("id", { count: "exact", head: true }).eq("product_id", productId);
    setStudents(count || 0);
  };
  useEffect(() => { load(); }, [productId]);
  const save = async (l: Lesson) => {
    if (!l.title.trim()) return toast.error("Dê um título para a aula.");
    if (l.video_url && !/^https:\/\//.test(l.video_url)) return toast.error("O link do vídeo precisa começar com https://");
    const payload = { title: l.title.trim(), description: l.description || null, video_url: l.video_url || null, position: l.position, product_id: productId, user_id: userId };
    const { error } = l.id ? await supabase.from("member_lessons").update(payload).eq("id", l.id) : await supabase.from("member_lessons").insert(payload);
    if (error) return toast.error("Não foi possível salvar a aula.");
    toast.success("Aula salva"); load();
  };
  const remove = async (l: Lesson) => { if (l.id) await supabase.from("member_lessons").delete().eq("id", l.id); load(); };
  const set = (i: number, patch: Partial<Lesson>) => setRows(r => r.map((x, j) => j === i ? { ...x, ...patch } : x));
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between"><div><p className="font-semibold">Área de membros</p><p className="text-xs text-muted-foreground">{students} aluno(s) com acesso. O link chega no WhatsApp quando o pagamento é confirmado.</p></div>
        <Button size="sm" variant="outline" onClick={() => setRows(r => [...r, { title: "", position: r.length }])}><Plus className="h-4 w-4 mr-1" />Aula</Button></div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aula ainda.</p>}
      {rows.map((l, i) => (
        <div key={l.id || i} className="space-y-2 border-t border-border pt-2">
          <Label>Aula {i + 1}</Label>
          <Input placeholder="Título da aula" value={l.title} onChange={e => set(i, { title: e.target.value })} />
          <Input placeholder="Link do vídeo (YouTube, Vimeo, Drive...)" value={l.video_url || ""} onChange={e => set(i, { video_url: e.target.value })} />
          <Textarea rows={2} placeholder="Descrição ou material de apoio" value={l.description || ""} onChange={e => set(i, { description: e.target.value })} />
          <div className="flex gap-2"><Button size="sm" onClick={() => save(l)}>Salvar aula</Button><Button size="sm" variant="ghost" onClick={() => remove(l)}><Trash2 className="h-4 w-4" /></Button></div>
        </div>
      ))}
    </div>
  );
}
