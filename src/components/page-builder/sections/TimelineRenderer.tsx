import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const TimelineRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const items = c.items || c.events || [
    { year: "2020", title: "Fundação", desc: "A empresa foi fundada com uma visão clara." },
    { year: "2021", title: "Primeiro Produto", desc: "Lançamos nosso produto principal no mercado." },
    { year: "2022", title: "Crescimento", desc: "Atingimos 10.000 clientes satisfeitos." },
    { year: "2023", title: "Expansão", desc: "Expandimos para novos mercados." },
    { year: "2024", title: "Hoje", desc: "Líderes do setor com presença nacional." },
  ];
  const layout = c.layout || "vertical";
  const accent = c.accentColor || "#84CC16";
  const anim = getAnimation(c.animation);

  const sectionStyle: React.CSSProperties = {
    background: c.bgGradient || c.bgColor || "#0a0a0a",
    color: c.textColor || "#ffffff",
    paddingTop: `${c.paddingY || 80}px`,
    paddingBottom: `${c.paddingY || 80}px`,
    fontFamily: c.fontFamily || "Inter, sans-serif",
  };

  if (layout === "horizontal") {
    return (
      <section style={sectionStyle}>
        <div className="max-w-6xl mx-auto px-6">
          {(c.headline || c.title) && (
            <motion.div {...anim} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.headline || c.title}</h2>
              {c.subtitle && <p className="text-lg opacity-70 max-w-2xl mx-auto">{c.subtitle}</p>}
            </motion.div>
          )}
          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Line */}
            <div className="absolute top-8 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }} />
            <div className="flex justify-between items-start gap-4 overflow-x-auto pb-4">
              {items.map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex flex-col items-center text-center min-w-[140px] flex-1"
                >
                  {/* Dot */}
                  <div
                    className="w-4 h-4 rounded-full border-2 relative z-10 mb-4 shrink-0"
                    style={{ background: accent, borderColor: accent, boxShadow: `0 0 12px ${accent}60` }}
                  />
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full mb-2"
                    style={{ background: `${accent}20`, color: accent }}
                  >
                    {item.year || item.date}
                  </span>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs opacity-60 leading-relaxed">{item.desc || item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Vertical layout (default)
  return (
    <section style={sectionStyle}>
      <div className="max-w-3xl mx-auto px-6">
        {(c.headline || c.title) && (
          <motion.div {...anim} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.headline || c.title}</h2>
            {c.subtitle && <p className="text-lg opacity-70 max-w-2xl mx-auto">{c.subtitle}</p>}
          </motion.div>
        )}
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[22px] top-0 bottom-0 w-0.5"
            style={{ background: `linear-gradient(to bottom, transparent, ${accent}, transparent)` }}
          />
          <div className="space-y-8">
            {items.map((item: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex gap-6 items-start"
              >
                {/* Dot + year */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold border-2 relative z-10"
                    style={{
                      background: i === items.length - 1 ? accent : `${accent}20`,
                      borderColor: accent,
                      color: i === items.length - 1 ? "#000" : accent,
                      boxShadow: `0 0 16px ${accent}40`,
                    }}
                  >
                    {(item.year || item.date || "").toString().slice(-2) || i + 1}
                  </div>
                </div>
                {/* Content */}
                <div
                  className="flex-1 rounded-xl p-4 border"
                  style={{
                    background: `${accent}08`,
                    borderColor: `${accent}20`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${accent}20`, color: accent }}>
                      {item.year || item.date}
                    </span>
                    <h3 className="font-bold text-base">{item.title}</h3>
                  </div>
                  <p className="text-sm opacity-70 leading-relaxed">{item.desc || item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineRenderer;
