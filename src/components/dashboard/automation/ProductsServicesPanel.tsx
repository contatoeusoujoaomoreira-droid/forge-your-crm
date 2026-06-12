import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, Image as ImageIcon, Upload } from "lucide-react";

type Product = {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  niche: string | null;
  segment: string | null;
  description: string | null;
  categories: string[] | null;
  keywords: string[] | null;
  images: string[] | null;
  external_links: any;
  price: number | null;
  price_label: string | null;
  ad_identifiers: string[] | null;
  ad_source: string | null;
  is_active: boolean;
};

const empty: Partial<Product> = {
  name: "",
  niche: "",
  segment: "",
  description: "",
  categories: [],
  keywords: [],
  images: [],
  external_links: [],
  price: null,
  price_label: "",
  ad_identifiers: [],
  ad_source: "",
  is_active: true,
  agent_id: null,
};

export default function ProductsServicesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(empty);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("products_services" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data as any) || []);
    const { data: ag } = await supabase.from("ai_agents").select("id,name").eq("user_id", user.id);
    setAgents((ag as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const save = async () => {
    if (!user || !editing.name?.trim()) { toast.error("Nome obrigatório"); return; }
    const payload = {
      ...editing,
      user_id: user.id,
      categories: Array.isArray(editing.categories) ? editing.categories : String(editing.categories || "").split(",").map(s => s.trim()).filter(Boolean),
      keywords: Array.isArray(editing.keywords) ? editing.keywords : String(editing.keywords || "").split(",").map(s => s.trim()).filter(Boolean),
      ad_identifiers: Array.isArray(editing.ad_identifiers) ? editing.ad_identifiers : String(editing.ad_identifiers || "").split(",").map(s => s.trim()).filter(Boolean),
      agent_id: editing.agent_id || null,
    };
    const res = editing.id
      ? await supabase.from("products_services" as any).update(payload).eq("id", editing.id)
      : await supabase.from("products_services" as any).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success("Salvo");
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir produto/serviço?")) return;
    await supabase.from("products_services" as any).delete().eq("id", id);
    load();
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/products/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("agent-media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("agent-media").getPublicUrl(path);
      setEditing((p) => ({ ...p, images: [...(p.images || []), data.publicUrl] }));
      toast.success("Imagem adicionada");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5" />Produtos & Serviços</h3>
          <p className="text-xs text-muted-foreground">Catálogo consultável pela IA. Quando o lead vem de anúncio com identificador, a IA reconhece o produto automaticamente.</p>
        </div>
        <Button size="sm" onClick={() => { setEditing(empty); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Novo
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {!loading && items.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          Nenhum produto cadastrado. Adicione produtos/serviços para a IA usar nas conversas.
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <Card key={it.id} className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              {it.images?.[0]
                ? <img src={it.images[0]} alt={it.name} className="h-14 w-14 rounded object-cover bg-muted" />
                : <div className="h-14 w-14 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-muted-foreground truncate">{it.niche || it.segment || "—"}</div>
                {it.price_label && <div className="text-xs mt-0.5">{it.price_label}</div>}
              </div>
            </div>
            {!!it.categories?.length && (
              <div className="flex flex-wrap gap-1">
                {it.categories!.slice(0, 4).map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
              </div>
            )}
            {!!it.ad_identifiers?.length && (
              <div className="text-[10px] text-muted-foreground">📢 anúncio: {it.ad_identifiers!.slice(0, 2).join(", ")}</div>
            )}
            <div className="flex justify-between items-center pt-1">
              <Badge variant={it.is_active ? "default" : "secondary"} className="text-[10px]">
                {it.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(it); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing.id ? "Editar" : "Novo"} produto/serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Nicho</Label><Input value={editing.niche || ""} onChange={(e) => setEditing({ ...editing, niche: e.target.value })} placeholder="ex: imóveis, beleza, educação" /></div>
              <div><Label>Segmento</Label><Input value={editing.segment || ""} onChange={(e) => setEditing({ ...editing, segment: e.target.value })} placeholder="ex: alto padrão, popular" /></div>
              <div><Label>Preço (label)</Label><Input value={editing.price_label || ""} onChange={(e) => setEditing({ ...editing, price_label: e.target.value })} placeholder="ex: R$ 350 mil, sob consulta" /></div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={4} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="O que é, benefícios, diferenciais, condições…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categorias (vírgula)</Label>
                <Input value={Array.isArray(editing.categories) ? editing.categories.join(", ") : (editing.categories || "")} onChange={(e) => setEditing({ ...editing, categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean) as any })} />
              </div>
              <div>
                <Label>Palavras-chave (vírgula)</Label>
                <Input value={Array.isArray(editing.keywords) ? editing.keywords.join(", ") : (editing.keywords || "")} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(",").map(s => s.trim()).filter(Boolean) as any })} placeholder="termos que o lead pode usar" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>IDs de anúncio (vírgula)</Label>
                <Input value={Array.isArray(editing.ad_identifiers) ? editing.ad_identifiers.join(", ") : (editing.ad_identifiers || "")} onChange={(e) => setEditing({ ...editing, ad_identifiers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) as any })} placeholder="ex: ad_id ou utm_content" />
                <p className="text-[10px] text-muted-foreground mt-1">Quando o lead vier de anúncio com esse ID, a IA reconhece esse produto.</p>
              </div>
              <div>
                <Label>Origem do anúncio</Label>
                <Select value={editing.ad_source || "none"} onValueChange={(v) => setEditing({ ...editing, ad_source: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Agente vinculado (opcional)</Label>
              <Select value={editing.agent_id || "none"} onValueChange={(v) => setEditing({ ...editing, agent_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Todos os agentes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todos os agentes</SelectItem>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imagens</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {(editing.images || []).map((img, i) => (
                  <div key={i} className="relative h-20 w-20 rounded overflow-hidden border group">
                    <img src={img} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setEditing({ ...editing, images: editing.images!.filter((_, j) => j !== i) })} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs opacity-0 group-hover:opacity-100">×</button>
                  </div>
                ))}
                <label className="h-20 w-20 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted/50">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
