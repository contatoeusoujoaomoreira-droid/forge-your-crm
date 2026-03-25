import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore
import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Save, ExternalLink, Monitor, Tablet,
  Smartphone, Code, Undo2, Redo2, Download, Upload, Layers,
  Paintbrush, LayoutGrid, Link2, Eye, EyeOff, X,
  ChevronDown, ChevronUp, Globe, Search, Tag,
} from "lucide-react";

interface Props {
  pageId: string;
  onBack: () => void;
}

function parseFullHtml(htmlContent: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const styles: string[] = [];
  doc.querySelectorAll("style").forEach((s) => { styles.push(s.textContent || ""); s.remove(); });
  const links: string[] = [];
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => { links.push((l as HTMLLinkElement).href); });
  const fontLinks: string[] = [];
  doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((l) => { fontLinks.push((l as HTMLLinkElement).href); });
  const scripts: string[] = [];
  doc.querySelectorAll("script[src]").forEach((s) => { scripts.push((s as HTMLScriptElement).src); });
  const inlineScripts: string[] = [];
  doc.querySelectorAll("script:not([src])").forEach((s) => { if (s.textContent) inlineScripts.push(s.textContent); });
  const bodyHtml = doc.body?.innerHTML || htmlContent;
  return { bodyHtml, css: styles.join("\n"), links: [...links, ...fontLinks], scripts, inlineScripts };
}

