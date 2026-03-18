import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Plus, Minus, Star, Timer, Copy, Check } from "lucide-react";

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
  const [step, setStep] = useState<"menu" | "checkout" | "pix">("menu");
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "", notes: "" });
  const [notification, setNotification] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pixCopied, setPixCopied] = useState(false);
  const notifInterval = useRef<any>(null);
  const countdownInterval = useRef<any>(null);

  useEffect(() => {
    const fetchCheckout = async () => {
      const { data } = await supabase.from("checkouts").select("*").eq("slug", slug).eq("is_active", true).eq("is_published", true).maybeSingle();
      if (data) {
        setCheckout(data);
        setItems(Array.isArray(data.items) ? (data.items as unknown as CheckoutItem[]) : []);
        const s = (data.style || {}) as any;
        if (s.showCountdown) setCountdown((s.countdownMinutes || 15) * 60);
      }
      setLoading(false);
    };
    fetchCheckout();
  }, [slug]);

  useEffect(() => {
    if (countdown > 0) {
      countdownInterval.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
      return () => clearInterval(countdownInterval.current);
    }
  }, [countdown > 0]);

  useEffect(() => {
    const style = checkout?.style || {};
    if (style.showNotifications && style.notificationMessages?.length) {
      const msgs = style.notificationMessages;
      let idx = 0;
      const show = () => {
        setNotification(msgs[idx % msgs.length]);
        idx++;
        setTimeout(() => setNotification(null), 4000);
      };
      notifInterval.current = setInterval(show, (style.notificationInterval || 8) * 1000);
      setTimeout(show, 3000);
      return () => clearInterval(notifInterval.current);
    }
  }, [checkout]);

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

  const style = checkout?.style || {};
  const orderLabel = style.orderType === "reserva" ? "Reserva" : style.orderType === "agendamento" ? "Agendamento" : "Pedido";
  const buttonLabel = style.submitButtonText || `Enviar ${orderLabel} via WhatsApp`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkout || !customer.name || cartItems.length === 0) return;

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

    // If PIX is enabled, show PIX screen
    if (style.pixEnabled && style.pixKey) {
      setStep("pix");
      return;
    }

    const whatsNumber = checkout.whatsapp_number;
    if (whatsNumber) {
      const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name} — R$ ${i.subtotal.toFixed(2)}`).join("\n");
      const msg = encodeURIComponent(
        `🛒 *Novo ${orderLabel}*\n\n` +
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

  const handleCopyPix = () => {
    navigator.clipboard.writeText(style.pixKey || "");
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><div className="h-8 w-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div>;
  if (!checkout) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><p>Checkout não encontrado</p></div>;

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen relative" style={{ background: style.bgColor || "#000", color: style.textColor || "#fff", fontFamily: "Inter" }}>
      {/* Countdown Banner */}
      {style.showCountdown && countdown > 0 && (
        <div className="text-center py-2 px-4 text-sm font-bold flex items-center justify-center gap-2" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
          <Timer className="h-4 w-4" /> Oferta expira em {formatTime(countdown)}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-lg border-b border-white/10 px-4 py-3 flex items-center justify-between" style={{ background: `${style.bgColor || "#000"}CC` }}>
        <div className="flex items-center gap-3">
          {style.logoUrl && <img src={style.logoUrl} alt="" className="h-8 object-contain" />}
          <div>
            <h1 className="text-lg font-bold">{checkout.title}</h1>
            {checkout.description && <p className="text-xs opacity-60">{checkout.description}</p>}
          </div>
        </div>
        {totalItems > 0 && step === "menu" && (
          <button onClick={() => setStep("checkout")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-transform hover:scale-105" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
            <ShoppingCart className="h-4 w-4" />
            <span>{totalItems}</span>
            <span>R$ {total.toFixed(2)}</span>
          </button>
        )}
      </div>

      {/* Ratings */}
      {style.showRatings && (
        <div className="flex items-center justify-center gap-1 py-2">
          {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4" style={{ color: style.accentColor || "#84CC16", fill: style.accentColor || "#84CC16" }} />)}
          <span className="text-xs ml-1 opacity-60">4.9 (1.247 avaliações)</span>
        </div>
      )}

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

          {/* Floating cart button */}
          {totalItems > 0 && (
            <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40">
              <button onClick={() => setStep("checkout")} className="w-full flex items-center justify-between px-6 py-4 rounded-xl text-sm font-bold shadow-2xl transition-transform hover:scale-[1.02]" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
                <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Ver {orderLabel} ({totalItems})</span>
                <span>R$ {total.toFixed(2)}</span>
              </button>
            </div>
          )}
        </div>
      ) : step === "pix" ? (
        <div className="max-w-lg mx-auto p-4 space-y-6">
          <div className="text-center space-y-3">
            <div className="text-4xl">💳</div>
            <h2 className="text-xl font-bold">Pagamento via PIX</h2>
            <p className="text-sm opacity-70">Pague via PIX para garantir seu desconto</p>
          </div>

          <div className="rounded-xl p-6 space-y-4" style={{ background: `${style.textColor || "#fff"}08`, border: `1px solid ${style.textColor || "#fff"}15` }}>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: style.accentColor || "#84CC16" }}>R$ {total.toFixed(2)}</p>
              {style.pixDiscount && <p className="text-xs opacity-60 mt-1">Com {style.pixDiscount}% de desconto no PIX</p>}
            </div>

            {style.pixQrCode && (
              <div className="flex justify-center">
                <img src={style.pixQrCode} alt="QR Code PIX" className="h-48 w-48 rounded-lg bg-white p-2" />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold opacity-70">Chave PIX:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg px-4 py-3 text-sm font-mono truncate" style={{ background: `${style.textColor || "#fff"}10` }}>
                  {style.pixKey}
                </div>
                <button onClick={handleCopyPix} className="px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-1" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
                  {pixCopied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
                </button>
              </div>
            </div>

            {(style.pixName || style.pixBank) && (
              <div className="text-xs opacity-60 space-y-1">
                {style.pixName && <p><strong>Nome:</strong> {style.pixName}</p>}
                {style.pixBank && <p><strong>Banco:</strong> {style.pixBank}</p>}
              </div>
            )}
          </div>

          <p className="text-xs text-center opacity-50">Após o pagamento, envie o comprovante pelo WhatsApp</p>

          <button
            onClick={() => {
              const whatsNumber = checkout.whatsapp_number;
              if (whatsNumber) {
                const msg = encodeURIComponent(`✅ Pagamento PIX realizado!\n\n👤 ${customer.name}\n💰 R$ ${total.toFixed(2)}\n\nComprovante em anexo.`);
                window.open(`https://wa.me/${whatsNumber}?text=${msg}`, "_blank");
              }
              setStep("menu"); setCart({}); setCustomer({ name: "", email: "", phone: "", notes: "" });
            }}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
            style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}
          >
            Enviar Comprovante via WhatsApp
          </button>
        </div>
      ) : (
        <div className="max-w-lg mx-auto p-4">
          <button onClick={() => setStep("menu")} className="text-sm opacity-60 hover:opacity-100 mb-4">← Voltar ao cardápio</button>
          
          <div className="space-y-3 mb-6">
            <p className="font-semibold text-sm">Resumo do {orderLabel}</p>
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
            <input type="text" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Seu nome *" required className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" style={{ color: style.textColor || "#fff" }} />
            <div className="grid grid-cols-2 gap-3">
              <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="E-mail" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" style={{ color: style.textColor || "#fff" }} />
              <input type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="WhatsApp" className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" style={{ color: style.textColor || "#fff" }} />
            </div>
            <textarea value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} placeholder="Observações..." className="w-full rounded-lg px-4 py-3 text-sm border border-white/10 bg-white/5 focus:outline-none" rows={2} style={{ color: style.textColor || "#fff" }} />
            <button type="submit" className="w-full py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105" style={{ background: style.accentColor || "#84CC16", color: style.bgColor || "#000" }}>
              {buttonLabel}
            </button>
          </form>
        </div>
      )}

      {/* Floating Notification */}
      {notification && (
        <div className="fixed bottom-4 left-4 right-4 max-w-sm mx-auto z-50 animate-in slide-in-from-bottom-4">
          <div className="rounded-xl px-4 py-3 text-sm font-medium shadow-2xl" style={{ background: `${style.bgColor || "#000"}F0`, border: `1px solid ${style.accentColor || "#84CC16"}30`, color: style.textColor || "#fff" }}>
            🛒 {notification}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPublic;
