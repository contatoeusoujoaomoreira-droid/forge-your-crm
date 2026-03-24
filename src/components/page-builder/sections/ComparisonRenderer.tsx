import { motion } from "framer-motion";
import { getAnimation } from "./animations";
import { Check, X, Minus } from "lucide-react";

const ComparisonRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const items = c.items || c.rows || [
    { feature: "Suporte 24/7", ours: true, theirs: false },
    { feature: "Atualizações gratuitas", ours: true, theirs: false },
    { feature: "Integração com APIs", ours: true, theirs: true },
    { feature: "Painel de analytics", ours: true, theirs: false },
    { feature: "Onboarding personalizado", ours: true, theirs: false },
    { feature: "Preço justo", ours: true, theirs: false },
  ];
  const ourLabel = c.ourLabel || c.leftLabel || "Nossa Solução";
  const theirLabel = c.theirLabel || c.rightLabel || "Concorrência";
  const accent = c.accentColor || "#84CC16";
  const anim = getAnimation(c.animation);

  const sectionStyle: React.CSSProperties = {
    background: c.bgGradient || c.bgColor || "#000000",
    color: c.textColor || "#ffffff",
    paddingTop: `${c.paddingY || 80}px`,
    paddingBottom: `${c.paddingY || 80}px`,
    fontFamily: c.fontFamily || "Inter, sans-serif",
  };

  const renderValue = (val: boolean | string, isOurs: boolean) => {
    if (typeof val === "boolean") {
      if (val) {
        return (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: isOurs ? `${accent}20` : "rgba(255,255,255,0.05)",
              border: `1px solid ${isOurs ? accent : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <Check className="h-3.5 w-3.5" style={{ color: isOurs ? accent : "rgba(255,255,255,0.4)" }} />
          </div>
        );
      } else {
        return (
          <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto bg-red-500/10 border border-red-500/20">
            <X className="h-3.5 w-3.5 text-red-400/60" />
          </div>
        );
      }
    }
    if (val === "-" || val === "—") {
      return (
        <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto bg-white/5 border border-white/10">
          <Minus className="h-3.5 w-3.5 opacity-30" />
        </div>
      );
    }
    return (
      <span
        className="text-sm font-semibold"
        style={{ color: isOurs ? accent : "rgba(255,255,255,0.6)" }}
      >
        {val}
      </span>
    );
  };

  return (
    <section style={sectionStyle}>
      <div className="max-w-4xl mx-auto px-6">
        {(c.headline || c.title) && (
          <motion.div {...anim} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.headline || c.title}</h2>
            {c.subtitle && <p className="text-lg opacity-70 max-w-2xl mx-auto">{c.subtitle}</p>}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl overflow-hidden border"
          style={{ borderColor: `${accent}30` }}
        >
          {/* Header */}
          <div
            className="grid grid-cols-3 gap-0"
            style={{ background: `${accent}10`, borderBottom: `1px solid ${accent}20` }}
          >
            <div className="p-4 text-sm font-bold opacity-50 uppercase tracking-wider">Recurso</div>
            <div
              className="p-4 text-center border-l"
              style={{ borderColor: `${accent}20`, background: `${accent}15` }}
            >
              <span
                className="text-sm font-bold px-3 py-1 rounded-full"
                style={{ background: accent, color: "#000" }}
              >
                {ourLabel}
              </span>
            </div>
            <div className="p-4 text-center border-l" style={{ borderColor: `${accent}20` }}>
              <span className="text-sm font-semibold opacity-50">{theirLabel}</span>
            </div>
          </div>

          {/* Rows */}
          {items.map((item: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="grid grid-cols-3 gap-0 border-b last:border-b-0"
              style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <div className="p-4 text-sm font-medium">{item.feature}</div>
              <div
                className="p-4 flex items-center justify-center border-l"
                style={{ borderColor: `${accent}15`, background: `${accent}05` }}
              >
                {renderValue(item.ours !== undefined ? item.ours : item.left, true)}
              </div>
              <div className="p-4 flex items-center justify-center border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                {renderValue(item.theirs !== undefined ? item.theirs : item.right, false)}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA below table */}
        {c.ctaText && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8"
          >
            <a
              href={c.ctaUrl || "#"}
              className="inline-block px-8 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: accent, color: "#000" }}
            >
              {c.ctaText}
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ComparisonRenderer;