const GrapesEditor = ({ pageId, onBack }: Props) => {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [codeContent, setCodeContent] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pixelMeta, setPixelMeta] = useState("");
  const [pixelGoogle, setPixelGoogle] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [activeDevice, setActiveDevice] = useState("desktop");
  const [activePanel, setActivePanel] = useState<string | null>("blocks");
  const [originalHeadContent, setOriginalHeadContent] = useState("");
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("landing_pages").select("*").eq("id", pageId).single();
      if (data) {
        setTitle(data.title);
        setSlug(data.slug);
        setCustomDomain((data as any).custom_domain || "");
        setMetaTitle(data.meta_title || "");
        setMetaDescription(data.meta_description || "");
        setPixelMeta(data.pixel_meta_id || "");
        setPixelGoogle(data.pixel_google_id || "");
        setIsPublished(data.is_published);
        if (containerRef.current && !editorRef.current) {
          initEditor((data as any).html_content || "");
        }
      }
    };
    load();
    return () => { if (editorRef.current) { editorRef.current.destroy(); editorRef.current = null; } };
  }, [pageId]);

  const initEditor = (htmlContent: string) => {
    const parsed = parseFullHtml(htmlContent);
    if (htmlContent.includes("<head")) {
      const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (headMatch) setOriginalHeadContent(headMatch[1]);
    }

    const canvasStyles = [
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap",
      ...parsed.links,
    ];

    const editor = grapesjs.init({
      container: containerRef.current!,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      undoManager: { maximumStackLength: 50 },
      canvas: { styles: canvasStyles, scripts: parsed.scripts },
      plugins: [grapesjsBlocksBasic],
      pluginsOpts: {
        [grapesjsBlocksBasic as any]: { flexGrid: true },
      },
      blockManager: { appendTo: "#gjs-blocks" },
      layerManager: { appendTo: "#gjs-layers" },
      traitManager: { appendTo: "#gjs-traits" },
      styleManager: {
        appendTo: "#gjs-styles",
        sectors: [
          {
            name: "Layout",
            open: true,
            buildProps: ["display", "flex-direction", "flex-wrap", "justify-content", "align-items", "align-content", "gap", "order", "flex-basis", "flex-grow", "flex-shrink", "align-self"],
          },
          {
            name: "Dimensão",
            open: false,
            buildProps: ["width", "min-width", "max-width", "height", "min-height", "max-height", "padding", "margin"],
          },
          {
            name: "Tipografia",
            open: false,
            buildProps: ["font-family", "font-size", "font-weight", "letter-spacing", "color", "line-height", "text-align", "text-decoration", "text-transform", "text-shadow"],
            properties: [
              {
                name: "Fonte",
                property: "font-family",
                type: "select",
                defaults: "Inter, sans-serif",
                options: [
                  { id: "inter", value: "Inter, sans-serif", name: "Inter" },
                  { id: "jakarta", value: "'Plus Jakarta Sans', sans-serif", name: "Plus Jakarta Sans" },
                  { id: "poppins", value: "Poppins, sans-serif", name: "Poppins" },
                  { id: "montserrat", value: "Montserrat, sans-serif", name: "Montserrat" },
                  { id: "space-grotesk", value: "'Space Grotesk', sans-serif", name: "Space Grotesk" },
                  { id: "dm-sans", value: "'DM Sans', sans-serif", name: "DM Sans" },
                  { id: "georgia", value: "Georgia, serif", name: "Georgia" },
                  { id: "arial", value: "Arial, sans-serif", name: "Arial" },
                  { id: "monospace", value: "monospace", name: "Monospace" },
                ],
              },
            ],
          },
          {
            name: "Fundo & Bordas",
            open: false,
            buildProps: ["background-color", "background", "background-image", "border-radius", "border", "box-shadow", "opacity"],
          },
          {
            name: "Animação",
            open: false,
            buildProps: ["transition", "transform"],
            properties: [
              {
                name: "Transição",
                property: "transition",
                type: "composite",
                properties: [
                  { name: "Propriedade", property: "transition-property", type: "select", defaults: "all", options: [{ id: "all", value: "all", name: "Todas" }, { id: "transform", value: "transform", name: "Transform" }, { id: "opacity", value: "opacity", name: "Opacity" }, { id: "background", value: "background", name: "Background" }] },
                  { name: "Duração", property: "transition-duration", type: "text", defaults: "0.3s" },
                  { name: "Easing", property: "transition-timing-function", type: "select", defaults: "ease", options: [{ id: "ease", value: "ease", name: "Ease" }, { id: "ease-in-out", value: "ease-in-out", name: "Ease In Out" }, { id: "suave", value: "cubic-bezier(0.4,0,0.2,1)", name: "Suave" }] },
                ],
              },
            ],
          },
          {
            name: "Posição",
            open: false,
            buildProps: ["position", "top", "right", "bottom", "left", "z-index", "overflow", "cursor"],
          },
        ],
      },
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet", width: "768px", widthMedia: "992px" },
          { name: "Mobile", width: "375px", widthMedia: "480px" },
        ],
      },
    });

    // Link traits
    editor.DomComponents.addType("link", {
      isComponent: (el) => el.tagName === "A",
      model: {
        defaults: {
          traits: [
            { type: "text", name: "href", label: "URL / Link", placeholder: "https://... ou https://wa.me/55..." },
            { type: "select", name: "target", label: "Abrir em", options: [{ id: "same", value: "", name: "Mesma aba" }, { id: "blank", value: "_blank", name: "Nova aba" }] },
            { type: "text", name: "title", label: "Título" },
            { type: "select", name: "data-action", label: "Ação", options: [
              { id: "none", value: "", name: "Nenhuma" },
              { id: "whatsapp", value: "whatsapp", name: "WhatsApp" },
              { id: "phone", value: "phone", name: "Ligar" },
              { id: "email", value: "email", name: "Email" },
              { id: "scroll", value: "scroll", name: "Scroll p/ seção" },
            ]},
          ],
        },
      },
    });

    editor.DomComponents.addType("button", {
      isComponent: (el) => el.tagName === "BUTTON",
      model: {
        defaults: {
          traits: [
            { type: "text", name: "data-href", label: "Link destino" },
            { type: "select", name: "data-action", label: "Ação", options: [
              { id: "none", value: "", name: "Nenhuma" },
              { id: "whatsapp", value: "whatsapp", name: "WhatsApp" },
              { id: "phone", value: "phone", name: "Ligar" },
              { id: "email", value: "email", name: "Email" },
              { id: "submit", value: "submit", name: "Enviar form" },
            ]},
          ],
        },
      },
    });

    // === BLOCKS ===
    const bm = editor.Blocks;

    bm.add("section-hero", {
      label: "Hero",
      category: "Seções",
      content: `<section style="padding:100px 20px;text-align:center;background:linear-gradient(135deg,#050505 0%,#0a0a0a 50%,#050505 100%);color:#e5e5e5;min-height:600px;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at center,rgba(132,204,22,0.04) 0%,transparent 70%);pointer-events:none;"></div>
        <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 18px;border-radius:100px;background:rgba(132,204,22,0.08);border:1px solid rgba(132,204,22,0.2);color:#84CC16;font-size:13px;font-weight:600;letter-spacing:0.02em;margin-bottom:32px;">🔥 Oferta Exclusiva</span>
        <h1 style="font-size:clamp(2.8rem,6vw,4.5rem);font-weight:800;margin:0 0 20px;max-width:860px;line-height:1.05;letter-spacing:-0.04em;">Título Principal da <span style="background:linear-gradient(135deg,#84CC16,#a3e635);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Sua Página</span></h1>
        <p style="font-size:clamp(1rem,2vw,1.2rem);color:#a3a3a3;margin:0 0 48px;max-width:600px;line-height:1.6;">Subtítulo com a proposta de valor clara e objetiva do seu produto ou serviço.</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
          <a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:16px 32px;background:#84CC16;color:#000000;font-weight:700;border-radius:10px;text-decoration:none;font-size:0.95rem;transition:all 0.25s;">Começar Agora →</a>
          <a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:16px 32px;background:#111111;color:#e5e5e5;border:1px solid #262626;border-radius:10px;text-decoration:none;font-size:0.95rem;font-weight:600;transition:all 0.25s;">Saiba Mais</a>
        </div>
      </section>`,
    });

    bm.add("section-features", {
      label: "Features Bento",
      category: "Seções",
      content: `<section style="padding:100px 20px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="max-width:1200px;margin:0 auto;">
          <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#84CC16;margin:0 0 16px;text-align:center;">RECURSOS</p>
          <h2 style="text-align:center;font-size:clamp(2rem,3.5vw,3rem);font-weight:800;letter-spacing:-0.04em;margin:0 0 16px;">Tudo que você precisa</h2>
          <p style="text-align:center;color:#a3a3a3;max-width:540px;margin:0 auto 60px;font-size:1.05rem;">Uma plataforma completa para escalar seu negócio</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:36px 32px;transition:all 0.3s;grid-column:span 2;">
              <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;background:rgba(132,204,22,0.1);border:1px solid rgba(132,204,22,0.2);">📊</div>
              <h3 style="font-weight:700;font-size:1.1rem;margin:0 0 10px;letter-spacing:-0.02em;">Analytics Avançado</h3>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0;">Acompanhe todas as métricas do seu negócio em tempo real.</p>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:36px 32px;transition:all 0.3s;">
              <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;background:#0a0a0a;border:1px solid #1e1e1e;">⚡</div>
              <h3 style="font-weight:700;font-size:1.1rem;margin:0 0 10px;letter-spacing:-0.02em;">Automação</h3>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0;">Automatize processos e economize tempo.</p>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:36px 32px;transition:all 0.3s;">
              <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;background:#0a0a0a;border:1px solid #1e1e1e;">🎯</div>
              <h3 style="font-weight:700;font-size:1.1rem;margin:0 0 10px;letter-spacing:-0.02em;">Segmentação</h3>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0;">Segmente seu público com precisão.</p>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:36px 32px;transition:all 0.3s;grid-column:span 2;">
              <div style="width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;background:#0a0a0a;border:1px solid #1e1e1e;">🚀</div>
              <h3 style="font-weight:700;font-size:1.1rem;margin:0 0 10px;letter-spacing:-0.02em;">Performance</h3>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0;">Otimize cada aspecto do seu funil de vendas.</p>
            </div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-testimonials", {
      label: "Depoimentos",
      category: "Seções",
      content: `<section style="padding:100px 20px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="max-width:1200px;margin:0 auto;">
          <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#84CC16;margin:0 0 16px;text-align:center;">DEPOIMENTOS</p>
          <h2 style="text-align:center;font-size:clamp(2rem,3.5vw,3rem);font-weight:800;letter-spacing:-0.04em;margin:0 0 60px;">O que nossos clientes dizem</h2>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:16px;padding:28px;transition:all 0.3s;">
              <div style="font-size:2rem;color:#84CC16;line-height:1;margin-bottom:12px;opacity:0.5;">"</div>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0 0 20px;">Resultado incrível, superou todas as minhas expectativas.</p>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#84CC16,#65a30d);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:#000;">M</div>
                <div><p style="font-weight:700;font-size:0.9rem;margin:0;">Maria Silva</p><p style="color:#737373;font-size:0.75rem;margin:0;">CEO, Empresa</p></div>
              </div>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:16px;padding:28px;transition:all 0.3s;">
              <div style="font-size:2rem;color:#84CC16;line-height:1;margin-bottom:12px;opacity:0.5;">"</div>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0 0 20px;">A melhor decisão que tomei para meu negócio.</p>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#a3e635,#84CC16);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:#000;">J</div>
                <div><p style="font-weight:700;font-size:0.9rem;margin:0;">João Santos</p><p style="color:#737373;font-size:0.75rem;margin:0;">Diretor</p></div>
              </div>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:16px;padding:28px;transition:all 0.3s;">
              <div style="font-size:2rem;color:#84CC16;line-height:1;margin-bottom:12px;opacity:0.5;">"</div>
              <p style="color:#a3a3a3;font-size:0.9rem;line-height:1.7;margin:0 0 20px;">Plataforma intuitiva e com resultados comprovados.</p>
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#65a30d,#84CC16);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.85rem;color:#000;">A</div>
                <div><p style="font-weight:700;font-size:0.9rem;margin:0;">Ana Costa</p><p style="color:#737373;font-size:0.75rem;margin:0;">Empreendedora</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-pricing", {
      label: "Preços",
      category: "Seções",
      content: `<section style="padding:100px 20px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="max-width:1000px;margin:0 auto;">
          <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#84CC16;margin:0 0 16px;text-align:center;">PREÇOS</p>
          <h2 style="text-align:center;font-size:clamp(2rem,3.5vw,3rem);font-weight:800;letter-spacing:-0.04em;margin:0 0 60px;">Escolha seu plano</h2>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:40px 32px;text-align:left;transition:all 0.3s;">
              <p style="font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#737373;margin:0 0 12px;">BÁSICO</p>
              <p style="font-size:2.8rem;font-weight:800;letter-spacing:-0.04em;line-height:1;margin:0 0 4px;">R$49</p>
              <p style="color:#737373;font-size:0.8rem;margin:0 0 24px;">/mês</p>
              <a href="#" style="display:block;width:100%;padding:14px;border-radius:10px;font-weight:700;font-size:0.95rem;text-align:center;text-decoration:none;border:1px solid #262626;color:#e5e5e5;background:transparent;margin-bottom:28px;transition:all 0.25s;">Começar</a>
              <ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Feature 1</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Feature 2</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:0.875rem;color:#a3a3a3;">✓ Feature 3</li></ul>
            </div>
            <div style="background:linear-gradient(135deg,#111111 0%,rgba(132,204,22,0.04) 100%);border:1px solid rgba(132,204,22,0.3);border-radius:20px;padding:40px 32px;text-align:left;position:relative;transition:all 0.3s;">
              <span style="position:absolute;top:-1px;left:50%;transform:translateX(-50%);background:#84CC16;color:#000;font-size:0.65rem;font-weight:800;padding:4px 16px;border-radius:0 0 8px 8px;letter-spacing:0.1em;">POPULAR</span>
              <p style="font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#737373;margin:12px 0 12px;">PRO</p>
              <p style="font-size:2.8rem;font-weight:800;letter-spacing:-0.04em;line-height:1;margin:0 0 4px;">R$99</p>
              <p style="color:#737373;font-size:0.8rem;margin:0 0 24px;">/mês</p>
              <a href="#" style="display:block;width:100%;padding:14px;border-radius:10px;font-weight:700;font-size:0.95rem;text-align:center;text-decoration:none;background:#84CC16;color:#000;margin-bottom:28px;border:none;transition:all 0.25s;">Começar</a>
              <ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Tudo do Básico</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Feature Pro 1</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:0.875rem;color:#a3a3a3;">✓ Feature Pro 2</li></ul>
            </div>
            <div style="background:#111111;border:1px solid #1e1e1e;border-radius:20px;padding:40px 32px;text-align:left;transition:all 0.3s;">
              <p style="font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#737373;margin:0 0 12px;">ENTERPRISE</p>
              <p style="font-size:2.8rem;font-weight:800;letter-spacing:-0.04em;line-height:1;margin:0 0 4px;">R$199</p>
              <p style="color:#737373;font-size:0.8rem;margin:0 0 24px;">/mês</p>
              <a href="#" style="display:block;width:100%;padding:14px;border-radius:10px;font-weight:700;font-size:0.95rem;text-align:center;text-decoration:none;border:1px solid #262626;color:#e5e5e5;background:transparent;margin-bottom:28px;transition:all 0.25s;">Começar</a>
              <ul style="list-style:none;padding:0;margin:0;"><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Tudo do Pro</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:0.875rem;color:#a3a3a3;">✓ Suporte Priority</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:0.875rem;color:#a3a3a3;">✓ SLA dedicado</li></ul>
            </div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-cta", {
      label: "CTA Final",
      category: "Seções",
      content: `<section style="padding:100px 20px;background:#0a0a0a;text-align:center;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="background:rgba(132,204,22,0.03);border:1px solid rgba(132,204,22,0.15);border-radius:24px;padding:80px 60px;max-width:800px;margin:0 auto;">
          <h2 style="font-size:clamp(2rem,4vw,3.2rem);font-weight:800;letter-spacing:-0.04em;margin:0 0 16px;color:#e5e5e5;">Pronto para <span style="color:#84CC16;">começar?</span></h2>
          <p style="color:#a3a3a3;margin:0 0 40px;font-size:1.05rem;">Junte-se a milhares de profissionais que já transformaram seus negócios.</p>
          <a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:16px 40px;background:#84CC16;color:#000;font-weight:700;border-radius:10px;text-decoration:none;font-size:0.95rem;transition:all 0.25s;">Começar Agora →</a>
        </div>
      </section>`,
    });

    bm.add("section-faq", {
      label: "FAQ",
      category: "Seções",
      content: `<section style="padding:100px 20px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="max-width:700px;margin:0 auto;">
          <p style="font-size:0.75rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#84CC16;margin:0 0 16px;text-align:center;">FAQ</p>
          <h2 style="text-align:center;font-size:clamp(2rem,3.5vw,3rem);font-weight:800;letter-spacing:-0.04em;margin:0 0 48px;">Perguntas Frequentes</h2>
          <div style="border-top:1px solid #1e1e1e;">
            <div style="padding:24px 0;border-bottom:1px solid #1e1e1e;"><h4 style="font-size:16px;font-weight:600;margin:0 0 10px;cursor:pointer;">Pergunta frequente 1?</h4><p style="font-size:14px;color:#a3a3a3;margin:0;line-height:1.6;">Resposta detalhada e clara para a pergunta.</p></div>
            <div style="padding:24px 0;border-bottom:1px solid #1e1e1e;"><h4 style="font-size:16px;font-weight:600;margin:0 0 10px;cursor:pointer;">Pergunta frequente 2?</h4><p style="font-size:14px;color:#a3a3a3;margin:0;line-height:1.6;">Resposta detalhada e clara para a pergunta.</p></div>
            <div style="padding:24px 0;border-bottom:1px solid #1e1e1e;"><h4 style="font-size:16px;font-weight:600;margin:0 0 10px;cursor:pointer;">Pergunta frequente 3?</h4><p style="font-size:14px;color:#a3a3a3;margin:0;line-height:1.6;">Resposta detalhada e clara para a pergunta.</p></div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-form", {
      label: "Formulário",
      category: "Seções",
      content: `<section style="padding:80px 20px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="max-width:480px;margin:0 auto;">
          <h2 style="text-align:center;font-size:28px;font-weight:700;margin:0 0 12px;">Entre em Contato</h2>
          <p style="text-align:center;font-size:14px;color:#a3a3a3;margin:0 0 36px;">Preencha o formulário abaixo</p>
          <form style="display:flex;flex-direction:column;gap:14px;">
            <input type="text" placeholder="Seu nome" style="padding:14px 18px;background:#111111;border:1px solid #1e1e1e;border-radius:10px;color:#e5e5e5;font-size:14px;outline:none;" />
            <input type="email" placeholder="Seu email" style="padding:14px 18px;background:#111111;border:1px solid #1e1e1e;border-radius:10px;color:#e5e5e5;font-size:14px;outline:none;" />
            <input type="tel" placeholder="WhatsApp" style="padding:14px 18px;background:#111111;border:1px solid #1e1e1e;border-radius:10px;color:#e5e5e5;font-size:14px;outline:none;" />
            <button type="submit" style="padding:16px;background:#84CC16;color:#000;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-size:16px;transition:all 0.3s;">Enviar →</button>
          </form>
        </div>
      </section>`,
    });

    bm.add("section-footer", {
      label: "Footer",
      category: "Seções",
      content: `<footer style="padding:48px 20px 24px;background:#050505;color:#e5e5e5;font-family:'Plus Jakarta Sans',sans-serif;border-top:1px solid #1e1e1e;">
        <div style="max-width:1000px;margin:0 auto;">
          <div style="display:flex;justify-content:center;gap:28px;margin-bottom:32px;">
            <a href="#" style="color:#84CC16;text-decoration:none;font-size:14px;font-weight:500;">Início</a>
            <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:14px;">Recursos</a>
            <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:14px;">Preços</a>
            <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:14px;">Contato</a>
          </div>
          <div style="width:100%;height:1px;background:#1e1e1e;margin-bottom:24px;"></div>
          <p style="font-size:12px;color:#737373;margin:0;text-align:center;">© 2026 Sua Empresa. Todos os direitos reservados.</p>
        </div>
      </footer>`,
    });

    // Elements
    bm.add("stats-bar", {
      label: "Estatísticas",
      category: "Elementos",
      content: `<div style="display:grid;grid-template-columns:repeat(4,1fr);background:#111111;border:1px solid #1e1e1e;border-radius:20px;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="padding:40px 32px;border-right:1px solid #1e1e1e;text-align:center;"><p style="font-size:2.5rem;font-weight:800;letter-spacing:-0.04em;color:#84CC16;line-height:1;margin:0 0 8px;">10K+</p><p style="color:#a3a3a3;font-size:0.85rem;margin:0;">Usuários</p></div>
        <div style="padding:40px 32px;border-right:1px solid #1e1e1e;text-align:center;"><p style="font-size:2.5rem;font-weight:800;letter-spacing:-0.04em;color:#84CC16;line-height:1;margin:0 0 8px;">98%</p><p style="color:#a3a3a3;font-size:0.85rem;margin:0;">Satisfação</p></div>
        <div style="padding:40px 32px;border-right:1px solid #1e1e1e;text-align:center;"><p style="font-size:2.5rem;font-weight:800;letter-spacing:-0.04em;color:#84CC16;line-height:1;margin:0 0 8px;">24/7</p><p style="color:#a3a3a3;font-size:0.85rem;margin:0;">Suporte</p></div>
        <div style="padding:40px 32px;text-align:center;"><p style="font-size:2.5rem;font-weight:800;letter-spacing:-0.04em;color:#84CC16;line-height:1;margin:0 0 8px;">5★</p><p style="color:#a3a3a3;font-size:0.85rem;margin:0;">Avaliação</p></div>
      </div>`,
    });

    bm.add("button-cta", {
      label: "Botão CTA",
      category: "Elementos",
      content: `<div style="text-align:center;padding:20px;"><a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:16px 40px;background:#84CC16;color:#000;font-weight:700;border-radius:10px;text-decoration:none;font-size:0.95rem;transition:all 0.25s;font-family:'Plus Jakarta Sans',sans-serif;">Clique Aqui →</a></div>`,
    });

    bm.add("button-whatsapp", {
      label: "Botão WhatsApp",
      category: "Elementos",
      content: `<div style="text-align:center;padding:20px;"><a href="https://wa.me/5511999999999?text=Olá!" target="_blank" style="display:inline-flex;align-items:center;gap:10px;padding:16px 36px;background:#25D366;color:white;font-weight:700;border-radius:12px;text-decoration:none;font-size:16px;transition:all 0.3s;box-shadow:0 4px 15px rgba(37,211,102,0.3);font-family:'Plus Jakarta Sans',sans-serif;">💬 Falar no WhatsApp</a></div>`,
    });

    bm.add("button-outline", {
      label: "Botão Outline",
      category: "Elementos",
      content: `<div style="text-align:center;padding:20px;"><a href="#" style="display:inline-flex;align-items:center;gap:8px;padding:14px 36px;background:transparent;color:#84CC16;font-weight:600;border-radius:10px;text-decoration:none;font-size:15px;border:1px solid rgba(132,204,22,0.3);transition:all 0.3s;font-family:'Plus Jakarta Sans',sans-serif;">Ver Mais ↗</a></div>`,
    });

    bm.add("video-embed", {
      label: "Vídeo YouTube",
      category: "Elementos",
      content: `<div style="max-width:800px;margin:0 auto;padding:20px;"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:16px;border:1px solid #1e1e1e;"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div></div>`,
    });

    bm.add("image-full", {
      label: "Imagem",
      category: "Elementos",
      content: `<div style="padding:20px;"><img src="https://placehold.co/1200x600/111111/84CC16?text=Sua+Imagem" alt="Imagem" style="width:100%;height:auto;border-radius:16px;display:block;border:1px solid #1e1e1e;" /></div>`,
    });

    bm.add("social-proof", {
      label: "Prova Social",
      category: "Elementos",
      content: `<div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:20px;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="display:flex;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#84CC16,#65a30d);border:2px solid #050505;"></div>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#a3e635,#84CC16);border:2px solid #050505;margin-left:-10px;"></div>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#65a30d,#84CC16);border:2px solid #050505;margin-left:-10px;"></div>
        </div>
        <div><p style="font-size:14px;font-weight:600;color:#e5e5e5;margin:0;">+2.500 clientes</p><p style="font-size:11px;color:#737373;margin:0;">já usam nossa plataforma</p></div>
      </div>`,
    });

    bm.add("integrations-chips", {
      label: "Integrações",
      category: "Elementos",
      content: `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:40px 20px;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="display:flex;align-items:center;gap:8px;background:#111111;border:1px solid #1e1e1e;padding:10px 20px;border-radius:100px;font-size:0.85rem;font-weight:500;color:#a3a3a3;"><span style="width:8px;height:8px;border-radius:50%;background:#84CC16;"></span>Stripe</div>
        <div style="display:flex;align-items:center;gap:8px;background:#111111;border:1px solid #1e1e1e;padding:10px 20px;border-radius:100px;font-size:0.85rem;font-weight:500;color:#a3a3a3;"><span style="width:8px;height:8px;border-radius:50%;background:#84CC16;"></span>Hotmart</div>
        <div style="display:flex;align-items:center;gap:8px;background:#111111;border:1px solid #1e1e1e;padding:10px 20px;border-radius:100px;font-size:0.85rem;font-weight:500;color:#a3a3a3;"><span style="width:8px;height:8px;border-radius:50%;background:#84CC16;"></span>Google Ads</div>
        <div style="display:flex;align-items:center;gap:8px;background:#111111;border:1px solid #1e1e1e;padding:10px 20px;border-radius:100px;font-size:0.85rem;font-weight:500;color:#a3a3a3;"><span style="width:8px;height:8px;border-radius:50%;background:#84CC16;"></span>Meta Ads</div>
        <div style="display:flex;align-items:center;gap:8px;background:#111111;border:1px solid #1e1e1e;padding:10px 20px;border-radius:100px;font-size:0.85rem;font-weight:500;color:#a3a3a3;"><span style="width:8px;height:8px;border-radius:50%;background:#84CC16;"></span>WhatsApp</div>
      </div>`,
    });

    bm.add("divider", { label: "Divisor", category: "Elementos", content: `<hr style="border:none;height:1px;background:linear-gradient(90deg,transparent,#84CC16,transparent);margin:40px auto;max-width:600px;" />` });
    bm.add("spacer", { label: "Espaçador", category: "Elementos", content: `<div style="height:60px;"></div>` });

    bm.add("gradient-heading", {
      label: "Título Gradiente",
      category: "Elementos",
      content: `<h2 style="font-size:48px;font-weight:800;color:#84CC16;text-align:center;margin:0;padding:20px;letter-spacing:-0.04em;font-family:'Plus Jakarta Sans',sans-serif;">Texto Destaque</h2>`,
    });

    bm.add("nav-bar", {
      label: "Navbar",
      category: "Seções",
      content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:20px 5%;background:rgba(5,5,5,0.7);backdrop-filter:blur(24px);border-bottom:1px solid #1e1e1e;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="font-weight:800;font-size:1.4rem;letter-spacing:-0.04em;color:#e5e5e5;">Sua<span style="color:#84CC16;">Marca</span></div>
        <div style="display:flex;gap:2rem;">
          <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:0.9rem;font-weight:500;">Recursos</a>
          <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:0.9rem;font-weight:500;">Preços</a>
          <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:0.9rem;font-weight:500;">Contato</a>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <a href="#" style="color:#a3a3a3;text-decoration:none;font-size:0.9rem;font-weight:500;padding:8px 16px;border-radius:8px;border:1px solid #262626;">Login</a>
          <a href="#" style="background:#84CC16;color:#000;padding:10px 22px;border-radius:8px;font-weight:700;font-size:0.85rem;text-decoration:none;">Começar</a>
        </div>
      </nav>`,
    });

    // Load content
    if (parsed.bodyHtml) {
      if (parsed.css) editor.setStyle(parsed.css);
      editor.setComponents(parsed.bodyHtml);
    }

    if (parsed.inlineScripts.length > 0) {
      editor.on("load", () => {
        const frame = editor.Canvas.getFrameEl();
        if (frame) {
          const frameDoc = frame.contentDocument;
          if (frameDoc) {
            parsed.inlineScripts.forEach((script) => {
              const el = frameDoc.createElement("script");
              el.textContent = script;
              frameDoc.body.appendChild(el);
            });
          }
        }
      });
    }

    editor.on("component:selected", (comp: any) => {
      const tag = comp?.get?.("tagName");
      setSelectedComponent(tag || null);
      if (tag === "a" || tag === "button") {
        setActivePanel("traits");
      }
    });

    editor.on("component:deselected", () => {
      setSelectedComponent(null);
    });

    editorRef.current = editor;
  };

  const getFullHtml = useCallback(() => {
    if (!editorRef.current) return "";
    const editor = editorRef.current;
    const html = editor.getHtml();
    const css = editor.getCss();

    let headContent = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle || title}</title>
${metaDescription ? `<meta name="description" content="${metaDescription}">` : ""}
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
</style>`;

    if (originalHeadContent) {
      const linkMatches = originalHeadContent.match(/<link[^>]*>/gi);
      if (linkMatches) headContent += "\n" + linkMatches.join("\n");
    }

    headContent += `\n<style>\n${css}\n</style>`;

    return `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n${headContent}\n</head>\n<body>\n${html}\n</body>\n</html>`;
  }, [metaTitle, title, metaDescription, originalHeadContent]);

  const handleSave = async () => {
    setSaving(true);
    const fullHtml = getFullHtml();
    const { error } = await supabase.from("landing_pages").update({
      html_content: fullHtml, title, slug,
      custom_domain: customDomain || null,
      meta_title: metaTitle || null, meta_description: metaDescription || null,
      pixel_meta_id: pixelMeta || null, pixel_google_id: pixelGoogle || null,
      is_published: isPublished,
    } as any).eq("id", pageId);
    setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: "Salvo!" });
  };

  const handleExportHTML = () => {
    const fullHtml = getFullHtml();
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug || "page"}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (editorRef.current) {
        const parsed = parseFullHtml(content);
        if (parsed.css) editorRef.current.setStyle(parsed.css);
        editorRef.current.setComponents(parsed.bodyHtml);
        toast({ title: "HTML importado!" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadHtmlIntoEditor = (content: string) => {
    if (editorRef.current) {
      const parsed = parseFullHtml(content);
      if (parsed.css) editorRef.current.setStyle(parsed.css);
      editorRef.current.setComponents(parsed.bodyHtml);
    }
  };

  const handleViewCode = () => {
    if (editorRef.current) {
      setCodeContent(getFullHtml());
      setShowCode(!showCode);
    }
  };

  const handleDevice = (device: string) => {
    setActiveDevice(device);
    if (editorRef.current) editorRef.current.setDevice(device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile");
  };

  const handleUndo = () => editorRef.current?.UndoManager.undo();
  const handleRedo = () => editorRef.current?.UndoManager.redo();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title, slug, metaTitle, metaDescription, pixelMeta, pixelGoogle, isPublished, customDomain]);

  const systemUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  const panels = [
    { id: "blocks", icon: LayoutGrid, label: "Blocos" },
    { id: "styles", icon: Paintbrush, label: "Design" },
    { id: "traits", icon: Tag, label: "Ações" },
    { id: "layers", icon: Layers, label: "Camadas" },
  ] as const;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col" style={{ background: "#050505" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 z-50" style={{ borderBottom: "1px solid #1e1e1e", background: "#050505" }}>
        {/* Left */}
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="flex items-center justify-center h-7 w-7 rounded-md transition-colors hover:bg-white/5" style={{ color: "#a3a3a3" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4" style={{ background: "#1e1e1e" }} />
          <span className="text-xs font-semibold truncate max-w-[160px]" style={{ color: "#e5e5e5" }}>{title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: isPublished ? "rgba(132,204,22,0.12)" : "rgba(255,255,255,0.04)", color: isPublished ? "#84CC16" : "#737373" }}>
            {isPublished ? "LIVE" : "DRAFT"}
          </span>
        </div>

        {/* Center - Devices */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}>
          {(["desktop", "tablet", "mobile"] as const).map(d => (
            <button key={d} onClick={() => handleDevice(d)} className="h-6 w-7 rounded-md flex items-center justify-center transition-all" style={{ color: activeDevice === d ? "#84CC16" : "#737373", background: activeDevice === d ? "rgba(132,204,22,0.1)" : "transparent" }}>
              {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <button onClick={handleUndo} className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "#737373" }} title="Desfazer"><Undo2 className="h-3.5 w-3.5" /></button>
          <button onClick={handleRedo} className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "#737373" }} title="Refazer"><Redo2 className="h-3.5 w-3.5" /></button>
          <div className="w-px h-4 mx-0.5" style={{ background: "#1e1e1e" }} />
          <button onClick={handleViewCode} className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "#737373" }} title="Código"><Code className="h-3.5 w-3.5" /></button>
          <button onClick={handleExportHTML} className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "#737373" }} title="Exportar"><Download className="h-3.5 w-3.5" /></button>
          <button onClick={() => fileInputRef.current?.click()} className="h-7 w-7 rounded-md flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "#737373" }} title="Importar"><Upload className="h-3.5 w-3.5" /></button>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleImportHTML} className="hidden" />
          <div className="w-px h-4 mx-0.5" style={{ background: "#1e1e1e" }} />
          <button onClick={() => setShowSettings(!showSettings)} className="h-7 px-2 rounded-md flex items-center gap-1 text-[11px] font-medium transition-colors hover:bg-white/5" style={{ color: showSettings ? "#84CC16" : "#737373" }}>
            <Globe className="h-3.5 w-3.5" /> SEO
          </button>
          <button onClick={handleSave} disabled={saving} className="h-7 px-3 rounded-md flex items-center gap-1.5 text-[11px] font-bold transition-all" style={{ background: "#84CC16", color: "#000" }}>
            <Save className="h-3 w-3" /> {saving ? "..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 space-y-3 z-40 shrink-0" style={{ borderBottom: "1px solid #1e1e1e", background: "#0a0a0a" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Título", val: title, set: setTitle },
              { label: "Slug (URL)", val: slug, set: (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "")) },
              { label: "Domínio Próprio", val: customDomain, set: setCustomDomain, placeholder: "seudominio.com" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#737373" }}>{f.label}</label>
                <Input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder || ""} className="text-sm h-8" style={{ background: "#111111", borderColor: "#1e1e1e", color: "#e5e5e5" }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: "Meta Title", val: metaTitle, set: setMetaTitle },
              { label: "Meta Description", val: metaDescription, set: setMetaDescription },
              { label: "Pixel Meta", val: pixelMeta, set: setPixelMeta },
              { label: "Pixel Google", val: pixelGoogle, set: setPixelGoogle },
            ].map(f => (
              <div key={f.label}>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "#737373" }}>{f.label}</label>
                <Input value={f.val} onChange={e => f.set(e.target.value)} className="text-sm h-8" style={{ background: "#111111", borderColor: "#1e1e1e", color: "#e5e5e5" }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#e5e5e5" }}>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} /> Publicar
            </label>
            {isPublished && slug && (
              <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1 hover:underline" style={{ color: "#84CC16" }}>
                <ExternalLink className="h-3 w-3" /> {systemUrl}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Code Overlay */}
      {showCode && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(5,5,5,0.98)" }}>
          <div className="flex items-center justify-between px-4 h-10" style={{ background: "#0a0a0a", borderBottom: "1px solid #1e1e1e" }}>
            <span className="text-xs font-semibold" style={{ color: "#e5e5e5" }}>Código HTML</span>
            <button onClick={() => setShowCode(false)} className="text-xs font-medium" style={{ color: "#a3a3a3" }}>Fechar</button>
          </div>
          <textarea
            value={codeContent}
            onChange={e => setCodeContent(e.target.value)}
            className="flex-1 w-full resize-none p-4 font-mono text-xs focus:outline-none leading-5"
            style={{ background: "#050505", color: "#84CC16" }}
            spellCheck={false}
          />
          <div className="flex gap-2 p-2" style={{ background: "#0a0a0a", borderTop: "1px solid #1e1e1e" }}>
            <button onClick={() => { loadHtmlIntoEditor(codeContent); setShowCode(false); toast({ title: "HTML aplicado!" }); }} className="h-8 px-4 rounded-md text-xs font-bold" style={{ background: "#84CC16", color: "#000" }}>
              Aplicar Código
            </button>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Icons */}
        <div className="w-12 flex flex-col items-center py-3 gap-1 shrink-0" style={{ background: "#050505", borderRight: "1px solid #1e1e1e" }}>
          {panels.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActivePanel(activePanel === id ? null : id)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group"
              style={{ color: activePanel === id ? "#84CC16" : "#737373", background: activePanel === id ? "rgba(132,204,22,0.08)" : "transparent" }}
              title={label}
            >
              <Icon className="h-4 w-4" />
              {activePanel === id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r" style={{ background: "#84CC16" }} />}
            </button>
          ))}
        </div>

        {/* Side Panel */}
        {activePanel && (
          <div className="w-[280px] overflow-y-auto shrink-0" style={{ background: "#0a0a0a", borderRight: "1px solid #1e1e1e" }}>
            <div className="flex items-center justify-between px-4 h-10" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#737373" }}>
                {panels.find(p => p.id === activePanel)?.label}
              </h3>
              <button onClick={() => setActivePanel(null)} className="h-5 w-5 rounded flex items-center justify-center" style={{ color: "#737373" }}>
                <X className="h-3 w-3" />
              </button>
            </div>
            <div
              id={activePanel === "blocks" ? "gjs-blocks" : activePanel === "styles" ? "gjs-styles" : activePanel === "traits" ? "gjs-traits" : "gjs-layers"}
              className="p-1"
            />
            {activePanel === "traits" && (
              <div className="px-4 py-3 text-[10px] leading-relaxed" style={{ color: "#737373", borderTop: "1px solid #1e1e1e" }}>
                {selectedComponent === "a" || selectedComponent === "button"
                  ? "Configure a URL, ação (WhatsApp, telefone, email) e destino do elemento selecionado."
                  : "Selecione um link ou botão no canvas para configurar ações e destinos."
                }
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1" />
      </div>
    </div>
  );
};

export default GrapesEditor;