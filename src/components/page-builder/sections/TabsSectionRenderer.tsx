import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimation } from "./animations";

const TabsSectionRenderer = ({ config: c, isEditor }: { config: any; isEditor?: boolean }) => {
  const tabs = c.tabs || [
    { label: "Funcionalidade 1", icon: "⚡", content: "Conteúdo da primeira aba com detalhes sobre a funcionalidade principal do produto." },
    { label: "Funcionalidade 2", icon: "🎯", content: "Conteúdo da segunda aba com informações sobre como o produto resolve seu problema." },
    { label: "Funcionalidade 3", icon: "🔒", content: "Conteúdo da terceira aba com detalhes sobre segurança e confiabilidade." },
  ];
  const [activeTab, setActiveTab] = useState(0);
  const accent = c.accentColor || "#84CC16";
  const anim = getAnimation(c.animation);

  const sectionStyle: React.CSSProperties = {
    background: c.bgGradient || c.bgColor || "#0a0a0a",
    color: c.textColor || "#ffffff",
    paddingTop: `${c.paddingY || 80}px`,
    paddingBottom: `${c.paddingY || 80}px`,
    fontFamily: c.fontFamily || "Inter, sans-serif",
  };

  const currentTab = tabs[activeTab] || tabs[0];

  return (
    <section style={sectionStyle}>
      <div className="max-w-5xl mx-auto px-6">
        {(c.headline || c.title) && (
          <motion.div {...anim} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{c.headline || c.title}</h2>
            {c.subtitle && <p className="text-lg opacity-70 max-w-2xl mx-auto">{c.subtitle}</p>}
          </motion.div>
        )}

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tabs.map((tab: any, i: number) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: activeTab === i ? accent : "rgba(255,255,255,0.05)",
                color: activeTab === i ? "#000" : "rgba(255,255,255,0.7)",
                border: `1px solid ${activeTab === i ? accent : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {activeTab === i && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: accent, zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border p-8"
            style={{
              background: `${accent}08`,
              borderColor: `${accent}25`,
            }}
          >
            {currentTab.image && (
              <img
                src={currentTab.image}
                alt={currentTab.label}
                className="w-full rounded-xl mb-6 object-cover"
                style={{ maxHeight: 300 }}
              />
            )}
            {currentTab.icon && (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ background: `${accent}20` }}
              >
                {currentTab.icon}
              </div>
            )}
            <h3 className="text-xl font-bold mb-3">{currentTab.label}</h3>
            {typeof currentTab.content === "string" ? (
              <p className="text-base opacity-75 leading-relaxed">{currentTab.content}</p>
            ) : (
              <div className="space-y-3">
                {Array.isArray(currentTab.content) && currentTab.content.map((item: any, j: number) => (
                  <div key={j} className="flex items-start gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ background: accent, color: "#000" }}
                    >
                      ✓
                    </span>
                    <p className="text-sm opacity-75">{typeof item === "string" ? item : item.text || item.title}</p>
                  </div>
                ))}
              </div>
            )}
            {currentTab.ctaText && (
              <a
                href={currentTab.ctaUrl || "#"}
                className="inline-block mt-6 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{ background: accent, color: "#000" }}
              >
                {currentTab.ctaText}
              </a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default TabsSectionRenderer;
