import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

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
  pixel_meta_id: string | null;
  pixel_google_id: string | null;
  html_content: string | null;
}

const animations = {
  "fade-in": { initial: { opacity: 0 }, animate: { opacity: 1 } },
  "slide-up": { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
  "scale-in": { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
};

const resolveCTAUrl = (config: any) => {
  const action = config.ctaAction || "link";
  if (action === "whatsapp") {
    const phone = (config.ctaWhatsapp || "").replace(/\D/g, "");
    const msg = encodeURIComponent(config.ctaWhatsappMessage || "Olá!");
    return `https://wa.me/${phone}?text=${msg}`;
  }
  return config.ctaUrl || "#";
};

const CTAButton = ({ config, className = "" }: { config: any; className?: string }) => {
  if (!config.ctaText) return null;
  const url = resolveCTAUrl(config);
  const isExternal = url.startsWith("http");
  return (
    <a href={url} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}
      className={`inline-block px-8 py-4 rounded-lg font-bold text-sm transition-transform hover:scale-105 ${className}`}
      style={{ background: config.accentColor || "#84CC16", color: config.accentTextColor || "#000" }}
      onClick={() => {
        // Fire pixel events on CTA click
        if (typeof window !== "undefined") {
          if ((window as any).fbq) (window as any).fbq("track", "Lead");
          if ((window as any).gtag) (window as any).gtag("event", "generate_lead", { event_category: "CTA" });
        }
      }}>
      {config.ctaText}
    </a>
  );
};

const HeroSection = ({ config }: { config: any }) => (
  <section
    className="relative overflow-hidden"
    style={{
      background: config.bgGradient || config.bgColor || "#000",
      color: config.textColor || "#fff",
      paddingTop: `${config.paddingY || 80}px`,
      paddingBottom: `${config.paddingY || 80}px`,
      fontFamily: config.fontFamily || "Inter",
    }}
  >
    <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
      {config.badge && (
        <span className="inline-block text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border" style={{ borderColor: `${config.accentColor || "#84CC16"}40`, color: config.accentColor || "#84CC16" }}>
          {config.badge}
        </span>
      )}
      <h1 className="font-black leading-tight mb-6" style={{ fontSize: `${config.headingSize || 48}px`, fontWeight: config.headingWeight || 800 }}>
        {config.headline}
      </h1>
      <p className="text-lg opacity-80 max-w-2xl mx-auto mb-8 whitespace-pre-line" style={{ fontSize: `${config.subtitleSize || 18}px` }}>
        {config.subtitle}
      </p>
      <CTAButton config={config} />
    </div>
  </section>
);

const FeaturesSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#0A0A0A", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-12">{config.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="p-5 rounded-lg border border-white/10 bg-white/5">
            <span className="text-2xl mb-3 block">{item.icon}</span>
            <h3 className="font-semibold mb-2" style={{ color: config.accentColor || "#84CC16" }}>{item.title}</h3>
            <p className="text-sm opacity-70">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const BenefitsSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#0A0A0A", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-4">{config.title}</h2>
      {config.subtitle && <p className="text-center opacity-70 mb-10">{config.subtitle}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="flex gap-3 p-4 rounded-lg border border-white/10 bg-white/5">
            <span className="text-xl shrink-0">{item.icon}</span>
            <div>
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs opacity-70">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TestimonialsSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#000", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-10">{config.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(config.items || []).map((item: any, i: number) => (
          <div key={i} className="p-5 rounded-lg border border-white/10 bg-white/5">
            <p className="text-sm italic opacity-80 mb-4">"{item.text}"</p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: config.accentColor || "#84CC16", color: "#000" }}>
                {item.name?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs opacity-60">{item.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const PricingSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#000", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="relative z-10 max-w-5xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-2">{config.title}</h2>
      {config.subtitle && <p className="text-center opacity-70 mb-10">{config.subtitle}</p>}
      <div className={`grid grid-cols-1 ${(config.plans || []).length > 1 ? "md:grid-cols-2" : ""} ${(config.plans || []).length > 2 ? "lg:grid-cols-3" : ""} gap-6 max-w-4xl mx-auto`}>
        {(config.plans || []).map((plan: any, i: number) => (
          <div key={i} className={`p-6 rounded-xl border ${plan.highlight ? "border-2" : "border-white/10"} bg-white/5 flex flex-col`} style={plan.highlight ? { borderColor: config.accentColor || "#84CC16" } : {}}>
            {plan.highlight && <span className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: config.accentColor || "#84CC16" }}>Mais Popular</span>}
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-4xl font-black my-4">R${plan.price}<span className="text-sm font-normal opacity-60">/mês</span></p>
            <ul className="space-y-2 mb-6 flex-1">
              {(plan.features || []).map((f: string, j: number) => (
                <li key={j} className="text-sm flex items-center gap-2"><span style={{ color: config.accentColor || "#84CC16" }}>✓</span> {f}</li>
              ))}
            </ul>
            <a href={plan.ctaUrl || "#"} className="block text-center py-3 rounded-lg font-semibold text-sm transition-transform hover:scale-105" style={plan.highlight ? { background: config.accentColor || "#84CC16", color: "#000" } : { border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}>
              {plan.ctaText}
            </a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FAQSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#000", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="max-w-3xl mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-10">{config.title}</h2>
      <div className="space-y-4">
        {(config.items || []).map((item: any, i: number) => (
          <details key={i} className="group border border-white/10 rounded-lg overflow-hidden">
            <summary className="p-4 cursor-pointer font-semibold text-sm flex items-center justify-between hover:bg-white/5">
              {item.question}
              <span className="text-lg group-open:rotate-45 transition-transform">+</span>
            </summary>
            <div className="px-4 pb-4 text-sm opacity-70">{item.answer}</div>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const CTASectionBlock = ({ config }: { config: any }) => (
  <section style={{ background: config.bgGradient || config.bgColor || "#000", color: config.textColor || "#fff", padding: `${config.paddingY || 80}px 0` }}>
    <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
      <h2 className="text-3xl font-bold mb-4">{config.headline}</h2>
      <p className="opacity-80 mb-8">{config.description}</p>
      <CTAButton config={config} />
    </div>
  </section>
);

const ContactFormSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#000", color: config.textColor || "#fff", padding: `${config.paddingY || 60}px 0` }}>
    <div className="relative z-10 max-w-md mx-auto px-6 text-center">
      <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
      {config.subtitle && <p className="text-sm opacity-70 mb-6">{config.subtitle}</p>}
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        {(config.fields || ["name", "email"]).map((f: string) => (
          <input key={f} type={f === "email" ? "email" : "text"} placeholder={f === "name" ? "Seu nome" : f === "email" ? "Seu email" : "Seu telefone"} className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-sm placeholder:opacity-50 focus:outline-none" style={{ borderColor: `${config.accentColor || "#84CC16"}50` }} />
        ))}
        <button type="submit" className="w-full py-3 rounded-lg font-bold text-sm" style={{ background: config.accentColor || "#84CC16", color: "#000" }}>
          {config.ctaText || "Enviar"}
        </button>
      </form>
    </div>
  </section>
);

const CustomHTMLSection = ({ config }: { config: any }) => (
  <section style={{ background: config.bgColor || "#0a0a0a", padding: `${config.paddingY || 40}px 0` }}>
    <div className="max-w-3xl mx-auto px-6 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: config.html || "" }} />
  </section>
);

const sectionRenderers: Record<string, React.FC<{ config: any }>> = {
  hero: HeroSection,
  features: FeaturesSection,
  benefits: BenefitsSection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  faq: FAQSection,
  cta: CTASectionBlock,
  contact_form: ContactFormSection,
  custom_html: CustomHTMLSection,
};

const FullHTMLPage = ({ html, page }: { html: string; page: PageData }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (page.meta_title) document.title = page.meta_title;
    else document.title = page.title;

    // Inject pixel tracking
    const metaDesc = document.querySelector('meta[name="description"]');
    if (page.meta_description) {
      if (metaDesc) metaDesc.setAttribute("content", page.meta_description);
      else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = page.meta_description;
        document.head.appendChild(meta);
      }
    }
  }, [page]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Inject pixels into iframe
          if (page.pixel_meta_id) {
            const script = iframeDoc.createElement("script");
            script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${page.pixel_meta_id}');fbq('track','PageView');`;
            iframeDoc.head.appendChild(script);
          }
          if (page.pixel_google_id) {
            const script = iframeDoc.createElement("script");
            script.src = `https://www.googletagmanager.com/gtag/js?id=${page.pixel_google_id}`;
            script.async = true;
            iframeDoc.head.appendChild(script);
            const script2 = iframeDoc.createElement("script");
            script2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${page.pixel_google_id}');`;
            iframeDoc.head.appendChild(script2);
          }
        }
      } catch {}
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [page]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      title={page.title}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        margin: 0,
        padding: 0,
      }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  );
};

const LandingPagePublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      const { data: pageData } = await supabase.from("landing_pages").select("*").eq("slug", slug).maybeSingle();
      if (!pageData) { setNotFound(true); setLoading(false); return; }

      setPage(pageData as any);

      if (!(pageData as any).html_content) {
        const { data: sectionData } = await supabase.from("landing_page_sections").select("*").eq("page_id", pageData.id).order("order", { ascending: true });
        setSections((sectionData || []).filter((s: any) => s.is_visible !== false) as Section[]);
      }

      // Track page view
      const visitorId = localStorage.getItem("_vid") || Math.random().toString(36).substring(2);
      localStorage.setItem("_vid", visitorId);
      const params = new URLSearchParams(window.location.search);
      await supabase.from("page_views").insert({
        page_id: pageData.id,
        visitor_id: visitorId,
        utm_source: params.get("utm_source") || null,
        utm_medium: params.get("utm_medium") || null,
        utm_campaign: params.get("utm_campaign") || null,
      });

      // Set meta tags
      if (pageData.meta_title) document.title = pageData.meta_title;
      else document.title = pageData.title;

      // Inject Meta Pixel directly on the page (section-based pages)
      if (!(pageData as any).html_content) {
        if (pageData.pixel_meta_id) {
          const existing = document.getElementById("fb-pixel-script");
          if (!existing) {
            const script = document.createElement("script");
            script.id = "fb-pixel-script";
            script.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pageData.pixel_meta_id}');fbq('track','PageView');`;
            document.head.appendChild(script);
            const noscript = document.createElement("noscript");
            noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pageData.pixel_meta_id}&ev=PageView&noscript=1"/>`;
            document.body.appendChild(noscript);
          }
        }
        if (pageData.pixel_google_id) {
          const existing = document.getElementById("gtag-script");
          if (!existing) {
            const script = document.createElement("script");
            script.id = "gtag-script";
            script.src = `https://www.googletagmanager.com/gtag/js?id=${pageData.pixel_google_id}`;
            script.async = true;
            document.head.appendChild(script);
            const script2 = document.createElement("script");
            script2.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${pageData.pixel_google_id}');`;
            document.head.appendChild(script2);
          }
        }
      }

      setLoading(false);
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground mb-6">Página não encontrada</p>
          <a href="/" className="text-primary hover:underline">Voltar ao início</a>
        </div>
      </div>
    );
  }

  // Full HTML page - render via dedicated component
  if (page.html_content) {
    return <FullHTMLPage html={page.html_content} page={page} />;
  }

  // Section-based rendering
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      {sections.map((section, i) => {
        const Renderer = sectionRenderers[section.section_type];
        if (!Renderer) return null;
        const anim = animations[(section.config as any)?.animation as keyof typeof animations] || animations["fade-in"];
        return (
          <motion.div key={section.id} {...anim} transition={{ duration: 0.6, delay: i * 0.1 }}>
            <Renderer config={section.config} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default LandingPagePublic;
