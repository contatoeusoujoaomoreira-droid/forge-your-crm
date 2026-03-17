import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const BenefitsRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  const items = c.items || [];
  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#0A0A0A", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-5xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-4">{c.title}</h2>}
        {c.subtitle && <p className="text-center opacity-70 mb-10">{c.subtitle}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <motion.div key={i} {...getAnimation(c.animation)} transition={{ delay: i * 0.1 }} className="flex gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs opacity-70">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default BenefitsRenderer;
