import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Upload, FileCode, Download, Pencil, Trash2, Package, AlertTriangle, Search, Webhook, History } from "lucide-react";

export type Product = {
  id?: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand?: string | null;
  cost_price?: number | null;
  description: string | null;
  unit: string;
  price: number | null;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  stock_qty: number;
  low_stock_threshold: number;
  images: string[];
  is_active: boolean;
  show_in_catalog: boolean;
};

const UNITS = ["un", "cx", "fardo", "kg", "L", "galão", "pct"];
const empty: Product = {
  name: "", sku: null, barcode: null, category: null, description: null, unit: "un",
  price: null, wholesale_price: null, wholesale_min_qty: null, stock_qty: 0, low_stock_threshold: 0,
  images: [], is_active: true, show_in_catalog: true,
};
const brl = (v: number | null | undefined) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: any) => { if (v === null || v === undefined || v === "") return null; const n = Number(String(v).replace(/\./g, "").replace(",", ".")); return isNaN(n) ? null : n; };
const numPlain = (v: any) => { const n = Number(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };

export default function ProductsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [showApi, setShowApi] = useState(false);
  const sheetRef = useRef<HTMLInputElement>(null);
  const xmlRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("products_services").select("*").eq("user_id", user.id).order("name");
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const [catFilter, setCatFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category).filter(Boolean))).sort() as string[], [items]);
  const brands = useMemo(() => Array.from(new Set(items.map((p) => p.brand).filter(Boolean))).sort() as string[], [items]);
  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    return items.filter((p) =>
      (!catFilter || p.category === catFilter) && (!brandFilter || p.brand === brandFilter) &&
      (!t || [p.name, p.sku, p.category, p.brand, p.barcode].some((f) => String(f || "").toLowerCase().includes(t))));
  }, [items, q, catFilter, brandFilter]);
  const lowStock = items.filter((p) => p.is_active && Number(p.low_stock_threshold) > 0 && Number(p.stock_qty) <= Number(p.low_stock_threshold));

  const save = async () => {
    if (!user || !edit) return;
    if (!edit.name.trim()) { toast.error("Informe o nome do produto"); return; }
    setSaving(true);
    const payload: any = { ...edit, user_id: user.id, sku: edit.sku?.trim() || null, brand: edit.brand?.trim() || null, category: edit.category?.trim() || null, price_label: null };
    delete payload.id;
    const prevQty = edit.id ? Number(items.find((p) => p.id === edit.id)?.stock_qty || 0) : 0;
    const res = edit.id
      ? await supabase.from("products_services").update(payload).eq("id", edit.id).select("id").single()
      : await supabase.from("products_services").insert(payload).select("id").single();
    setSaving(false);
    if (res.error) { toast.error(res.error.message.includes("uq_products_user_sku") ? "Já existe um produto com esse código (SKU)" : res.error.message); return; }
    const delta = Number(edit.stock_qty || 0) - prevQty;
    if (delta !== 0 && res.data?.id) {
      await supabase.from("stock_movements").insert({ user_id: user.id, product_id: res.data.id, delta, balance_after: Number(edit.stock_qty || 0), reason: edit.id ? "ajuste manual" : "cadastro" });
    }
    toast.success("Produto salvo!");
    setEdit(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("products_services").delete().eq("id", id);
    load();
  };

  const uploadImage = async (file: File) => {
    if (!user || !edit) return;
    const path = `${user.id}/products/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const { error } = await supabase.storage.from("chat-media").upload(path, file, { upsert: true });
    if (error) { toast.error("Falha ao enviar foto: " + error.message); return; }
    const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
    setEdit((e: any) => e ? { ...e, images: [...(e.images || []), data.publicUrl] } : e);
  };

  /** Upsert por SKU: se existir, atualiza (e soma estoque quando addStock); senão cria. */
  const upsertMany = async (rows: Partial<Product>[], addStock: boolean) => {
    if (!user) return;
    const { data: existing } = await supabase.from("products_services").select("id, sku, stock_qty").eq("user_id", user.id);
    const bySku = new Map((existing || []).filter((e) => e.sku).map((e) => [String(e.sku), e]));
    let created = 0, updated = 0;
    for (const r of rows) {
      if (!r.name) continue;
      const ex = r.sku ? bySku.get(String(r.sku)) : undefined;
      if (ex) {
        const patch: any = { ...r };
        if (addStock) patch.stock_qty = Number(ex.stock_qty || 0) + Number(r.stock_qty || 0);
        Object.keys(patch).forEach((k) => patch[k] === null || patch[k] === undefined ? delete patch[k] : null);
        await supabase.from("products_services").update(patch).eq("id", ex.id);
        updated++;
      } else {
        await supabase.from("products_services").insert({ ...empty, ...r, user_id: user.id } as any);
        created++;
      }
    }
    toast.success(`${created} produtos criados, ${updated} atualizados`);
    load();
  };

  const importSheet = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer());
    const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    const pick = (r: any, ...keys: string[]) => { for (const k of Object.keys(r)) if (keys.includes(k.toLowerCase().trim())) return r[k]; return ""; };
    const mapped = rows.map((r) => ({
      name: String(pick(r, "nome", "name", "produto")).trim(),
      sku: String(pick(r, "sku", "codigo", "código")).trim() || null,
      barcode: String(pick(r, "ean", "codigo de barras", "código de barras", "barcode")).trim() || null,
      category: String(pick(r, "categoria", "category")).trim() || null,
      description: String(pick(r, "descricao", "descrição", "description")).trim() || null,
      unit: String(pick(r, "unidade", "unit")).trim() || "un",
      price: num(pick(r, "preco", "preço", "preco varejo", "preço varejo", "price")),
      wholesale_price: num(pick(r, "preco atacado", "preço atacado", "atacado")),
      wholesale_min_qty: num(pick(r, "qtd minima atacado", "qtd mínima atacado", "minimo atacado")),
      stock_qty: num(pick(r, "estoque", "stock", "quantidade")) ?? 0,
      low_stock_threshold: num(pick(r, "estoque minimo", "estoque mínimo")) ?? 0,
      images: String(pick(r, "foto", "imagem", "image")).trim() ? [String(pick(r, "foto", "imagem", "image")).trim()] : [],
    }));
    await upsertMany(mapped, false);
  };

  const importXml = async (file: File) => {
    const doc = new DOMParser().parseFromString(await file.text(), "text/xml");
    const prods = Array.from(doc.getElementsByTagName("prod"));
    if (!prods.length) { toast.error("Nenhum produto encontrado neste XML de nota fiscal"); return; }
    const g = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]?.textContent?.trim() || "";
    const rows = prods.map((p) => {
      const ean = g(p, "cEAN");
      return {
        name: g(p, "xProd"),
        sku: g(p, "cProd") || null,
        barcode: ean && ean !== "SEM GTIN" ? ean : null,
        unit: g(p, "uCom") || "un",
        stock_qty: numPlain(g(p, "qCom")) ?? 0,
      } as Partial<Product>;
    });
    await upsertMany(rows, true);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ nome: "Detergente 5L", sku: "DET-5L", ean: "", categoria: "Limpeza", descricao: "Detergente neutro concentrado", unidade: "galão", "preco varejo": 35, "preco atacado": 28, "qtd minima atacado": 5, estoque: 100, "estoque minimo": 10, foto: "" }]);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo-produtos.xlsx");
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/products-sync`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" />Produtos & Estoque</h2>
          <p className="text-sm text-muted-foreground">Cadastre, importe e controle o estoque. Os produtos ativos aparecem na sua Loja Virtual.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" />Modelo de planilha</Button>
          <Button variant="outline" size="sm" onClick={() => sheetRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Importar Excel/CSV</Button>
          <Button variant="outline" size="sm" onClick={() => xmlRef.current?.click()}><FileCode className="h-4 w-4 mr-1" />Importar XML (NF-e)</Button>
          <Button variant="outline" size="sm" onClick={() => setShowApi(true)}><Webhook className="h-4 w-4 mr-1" />API / Webhook</Button>
          <Button size="sm" onClick={() => setEdit({ ...empty })}><Plus className="h-4 w-4 mr-1" />Novo produto</Button>
        </div>
        <input ref={sheetRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importSheet(f); e.target.value = ""; }} />
        <input ref={xmlRef} type="file" accept=".xml" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importXml(f); e.target.value = ""; }} />
      </div>

      {lowStock.length > 0 && (
        <Card className="p-3 border-destructive/40 bg-destructive/5 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {lowStock.length} produto(s) com estoque baixo: {lowStock.slice(0, 5).map((p) => p.name).join(", ")}{lowStock.length > 5 ? "..." : ""}
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, código, marca ou categoria" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">Todas as categorias</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="h-10 px-3 rounded-md border border-input bg-background text-sm" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <option value="">Todas as marcas</option>{brands.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum produto ainda. Clique em "Novo produto" ou importe uma planilha.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const low = Number(p.low_stock_threshold) > 0 && Number(p.stock_qty) <= Number(p.low_stock_threshold);
            return (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="p-3 space-y-1 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{p.name}</p>
                    {!p.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{[p.sku, p.category].filter(Boolean).join(" · ") || "Sem código"}</p>
                  <p className="text-sm"><b>{brl(p.price)}</b> / {p.unit}</p>
                  {p.wholesale_price != null && <p className="text-xs text-primary">Atacado: {brl(p.wholesale_price)} a partir de {p.wholesale_min_qty ?? 1}</p>}
                  <p className={`text-xs ${low ? "text-destructive font-semibold" : "text-muted-foreground"}`}>Estoque: {Number(p.stock_qty)} {p.unit}{low ? " (baixo)" : ""}</p>
                </div>
                <div className="flex border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEdit({ ...empty, ...p })}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
                  <Button variant="ghost" size="sm" title="Histórico de estoque" onClick={() => openHist(p)}><History className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Nome *</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div><Label>Código / SKU</Label><Input value={edit.sku || ""} onChange={(e) => setEdit({ ...edit, sku: e.target.value })} /></div>
              <div><Label>Código de barras</Label><Input value={edit.barcode || ""} onChange={(e) => setEdit({ ...edit, barcode: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input list="cat-list" value={edit.category || ""} onChange={(e) => setEdit({ ...edit, category: e.target.value })} placeholder="Ex: Químicos, Descartáveis" />
                <datalist id="cat-list">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><Label>Marca</Label><Input list="brand-list" value={edit.brand || ""} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} placeholder="Ex: Ypê" />
                <datalist id="brand-list">{brands.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><Label>Preço de custo (R$)</Label><Input type="number" step="0.01" value={edit.cost_price ?? ""} onChange={(e) => setEdit({ ...edit, cost_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Unidade</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Label>Descrição</Label><Textarea rows={3} value={edit.description || ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div><Label>Preço varejo (R$)</Label><Input type="number" step="0.01" value={edit.price ?? ""} onChange={(e) => setEdit({ ...edit, price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Preço atacado (R$)</Label><Input type="number" step="0.01" value={edit.wholesale_price ?? ""} onChange={(e) => setEdit({ ...edit, wholesale_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Atacado a partir de (qtd)</Label><Input type="number" value={edit.wholesale_min_qty ?? ""} onChange={(e) => setEdit({ ...edit, wholesale_min_qty: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Estoque atual</Label><Input type="number" value={edit.stock_qty} onChange={(e) => setEdit({ ...edit, stock_qty: Number(e.target.value || 0) })} /></div>
              <div><Label>Avisar quando estoque ≤</Label><Input type="number" value={edit.low_stock_threshold} onChange={(e) => setEdit({ ...edit, low_stock_threshold: Number(e.target.value || 0) })} /></div>
              <div className="col-span-2 space-y-2">
                <Label>Fotos</Label>
                <div className="flex flex-wrap gap-2">
                  {edit.images.map((src, i) => (
                    <div key={i} className="relative">
                      <img src={src} alt="" className="h-16 w-16 rounded object-cover border border-border" />
                      <button className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs" onClick={() => setEdit({ ...edit, images: edit.images.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => imgRef.current?.click()}><Plus className="h-4 w-4 mr-1" />Enviar fotos</Button>
                  <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => { Array.from(e.target.files || []).forEach((f) => uploadImage(f)); e.target.value = ""; }} />
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /><Label>Ativo</Label></div>
              <div className="flex items-center gap-2"><Switch checked={edit.show_in_catalog} onCheckedChange={(v) => setEdit({ ...edit, show_in_catalog: v })} /><Label>Mostrar na Loja Virtual</Label></div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!hist} onOpenChange={(o) => !o && setHist(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Histórico de estoque · {hist?.name}</DialogTitle></DialogHeader>
          {histRows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p> : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border text-sm">
              {histRows.map((m) => (
                <div key={m.id} className="flex justify-between py-2">
                  <div><p className="font-medium">{m.reason}</p><p className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</p></div>
                  <div className="text-right"><p className={Number(m.delta) < 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>{Number(m.delta) > 0 ? "+" : ""}{Number(m.delta)}</p><p className="text-[11px] text-muted-foreground">saldo {Number(m.balance_after ?? 0)}</p></div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showApi} onOpenChange={setShowApi}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Sincronizar com ERP (API / Webhook)</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Seu ERP (Bling, Tiny, etc.) pode enviar produtos automaticamente para este endereço:</p>
            <Input readOnly value={webhookUrl} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <p className="text-muted-foreground">Use uma chave da área <b>Automação → API Keys</b> no cabeçalho <code>x-api-key</code>. Envie uma lista de produtos com: nome, sku, preco, estoque, categoria, unidade. Produtos com o mesmo SKU são atualizados.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
