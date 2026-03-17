import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const FeaturesRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  const items = c.items || [];
  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#0A0A0A", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-5xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-12">{c.title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <motion.div key={i} {...getAnimation(c.animation)} transition={{ delay: i * 0.1 }} className="p-5 rounded-lg border border-white/10 bg-white/5">
              <span className="text-2xl mb-3 block">{item.icon}</span>
              <h3 className="font-semibold mb-2" style={{ color: c.accentColor || "#84CC16" }}>{item.title}</h3>
              <p className="text-sm opacity-70">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default FeaturesRenderer;
