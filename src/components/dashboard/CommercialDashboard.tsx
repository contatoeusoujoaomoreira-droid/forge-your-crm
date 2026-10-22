import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { ShoppingBag, DollarSign, Receipt, AlertTriangle, Package, Boxes, Clock, TrendingUp } from "lucide-react";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CommercialDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const since = new Date(); since.setDate(1); since.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from("store_orders").select("id, order_no, customer_name, total, status, created_at").eq("user_id", user.id).gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(1000),
      supabase.from("products_services").select("id, name, stock_qty, low_stock_threshold, price, cost_price, is_active").eq("user_id", user.id),
    ]).then(([o, p]) => { setOrders(o.data || []); setProducts(p.data || []); setLoading(false); });
  }, [user]);

  const today = new Date().toDateString();
  const valid = orders.filter((o) => o.status !== "cancelado");
  const todayOrders = valid.filter((o) => new Date(o.created_at).toDateString() === today);
  const sum = (l: any[]) => l.reduce((s, o) => s + Number(o.total || 0), 0);
  const monthTotal = sum(valid);
  const ticket = valid.length ? monthTotal / valid.length : 0;
  const pending = orders.filter((o) => ["novo", "confirmado"].includes(o.status)).length;
  const delivering = orders.filter((o) => o.status === "em entrega").length;
  const active = products.filter((p) => p.is_active);
  const low = active.filter((p) => Number(p.low_stock_threshold) > 0 && Number(p.stock_qty) <= Number(p.low_stock_threshold));
  const out = active.filter((p) => Number(p.stock_qty) <= 0);
  const stockValue = active.reduce((s, p) => s + Number(p.stock_qty || 0) * Number(p.cost_price ?? p.price ?? 0), 0);

  const kpis = [
    { label: "Vendas hoje", value: brl(sum(todayOrders)), sub: `${todayOrders.length} pedido(s)`, icon: DollarSign },
    { label: "Vendas no mês", value: brl(monthTotal), sub: `${valid.length} pedido(s)`, icon: TrendingUp },
    { label: "Ticket médio", value: brl(ticket), sub: "no mês", icon: Receipt },
    { label: "Pedidos a atender", value: String(pending), sub: `${delivering} em entrega`, icon: Clock },
    { label: "Produtos ativos", value: String(active.length), sub: `${out.length} sem estoque`, icon: Package },
    { label: "Valor em estoque", value: brl(stockValue), sub: "custo (ou preço)", icon: Boxes },
  ];

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">{k.label}<k.icon className="h-4 w-4 text-primary" /></div>
            <p className="text-xl font-bold mt-2">{k.value}</p>
            <p className="text-[11px] text-muted-foreground">{k.sub}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" />Últimos pedidos</h3>
          {orders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido neste mês.</p> : (
            <div className="divide-y divide-border">
              {orders.slice(0, 8).map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0"><p className="font-medium truncate">#{o.order_no} · {o.customer_name}</p><p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")} · {o.status}</p></div>
                  <span className="font-semibold">{brl(Number(o.total))}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Estoque baixo</h3>
          {low.length === 0 ? <p className="text-sm text-muted-foreground">Tudo certo com o estoque.</p> : (
            <div className="divide-y divide-border">
              {low.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-destructive font-semibold">{Number(p.stock_qty)} (mín. {Number(p.low_stock_threshold)})</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
