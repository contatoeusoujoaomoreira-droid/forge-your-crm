import { useEffect, useRef, useState, useCallback } from "react";
import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsPresetWebpage from "grapesjs-preset-webpage";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Save, Settings, ExternalLink, Monitor, Tablet,
  Smartphone, Code, Undo2, Redo2, Download, Upload, Layers,
  Paintbrush, LayoutGrid, Plus, MousePointer, Type, Image,
  Video, Link2, Square, Minus, AlignCenter,
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
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
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
      plugins: [grapesjsPresetWebpage, grapesjsBlocksBasic],
      pluginsOpts: {
        [grapesjsPresetWebpage as any]: { modalImportTitle: "Importar HTML", modalImportButton: "Importar", modalImportContent: "" },
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
                  { id: "poppins", value: "Poppins, sans-serif", name: "Poppins" },
                  { id: "montserrat", value: "Montserrat, sans-serif", name: "Montserrat" },
                  { id: "roboto", value: "Roboto, sans-serif", name: "Roboto" },
                  { id: "playfair", value: "Playfair Display, serif", name: "Playfair Display" },
                  { id: "dm-sans", value: "DM Sans, sans-serif", name: "DM Sans" },
                  { id: "space-grotesk", value: "Space Grotesk, sans-serif", name: "Space Grotesk" },
                  { id: "georgia", value: "Georgia, serif", name: "Georgia" },
                  { id: "arial", value: "Arial, sans-serif", name: "Arial" },
                  { id: "monospace", value: "monospace", name: "Monospace" },
                ],
              },
            ],
          },
          {
            name: "Decoração",
            open: false,
            buildProps: ["background-color", "background", "background-image", "border-radius", "border", "box-shadow", "opacity"],
          },
          {
            name: "Animações",
            open: false,
            buildProps: ["transition", "transform", "animation"],
            properties: [
              {
                name: "Transição",
                property: "transition",
                type: "composite",
                properties: [
                  { name: "Propriedade", property: "transition-property", type: "select", defaults: "all", options: [{ id: "all", value: "all", name: "Todas" }, { id: "transform", value: "transform", name: "Transform" }, { id: "opacity", value: "opacity", name: "Opacity" }, { id: "background", value: "background", name: "Background" }, { id: "color", value: "color", name: "Color" }] },
                  { name: "Duração", property: "transition-duration", type: "text", defaults: "0.3s" },
                  { name: "Easing", property: "transition-timing-function", type: "select", defaults: "ease", options: [{ id: "ease", value: "ease", name: "Ease" }, { id: "ease-in-out", value: "ease-in-out", name: "Ease In Out" }, { id: "suave", value: "cubic-bezier(0.4,0,0.2,1)", name: "Suave" }] },
                ],
              },
            ],
          },
          {
            name: "Extra",
            open: false,
            buildProps: ["cursor", "overflow", "position", "top", "right", "bottom", "left", "z-index"],
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

    // Add link traits to all components with href
    editor.DomComponents.addType("link", {
      isComponent: (el) => el.tagName === "A",
      model: {
        defaults: {
          traits: [
            { type: "text", name: "href", label: "URL / Link", placeholder: "https://... ou https://wa.me/5511..." },
            { type: "select", name: "target", label: "Abrir em", options: [{ id: "same", value: "", name: "Mesma aba" }, { id: "blank", value: "_blank", name: "Nova aba" }] },
            { type: "text", name: "title", label: "Título" },
            { type: "select", name: "data-action", label: "Ação", options: [
              { id: "none", value: "", name: "Nenhuma" },
              { id: "whatsapp", value: "whatsapp", name: "WhatsApp" },
              { id: "phone", value: "phone", name: "Ligar" },
              { id: "email", value: "email", name: "Email" },
              { id: "scroll", value: "scroll", name: "Scroll para seção" },
            ]},
          ],
        },
      },
    });

    // Add traits to buttons
    editor.DomComponents.addType("button", {
      isComponent: (el) => el.tagName === "BUTTON",
      model: {
        defaults: {
          traits: [
            { type: "text", name: "data-href", label: "Link destino" },
            { type: "select", name: "data-action", label: "Ação", options: [
              { value: "", name: "Nenhuma" },
              { value: "whatsapp", name: "WhatsApp" },
              { value: "phone", name: "Ligar" },
              { value: "email", name: "Email" },
              { value: "submit", name: "Enviar form" },
            ]},
          ],
        },
      },
    });

    // Custom blocks
    const bm = editor.Blocks;

    // === SEÇÕES ===
    bm.add("section-hero", {
      label: "Hero Section",
      category: "Seções",
      content: `<section style="padding: 100px 20px; text-align: center; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%); color: white; min-height: 600px; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(ellipse at center, rgba(132,204,22,0.05) 0%, transparent 70%); pointer-events: none;"></div>
        <span style="display: inline-block; padding: 8px 20px; border-radius: 24px; background: rgba(132, 204, 22, 0.12); color: #84CC16; font-size: 13px; margin-bottom: 28px; font-weight: 500; letter-spacing: 0.5px; border: 1px solid rgba(132,204,22,0.2);">🔥 Oferta Exclusiva</span>
        <h1 style="font-size: 56px; font-weight: 800; margin: 0 0 20px; max-width: 800px; line-height: 1.05; letter-spacing: -0.02em;">Título Principal da Sua Página</h1>
        <p style="font-size: 19px; opacity: 0.7; margin: 0 0 40px; max-width: 600px; line-height: 1.6;">Subtítulo com a proposta de valor clara e objetiva do seu produto ou serviço.</p>
        <a href="#" style="display: inline-block; padding: 16px 40px; background: #84CC16; color: #000; font-weight: 700; border-radius: 10px; text-decoration: none; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 20px rgba(132,204,22,0.3);">Começar Agora →</a>
      </section>`,
    });

    bm.add("section-features", {
      label: "Features Grid",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: #0f0f0f; color: white;">
        <div style="max-width: 1100px; margin: 0 auto;">
          <h2 style="text-align: center; font-size: 40px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;">Nossos Recursos</h2>
          <p style="text-align: center; font-size: 16px; opacity: 0.5; margin: 0 0 56px; max-width: 500px; margin-left: auto; margin-right: auto;">Tudo que você precisa em um só lugar</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div style="padding: 36px 28px; background: #1a1a1a; border-radius: 16px; border: 1px solid #222; transition: all 0.3s ease;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(132,204,22,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 24px;">📊</div>
              <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 10px;">Recurso 1</h3>
              <p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Descrição breve e clara do recurso com detalhes relevantes.</p>
            </div>
            <div style="padding: 36px 28px; background: #1a1a1a; border-radius: 16px; border: 1px solid #222; transition: all 0.3s ease;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(59,130,246,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 24px;">⚡</div>
              <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 10px;">Recurso 2</h3>
              <p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Descrição breve e clara do recurso com detalhes relevantes.</p>
            </div>
            <div style="padding: 36px 28px; background: #1a1a1a; border-radius: 16px; border: 1px solid #222; transition: all 0.3s ease;">
              <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(168,85,247,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; font-size: 24px;">🎯</div>
              <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 10px;">Recurso 3</h3>
              <p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Descrição breve e clara do recurso com detalhes relevantes.</p>
            </div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-testimonials", {
      label: "Depoimentos",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: #111; color: white;"><div style="max-width: 1000px; margin: 0 auto; text-align: center;"><h2 style="font-size: 36px; font-weight: 700; margin: 0 0 12px;">O que nossos clientes dizem</h2><p style="font-size: 15px; opacity: 0.5; margin: 0 0 48px;">Resultados reais de pessoas reais</p><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;"><div style="padding: 28px; background: #1a1a1a; border-radius: 16px; text-align: left; border: 1px solid #222;"><div style="display: flex; gap: 4px; margin-bottom: 16px; color: #fbbf24;">★★★★★</div><p style="font-size: 14px; opacity: 0.8; margin: 0 0 20px; line-height: 1.6;">"Resultado incrível, superou minhas expectativas. Recomendo muito!"</p><div style="display: flex; align-items: center; gap: 12px;"><div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #84CC16, #22d3ee);"></div><div><p style="font-size: 14px; font-weight: 600; margin: 0;">Maria Silva</p><p style="font-size: 12px; opacity: 0.4; margin: 0;">CEO, Empresa</p></div></div></div><div style="padding: 28px; background: #1a1a1a; border-radius: 16px; text-align: left; border: 1px solid #222;"><div style="display: flex; gap: 4px; margin-bottom: 16px; color: #fbbf24;">★★★★★</div><p style="font-size: 14px; opacity: 0.8; margin: 0 0 20px; line-height: 1.6;">"A melhor decisão que tomei para meu negócio. Resultados fantásticos."</p><div style="display: flex; align-items: center; gap: 12px;"><div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #a855f7);"></div><div><p style="font-size: 14px; font-weight: 600; margin: 0;">João Santos</p><p style="font-size: 12px; opacity: 0.4; margin: 0;">Diretor</p></div></div></div></div></div></section>`,
    });

    bm.add("section-cta", {
      label: "CTA Section",
      category: "Seções",
      content: `<section style="padding: 100px 20px; background: linear-gradient(135deg, #84CC16 0%, #65a30d 100%); text-align: center; position: relative; overflow: hidden;"><div style="position: absolute; inset: 0; background: radial-gradient(ellipse at top, rgba(255,255,255,0.15), transparent 70%); pointer-events: none;"></div><div style="max-width: 700px; margin: 0 auto; position: relative;"><h2 style="font-size: 42px; font-weight: 800; color: #000; margin: 0 0 16px; letter-spacing: -0.02em;">Pronto para Começar?</h2><p style="font-size: 18px; color: rgba(0,0,0,0.6); margin: 0 0 36px;">Junte-se a milhares de clientes satisfeitos.</p><a href="#" style="display: inline-block; padding: 18px 48px; background: #000; color: white; font-weight: 700; border-radius: 12px; text-decoration: none; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">Começar Agora →</a></div></section>`,
    });

    bm.add("section-pricing", {
      label: "Preços",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: #0a0a0a; color: white;"><div style="max-width: 1000px; margin: 0 auto; text-align: center;"><h2 style="font-size: 40px; font-weight: 700; margin: 0 0 12px; letter-spacing: -0.02em;">Planos e Preços</h2><p style="font-size: 15px; opacity: 0.5; margin: 0 0 56px;">Escolha o plano ideal para você</p><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start;"><div style="padding: 36px; background: #1a1a1a; border-radius: 20px; border: 1px solid #222;"><h3 style="font-size: 18px; margin: 0 0 8px; opacity: 0.8;">Básico</h3><p style="font-size: 42px; font-weight: 800; margin: 0 0 24px;">R$49<span style="font-size: 14px; opacity: 0.4; font-weight: 400;">/mês</span></p><ul style="list-style: none; padding: 0; margin: 0 0 28px; text-align: left;"><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid #222;">✓ Feature 1</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid #222;">✓ Feature 2</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7;">✓ Feature 3</li></ul><a href="#" style="display: block; padding: 14px; background: #222; color: white; border-radius: 10px; text-decoration: none; font-weight: 600; transition: all 0.3s ease;">Escolher</a></div><div style="padding: 36px; background: linear-gradient(135deg, #1a2e0a, #1a1a2e); border-radius: 20px; border: 2px solid #84CC16; transform: scale(1.03); position: relative;"><span style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); padding: 4px 16px; background: #84CC16; color: #000; border-radius: 20px; font-size: 11px; font-weight: 700;">POPULAR</span><h3 style="font-size: 18px; margin: 16px 0 8px; opacity: 0.8;">Pro</h3><p style="font-size: 42px; font-weight: 800; margin: 0 0 24px;">R$99<span style="font-size: 14px; opacity: 0.4; font-weight: 400;">/mês</span></p><ul style="list-style: none; padding: 0; margin: 0 0 28px; text-align: left;"><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid rgba(132,204,22,0.2);">✓ Tudo do Básico</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid rgba(132,204,22,0.2);">✓ Feature Pro 1</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7;">✓ Feature Pro 2</li></ul><a href="#" style="display: block; padding: 14px; background: #84CC16; color: #000; border-radius: 10px; text-decoration: none; font-weight: 700; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(132,204,22,0.3);">Escolher</a></div><div style="padding: 36px; background: #1a1a1a; border-radius: 20px; border: 1px solid #222;"><h3 style="font-size: 18px; margin: 0 0 8px; opacity: 0.8;">Enterprise</h3><p style="font-size: 42px; font-weight: 800; margin: 0 0 24px;">R$199<span style="font-size: 14px; opacity: 0.4; font-weight: 400;">/mês</span></p><ul style="list-style: none; padding: 0; margin: 0 0 28px; text-align: left;"><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid #222;">✓ Tudo do Pro</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7; border-bottom: 1px solid #222;">✓ Suporte Priority</li><li style="padding: 8px 0; font-size: 14px; opacity: 0.7;">✓ SLA dedicado</li></ul><a href="#" style="display: block; padding: 14px; background: #222; color: white; border-radius: 10px; text-decoration: none; font-weight: 600; transition: all 0.3s ease;">Escolher</a></div></div></div></section>`,
    });

    bm.add("section-faq", {
      label: "FAQ",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: #111; color: white;"><div style="max-width: 700px; margin: 0 auto;"><h2 style="text-align: center; font-size: 36px; font-weight: 700; margin: 0 0 48px;">Perguntas Frequentes</h2><div style="border-top: 1px solid #222;"><div style="padding: 24px 0; border-bottom: 1px solid #222;"><h4 style="font-size: 16px; font-weight: 600; margin: 0 0 10px; cursor: pointer;">Pergunta frequente 1?</h4><p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Resposta detalhada e clara para a pergunta do cliente.</p></div><div style="padding: 24px 0; border-bottom: 1px solid #222;"><h4 style="font-size: 16px; font-weight: 600; margin: 0 0 10px; cursor: pointer;">Pergunta frequente 2?</h4><p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Resposta detalhada e clara para a pergunta do cliente.</p></div><div style="padding: 24px 0; border-bottom: 1px solid #222;"><h4 style="font-size: 16px; font-weight: 600; margin: 0 0 10px; cursor: pointer;">Pergunta frequente 3?</h4><p style="font-size: 14px; opacity: 0.6; margin: 0; line-height: 1.6;">Resposta detalhada e clara para a pergunta do cliente.</p></div></div></div></section>`,
    });

    bm.add("section-form", {
      label: "Formulário",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: #0a0a0a; color: white;"><div style="max-width: 480px; margin: 0 auto;"><h2 style="text-align: center; font-size: 28px; font-weight: 700; margin: 0 0 12px;">Entre em Contato</h2><p style="text-align: center; font-size: 14px; opacity: 0.5; margin: 0 0 36px;">Preencha o formulário abaixo</p><form style="display: flex; flex-direction: column; gap: 14px;"><input type="text" placeholder="Seu nome" style="padding: 14px 18px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; color: white; font-size: 14px; outline: none; transition: border-color 0.3s;" /><input type="email" placeholder="Seu email" style="padding: 14px 18px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; color: white; font-size: 14px; outline: none; transition: border-color 0.3s;" /><input type="tel" placeholder="WhatsApp" style="padding: 14px 18px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; color: white; font-size: 14px; outline: none; transition: border-color 0.3s;" /><button type="submit" style="padding: 16px; background: #84CC16; color: #000; font-weight: 700; border: none; border-radius: 10px; cursor: pointer; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(132,204,22,0.3);">Enviar →</button></form></div></section>`,
    });

    bm.add("section-footer", {
      label: "Footer",
      category: "Seções",
      content: `<footer style="padding: 48px 20px 24px; background: #050505; color: white;"><div style="max-width: 1000px; margin: 0 auto;"><div style="display: flex; justify-content: center; gap: 28px; margin-bottom: 32px;"><a href="#" style="color: #84CC16; text-decoration: none; font-size: 14px; font-weight: 500;">Início</a><a href="#" style="color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; transition: color 0.3s;">Recursos</a><a href="#" style="color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; transition: color 0.3s;">Preços</a><a href="#" style="color: rgba(255,255,255,0.5); text-decoration: none; font-size: 14px; transition: color 0.3s;">Contato</a></div><div style="width: 100%; height: 1px; background: #1a1a1a; margin-bottom: 24px;"></div><p style="font-size: 12px; opacity: 0.3; margin: 0; text-align: center;">© 2026 Sua Empresa. Todos os direitos reservados.</p></div></footer>`,
    });

    // === ELEMENTOS ===
    bm.add("gradient-heading", {
      label: "Título Gradiente",
      category: "Elementos",
      content: `<h2 style="font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #84CC16, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-align: center; margin: 0; padding: 20px; letter-spacing: -0.02em;">Texto com Gradiente</h2>`,
    });

    bm.add("button-whatsapp", {
      label: "Botão WhatsApp",
      category: "Elementos",
      content: `<div style="text-align: center; padding: 20px;"><a href="https://wa.me/5511999999999?text=Olá!" target="_blank" style="display: inline-flex; align-items: center; gap: 10px; padding: 16px 36px; background: #25D366; color: white; font-weight: 700; border-radius: 12px; text-decoration: none; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(37,211,102,0.3);">💬 Falar no WhatsApp</a></div>`,
    });

    bm.add("button-cta", {
      label: "Botão CTA",
      category: "Elementos",
      content: `<div style="text-align: center; padding: 20px;"><a href="#" style="display: inline-block; padding: 16px 44px; background: linear-gradient(135deg, #84CC16, #65a30d); color: #000; font-weight: 700; border-radius: 12px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 20px rgba(132, 204, 22, 0.3); transition: all 0.3s ease;">Clique Aqui →</a></div>`,
    });

    bm.add("button-link", {
      label: "Botão com Link",
      category: "Elementos",
      content: `<div style="text-align: center; padding: 20px;"><a href="https://exemplo.com" target="_blank" style="display: inline-block; padding: 14px 36px; background: transparent; color: #84CC16; font-weight: 600; border-radius: 10px; text-decoration: none; font-size: 15px; border: 2px solid #84CC16; transition: all 0.3s ease;">Ver Mais ↗</a></div>`,
    });

    bm.add("video-embed", {
      label: "Vídeo YouTube",
      category: "Elementos",
      content: `<div style="max-width: 800px; margin: 0 auto; padding: 20px;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div></div>`,
    });

    bm.add("image-full", {
      label: "Imagem",
      category: "Elementos",
      content: `<div style="padding: 20px;"><img src="https://placehold.co/1200x600/1a1a2e/84CC16?text=Sua+Imagem" alt="Imagem" style="width: 100%; height: auto; border-radius: 16px; display: block;" /></div>`,
    });

    bm.add("divider", { label: "Divisor", category: "Elementos", content: `<hr style="border: none; height: 1px; background: linear-gradient(90deg, transparent, #84CC16, transparent); margin: 40px auto; max-width: 600px;" />` });
    bm.add("spacer", { label: "Espaçador", category: "Elementos", content: `<div style="height: 60px;"></div>` });

    bm.add("countdown", {
      label: "Contador",
      category: "Elementos",
      content: `<div style="display: flex; justify-content: center; gap: 16px; padding: 40px 20px;"><div style="text-align: center; background: #1a1a1a; padding: 24px 16px; border-radius: 16px; min-width: 80px; border: 1px solid #222;"><span style="font-size: 40px; font-weight: 800; color: #84CC16; display: block; line-height: 1;">07</span><span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; color: white; margin-top: 4px; display: block;">Dias</span></div><div style="text-align: center; background: #1a1a1a; padding: 24px 16px; border-radius: 16px; min-width: 80px; border: 1px solid #222;"><span style="font-size: 40px; font-weight: 800; color: #84CC16; display: block; line-height: 1;">12</span><span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; color: white; margin-top: 4px; display: block;">Horas</span></div><div style="text-align: center; background: #1a1a1a; padding: 24px 16px; border-radius: 16px; min-width: 80px; border: 1px solid #222;"><span style="font-size: 40px; font-weight: 800; color: #84CC16; display: block; line-height: 1;">45</span><span style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; color: white; margin-top: 4px; display: block;">Min</span></div></div>`,
    });

    bm.add("social-proof", {
      label: "Prova Social",
      category: "Elementos",
      content: `<div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px;"><div style="display: flex;"><div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #84CC16, #22d3ee); border: 2px solid #0a0a0a;"></div><div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #a855f7); border: 2px solid #0a0a0a; margin-left: -10px;"></div><div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ef4444); border: 2px solid #0a0a0a; margin-left: -10px;"></div></div><div><p style="font-size: 14px; font-weight: 600; color: white; margin: 0;">+2.500 clientes</p><p style="font-size: 11px; color: rgba(255,255,255,0.4); margin: 0;">já usam nossa plataforma</p></div></div>`,
    });

    bm.add("badge-strip", {
      label: "Faixa de Logos",
      category: "Elementos",
      content: `<div style="padding: 40px 20px; background: #0a0a0a; text-align: center;"><p style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.3; color: white; margin: 0 0 24px;">Empresas que confiam em nós</p><div style="display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; opacity: 0.4;"><span style="font-size: 20px; font-weight: 700; color: white;">Logo 1</span><span style="font-size: 20px; font-weight: 700; color: white;">Logo 2</span><span style="font-size: 20px; font-weight: 700; color: white;">Logo 3</span><span style="font-size: 20px; font-weight: 700; color: white;">Logo 4</span></div></div>`,
    });

    bm.add("animated-stats", {
      label: "Estatísticas",
      category: "Elementos",
      content: `<div style="display: flex; justify-content: center; gap: 48px; padding: 60px 20px; background: #111; flex-wrap: wrap;"><div style="text-align: center;"><p style="font-size: 48px; font-weight: 800; color: #84CC16; margin: 0; line-height: 1;">10K+</p><p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 4px 0 0;">Usuários ativos</p></div><div style="text-align: center;"><p style="font-size: 48px; font-weight: 800; color: #22d3ee; margin: 0; line-height: 1;">98%</p><p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 4px 0 0;">Satisfação</p></div><div style="text-align: center;"><p style="font-size: 48px; font-weight: 800; color: #a855f7; margin: 0; line-height: 1;">24/7</p><p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 4px 0 0;">Suporte</p></div></div>`,
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

    // On component select, show traits panel
    editor.on("component:selected", () => {
      const selected = editor.getSelected();
      if (selected) {
        const tag = selected.get("tagName");
        if (tag === "a" || tag === "button") {
          setActivePanel("traits");
        }
      }
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
${metaDescription ? `<meta name="description" content="${metaDescription}">` : ""}`;

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
    else toast({ title: "Página salva com sucesso!" });
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

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col" style={{ background: "#111" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 flex-wrap z-50" style={{ borderBottom: "1px solid #1e1e1e", background: "#0a0a0a" }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2" style={{ color: "rgba(255,255,255,0.7)" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
          <span className="text-xs font-medium truncate max-w-[180px]" style={{ color: "rgba(255,255,255,0.8)" }}>{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: isPublished ? "rgba(132,204,22,0.15)" : "rgba(255,255,255,0.06)", color: isPublished ? "#a3e635" : "rgba(255,255,255,0.4)" }}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.5)" }} title="Desfazer (Ctrl+Z)"><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.5)" }} title="Refazer"><Redo2 className="h-3.5 w-3.5" /></Button>
          <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
          {(["desktop", "tablet", "mobile"] as const).map(d => (
            <Button key={d} variant="ghost" size="sm" onClick={() => handleDevice(d)} className="h-7 px-1.5" style={{ color: activeDevice === d ? "#a3e635" : "rgba(255,255,255,0.3)" }}>
              {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            </Button>
          ))}
          <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
          <Button variant="ghost" size="sm" onClick={handleViewCode} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.5)" }} title="Código"><Code className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.5)" }} title="Exportar"><Download className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.5)" }} title="Importar"><Upload className="h-3.5 w-3.5" /></Button>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleImportHTML} className="hidden" />
          <div className="w-px h-4 mx-1" style={{ background: "rgba(255,255,255,0.08)" }} />
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-7 px-2" style={{ color: showSettings ? "#a3e635" : "rgba(255,255,255,0.5)" }}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 font-semibold ml-1" style={{ background: "#84CC16", color: "#000" }}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-4 py-3 space-y-3 z-40" style={{ borderBottom: "1px solid #1e1e1e", background: "#0d0d0d" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Título</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="text-sm" style={{ background: "#1a1a1a", borderColor: "#222", color: "white" }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Slug (URL)</label>
              <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="text-sm" style={{ background: "#1a1a1a", borderColor: "#222", color: "white" }} />
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{systemUrl}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Domínio Próprio</label>
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com" className="text-sm" style={{ background: "#1a1a1a", borderColor: "#222", color: "white" }} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: "Meta Title", val: metaTitle, set: setMetaTitle },
              { label: "Meta Description", val: metaDescription, set: setMetaDescription },
              { label: "Pixel Meta", val: pixelMeta, set: setPixelMeta },
              { label: "Pixel Google", val: pixelGoogle, set: setPixelGoogle },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>{f.label}</label>
                <Input value={f.val} onChange={e => f.set(e.target.value)} className="text-sm" style={{ background: "#1a1a1a", borderColor: "#222", color: "white" }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "white" }}>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} /> Publicada
            </label>
            {isPublished && slug && (
              <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#a3e635" }}>
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
            )}
          </div>
        </div>
      )}

      {/* Code Overlay */}
      {showCode && (
        <div className="absolute inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.95)" }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ background: "#0a0a0a", borderBottom: "1px solid #1e1e1e" }}>
            <span className="text-sm font-semibold" style={{ color: "white" }}>Código HTML</span>
            <Button variant="ghost" size="sm" onClick={() => setShowCode(false)} style={{ color: "white" }}>Fechar</Button>
          </div>
          <textarea
            value={codeContent}
            onChange={e => setCodeContent(e.target.value)}
            className="flex-1 w-full resize-none p-4 font-mono text-xs focus:outline-none leading-5"
            style={{ background: "#050505", color: "#a3e635" }}
            spellCheck={false}
          />
          <div className="flex gap-2 p-2" style={{ background: "#0a0a0a", borderTop: "1px solid #1e1e1e" }}>
            <Button size="sm" onClick={() => {
              loadHtmlIntoEditor(codeContent);
              setShowCode(false);
              toast({ title: "HTML aplicado!" });
            }} style={{ background: "#84CC16", color: "#000" }}>
              Aplicar Código
            </Button>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar icons */}
        <div className="w-11 flex flex-col items-center py-2 gap-0.5" style={{ background: "#0a0a0a", borderRight: "1px solid #1e1e1e" }}>
          {([
            { id: "blocks", icon: LayoutGrid, label: "Blocos" },
            { id: "styles", icon: Paintbrush, label: "Estilos" },
            { id: "traits", icon: Link2, label: "Configurações" },
            { id: "layers", icon: Layers, label: "Camadas" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActivePanel(activePanel === id ? null : id)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: activePanel === id ? "#a3e635" : "rgba(255,255,255,0.3)", background: activePanel === id ? "rgba(132,204,22,0.1)" : "transparent" }}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Side Panel */}
        {activePanel && (
          <div className="w-64 overflow-y-auto" style={{ background: "#0f0f0f", borderRight: "1px solid #1e1e1e" }}>
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
                {activePanel === "blocks" ? "Blocos" : activePanel === "styles" ? "Estilos" : activePanel === "traits" ? "Configurações do Elemento" : "Camadas"}
              </h3>
            </div>
            <div
              id={activePanel === "blocks" ? "gjs-blocks" : activePanel === "styles" ? "gjs-styles" : activePanel === "traits" ? "gjs-traits" : "gjs-layers"}
              style={activePanel === "traits" ? { padding: "8px" } : undefined}
            />
            {activePanel === "traits" && (
              <div className="px-3 py-2 text-[10px]" style={{ color: "rgba(255,255,255,0.3)", borderTop: "1px solid #1e1e1e" }}>
                Selecione um link ou botão no canvas para editar URL, ação (WhatsApp, telefone, email) e destino.
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
