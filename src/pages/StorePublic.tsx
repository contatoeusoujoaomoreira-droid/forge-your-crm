import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Search, ShoppingCart, Package, MessageCircle } from "lucide-react";
import { unitPrice, cartTotal, buildOrderMessage, printReceipt, type CartLine } from "@/lib/store";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function StorePublic({ domain }: { domain?: string } = {}) {
  const params = useParams();
  const [slug, setSlug] = useState<string | undefined>(params.slug);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem(`cart_${slug}`) || "{}"); } catch { return {}; } });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [address, setAddress] = useState(""); const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let qs = supabase.from("store_settings").select("*").eq("is_published", true);
      qs = domain ? qs.ilike("custom_domain", domain.replace(/^www\./, "")) : qs.eq("slug", params.slug!);
      const { data: s } = await qs.maybeSingle();
      if (s && s.slug !== slug) setSlug(s.slug);
      setStore(s);
      if (s) {
        const { data } = await supabase.from("products_services").select("id,name,description,category,unit,price,wholesale_price,wholesale_min_qty,stock_qty,images")
          .eq("user_id", s.user_id).eq("is_active", true).eq("show_in_catalog", true).order("name");
        setProducts(data || []);
        document.title = s.store_name;
      }
      setLoading(false);
    })();
  }, [params.slug, domain]);
  useEffect(() => { if (!slug) return; localStorage.setItem(`cart_${slug}`, JSON.stringify(cart)); }, [cart, slug]);

  const cats = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);
  const shown = products.filter((p) => (!cat || p.category === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const lines: CartLine[] = products.filter((p) => cart[p.id] > 0).map((p) => ({ product: p, qty: cart[p.id] }));
  const total = cartTotal(lines);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const setQty = (id: string, qty: number) => setCart((c) => { const n = { ...c }; if (qty <= 0) delete n[id]; else n[id] = qty; return n; });

  const fee = address.trim() ? Number(store?.delivery_fee || 0) : 0;
  const minOrder = Number(store?.min_order || 0);
  const belowMin = minOrder > 0 && total < minOrder;
  const send = async () => {
    if (belowMin || sending) return;
    setSending(true);
    const orderNo = String(Date.now()).slice(-6);
    const msg = buildOrderMessage(lines, { name, address, notes, orderNo, storeName: store.store_name, fee });
    const waWin = window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
    const order = {
      user_id: store.user_id, order_no: orderNo, customer_name: name.trim(), address: address.trim() || null, notes: notes.trim() || null,
      items: lines.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, unit_price: unitPrice(l.product, l.qty) })),
      subtotal: total, delivery_fee: fee, total: Math.round((total + fee) * 100) / 100,
    };
    await (supabase as any).from("store_orders").insert(order);
    setSending(false);
    setDone({ ...order, created_at: new Date().toISOString() });
    setCart({}); setOpen(false);
    if (!waWin) window.location.href = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loja não encontrada.</div>;
  const color = store.primary_color || "hsl(var(--primary))";

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          {store.logo_url ? <img src={store.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full flex items-center justify-center text-background font-bold" style={{ background: color }}>{store.store_name[0]}</div>}
          <div className="flex-1 min-w-0"><h1 className="font-bold truncate">{store.store_name}</h1>{store.welcome_text && <p className="text-xs text-muted-foreground truncate">{store.welcome_text}</p>}</div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3 space-y-2">
          <div className="relative"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar produto" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {cats.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {["", ...cats].map((c) => (
                <button key={c || "all"} onClick={() => setCat(c)} className={`px-3 py-1 rounded-full text-sm whitespace-nowrap border ${cat === c ? "text-background border-transparent" : "border-border"}`} style={cat === c ? { background: color } : undefined}>{c || "Todos"}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => {
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} className="rounded-lg border border-border overflow-hidden flex flex-col bg-card">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="p-2 flex-1 flex flex-col gap-1">
                <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                {p.price != null && <p className="font-bold">{brl(Number(p.price))}<span className="text-xs font-normal text-muted-foreground"> /{p.unit}</span></p>}
                {p.wholesale_price != null && <p className="text-xs" style={{ color }}>{brl(Number(p.wholesale_price))} a partir de {p.wholesale_min_qty ?? 1}</p>}
                {Number(p.stock_qty) <= 0 && <p className="text-xs text-muted-foreground">Sob consulta</p>}
                <div className="mt-auto pt-1">
                  {qty === 0 ? (
                    <Button size="sm" className="w-full" style={{ background: color }} onClick={() => setQty(p.id, 1)}>Adicionar</Button>
                  ) : (
                    <div className="flex items-center justify-between border border-border rounded-md">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(p.id, qty - 1)}><Minus className="h-4 w-4" /></Button>
                      <input className="w-10 text-center bg-transparent text-sm" value={qty} onChange={(e) => setQty(p.id, Number(e.target.value.replace(/\D/g, "")) || 0)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(p.id, qty + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">Nenhum produto encontrado.</p>}
      </main>

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-3 bg-background border-t border-border">
          <Button className="w-full max-w-5xl mx-auto flex h-12 text-base" style={{ background: color }} onClick={() => setOpen(true)}>
            <ShoppingCart className="h-5 w-5 mr-2" />Ver cesta ({count}) · {brl(total)}
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Sua cesta</SheetTitle></SheetHeader>
          <div className="space-y-2 py-3">
            {lines.map((l) => (
              <div key={l.product.id} className="flex justify-between text-sm gap-2">
                <span>{l.qty}x {l.product.name}</span>
                <span className="font-medium">{brl(unitPrice(l.product, l.qty) * l.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t border-border pt-2"><span>Total estimado</span><span>{brl(total)}</span></div>
          </div>
          <div className="space-y-2">
            <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Input placeholder="Endereço de entrega" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
            <Textarea placeholder="Observações (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            <Button className="w-full h-12 text-base" style={{ background: color }} disabled={!name.trim()} onClick={send}>
              <MessageCircle className="h-5 w-5 mr-2" />Enviar pedido no WhatsApp
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
