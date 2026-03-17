import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const PricingRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const plans = c.plans || [];
  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#000", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-5xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-2">{c.title}</h2>}
        {c.subtitle && <p className="text-center opacity-70 mb-10">{c.subtitle}</p>}
        <div className={`grid grid-cols-1 ${plans.length > 1 ? "md:grid-cols-2" : ""} ${plans.length > 2 ? "lg:grid-cols-3" : ""} gap-6 max-w-4xl mx-auto`}>
          {plans.map((plan: any, i: number) => (
            <motion.div key={i} {...getAnimation(c.animation)} transition={{ delay: i * 0.15 }} className={`p-6 rounded-xl border ${plan.highlight ? "border-2" : "border-white/10"} bg-white/5 flex flex-col`} style={plan.highlight ? { borderColor: c.accentColor || "#84CC16" } : {}}>
              {plan.highlight && <span className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: c.accentColor || "#84CC16" }}>Mais Popular</span>}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-4xl font-black my-4">R${plan.price}<span className="text-sm font-normal opacity-60">/mês</span></p>
              <ul className="space-y-2 mb-6 flex-1">
                {(plan.features || []).filter(Boolean).map((f: string, fi: number) => (
                  <li key={fi} className="text-sm flex items-center gap-2"><span style={{ color: c.accentColor || "#84CC16" }}>✓</span> {f}</li>
                ))}
              </ul>
              <a
                href={isEditor ? "#" : (plan.ctaUrl || "#")}
                onClick={isEditor ? (e) => e.preventDefault() : undefined}
                className="block text-center py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105"
                style={plan.highlight ? { background: c.accentColor || "#84CC16", color: "#000" } : { border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
              >
                {plan.ctaText || "Escolher"}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default PricingRenderer;
