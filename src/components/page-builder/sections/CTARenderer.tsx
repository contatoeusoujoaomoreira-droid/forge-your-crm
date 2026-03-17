import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const CTARenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const getCtaHref = () => {
    if (c.ctaAction === "whatsapp") return `https://wa.me/${(c.ctaUrl || "").replace(/\D/g, "")}`;
    if (c.ctaAction === "scroll") return `#${c.ctaUrl || ""}`;
    return c.ctaUrl || "#";
  };

  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#000", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 80}px`, paddingBottom: `${c.paddingY || 80}px`, fontFamily: c.fontFamily || "Inter" }} className="text-center">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4">{c.headline || "CTA"}</h2>
        {c.description && <p className="opacity-80 mb-8">{c.description}</p>}
        {c.ctaText && (
          <a
            href={getCtaHref()}
            onClick={isEditor ? (e) => e.preventDefault() : undefined}
            className="inline-block px-8 py-4 rounded-lg font-bold text-sm transition-transform hover:scale-105"
            style={{ background: c.accentColor || "#84CC16", color: c.bgColor || "#000" }}
          >
            {c.ctaText}
          </a>
        )}
      </div>
    </motion.section>
  );
};

export default CTARenderer;
