import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const TestimonialsRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  const items = c.items || [];
  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#000", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-5xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <motion.div key={i} {...getAnimation(c.animation)} transition={{ delay: i * 0.1 }} className="p-5 rounded-lg border border-white/10 bg-white/5">
              <p className="text-sm italic opacity-80 mb-4">"{item.text}"</p>
              <div className="flex items-center gap-3">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: c.accentColor || "#84CC16", color: "#000" }}>
                    {item.name?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  {item.role && <p className="text-xs opacity-60">{item.role}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default TestimonialsRenderer;
