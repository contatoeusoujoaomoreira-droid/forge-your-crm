import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Printer, Search, Trash2, ClipboardList, MessageCircle } from "lucide-react";
import { printReceipt, unitPrice } from "@/lib/store";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const ORDER_STATUS = [
  "novo", "em análise comercial", "aguardando confirmação", "aguardando pagamento", "confirmado",
  "em separação", "separado", "pronto para retirada", "em expedição", "em transporte", "entregue", "concluído", "cancelado",
];
const PAYMENTS = ["PIX", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência", "A prazo"];
const CHANNELS: Record<string, string> = { loja: "Loja virtual", manual: "Manual", whatsapp: "WhatsApp", balcao: "Balcão" };

type Line = { product: any; qty: number };

export default function OrdersCenter() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<any | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("store_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300);
    setOrders(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim();
    return orders.filter((o) => (!status || o.status === status) &&
      (!t || [o.order_no, o.customer_name, o.customer_phone].some((f) => String(f || "").toLowerCase().includes(t))));
  }, [orders, q, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const update = async (id: string, patch: any) => {
    const { data, error } = await supabase.from("store_orders").update(patch).eq("id", id).select("*").single();
    if (error) return toast.error(error.message);
    setOrders((l) => l.map((x) => (x.id === id ? data : x)));
    if (view?.id === id) setView(data);
    toast.success("Pedido atualizado");
  };

  const openCreate = async () => {
    if (!user) return;
    const { data } = await supabase.from("products_services").select("id, name, sku, price, wholesale_price, wholesale_min_qty, stock_qty, unit").eq("user_id", user.id).eq("is_active", true).order("name").limit(1000);
    setProducts(data || []);
    setCreating(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" />Pedidos</h2>
          <p className="text-sm text-muted-foreground">Todos os pedidos da loja virtual e os criados manualmente.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Criar pedido</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatus("")} className={`text-xs px-3 py-1.5 rounded-full border ${!status ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>Todos ({orders.length})</button>
        {ORDER_STATUS.filter((s) => counts[s]).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${status === s ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{s} ({counts[s]})</button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por número, cliente ou telefone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum pedido encontrado.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr><th className="text-left p-3">Pedido</th><th className="text-left p-3">Cliente</th><th className="text-left p-3">Canal</th><th className="text-right p-3">Total</th><th className="text-left p-3">Pagamento</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="p-3"><button className="font-semibold hover:text-primary" onClick={() => setView(o)}>#{o.order_no}</button><p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p></td>
                  <td className="p-3"><p>{o.customer_name}</p><p className="text-[11px] text-muted-foreground capitalize">{o.customer_type}{o.customer_phone ? ` · ${o.customer_phone}` : ""}</p></td>
                  <td className="p-3">{CHANNELS[o.channel] || o.channel}</td>
                  <td className="p-3 text-right font-semibold">{brl(o.total)}</td>
                  <td className="p-3"><Badge variant={o.payment_status === "pago" ? "default" : "secondary"}>{o.payment_status}</Badge></td>
                  <td className="p-3">
                    <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={o.status} onChange={(e) => update(o.id, { status: e.target.value })}>
                      {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3"><Button size="sm" variant="ghost" onClick={() => setView(o)}>Abrir</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <OrderDetail order={view} onClose={() => setView(null)} onUpdate={update} />
      {creating && <CreateOrder products={products} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function OrderDetail({ order: o, onClose, onUpdate }: { order: any; onClose: () => void; onUpdate: (id: string, p: any) => void }) {
  const [pay, setPay] = useState("PIX");
  if (!o) return null;
  const phone = String(o.customer_phone || "").replace(/\D/g, "");
  const msg = `Pedido #${o.order_no}\n${(o.items || []).map((i: any) => `${i.qty}x ${i.name} — ${brl(i.unit_price * i.qty)}`).join("\n")}\nTotal: ${brl(o.total)}\nStatus: ${o.status}`;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pedido #{o.order_no}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-xs text-muted-foreground">Cliente</p><p>{o.customer_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Telefone</p><p>{o.customer_phone || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Recebimento</p><p>{o.address ? "Entrega" : "Retirada"}</p></div>
            <div><p className="text-xs text-muted-foreground">Pagamento</p><p>{o.payment_method || "—"} · {o.payment_status}</p></div>
          </div>
          {o.address && <p><span className="text-xs text-muted-foreground">Endereço: </span>{o.address}</p>}
          {o.notes && <p><span className="text-xs text-muted-foreground">Observações: </span>{o.notes}</p>}
          <div className="border border-border rounded-md divide-y divide-border">
            {(o.items || []).map((i: any, k: number) => (
              <div key={k} className="flex justify-between p-2"><span>{i.qty}x {i.name}</span><span>{brl(i.unit_price * i.qty)}</span></div>
            ))}
            <div className="p-2 text-xs text-muted-foreground flex justify-between"><span>Subtotal</span><span>{brl(o.subtotal)}</span></div>
            {Number(o.discount) > 0 && <div className="p-2 text-xs flex justify-between"><span>Desconto</span><span>- {brl(o.discount)}</span></div>}
            {Number(o.delivery_fee) > 0 && <div className="p-2 text-xs flex justify-between"><span>Frete</span><span>{brl(o.delivery_fee)}</span></div>}
            <div className="p-2 font-bold flex justify-between"><span>Total</span><span>{brl(o.total)}</span></div>
          </div>
          {o.payment_status !== "pago" && o.status !== "cancelado" && (
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Label>Registrar pagamento</Label>
                <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" value={pay} onChange={(e) => setPay(e.target.value)}>{PAYMENTS.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <Button size="sm" onClick={() => onUpdate(o.id, { payment_status: "pago", payment_method: pay })}>Marcar como pago</Button>
            </div>
          )}
          {(o.status_history || []).length > 0 && (
            <div><p className="text-xs text-muted-foreground mb-1">Histórico</p>
              {(o.status_history as any[]).map((h, k) => <p key={k} className="text-xs">{new Date(h.at).toLocaleString("pt-BR")} — {h.from} → <b>{h.to}</b></p>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => printReceipt(o)}><Printer className="h-4 w-4 mr-1" />Imprimir / PDF</Button>
            <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Enviar ao cliente</a></Button>
            {o.status !== "cancelado" && <Button size="sm" variant="destructive" className="ml-auto" onClick={() => confirm("Cancelar este pedido? O estoque volta automaticamente.") && onUpdate(o.id, { status: "cancelado" })}>Cancelar pedido</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateOrder({ products, onClose, onCreated }: { products: any[]; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");
  const [f, setF] = useState({ customer_name: "", customer_phone: "", customer_type: "varejo", channel: "manual", payment_method: "PIX", address: "", notes: "", discount: 0, delivery_fee: 0 });
  const [saving, setSaving] = useState(false);

  const add = () => {
    const p = products.find((x) => x.id === pick);
    if (!p) return;
    setLines((l) => l.some((x) => x.product.id === p.id) ? l.map((x) => x.product.id === p.id ? { ...x, qty: x.qty + 1 } : x) : [...l, { product: p, qty: 1 }]);
    setPick("");
  };
  const subtotal = lines.reduce((s, l) => s + unitPrice(l.product, l.qty) * l.qty, 0);
  const total = Math.max(0, subtotal - Number(f.discount || 0) + Number(f.delivery_fee || 0));

  const save = async () => {
    if (!user) return;
    if (!f.customer_name.trim()) return toast.error("Informe o cliente");
    if (lines.length === 0) return toast.error("Adicione pelo menos um produto");
    const over = lines.find((l) => l.qty > Number(l.product.stock_qty || 0));
    if (over && !confirm(`"${over.product.name}" tem só ${Number(over.product.stock_qty)} em estoque. Criar mesmo assim?`)) return;
    setSaving(true);
    const order_no = String(Date.now()).slice(-6);
    const { error } = await supabase.from("store_orders").insert({
      user_id: user.id, order_no, customer_name: f.customer_name.trim(), customer_phone: f.customer_phone || null,
      customer_type: f.customer_type, channel: f.channel, payment_method: f.payment_method,
      address: f.address || null, notes: f.notes || null, discount: Number(f.discount || 0), delivery_fee: Number(f.delivery_fee || 0),
      items: lines.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, unit_price: unitPrice(l.product, l.qty) })),
      subtotal, total, status: "novo",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Pedido #${order_no} criado`);
    onCreated();
  };

  const sel = "w-full h-9 px-2 rounded-md border border-input bg-background text-sm";
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Criar pedido</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><Label>Cliente *</Label><Input value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></div>
          <div><Label>Telefone / WhatsApp</Label><Input value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} /></div>
          <div><Label>Tipo de cliente</Label><select className={sel} value={f.customer_type} onChange={(e) => setF({ ...f, customer_type: e.target.value })}><option value="varejo">Varejo</option><option value="atacado">Atacado</option><option value="distribuicao">Distribuição</option></select></div>
          <div><Label>Canal</Label><select className={sel} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>{Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><Label>Forma de pagamento</Label><select className={sel} value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })}>{PAYMENTS.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><Label>Endereço (vazio = retirada)</Label><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>

          <div className="col-span-2 flex gap-2 items-end">
            <div className="flex-1"><Label>Adicionar produto</Label>
              <select className={sel} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Selecione...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""} — estoque {Number(p.stock_qty)}</option>)}
              </select>
            </div>
            <Button type="button" size="sm" onClick={add} disabled={!pick}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="col-span-2 border border-border rounded-md divide-y divide-border">
            {lines.length === 0 && <p className="p-3 text-muted-foreground text-xs">Nenhum item.</p>}
            {lines.map((l) => (
              <div key={l.product.id} className="flex items-center gap-2 p-2">
                <span className="flex-1 truncate">{l.product.name}</span>
                <Input type="number" min={1} className="w-20 h-8" value={l.qty} onChange={(e) => setLines((ls) => ls.map((x) => x.product.id === l.product.id ? { ...x, qty: Math.max(1, Number(e.target.value || 1)) } : x))} />
                <span className="w-24 text-right">{brl(unitPrice(l.product, l.qty) * l.qty)}</span>
                <button onClick={() => setLines((ls) => ls.filter((x) => x.product.id !== l.product.id))}><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            ))}
          </div>
          <div><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={f.discount} onChange={(e) => setF({ ...f, discount: Number(e.target.value || 0) })} /></div>
          <div><Label>Frete (R$)</Label><Input type="number" step="0.01" value={f.delivery_fee} onChange={(e) => setF({ ...f, delivery_fee: Number(e.target.value || 0) })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <div className="col-span-2 flex items-center justify-between pt-2">
            <span className="font-bold">Total: {brl(total)}</span>
            <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Criar pedido"}</Button></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
