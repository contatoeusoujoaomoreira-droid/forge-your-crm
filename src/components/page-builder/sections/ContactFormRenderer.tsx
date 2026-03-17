import { useState } from "react";
import { motion } from "framer-motion";
import { getAnimation } from "./animations";
import { supabase } from "@/integrations/supabase/client";

const ContactFormRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditor) return;
    await supabase.from("leads").insert({
      name: form.name, email: form.email || null, phone: form.phone || null,
      source: "landing_page", notes: form.message || null, status: "new",
    } as any);
    setSent(true);
  };

  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#000", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-md mx-auto px-6 text-center">
        {c.title && <h2 className="text-2xl font-bold mb-2">{c.title}</h2>}
        {c.subtitle && <p className="text-sm opacity-70 mb-6">{c.subtitle}</p>}
        {sent ? (
          <div className="py-12">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold">Obrigado!</p>
            <p className="text-sm opacity-70">Entraremos em contato em breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-white/30 outline-none" />
            <input type="email" placeholder="Seu email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-white/30 outline-none" />
            <input type="tel" placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-white/30 outline-none" />
            <textarea placeholder="Mensagem (opcional)" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-white/30 outline-none resize-none" />
            <button type="submit" className="w-full py-3 rounded-lg font-bold text-sm transition-transform hover:scale-105" style={{ background: c.accentColor || "#84CC16", color: c.bgColor || "#000" }}>
              {c.ctaText || "Enviar"}
            </button>
          </form>
        )}
      </div>
    </motion.section>
  );
};

export default ContactFormRenderer;
