import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, ShoppingCart, Copy, Pencil, Trash2, Eye, X, DollarSign } from "lucide-react";

interface CheckoutItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

interface Checkout {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  is_published: boolean;
  items: CheckoutItem[];
  whatsapp_number: string | null;
  style: any;
  created_at: string;
  _orderCount?: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: any[];
  total: number;
  status: string;
  created_at: string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const CheckoutsList = () => {
  const [checkouts, setCheckouts] = useState<Checkout[]>([]);
  const [editing, setEditing] = useState<Checkout | null>(null);
  const [showOrders, setShowOrders] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  const fetchCheckouts = async () => {
    const { data } = await supabase.from("checkouts").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: counts } = await supabase.from("orders").select("checkout_id");
    const countMap: Record<string, number> = {};
    (counts || []).forEach((r: any) => { countMap[r.checkout_id] = (countMap[r.checkout_id] || 0) + 1; });
    setCheckouts(data.map((c: any) => ({
      ...c,
      items: Array.isArray(c.items) ? c.items as CheckoutItem[] : [],
      _orderCount: countMap[c.id] || 0,
    })));
  };

  useEffect(() => { fetchCheckouts(); }, []);

  const startNew = () => setEditing({
    id: "", title: "", slug: "", description: "", is_active: true, is_published: false,
    items: [{ id: generateId(), name: "Produto 1", description: "Descrição", price: 97 }],
    whatsapp_number: "", style: { bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    created_at: "",
  });

  const handleSave = async () => {
    if (!editing || !editing.title || !editing.slug) {
      toast({ title: "Preencha título e slug", variant: "destructive" }); return;
    }
    const payload = {
      title: editing.title, slug: editing.slug, description: editing.description,
      is_active: editing.is_active, is_published: editing.is_published,
      items: editing.items as any, whatsapp_number: editing.whatsapp_number,
      style: editing.style as any,
    };
    if (editing.id) {
      const { error } = await supabase.from("checkouts").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("checkouts").insert(payload);
      if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "Checkout salvo!" });
    setEditing(null);
    fetchCheckouts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("checkouts").delete().eq("id", id);
    toast({ title: "Checkout excluído" });
    fetchCheckouts();
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/${slug}`);
    toast({ title: "Link copiado!" });
  };

  const fetchOrders = async (checkoutId: string) => {
    setShowOrders(checkoutId);
    const { data } = await supabase.from("orders").select("*").eq("checkout_id", checkoutId).order("created_at", { ascending: false });
    setOrders((data || []) as Order[]);
  };

  const addItem = () => {
    if (!editing) return;
    setEditing({ ...editing, items: [...editing.items, { id: generateId(), name: "", description: "", price: 0 }] });
  };

  const updateItem = (idx: number, updates: Partial<CheckoutItem>) => {
    if (!editing) return;
    const items = [...editing.items];
    items[idx] = { ...items[idx], ...updates };
    setEditing({ ...editing, items });
  };

  const removeItem = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, items: editing.items.filter((_, i) => i !== idx) });
  };

  // Orders view
  if (showOrders) {
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Pedidos</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowOrders(null)}>← Voltar</Button>
        </div>
        <div className="surface-card rounded-lg p-4 flex items-center gap-4">
          <DollarSign className="h-6 w-6 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-lg font-bold text-foreground">R$ {totalRevenue.toLocaleString("pt-BR")}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Pedidos</p>
            <p className="text-lg font-bold text-foreground">{orders.length}</p>
          </div>
        </div>
        {orders.length === 0 ? (
          <div className="surface-card rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Nenhum pedido</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="surface-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-foreground text-sm">{o.customer_name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${o.status === "completed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {o.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{o.customer_email} {o.customer_phone && `• ${o.customer_phone}`}</p>
                <p className="text-sm font-semibold text-primary mt-2">R$ {o.total?.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Editor view
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">{editing.id ? "Editar" : "Novo"} Checkout</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Salvar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Título</Label>
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 bg-secondary/50 border-border" placeholder="Checkout Principal" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
            <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-secondary/50 border-border" />
            <p className="text-[10px] text-muted-foreground mt-1">/checkout/{editing.slug || "..."}</p>
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">WhatsApp (para redirecionamento)</Label>
          <Input value={editing.whatsapp_number || ""} onChange={(e) => setEditing({ ...editing, whatsapp_number: e.target.value })} placeholder="5511999999999" className="mt-1 bg-secondary/50 border-border" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
            <Label className="text-xs text-muted-foreground">Ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
            <Label className="text-xs text-muted-foreground">Publicado</Label>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Itens ({editing.items.length})</p>
            <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Item</Button>
          </div>

          {editing.items.map((item, idx) => (
            <div key={item.id} className="surface-card rounded-lg p-4 space-y-2 relative">
              <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-destructive h-6 w-6 p-0"><X className="h-3 w-3" /></Button>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-[10px]">Nome</Label>
                  <Input value={item.name} onChange={(e) => updateItem(idx, { name: e.target.value })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" />
                </div>
                <div>
                  <Label className="text-[10px]">Preço (R$)</Label>
                  <Input type="number" value={item.price} onChange={(e) => updateItem(idx, { price: parseFloat(e.target.value) || 0 })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Descrição</Label>
                <Input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} className="h-7 text-xs bg-secondary/50 border-border mt-0.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Style */}
        <div className="surface-card rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎨 Estilo</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "bgColor", label: "Fundo" },
              { key: "textColor", label: "Texto" },
              { key: "accentColor", label: "Destaque" },
            ].map((c) => (
              <div key={c.key} className="flex items-center gap-2">
                <input type="color" value={editing.style[c.key] || "#000000"} onChange={(e) => setEditing({ ...editing, style: { ...editing.style, [c.key]: e.target.value } })} className="h-8 w-8 rounded border border-border cursor-pointer" />
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Checkout</h2>
        <Button size="sm" onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Novo Checkout</Button>
      </div>

      {checkouts.length === 0 ? (
        <div className="surface-card rounded-lg p-8 text-center space-y-3">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum checkout criado</p>
          <Button size="sm" onClick={startNew}>Criar Primeiro Checkout</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {checkouts.map((checkout) => (
            <div key={checkout.id} className="surface-card rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{checkout.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${checkout.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {checkout.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{checkout.items.length} itens</span>
                <span>{checkout._orderCount} pedidos</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing({ ...checkout })}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleCopyLink(checkout.slug)}><Copy className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => fetchOrders(checkout.id)}><Eye className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(checkout.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CheckoutsList;
