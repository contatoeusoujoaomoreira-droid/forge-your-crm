import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { validateStoreImage } from "@/lib/storeAppearance";

type Module = { id?: string; title: string; cover_url?: string | null; position: number };
type Lesson = { id?: string; title: string; description?: string | null; video_url?: string | null; file_url?: string | null; content_type: string; module_id?: string | null; position: number };
const TYPES = [{ v: "video", l: "Vídeo aula" }, { v: "pdf", l: "PDF" }, { v: "document", l: "Documento / arquivo" }, { v: "link", l: "Link externo" }];

async function uploadFile(userId: string, file: File) {
  if (file.size > 50 * 1024 * 1024) { toast.error("Arquivo maior que 50 MB."); return null; }
  const path = `${userId}/members/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) { toast.error("Falha no envio: " + error.message); return null; }
  return supabase.storage.from("chat-media").getPublicUrl(path).data.publicUrl;
}

export default function MemberLessons({ productId, userId }: { productId: string; userId: string }) {
  const [mods, setMods] = useState<Module[]>([]);
  const [rows, setRows] = useState<Lesson[]>([]);
  const [students, setStudents] = useState(0);
  const [external, setExternal] = useState("");
  const load = async () => {
    const [m, l, a, p] = await Promise.all([
      supabase.from("member_modules").select("*").eq("product_id", productId).order("position"),
      supabase.from("member_lessons").select("*").eq("product_id", productId).order("position"),
      supabase.from("member_access").select("id", { count: "exact", head: true }).eq("product_id", productId),
      supabase.from("products_services").select("members_external_url").eq("id", productId).maybeSingle(),
    ]);
    setMods(m.data || []); setRows((l.data as any) || []); setStudents(a.count || 0); setExternal(p.data?.members_external_url || "");
  };
  useEffect(() => { load(); }, [productId]);
  const saveExternal = async () => {
    if (external && !/^https:\/\//.test(external)) return toast.error("O link precisa começar com https://");
    const { error } = await supabase.from("products_services").update({ members_external_url: external || null }).eq("id", productId);
    error ? toast.error("Não foi possível salvar.") : toast.success(external ? "Área externa salva" : "Usando a área de membros própria");
  };
  const saveMod = async (m: Module) => {
    if (!m.title.trim()) return toast.error("Dê um nome ao módulo.");
    const payload = { title: m.title.trim(), cover_url: m.cover_url || null, position: m.position, product_id: productId, user_id: userId };
    const { error } = m.id ? await supabase.from("member_modules").update(payload).eq("id", m.id) : await supabase.from("member_modules").insert(payload);
    if (error) return toast.error("Não foi possível salvar o módulo.");
    toast.success("Módulo salvo"); load();
  };
  const save = async (l: Lesson) => {
    if (!l.title.trim()) return toast.error("Dê um título para a aula.");
    if (l.video_url && !/^https:\/\//.test(l.video_url)) return toast.error("O link precisa começar com https://");
    const payload = { title: l.title.trim(), description: l.description || null, video_url: l.video_url || null, file_url: l.file_url || null, content_type: l.content_type, module_id: l.module_id || null, position: l.position, product_id: productId, user_id: userId };
    const { error } = l.id ? await supabase.from("member_lessons").update(payload).eq("id", l.id) : await supabase.from("member_lessons").insert(payload);
    if (error) return toast.error("Não foi possível salvar a aula.");
    toast.success("Aula salva"); load();
  };
  const setM = (i: number, p: Partial<Module>) => setMods(r => r.map((x, j) => j === i ? { ...x, ...p } : x));
  const set = (i: number, p: Partial<Lesson>) => setRows(r => r.map((x, j) => j === i ? { ...x, ...p } : x));
  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div><p className="font-semibold">Área de membros</p><p className="text-xs text-muted-foreground">{students} aluno(s) com acesso. O acesso chega no WhatsApp quando o pagamento é confirmado.</p></div>

      <div className="space-y-2 rounded-md bg-secondary/40 p-3">
        <Label>Usar área de membros externa? (opcional)</Label>
        <p className="text-xs text-muted-foreground">Se você usa outra plataforma (Hotmart, Kiwify, Google Drive...), cole o link. Deixe vazio para usar a área própria abaixo.</p>
        <div className="flex gap-2"><Input placeholder="https://..." value={external} onChange={e => setExternal(e.target.value)} /><Button size="sm" onClick={saveExternal}>Salvar</Button></div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Módulos</Label><Button size="sm" variant="outline" onClick={() => setMods(r => [...r, { title: "", position: r.length }])}><Plus className="h-4 w-4 mr-1" />Módulo</Button></div>
        {mods.map((m, i) => (
          <div key={m.id || `n${i}`} className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <div className="h-12 w-20 overflow-hidden rounded bg-secondary">{m.cover_url && <img src={m.cover_url} alt="" className="h-full w-full object-cover" />}</div>
            <Input className="flex-1 min-w-[160px]" placeholder="Nome do módulo" value={m.title} onChange={e => setM(i, { title: e.target.value })} />
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-xs"><Upload className="h-3 w-3" />Capa
              <input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const bad = validateStoreImage(f); if (bad) return toast.error(bad); const u = await uploadFile(userId, f); if (u) setM(i, { cover_url: u }); }} /></label>
            <Button size="sm" onClick={() => saveMod(m)}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (m.id) await supabase.from("member_modules").delete().eq("id", m.id); load(); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between"><Label>Aulas e materiais</Label><Button size="sm" variant="outline" onClick={() => setRows(r => [...r, { title: "", content_type: "video", position: r.length }])}><Plus className="h-4 w-4 mr-1" />Conteúdo</Button></div>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum conteúdo ainda.</p>}
        {rows.map((l, i) => (
          <div key={l.id || `n${i}`} className="space-y-2 border-t border-border pt-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={l.content_type} onValueChange={v => set(i, { content_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent></Select>
              <Select value={l.module_id || "none"} onValueChange={v => set(i, { module_id: v === "none" ? null : v })}><SelectTrigger><SelectValue placeholder="Módulo" /></SelectTrigger><SelectContent><SelectItem value="none">Sem módulo</SelectItem>{mods.filter(m => m.id).map(m => <SelectItem key={m.id} value={m.id!}>{m.title}</SelectItem>)}</SelectContent></Select>
            </div>
            <Input placeholder="Título" value={l.title} onChange={e => set(i, { title: e.target.value })} />
            {(l.content_type === "video" || l.content_type === "link") && <Input placeholder={l.content_type === "video" ? "Link do vídeo (YouTube, Vimeo...)" : "https://..."} value={l.video_url || ""} onChange={e => set(i, { video_url: e.target.value })} />}
            {(l.content_type === "pdf" || l.content_type === "document") && <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-2 text-sm"><Upload className="h-4 w-4" />{l.file_url ? "Trocar arquivo" : "Enviar arquivo"}
              <input type="file" accept={l.content_type === "pdf" ? "application/pdf" : undefined} className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const u = await uploadFile(userId, f); if (u) set(i, { file_url: u }); }} /></label>}
            {l.file_url && <a href={l.file_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-primary"><ExternalLink className="h-3 w-3" />ver arquivo</a>}
            <Textarea rows={2} placeholder="Descrição" value={l.description || ""} onChange={e => set(i, { description: e.target.value })} />
            <div className="flex gap-2"><Button size="sm" onClick={() => save(l)}>Salvar</Button><Button size="sm" variant="ghost" onClick={async () => { if (l.id) await supabase.from("member_lessons").delete().eq("id", l.id); load(); }}><Trash2 className="h-4 w-4" /></Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
