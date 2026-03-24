import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const MarqueeRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const items: string[] = c.items || ["⚡ Velocidade", "🎯 Precisão", "🔒 Segurança", "🚀 Escalabilidade", "💡 Inovação"];
  const speed = c.speed || 30;
  const direction = c.direction === "right" ? "right" : "left";
  const gap = c.gap || 60;
  const fontSize = c.fontSize || 16;
  const fontWeight = c.fontWeight || "600";
  const pauseOnHover = c.pauseOnHover !== false;

  const sectionStyle: React.CSSProperties = {
    backgroundColor: c.bgColor || "#84CC16",
    color: c.textColor || "#000000",
    paddingTop: `${c.paddingY || 16}px`,
    paddingBottom: `${c.paddingY || 16}px`,
    overflow: "hidden",
    position: "relative",
  };

  // Duplicate items for seamless loop
  const allItems = [...items, ...items, ...items];
  const animDuration = (items.length * gap * 2) / speed;

  const trackStyle: React.CSSProperties = {
    display: "flex",
    gap: `${gap}px`,
    width: "max-content",
    animation: `marquee-${direction} ${animDuration}s linear infinite`,
    willChange: "transform",
  };

  return (
    <section style={sectionStyle}>
      {/* Fade edges */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
        background: `linear-gradient(to right, ${c.bgColor || "#84CC16"}, transparent)`,
        zIndex: 2, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
        background: `linear-gradient(to left, ${c.bgColor || "#84CC16"}, transparent)`,
        zIndex: 2, pointerEvents: "none",
      }} />

      <div
        className={pauseOnHover && !isEditor ? "group" : ""}
        style={{ overflow: "hidden" }}
      >
        <div
          style={{
            ...trackStyle,
            animationPlayState: "running",
          }}
          className={pauseOnHover && !isEditor ? "group-hover:[animation-play-state:paused]" : ""}
        >
          {allItems.map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: `${fontSize}px`,
                fontWeight,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {item}
              {i < allItems.length - 1 && (
                <span style={{ opacity: 0.4, marginLeft: 8 }}>•</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
};

export default MarqueeRenderer;
