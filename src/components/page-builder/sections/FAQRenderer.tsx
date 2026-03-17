import { useState } from "react";
import { motion } from "framer-motion";
import { getAnimation } from "./animations";
import { ChevronDown } from "lucide-react";

const FAQRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  const items = c.items || [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#000", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-3xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-white/5 transition-colors"
              >
                {item.question}
                <ChevronDown className={`h-4 w-4 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
              </button>
              {openIdx === i && (
                <div className="px-5 pb-4 text-sm opacity-70">{item.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default FAQRenderer;
