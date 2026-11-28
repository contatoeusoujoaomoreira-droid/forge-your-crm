import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ShoppingBag, DollarSign, Star, CalendarDays, MessageCircle } from "lucide-react";
import { isPaid } from "../../../supabase/functions/_shared/storeCommerce";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// A paid or completed order turns the buyer into a customer (grouped by WhatsApp, then e-mail/name).
export const isCustomerOrder = (o: any) => o.status !== "cancelado" && (isPaid(o.payment_status) || ["entregue", "concluído"].includes(o.status));
export const customerLevel = (orders: number, spent: number) => (orders >= 5 || spent >= 1000 ? "VIP" : orders >= 2 ? "Recorrente" : "Novo");

export default function StoreCustomers() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => { if (user) supabase.from("store_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2000).then(({ data }) => setOrders((data || []).filter(isCustomerOrder))); }, [user]);

  const { customers, days } = useMemo(() => {
    const map = new Map<string, any>(); const days = Array(7).fill(0);
    for (const o of orders) {
      const key = String(o.customer_phone || o.customer_email || o.customer_name || o.id).replace(/\s/g, "").toLowerCase();
      const c = map.get(key) || { key, name: o.customer_name, phone: o.customer_phone, email: o.customer_email, orders: 0, spent: 0, last: o.created_at, first: o.created_at, items: {} as Record<string, number> };
      c.orders++; c.spent += Number(o.total || 0); if (o.created_at > c.last) c.last = o.created_at; if (o.created_at < c.first) c.first = o.created_at;
      (o.items || []).forEach((i: any) => { c.items[i.name] = (c.items[i.name] || 0) + Number(i.qty || 1); });
      days[new Date(o.created_at).getDay()]++;
      map.set(key, c);
    }
    const customers = [...map.values()].map((c) => ({ ...c, favorite: Object.entries(c.items).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "-", level: customerLevel(c.orders, c.spent), points: Math.floor(c.spent) })).sort((a, b) => b.spent - a.spent);
    return { customers, days };
  }, [orders]);
  const total = customers.reduce((s, c) => s + c.spent, 0);
  const best = days.indexOf(Math.max(...days));
  const list = customers.filter((c) => !q || [c.name, c.phone, c.email].some((f) => String(f || "").toLowerCase().includes(q.toLowerCase())));
  const cards = [[Users, "Clientes", customers.length], [ShoppingBag, "Pedidos pagos", orders.length], [DollarSign, "Faturamento", brl(total)], [Star, "Ticket médio", brl(orders.length ? total / orders.length : 0)], [CalendarDays, "Dia que mais compram", orders.length ? DAYS[best] : "-"]] as const;

  return <div className="space-y-4">
    <div><h2 className="text-2xl font-bold">Clientes compradores</h2><p className="text-sm text-muted-foreground">Quem já pagou ou recebeu um pedido vira cliente automaticamente. 1 ponto de fidelidade para cada R$ 1 comprado.</p></div>
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">{cards.map(([Icon, l, v]) => <Card key={l} className="p-3"><Icon className="h-4 w-4 text-primary mb-1" /><p className="text-xs text-muted-foreground">{l}</p><p className="text-lg font-bold">{v}</p></Card>)}</div>
    <Input placeholder="Buscar por nome, WhatsApp ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
    <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground border-b border-border"><tr>{["#", "Cliente", "Nível", "Pedidos", "Total gasto", "Ticket", "Pontos", "Mais comprado", "Última compra", ""].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
      <tbody>{list.map((c, i) => <tr key={c.key} className="border-b border-border last:border-0">
        <td className="p-2">{i + 1}</td><td className="p-2"><p className="font-medium">{c.name || "Sem nome"}</p><p className="text-xs text-muted-foreground">{c.phone || c.email}</p></td>
        <td className="p-2"><Badge variant={c.level === "VIP" ? "default" : "secondary"}>{c.level}</Badge></td><td className="p-2">{c.orders}</td><td className="p-2 font-semibold">{brl(c.spent)}</td><td className="p-2">{brl(c.spent / c.orders)}</td><td className="p-2">{c.points}</td>
        <td className="p-2 max-w-40 truncate">{c.favorite}</td><td className="p-2">{new Date(c.last).toLocaleDateString("pt-BR")}<p className="text-xs text-muted-foreground">há {Math.floor((Date.now() - new Date(c.last).getTime()) / 864e5)} dias</p></td>
        <td className="p-2">{c.phone && <Button size="icon" variant="ghost" asChild><a aria-label="Chamar no WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/${String(c.phone).length <= 11 ? "55" : ""}${c.phone}`}><MessageCircle className="h-4 w-4" /></a></Button>}</td>
      </tr>)}{!list.length && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">Nenhum cliente ainda. Assim que um pedido for pago, ele aparece aqui.</td></tr>}</tbody></table></Card>
  </div>;
}
