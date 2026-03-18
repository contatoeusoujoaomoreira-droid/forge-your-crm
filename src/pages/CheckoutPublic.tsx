import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus } from "lucide-react";

interface CheckoutItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
}

const CheckoutPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [checkout, setCheckout] = useState<any>(null);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"menu" | "checkout">("menu");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    const fetchCheckout = async () => {
      const { data } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setCheckout(data);
        setItems(Array.isArray(data.items) ? data.items as CheckoutItem[] : []);
      }
      setLoading(false);
    };
    fetchCheckout();
  }, [slug]);

  const addToCart = (itemId: string) => setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  const removeFromCart = (itemId: string) => setCart(prev => {
    const next = { ...prev };
    if (next[itemId] > 1) next[itemId]--;
    else delete next[itemId];
    return next;
  });

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = items.find(i => i.id === id);
    return item ? { ...item, quantity: qty, subtotal: item.price * qty } : null;
  }).filter(Boolean) as (CheckoutItem & { quantity: number; subtotal: number })[];

  const total = cartItems.reduce((s, i) => s + i.subtotal, 0);
  const totalItems = Object.values(cart).reduce((s, q) => s + q, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkout || !customer.name || cartItems.length === 0) return;

    // Save order
    await supabase.from("orders").insert({
      checkout_id: checkout.id,
      customer_name: customer.name,
      customer_email: customer.email || null,
      customer_phone: customer.phone || null,
      items: cartItems as any,
      total,
      status: "pending",
      notes: customer.notes || null,
    });

    // Redirect to WhatsApp
    const whatsNumber = checkout.whatsapp_number;
    if (whatsNumber) {
      const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name} — R$ ${i.subtotal.toFixed(2)}`).join("\n");
      const msg = encodeURIComponent(
        `🛒 *Novo Pedido*\n\n` +
        `👤 ${customer.name}\n` +
        (customer.phone ? `📱 ${customer.phone}\n` : "") +
        (customer.email ? `📧 ${customer.email}\n` : "") +
        `\n📋 *Itens:*\n${itemsText}\n\n` +
        `💰 *Total: R$ ${total.toFixed(2)}*` +
        (customer.notes ? `\n\n📝 ${customer.notes}` : "")
      );
      window.open(`https://wa.me/${whatsNumber}?text=${msg}`, "_blank");
    }
    setStep("menu");
    setCart({});
    setCustomer({ name: "", email: "", phone: "", notes: "" });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!checkout) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Checkout não encontrado</p></div>;

  const style = checkout.style || {};

  return (
    <div className="min-h-screen" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff", fontFamily: "Inter" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center justify-between" style={{ background: `${style.bgColor || "#000"}CC` }}>
        <div>
          <h1 className="text-lg font-bold">{checkout.title}</h1>
          {checkout.description && <p className="text-xs opacity-60">{checkout.description}</p>}
        </div>
        {totalItems > 0 && step === "menu" && (
          <button onClick={() => setStep("checkout")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
            <ShoppingCart className="h-4 w-4" />
            <span>{totalItems}</span>
            <span>R$ {total.toFixed(2)}</span>
          </button>
        )}
      </div>

      {step === "menu" ? (
        <div className="max-w-lg mx-auto p-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.name}</p>
                {item.description && <p className="text-xs opacity-60 mt-0.5">{item.description}</p>}
                <p className="text-sm font-bold mt-1" style={{ color: style.accentColor || "#84CC16" }}>R$ {item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                {cart[item.id] ? (
                  <>
                    <button onClick={() => removeFromCart(item.id)} className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/10"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center font-bold">{cart[item.id]}</span>
                    <button onClick={() => addToCart(item.id)} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}><Plus className="h-4 w-4" /></button>
                  </>
                ) : (
                  <button onClick={() => addToCart(item.id)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/20 hover:border-white/40 transition-colors">Adicionar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setStep("menu")} className="text-sm opacity-60 hover:opacity-100 mb-4">← Voltar ao cardápio</button>
          
          <div className="space-y-3 mb-6">
            <p className="font-semibold text-sm">Resumo do Pedido</p>
            {cartItems.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm border-b border-white/10 pb-2">
                <span>{item.quantity}x {item.name}</span>
                <span className="font-semibold">R$ {item.subtotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span style={{ color: style.accentColor || "#84CC16" }}>R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Seu nome *" required className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="E-mail" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
              <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="WhatsApp" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" />
            </div>
            <textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="Observações..." className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" rows={2} />
            <button type="submit" className="w-full py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
              {checkout.whatsapp_number ? "Enviar Pedido via WhatsApp" : "Finalizar Pedido"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CheckoutPublic;
