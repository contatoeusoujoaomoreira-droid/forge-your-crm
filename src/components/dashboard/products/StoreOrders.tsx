import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Receipt, MessageCircle } from "lucide-react";
import { printReceipt } from "@/lib/store";

const brl = (v: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS = ["novo", "confirmado", "em entrega", "concluído", "cancelado"];

export default function StoreOrders({ storeName }: { storeName?: string }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("store_orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setOrders(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("store_orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Pedidos recebidos</h3>
      {orders.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda. Os pedidos feitos na loja aparecem aqui.</p>}
      {orders.map((o) => (
        <div key={o.id} className="border border-border rounded-md p-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">#{o.order_no} · {o.customer_name}</span>
            <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{(o.items || []).map((i: any) => `${i.qty}x ${i.name}`).join(", ")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{brl(o.total)}</span>
            <select className="h-8 rounded-md border border-border bg-background px-2 text-xs" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <Badge variant="secondary">{o.address ? "Entrega" : "Retirada"}</Badge>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => printReceipt(o, storeName)}><Printer className="h-4 w-4 mr-1" />Imprimir / PDF</Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Pedido #${o.order_no} — total ${brl(o.total)} — status: ${o.status}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Enviar</a>
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
