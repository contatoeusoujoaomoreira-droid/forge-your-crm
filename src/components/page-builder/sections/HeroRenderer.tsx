import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const getPatternStyle = (pattern: string): React.CSSProperties => {
  switch (pattern) {
    case "dots":
      return { backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "24px 24px" };
    case "squares":
      return { backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" };
    case "mesh":
      return {};
    case "noise":
      return {};
    default:
      return {};
  }
};

const getCtaHref = (config: any) => {
  if (config.ctaAction === "whatsapp") return `https://wa.me/${(config.ctaUrl || "").replace(/\D/g, "")}`;
  if (config.ctaAction === "scroll") return `#${config.ctaUrl || ""}`;
  return config.ctaUrl || "#";
};

const HeroRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const patternStyle = getPatternStyle(c.bgPattern || "none");
  const style: React.CSSProperties = {
    backgroundColor: c.bgColor || "#000000",
    background: c.bgGradient || c.bgColor || "#000000",
    color: c.textColor || "#ffffff",
    paddingTop: `${c.paddingY || 80}px`,
    paddingBottom: `${c.paddingY || 80}px`,
    ...patternStyle,
    fontFamily: c.fontFamily || "Inter, sans-serif",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: `${c.headingSize || 48}px`,
    fontWeight: c.headingWeight || 700,
    letterSpacing: "-0.025em",
    lineHeight: 1,
    ...(c.gradientText ? {
      background: `linear-gradient(135deg, ${c.textColor || "#fff"}, ${c.accentColor || "#84CC16"})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    } : {}),
  };

  const btnStyle: React.CSSProperties = c.btnStyle === "outline"
    ? { border: `2px solid ${c.accentColor || "#84CC16"}`, color: c.accentColor || "#84CC16", backgroundColor: "transparent" }
    : c.btnStyle === "ghost"
    ? { color: c.accentColor || "#84CC16", backgroundColor: "transparent" }
    : { backgroundColor: c.accentColor || "#84CC16", color: c.bgColor || "#000" };

  const btnSizeClass = c.btnSize === "sm" ? "px-4 py-2 text-xs" : c.btnSize === "lg" ? "px-10 py-5 text-base" : c.btnSize === "xl" ? "px-12 py-6 text-lg" : "px-8 py-4 text-sm";

  return (
    <motion.section {...getAnimation(c.animation)} style={style} className="relative">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {c.badge && (
          <span className="inline-block text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border" style={{ borderColor: `${c.accentColor || "#84CC16"}40`, color: c.accentColor || "#84CC16" }}>
            {c.badge}
          </span>
        )}
        <h1 className="mb-4" style={headingStyle}>{c.headline || "Título Principal"}</h1>
        <p className="max-w-2xl mx-auto mb-8 opacity-80" style={{ fontSize: `${c.subtitleSize || 18}px` }}>{c.subtitle || "Subtítulo"}</p>
        {c.ctaText && (
          <a
            href={getCtaHref(c)}
            onClick={isEditor ? (e) => e.preventDefault() : c.ctaAction === "scroll" ? (e) => { e.preventDefault(); document.getElementById(c.ctaUrl)?.scrollIntoView({ behavior: "smooth" }); } : undefined}
            className={`inline-block rounded-lg font-bold transition-transform hover:scale-105 ${btnSizeClass} ${c.btnStyle === "rounded-full" ? "!rounded-full" : ""}`}
            style={btnStyle}
          >
            {c.ctaText}
          </a>
        )}
      </div>
    </motion.section>
  );
};

export default HeroRenderer;
