import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getAnimation } from "./animations";

const AccordionRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const items = c.items || [
    { title: "Como funciona o produto?", content: "Nosso produto funciona de forma simples e intuitiva. Após o cadastro, você tem acesso imediato a todas as funcionalidades." },
    { title: "Qual é o prazo de entrega?", content: "O prazo de entrega varia de acordo com a sua localização. Em média, entregamos em 3 a 7 dias úteis." },
    { title: "Posso cancelar a qualquer momento?", content: "Sim! Você pode cancelar sua assinatura a qualquer momento, sem multas ou taxas adicionais." },
    { title: "Há suporte disponível?", content: "Oferecemos suporte 24/7 via chat, e-mail e telefone para todos os nossos clientes." },
  ];
  const allowMultiple = c.allowMultiple === true;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  const accent = c.accentColor || "#84CC16";
  const anim = getAnimation(c.animation);

  const toggleItem = (idx: number) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        if (!allowMultiple) next.clear();
        next.add(idx);
      }
      return next;
    });
  };

  const sectionStyle: React.CSSProperties = {
    background: c.bgGradient || c.bgColor || "#0a0a0a",
    color: c.textColor || "#ffffff",
    paddingTop: `${c.paddingY || 80}px`,
    paddingBottom: `${c.paddingY || 80}px`,
    fontFamily: c.fontFamily || "Inter, sans-serif",
  };

  return (
    <section style={sectionStyle}>
      <div className="max-w-3xl mx-auto px-6">
        {(c.headline || c.title) && (
          <motion.div {...anim} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.headline || c.title}</h2>
            {c.subtitle && <p className="text-lg opacity-70 max-w-2xl mx-auto">{c.subtitle}</p>}
          </motion.div>
        )}

        <div className="space-y-3">
          {items.map((item: any, i: number) => {
            const isOpen = openItems.has(i);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: isOpen ? `${accent}40` : "rgba(255,255,255,0.08)",
                  background: isOpen ? `${accent}08` : "rgba(255,255,255,0.03)",
                  transition: "border-color 0.2s, background 0.2s",
                }}
              >
                <button
                  onClick={() => toggleItem(i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-semibold text-base leading-snug">{item.title || item.question}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0"
                    style={{ color: isOpen ? accent : "rgba(255,255,255,0.4)" }}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-5 pb-5">
                        <div
                          className="h-px mb-4"
                          style={{ background: `${accent}20` }}
                        />
                        <p className="text-sm opacity-75 leading-relaxed">
                          {item.content || item.answer}
                        </p>
                        {item.ctaText && (
                          <a
                            href={item.ctaUrl || "#"}
                            className="inline-block mt-3 text-sm font-semibold hover:underline"
                            style={{ color: accent }}
                          >
                            {item.ctaText} →
                          </a>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AccordionRenderer;
