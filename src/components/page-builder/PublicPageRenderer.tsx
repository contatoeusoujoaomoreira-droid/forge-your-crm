/**
 * PublicPageRenderer
 * 
 * Componente responsável por renderizar landing pages publicadas
 * com sincronização 100% WYSIWYG com o editor.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlobalStyleInjector, GLOBAL_STYLES } from "./GlobalStyleInjector";

interface Section {
  id: string;
  section_type: string;
  order: number;
  config: any;
  is_visible: boolean;
}

interface PageData {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  html_content: string | null;
  sections?: Section[];
}

const animationVariants: Record<string, any> = {
  "fade-in": { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.8 } },
  "slide-up": { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8 } },
  "slide-down": { initial: { opacity: 0, y: -40 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8 } },
  "slide-left": { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.8 } },
  "slide-right": { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.8 } },
  "scale-in": { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6 } },
  "bounce-in": { initial: { opacity: 0, scale: 0.3 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, type: "spring" } },
};

const SectionWrapper = ({
  children,
  config,
  animation,
}: {
  children: React.ReactNode;
  config: any;
  animation?: string;
}) => {
  const variant = animation && animationVariants[animation];

  if (!variant) {
    return <>{children}</>;
  }

  return (
    <motion.div initial={variant.initial} animate={variant.animate} transition={variant.transition}>
      {children}
    </motion.div>
  );
};

// Renderizadores de Seções
const HeroRenderer = ({ config }: { config: any }) => (
  <section
    className="relative overflow-hidden"
    style={{
      background: config.bgGradient || config.bgColor || "#000000",
      color: config.textColor || "#ffffff",
      paddingTop: `${config.paddingY || 80}px`,
      paddingBottom: `${config.paddingY || 80}px`,
      fontFamily: config.fontFamily || "Inter",
    }}
  >
    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
      {config.badge && (
        <span
          className="inline-block text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border"
          style={{
            borderColor: `${config.accentColor || "#84CC16"}40`,
            color: config.accentColor || "#84CC16",
          }}
        >
          {config.badge}
        </span>
      )}
      <h1
        className="font-black leading-tight mb-6"
        style={{
          fontSize: `${config.headingSize || 48}px`,
          fontWeight: config.headingWeight || 800,
        }}
      >
        {config.headline}
      </h1>
      <p
        className="text-lg opacity-80 max-w-2xl mx-auto mb-8 whitespace-pre-line"
        style={{ fontSize: `${config.subtitleSize || 18}px` }}
      >
        {config.subtitle}
      </p>
      {config.ctaText && (
        <a
          href={config.ctaUrl || "#"}
          className="inline-block px-8 py-4 rounded-lg font-bold text-sm transition-transform hover:scale-105"
          style={{
            background: config.accentColor || "#84CC16",
            color: config.accentTextColor || "#000",
          }}
        >
          {config.ctaText}
        </a>
      )}
    </div>
  </section>
);

const FeaturesRenderer = ({ config }: { config: any }) => (
  <section
    style={{
      background: config.bgColor || "#0A0A0A",
      color: config.textColor || "#fff",
      padding: `${config.paddingY || 60}px 0`,
    }}
  >
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-12">{config.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="p-5 rounded-lg border border-white/10 bg-white/5">
            <span className="text-2xl mb-3 block">{item.icon}</span>
            <h3 className="font-semibold mb-2" style={{ color: config.accentColor || "#84CC16" }}>
              {item.title}
            </h3>
            <p className="text-sm opacity-70">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const PricingRenderer = ({ config }: { config: any }) => (
  <section
    style={{
      background: config.bgColor || "#000000",
      color: config.textColor || "#fff",
      padding: `${config.paddingY || 60}px 0`,
    }}
  >
    <div className="max-w-6xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-12">{config.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {(config.plans || []).map((plan: any, i: number) => (
          <div
            key={i}
            className={`p-8 rounded-lg border transition-all ${
              plan.highlight
                ? "border-2 relative scale-105"
                : "border border-white/10"
            }`}
            style={{
              borderColor: plan.highlight ? config.accentColor || "#84CC16" : "rgba(255,255,255,0.1)",
              background: plan.highlight ? `${config.accentColor || "#84CC16"}15` : "rgba(255,255,255,0.05)",
            }}
          >
            {plan.highlight && (
              <div
                className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                style={{ background: config.accentColor || "#84CC16", color: "#000" }}
              >
                Mais Popular
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="text-4xl font-bold mb-6" style={{ color: config.accentColor || "#84CC16" }}>
              R$ {plan.price}
              <span className="text-lg opacity-70">/mês</span>
            </div>
            <ul className="space-y-3 mb-8">
              {(plan.features || []).map((feature: string, j: number) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <span style={{ color: config.accentColor || "#84CC16" }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <a
              href={plan.ctaUrl || "#"}
              className="block w-full py-3 rounded-lg font-bold text-center transition-all"
              style={{
                background: plan.highlight ? config.accentColor || "#84CC16" : "transparent",
                color: plan.highlight ? "#000" : config.accentColor || "#84CC16",
                border: `2px solid ${config.accentColor || "#84CC16"}`,
              }}
            >
              {plan.ctaText || "Assinar"}
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTARenderer = ({ config }: { config: any }) => (
  <section
    style={{
      background: config.bgGradient || config.bgColor || "#000000",
      color: config.textColor || "#fff",
      padding: `${config.paddingY || 80}px 0`,
    }}
  >
    <div className="max-w-2xl mx-auto px-6 text-center">
      <h2 className="text-4xl font-bold mb-4">{config.headline}</h2>
      <p className="text-lg opacity-80 mb-8">{config.description}</p>
      <a
        href={config.ctaUrl || "#"}
        className="inline-block px-8 py-4 rounded-lg font-bold transition-transform hover:scale-105"
        style={{
          background: config.accentColor || "#84CC16",
          color: config.accentTextColor || "#000",
        }}
      >
        {config.ctaText}
      </a>
    </div>
  </section>
);

const SECTION_RENDERERS: Record<string, any> = {
  hero: HeroRenderer,
  features: FeaturesRenderer,
  pricing: PricingRenderer,
  cta: CTARenderer,
  // Adicionar mais renderers conforme necessário
};

interface PublicPageRendererProps {
  pageData: PageData;
  sections?: Section[];
}

export const PublicPageRenderer = ({ pageData, sections = [] }: PublicPageRendererProps) => {
  // Se a página tem HTML customizado, renderizar como iframe
  if (pageData.html_content) {
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: pageData.html_content,
        }}
      />
    );
  }

  // Renderizar seções em ordem
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <>
      <GlobalStyleInjector />
      <div className="w-full">
        {sortedSections.map((section) => {
          if (!section.is_visible) return null;

          const Renderer = SECTION_RENDERERS[section.section_type];
          if (!Renderer) return null;

          return (
            <SectionWrapper
              key={section.id}
              config={section.config}
              animation={section.config?.animation}
            >
              <Renderer config={section.config} />
            </SectionWrapper>
          );
        })}
      </div>
    </>
  );
};
