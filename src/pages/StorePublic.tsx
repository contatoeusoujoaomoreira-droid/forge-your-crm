import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Minus, Plus, Search, ShoppingCart, Package, MessageCircle } from "lucide-react";
import StorefrontHeader from "@/components/store/StorefrontHeader";
import OrderTracking from "@/components/store/OrderTracking";
import { startStoreTracking, storeEvent, storeTrackingEnabled } from "@/lib/storeTracking";
import { storeThemeStyle } from "@/lib/storeAppearance";
import { unitPrice, cartTotal, buildOrderMessage, printReceipt, type CartLine } from "@/lib/store";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function StorePublic({ domain }: { domain?: string } = {}) {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const [viewItem, setViewItem] = useState<any>(null);
  const [tracking, setTracking] = useState(!!search.get("pedido"));
  const [trackingToken, setTrackingToken] = useState(search.get("pedido") || "");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("name");
  const [autoPay, setAutoPay] = useState(false);
  const [slug, setSlug] = useState<string | undefined>(params.slug);
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [cart, setCart] = useState<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem(`cart_${slug}`) || "{}"); } catch { return {}; } });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [address, setAddress] = useState(""); const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let qs = supabase.from("store_settings").select("*").eq("is_published", true);
      qs = domain ? qs.ilike("custom_domain", domain.replace(/^www\./, "")) : qs.eq("slug", params.slug || "");
      const { data: s } = await qs.maybeSingle();
      if (s && s.slug !== slug) setSlug(s.slug);
      setStore(s);
      if (s) {
        const { data } = await supabase.from("products_services").select("id,name,description,category,unit,price,wholesale_price,wholesale_min_qty,stock_qty,images,item_type,delivery_type,brand,sku")
          .eq("user_id", s.user_id).eq("is_active", true).eq("show_in_catalog", true).order("name");
        setProducts(data || []);
        const itemId = search.get("item") || search.get("pagar");
        const found = itemId ? (data || []).find((x: any) => x.id === itemId) : null;
        if (found) { setViewItem(found); if (search.get("pagar") && s.infinitepay_enabled) setAutoPay(true); }
        document.title = s.store_name;
      }
      setLoading(false);
    })();
  }, [params.slug, domain]);
  const trackCfg = store?.storefront_config?.tracking || {};
  useEffect(() => { if (!store) return; const stop = startStoreTracking(store.storefront_config?.tracking || {}); void storeEvent("page_view"); return stop; }, [store?.id]);
  useEffect(() => { if (viewItem) void storeEvent("view_item", { value: Number(viewItem.price || 0), items: [{ id: viewItem.id, price: viewItem.price }] }); }, [viewItem?.id]);
  useEffect(() => { if (!slug) return; localStorage.setItem(`cart_${slug}`, JSON.stringify(cart)); }, [cart, slug]);

  const cats = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];
  const shown = products.filter((p) => (!cat || p.category === cat) && (!brand || p.brand === brand) && (!q || [p.name,p.sku,p.brand,p.description].some(v=>String(v || "").toLowerCase().includes(q.toLowerCase())))).sort((a,b)=>sort==="price-low"?Number(a.price)-Number(b.price):sort==="price-high"?Number(b.price)-Number(a.price):a.name.localeCompare(b.name));
  const lines: CartLine[] = products.filter((p) => p.item_type !== 'service' && cart[p.id] > 0).map((p) => ({ product: p, qty: cart[p.id] }));
  const total = cartTotal(lines);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const setQty = (id: string, qty: number) => setCart((c) => { const n = { ...c }; const product=products.find(p=>p.id===id); const safeQty=Math.max(0,Math.min(Math.floor(qty),Number(product?.stock_qty || 0))); if (safeQty <= 0) delete n[id]; else { if (safeQty > (c[id] || 0)) void storeEvent("add_to_cart", { value: Number(product?.price || 0), items: [{ id, price: product?.price }] }); n[id] = safeQty; } return n; });

  const fee = address.trim() ? Number(store?.delivery_fee || 0) : 0;
  const minOrder = Number(store?.min_order || 0);
  const belowMin = minOrder > 0 && total < minOrder;
  const [payError, setPayError] = useState("");
  const createOrder = async (selected: CartLine[], customerName: string, delivery = "", comment = "") => {
    const { data, error } = await supabase.functions.invoke("infinitepay", { body: { action:"create_order", store_slug:store.slug, customer_name:customerName, customer_phone:phone.replace(/\D/g,"") || undefined, customer_email:/^\S+@\S+\.\S+$/.test(email.trim())?email.trim():undefined, address:delivery, notes:comment, items:selected.map(l=>({id:l.product.id,qty:l.qty})) } });
    if (error || !data?.order) { let msg=data?.error; try { msg = msg || (await (error as any)?.context?.json())?.error; } catch {} throw new Error(msg || "Não foi possível criar o pedido. Tente novamente."); }
    const order=data.order;
    localStorage.setItem(`last_order_${store.slug}`,order.tracking_token);
    setTrackingToken(order.tracking_token);
    return order;
  };
  const payment = async (order:any) => {
    void storeEvent("begin_checkout", { value: Number(order.total || 0) });
    const {data}=await supabase.functions.invoke("infinitepay",{body:{order_id:order.id,token:order.tracking_token,redirect_url:`${window.location.origin}${window.location.pathname}?pedido=${order.tracking_token}`}});
    if (!data?.url) throw new Error(data?.error || "Não foi possível abrir o pagamento agora.");
    return data.url;
  };
  const send = async (mode: "whatsapp" | "pay" = "whatsapp") => {
    if (belowMin || sending) return;
    setSending(true); setPayError("");
    try {
      const order=await createOrder(lines,name.trim(),address.trim(),notes.trim());
      const trackingUrl=`${window.location.origin}${window.location.pathname}?pedido=${order.tracking_token}`;
      const msg=buildOrderMessage(lines,{name,address,notes,orderNo:order.order_no,storeName:store.store_name,fee})+`\nAcompanhe seu pedido: ${trackingUrl}`;
      const waUrl=`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(msg)}`;
      if (mode==="pay") { window.location.href=await payment(order); return; }
      setDone({...order,wa_url:waUrl}); setCart({}); setOpen(false);
      window.open(waUrl,"_blank","noopener,noreferrer");
    } catch(error) { setPayError(error instanceof Error?error.message:"Não foi possível concluir o pedido."); }
    setSending(false);
  };

  const buyNow = async (p: any, qty = 1) => {
    if (sending) return;
    setSending(true); setPayError("");
    try {
      const order=await createOrder([{product:p,qty:p.item_type==="service"?1:qty}],name.trim() || "Cliente");
      if (store.infinitepay_enabled) {window.location.href=await payment(order);return;}
      window.open(`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Pedido #${order.order_no}: ${p.name}`)}`,"_blank","noopener,noreferrer");
    } catch(error) {setPayError(error instanceof Error?error.message:"Não foi possível abrir o pagamento.");setAutoPay(false);}
    setSending(false);
  };
  useEffect(() => { if (autoPay && viewItem && store) { setAutoPay(false); buyNow(viewItem); } }, [autoPay, viewItem, store]);
  const closeItem = () => { setViewItem(null); if (search.get("item") || search.get("pagar")) { search.delete("item"); search.delete("pagar"); setSearch(search, { replace: true }); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!store) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loja não encontrada.</div>;
  const {className:themeClass,style}=storeThemeStyle(store);
  const bgStyle=style as React.CSSProperties;

  return (
    <div className={`min-h-screen bg-background text-foreground pb-24 ${themeClass}`} style={bgStyle}>
      <StorefrontHeader store={store} q={q} onSearch={setQ} categories={cats} category={cat} onCategory={setCat} count={count} onCart={()=>setOpen(true)} onTrack={()=>{setTrackingToken(localStorage.getItem(`last_order_${store.slug}`) || "");setTracking(true);}} />
      <section className="max-w-7xl mx-auto px-4 pt-6 flex flex-wrap justify-between items-center gap-3">
        <div><h2 className="text-xl font-bold">{cat || store.storefront_config?.catalog_title || "Produtos e serviços"}</h2><p className="text-xs text-muted-foreground">{shown.length} itens</p></div>
        <div className="flex flex-wrap gap-2">
          {brands.length>0 && <select aria-label="Filtrar por marca" className="h-10 px-3 rounded-md bg-background border border-input text-sm" value={brand} onChange={e=>setBrand(e.target.value)}><option value="">Todas as marcas</option>{brands.map(b=><option key={b}>{b}</option>)}</select>}
          <select aria-label="Ordenar catálogo" className="h-10 px-3 rounded-md bg-background border border-input text-sm" value={sort} onChange={e=>setSort(e.target.value)}><option value="name">Nome</option><option value="price-low">Menor preço</option><option value="price-high">Maior preço</option></select>
        </div>
      </section>
      <main className="max-w-7xl mx-auto px-4 py-5 grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {shown.map((p) => {
          const qty = cart[p.id] || 0;
          return (
            <div key={p.id} className="rounded-lg border border-border overflow-hidden flex flex-col bg-card">
              <div className="aspect-square bg-muted flex items-center justify-center cursor-pointer" onClick={() => setViewItem(p)}>
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-contain p-3" loading="lazy" /> : <Package className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <p className="text-sm font-medium leading-tight line-clamp-2">{p.name}</p>
                {p.price != null && <p className="font-bold">{brl(Number(p.price))}<span className="text-xs font-normal text-muted-foreground"> /{p.unit}</span></p>}
                {p.wholesale_price != null && <p className="text-xs" >{brl(Number(p.wholesale_price))} a partir de {p.wholesale_min_qty ?? 1}</p>}
                {p.item_type !== "service" && Number(p.stock_qty) <= 0 && <p className="text-xs text-muted-foreground">Esgotado</p>}
                <div className="mt-auto pt-1">
                  {p.item_type === "service" ? (
                    <Button size="sm" className="w-full"  disabled={sending} onClick={() => setViewItem(p)}>Contratar</Button>
                  ) : qty === 0 ? (
                    <Button size="sm" className="w-full"  disabled={Number(p.stock_qty)<=0} onClick={() => setQty(p.id, 1)}>Comprar</Button>
                  ) : (
                    <div className="flex items-center justify-between border border-border rounded-md">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(p.id, qty - 1)}><Minus className="h-4 w-4" /></Button>
                      <input className="w-10 text-center bg-transparent text-sm" value={qty} onChange={(e) => setQty(p.id, Number(e.target.value.replace(/\D/g, "")) || 0)} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={qty>=Number(p.stock_qty)} onClick={() => setQty(p.id, qty + 1)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="col-span-full text-center text-muted-foreground py-10">Nenhum produto encontrado.</p>}
      </main>

      <footer className="border-t border-border bg-secondary/30 mt-8"><div className="max-w-7xl mx-auto px-4 py-8 grid gap-6 md:grid-cols-3 text-sm"><div><h2 className="font-bold mb-2">{store.store_name}</h2><p className="text-muted-foreground whitespace-pre-line">{store.storefront_config?.about || store.welcome_text}</p></div><div><h3 className="font-semibold mb-2">Atendimento</h3><p>{store.opening_hours}</p><p>{store.storefront_config?.contact_email}</p><Button asChild variant="link" className="px-0"><a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noreferrer">Falar no WhatsApp</a></Button><Button variant="link" onClick={()=>setTracking(true)}>Acompanhar pedido</Button></div><div><h3 className="font-semibold mb-2">Informações da loja</h3><p className="whitespace-pre-line text-muted-foreground">{store.storefront_config?.policies || ""}</p>{store.infinitepay_enabled && <p className="mt-3 font-medium">Pix e cartão • InfinitePay</p>}</div></div></footer>
      <OrderTracking open={tracking} onClose={()=>setTracking(false)} token={trackingToken || undefined} store={store} themeClass={themeClass} themeStyle={bgStyle} />
      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-3 bg-background border-t border-border">
          <Button className="w-full max-w-7xl mx-auto flex h-12 text-base"  onClick={() => setOpen(true)}>
            <ShoppingCart className="h-5 w-5 mr-2" />Ver cesta ({count}) · {brl(total)}
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className={`max-h-[90vh] overflow-y-auto bg-background text-foreground ${themeClass}`} style={bgStyle}>
          <SheetHeader><SheetTitle>Sua cesta</SheetTitle></SheetHeader>
          {!count && <p className="py-6 text-muted-foreground">Seu carrinho está vazio.</p>}
          <div className="space-y-2 py-3">
            {lines.map((l) => (
              <div key={l.product.id} className="flex justify-between text-sm gap-2">
                <span>{l.qty}x {l.product.name}</span>
                <span className="font-medium">{brl(unitPrice(l.product, l.qty) * l.qty)}</span>
              </div>
            ))}
            {fee > 0 && <div className="flex justify-between text-sm border-t border-border pt-2"><span>Taxa de entrega</span><span>{brl(fee)}</span></div>}
            <div className="flex justify-between font-bold border-t border-border pt-2"><span>Total</span><span>{brl(total + fee)}</span></div>
          </div>
          <div className="space-y-2">
            <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            <Input placeholder="Seu WhatsApp com DDD" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
            <Input placeholder="Endereço de entrega" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
            <Textarea placeholder="Observações (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            {belowMin && <p className="text-sm text-destructive">Pedido mínimo: {brl(minOrder)}. Faltam {brl(minOrder - total)}.</p>}
            {store.infinitepay_enabled && (
              <Button className="w-full h-12 text-base"  disabled={!count || !name.trim() || belowMin || sending} onClick={() => send("pay")}>
                {sending ? "Abrindo pagamento..." : "💳 Pagar agora (Pix ou Cartão)"}
              </Button>
            )}
            {payError && <p className="text-sm text-destructive">{payError}</p>}
            <Button className="w-full h-12 text-base" variant={store.infinitepay_enabled ? "outline" : "default"}  disabled={!count || !name.trim() || belowMin || sending} onClick={() => send("whatsapp")}>
              <MessageCircle className="h-5 w-5 mr-2" />{sending ? "Enviando..." : "Enviar pedido no WhatsApp"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!done} onOpenChange={(v) => !v && setDone(null)}>
        <SheetContent side="bottom" className={`max-h-[90vh] overflow-y-auto bg-background text-foreground ${themeClass}`} style={bgStyle}>
          <SheetHeader><SheetTitle>✅ Pedido #{done?.order_no} enviado!</SheetTitle></SheetHeader>
          {done && (
            <div className="space-y-2 py-3 text-sm">
              {done.items.map((i: any) => <div key={i.id} className="flex justify-between"><span>{i.qty}x {i.name}</span><span>{brl(i.unit_price * i.qty)}</span></div>)}
              <div className="flex justify-between border-t border-border pt-2"><span>Entrega</span><span>{brl(done.delivery_fee)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{brl(done.total)}</span></div>
              <p className="text-xs text-muted-foreground">A loja vai confirmar seu pedido pelo WhatsApp.</p>
              <Button variant="outline" className="w-full" onClick={()=>{setDone(null);setTracking(true);}}>Acompanhar pedido</Button>
              {done.payment_link && <Button className="w-full" asChild><a href={done.payment_link} target="_blank" rel="noreferrer">💳 Pagar agora (Pix ou cartão)</a></Button>}
              <Button variant="outline" className="w-full" onClick={() => printReceipt(done, store.store_name)}>Imprimir / Salvar comprovante</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={!!viewItem} onOpenChange={(v) => !v && closeItem()}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto bg-background text-foreground ${themeClass}`} style={bgStyle}>
          {viewItem && (() => { const isSvc = viewItem.item_type === "service"; const q = cart[viewItem.id] || 0; return (
            <div className="space-y-3">
              <DialogHeader><DialogTitle>{viewItem.name}</DialogTitle></DialogHeader>
              {viewItem.images?.[0] && <img src={viewItem.images[0]} alt={viewItem.name} className="w-full aspect-square max-h-72 object-contain rounded-md" />}
              {viewItem.price != null && <p className="text-xl font-bold">{brl(Number(viewItem.price))}<span className="text-sm font-normal text-muted-foreground"> /{viewItem.unit}</span></p>}
              {viewItem.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{viewItem.description}</p>}
              {autoPay || (sending && isSvc) ? <p className="text-sm text-muted-foreground">Abrindo o pagamento...</p> : null}
              {viewItem.delivery_type === "digital" && <div className="space-y-2 rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">Produto digital: o acesso chega no seu WhatsApp assim que o pagamento for confirmado.</p><Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /><Input placeholder="Seu WhatsApp com DDD" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /><Input type="email" placeholder="Seu e-mail (para entrar na área de membros)" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} /></div>}
              {payError && <p className="text-xs text-destructive">{payError}</p>}
              {store.infinitepay_enabled && viewItem.price != null && (
                <Button className="w-full"  disabled={sending || (!isSvc && Number(viewItem.stock_qty)<=0) || (viewItem.delivery_type==="digital" && (!name.trim() || phone.replace(/\D/g,"").length<10 || !/^\S+@\S+\.\S+$/.test(email.trim())))} onClick={() => buyNow(viewItem, isSvc ? 1 : Math.max(1, q))}>{sending ? "Abrindo pagamento..." : isSvc ? "💳 Contratar e pagar agora" : "💳 Comprar agora (Pix ou Cartão)"}</Button>
              )}
              {!isSvc && <Button variant="outline" className="w-full" disabled={q>=Number(viewItem.stock_qty)} onClick={() => { setQty(viewItem.id, q + 1); closeItem(); }}><ShoppingCart className="h-4 w-4 mr-1" />{q > 0 ? `Adicionar mais um (${q} na cesta)` : "Adicionar à cesta"}</Button>}
              <Button variant="ghost" className="w-full" asChild><a href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Olá! Tenho interesse em: ${viewItem.name}`)}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-1" />Falar no WhatsApp</a></Button>
            </div>); })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
