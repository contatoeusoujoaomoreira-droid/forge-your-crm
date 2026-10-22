import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Boxes, Search, ArrowDownUp } from "lucide-react";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const MOVE_TYPES: Record<string, { label: string; sign: 1 | -1 | 0 }> = {
  entrada_compra: { label: "Entrada por compra", sign: 1 },
  entrada_devolucao: { label: "Entrada por devolução", sign: 1 },
  entrada_ajuste: { label: "Entrada por ajuste", sign: 1 },
  saida_perda: { label: "Saída por perda", sign: -1 },
  saida_avaria: { label: "Saída por avaria", sign: -1 },
  saida_ajuste: { label: "Saída por ajuste", sign: -1 },
  inventario: { label: "Inventário (contagem)", sign: 0 },
};
const typeLabel = (t: string) => MOVE_TYPES[t]?.label || (t === "saida_venda" ? "Saída por venda" : t);

export default function StockPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [moves, setMoves] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [mv, setMv] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    const [p, m] = await Promise.all([
      supabase.from("products_services").select("id, name, sku, unit, stock_qty, low_stock_threshold, cost_price, price, is_active").eq("user_id", user.id).order("name").limit(2000),
      supabase.from("stock_movements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts(p.data || []); setMoves(m.data || []);
  };
  useEffect(() => { load(); }, [user]);

  const names = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);
  const isLow = (p: any) => Number(p.stock_qty) <= 0 || (Number(p.low_stock_threshold) > 0 && Number(p.stock_qty) <= Number(p.low_stock_threshold));
  const list = products.filter((p) => (!onlyLow || isLow(p)) && (!q || `${p.name} ${p.sku || ""}`.toLowerCase().includes(q.toLowerCase())));
  const value = products.reduce((s, p) => s + Math.max(0, Number(p.stock_qty)) * Number(p.cost_price ?? p.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6 text-primary" />Estoque</h2>
        <p className="text-sm text-muted-foreground">Entradas, saídas, perdas, avarias e inventário. Vendas e cancelamentos são lançados automaticamente.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Produtos</p><p className="text-xl font-bold">{products.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Estoque baixo</p><p className="text-xl font-bold text-destructive">{products.filter((p) => isLow(p) && Number(p.stock_qty) > 0).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Esgotados</p><p className="text-xl font-bold text-destructive">{products.filter((p) => Number(p.stock_qty) <= 0).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Valor do estoque</p><p className="text-xl font-bold">{brl(value)}</p></Card>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative w-full max-w-sm"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar produto ou SKU" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button size="sm" variant={onlyLow ? "default" : "outline"} onClick={() => setOnlyLow(!onlyLow)}>Só baixo / esgotado</Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left p-3">Produto</th><th className="text-right p-3">Estoque</th><th className="text-right p-3">Mínimo</th><th className="text-right p-3">Custo</th><th className="p-3"></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-3"><p>{p.name}</p><p className="text-[11px] text-muted-foreground">{p.sku || "Sem SKU"}</p></td>
                <td className={`p-3 text-right font-semibold ${isLow(p) ? "text-destructive" : ""}`}>{Number(p.stock_qty)} {p.unit}</td>
                <td className="p-3 text-right">{Number(p.low_stock_threshold)}</td>
                <td className="p-3 text-right">{p.cost_price != null ? brl(p.cost_price) : "—"}</td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setMv(p)}><ArrowDownUp className="h-4 w-4 mr-1" />Movimentar</Button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum produto.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Últimas movimentações</h3>
        {moves.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p> : (
          <div className="divide-y divide-border text-sm">
            {moves.map((m) => (
              <div key={m.id} className="flex justify-between py-2 gap-2">
                <div className="min-w-0"><p className="truncate">{names[m.product_id] || "Produto"}</p><p className="text-[11px] text-muted-foreground">{typeLabel(m.movement_type)} · {m.reason}{m.note ? ` · ${m.note}` : ""} · {new Date(m.created_at).toLocaleString("pt-BR")}</p></div>
                <div className="text-right shrink-0"><p className={Number(m.delta) < 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>{Number(m.delta) > 0 ? "+" : ""}{Number(m.delta)}</p><p className="text-[11px] text-muted-foreground">saldo {Number(m.balance_after ?? 0)}</p></div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {mv && <MoveDialog product={mv} onClose={() => setMv(null)} onDone={() => { setMv(null); load(); }} />}
    </div>
  );
}

function MoveDialog({ product, onClose, onDone }: { product: any; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [type, setType] = useState("entrada_compra");
  const [qty, setQty] = useState<number>(0);
  const [cost, setCost] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const cur = Number(product.stock_qty || 0);
  const sign = MOVE_TYPES[type].sign;
  const next = sign === 0 ? qty : cur + sign * qty;

  const save = async () => {
    if (!user) return;
    if (!(qty >= 0) || (sign !== 0 && qty <= 0)) return toast.error("Informe uma quantidade válida");
    const delta = next - cur;
    if (delta === 0) return toast.error("Nada a alterar");
    setSaving(true);
    const patch: any = { stock_qty: next };
    if (type === "entrada_compra" && cost !== "") {
      const c = Number(cost);
      const old = Number(product.cost_price ?? c);
      patch.cost_price = cur > 0 ? Number(((old * cur + c * qty) / (cur + qty)).toFixed(4)) : c; // custo médio
    }
    const { error } = await supabase.from("products_services").update(patch).eq("id", product.id);
    if (!error) await supabase.from("stock_movements").insert({ user_id: user.id, product_id: product.id, delta, balance_after: next, movement_type: type, reason: MOVE_TYPES[type].label, unit_cost: cost === "" ? null : Number(cost), note: note || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estoque atualizado");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Movimentar · {product.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Estoque atual: <b className="text-foreground">{cur} {product.unit}</b></p>
          <div><Label>Tipo</Label>
            <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(MOVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div><Label>{sign === 0 ? "Quantidade contada" : "Quantidade"}</Label><Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value || 0))} /></div>
          {type === "entrada_compra" && <div><Label>Custo unitário (R$) — atualiza o custo médio</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>}
          <div><Label>Observação / documento</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: NF 1234, fornecedor X" /></div>
          <p>Novo estoque: <b>{next}</b> {next < 0 && <span className="text-destructive">(negativo)</span>}</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Confirmar"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
