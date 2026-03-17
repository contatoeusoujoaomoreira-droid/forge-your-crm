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
  Paintbrush, LayoutGrid,
} from "lucide-react";

interface Props {
  pageId: string;
  onBack: () => void;
}

/** Parse full HTML doc into body + css + head links */
function parseFullHtml(htmlContent: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  // Extract all <style> content
  const styles: string[] = [];
  doc.querySelectorAll("style").forEach((s) => {
    styles.push(s.textContent || "");
    s.remove();
  });

  // Extract <link> stylesheets
  const links: string[] = [];
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    links.push((l as HTMLLinkElement).href);
  });

  // Get Google Fonts links from <link> tags
  const fontLinks: string[] = [];
  doc.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach((l) => {
    fontLinks.push((l as HTMLLinkElement).href);
  });

  // Also grab external scripts src for re-injection
  const scripts: string[] = [];
  doc.querySelectorAll("script[src]").forEach((s) => {
    scripts.push((s as HTMLScriptElement).src);
  });

  // Inline scripts
  const inlineScripts: string[] = [];
  doc.querySelectorAll("script:not([src])").forEach((s) => {
    if (s.textContent) inlineScripts.push(s.textContent);
  });

  const bodyHtml = doc.body?.innerHTML || htmlContent;

  return {
    bodyHtml,
    css: styles.join("\n"),
    links: [...links, ...fontLinks],
    scripts,
    inlineScripts,
  };
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

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [pageId]);

  const initEditor = (htmlContent: string) => {
    // Parse the full HTML to extract body, css, links
    const parsed = parseFullHtml(htmlContent);

    // Store original head for later export
    if (htmlContent.includes("<head")) {
      const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (headMatch) setOriginalHeadContent(headMatch[1]);
    }

    // Build canvas styles from external links
    const canvasStyles = [
      "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
      ...parsed.links,
    ];

    const editor = grapesjs.init({
      container: containerRef.current!,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      undoManager: { maximumStackLength: 50 },
      canvas: {
        styles: canvasStyles,
        scripts: parsed.scripts,
      },
      plugins: [grapesjsPresetWebpage, grapesjsBlocksBasic],
      pluginsOpts: {
        [grapesjsPresetWebpage as any]: {
          modalImportTitle: "Importar HTML",
          modalImportButton: "Importar",
          modalImportContent: "",
        },
        [grapesjsBlocksBasic as any]: {
          flexGrid: true,
        },
      },
      blockManager: {
        appendTo: "#gjs-blocks",
      },
      layerManager: {
        appendTo: "#gjs-layers",
      },
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
                  { id: "georgia", value: "Georgia, serif", name: "Georgia" },
                  { id: "arial", value: "Arial, sans-serif", name: "Arial" },
                  { id: "helvetica", value: "Helvetica, sans-serif", name: "Helvetica" },
                  { id: "monospace", value: "monospace", name: "Monospace" },
                ],
              },
            ],
          },
          {
            name: "Decoração",
            open: false,
            buildProps: ["background-color", "background", "border-radius", "border", "box-shadow", "opacity"],
          },
          {
            name: "Extra",
            open: false,
            buildProps: ["transition", "transform", "cursor", "overflow", "position", "top", "right", "bottom", "left", "z-index"],
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

    // Custom blocks
    const bm = editor.Blocks;

    bm.add("section-hero", {
      label: "Hero Section",
      category: "Seções",
      content: `<section style="padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); color: white; min-height: 500px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: rgba(132, 204, 22, 0.15); color: #84CC16; font-size: 14px; margin-bottom: 24px;">🔥 Destaque</span>
        <h1 style="font-size: 48px; font-weight: 800; margin: 0 0 16px; max-width: 800px; line-height: 1.1;">Título Principal da Sua Página</h1>
        <p style="font-size: 18px; opacity: 0.8; margin: 0 0 32px; max-width: 600px;">Subtítulo com a proposta de valor.</p>
        <a href="#" style="display: inline-block; padding: 14px 32px; background: #84CC16; color: #000; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px;">Começar Agora →</a>
      </section>`,
    });

    bm.add("section-features", {
      label: "Features Grid",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #0f0f0f; color: white;">
        <div style="max-width: 1100px; margin: 0 auto;">
          <h2 style="text-align: center; font-size: 36px; font-weight: 700; margin: 0 0 48px;">Nossos Recursos</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
            <div style="padding: 32px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
              <div style="font-size: 32px; margin-bottom: 16px;">📊</div>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Recurso 1</h3>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso.</p>
            </div>
            <div style="padding: 32px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
              <div style="font-size: 32px; margin-bottom: 16px;">⚡</div>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Recurso 2</h3>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso.</p>
            </div>
            <div style="padding: 32px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
              <div style="font-size: 32px; margin-bottom: 16px;">🎯</div>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Recurso 3</h3>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso.</p>
            </div>
          </div>
        </div>
      </section>`,
    });

    bm.add("section-testimonials", {
      label: "Depoimentos",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #111; color: white;"><div style="max-width: 1000px; margin: 0 auto; text-align: center;"><h2 style="font-size: 32px; font-weight: 700; margin: 0 0 40px;">O que nossos clientes dizem</h2><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;"><div style="padding: 24px; background: #1a1a1a; border-radius: 12px; text-align: left;"><p style="font-size: 14px; opacity: 0.8; margin: 0 0 16px;">"Depoimento incrível."</p><div style="display: flex; align-items: center; gap: 12px;"><div style="width: 40px; height: 40px; border-radius: 50%; background: #84CC16;"></div><div><p style="font-size: 14px; font-weight: 600; margin: 0;">Nome</p><p style="font-size: 12px; opacity: 0.5; margin: 0;">CEO</p></div></div></div><div style="padding: 24px; background: #1a1a1a; border-radius: 12px; text-align: left;"><p style="font-size: 14px; opacity: 0.8; margin: 0 0 16px;">"Outro depoimento."</p><div style="display: flex; align-items: center; gap: 12px;"><div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6;"></div><div><p style="font-size: 14px; font-weight: 600; margin: 0;">Nome</p><p style="font-size: 12px; opacity: 0.5; margin: 0;">Diretor</p></div></div></div></div></div></section>`,
    });

    bm.add("section-cta", {
      label: "CTA Section",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: linear-gradient(135deg, #84CC16 0%, #65a30d 100%); text-align: center;"><div style="max-width: 700px; margin: 0 auto;"><h2 style="font-size: 36px; font-weight: 800; color: #000; margin: 0 0 16px;">Pronto para Começar?</h2><p style="font-size: 18px; color: rgba(0,0,0,0.7); margin: 0 0 32px;">Junte-se a milhares de clientes satisfeitos.</p><a href="#" style="display: inline-block; padding: 16px 40px; background: #000; color: white; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px;">Começar Agora →</a></div></section>`,
    });

    bm.add("section-pricing", {
      label: "Preços",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #0a0a0a; color: white;"><div style="max-width: 1000px; margin: 0 auto; text-align: center;"><h2 style="font-size: 36px; font-weight: 700; margin: 0 0 48px;">Planos e Preços</h2><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;"><div style="padding: 32px; background: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;"><h3 style="font-size: 20px; margin: 0 0 8px;">Básico</h3><p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$49<span style="font-size: 14px; opacity: 0.5;">/mês</span></p><a href="#" style="display: block; padding: 12px; background: #333; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Escolher</a></div><div style="padding: 32px; background: linear-gradient(135deg, #1a2e0a, #1a1a2e); border-radius: 16px; border: 2px solid #84CC16; transform: scale(1.05);"><span style="display: inline-block; padding: 4px 12px; background: #84CC16; color: #000; border-radius: 12px; font-size: 11px; font-weight: 700; margin-bottom: 12px;">POPULAR</span><h3 style="font-size: 20px; margin: 0 0 8px;">Pro</h3><p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$99<span style="font-size: 14px; opacity: 0.5;">/mês</span></p><a href="#" style="display: block; padding: 12px; background: #84CC16; color: #000; border-radius: 8px; text-decoration: none; font-weight: 700;">Escolher</a></div><div style="padding: 32px; background: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;"><h3 style="font-size: 20px; margin: 0 0 8px;">Enterprise</h3><p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$199<span style="font-size: 14px; opacity: 0.5;">/mês</span></p><a href="#" style="display: block; padding: 12px; background: #333; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Escolher</a></div></div></div></section>`,
    });

    bm.add("section-faq", {
      label: "FAQ",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #111; color: white;"><div style="max-width: 700px; margin: 0 auto;"><h2 style="text-align: center; font-size: 32px; font-weight: 700; margin: 0 0 40px;">Perguntas Frequentes</h2><div style="border-top: 1px solid #2a2a2a;"><div style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;"><h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Pergunta 1?</h4><p style="font-size: 14px; opacity: 0.7; margin: 0;">Resposta detalhada aqui.</p></div><div style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;"><h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Pergunta 2?</h4><p style="font-size: 14px; opacity: 0.7; margin: 0;">Resposta detalhada aqui.</p></div></div></div></section>`,
    });

    bm.add("section-form", {
      label: "Formulário",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #0a0a0a; color: white;"><div style="max-width: 500px; margin: 0 auto;"><h2 style="text-align: center; font-size: 28px; font-weight: 700; margin: 0 0 32px;">Entre em contato</h2><form style="display: flex; flex-direction: column; gap: 16px;"><input type="text" placeholder="Seu nome" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px;" /><input type="email" placeholder="Seu email" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px;" /><button type="submit" style="padding: 14px; background: #84CC16; color: #000; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Enviar</button></form></div></section>`,
    });

    bm.add("section-footer", {
      label: "Footer",
      category: "Seções",
      content: `<footer style="padding: 40px 20px; background: #050505; color: white; text-align: center;"><div style="max-width: 1000px; margin: 0 auto;"><div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 24px;"><a href="#" style="color: #84CC16; text-decoration: none; font-size: 14px;">Início</a><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Recursos</a><a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Preços</a></div><p style="font-size: 12px; opacity: 0.4; margin: 0;">© 2026 Sua Empresa. Todos os direitos reservados.</p></div></footer>`,
    });

    bm.add("gradient-heading", {
      label: "Título Gradiente",
      category: "Elementos",
      content: `<h2 style="font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #84CC16, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-align: center; margin: 0; padding: 20px;">Texto com Gradiente</h2>`,
    });

    bm.add("video-embed", {
      label: "Vídeo YouTube",
      category: "Elementos",
      content: `<div style="max-width: 800px; margin: 0 auto; padding: 20px;"><div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;"><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div></div>`,
    });

    bm.add("image-full", {
      label: "Imagem Full",
      category: "Elementos",
      content: `<div style="padding: 20px;"><img src="https://placehold.co/1200x600/1a1a2e/84CC16?text=Sua+Imagem" alt="Imagem" style="width: 100%; height: auto; border-radius: 12px; display: block;" /></div>`,
    });

    bm.add("divider", { label: "Divisor", category: "Elementos", content: `<hr style="border: none; height: 1px; background: linear-gradient(90deg, transparent, #84CC16, transparent); margin: 40px auto; max-width: 600px;" />` });
    bm.add("spacer", { label: "Espaçador", category: "Elementos", content: `<div style="height: 60px;"></div>` });
    bm.add("button-cta", {
      label: "Botão CTA",
      category: "Elementos",
      content: `<div style="text-align: center; padding: 20px;"><a href="#" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #84CC16, #65a30d); color: #000; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 15px rgba(132, 204, 22, 0.3);">Clique Aqui →</a></div>`,
    });
    bm.add("countdown", {
      label: "Contador",
      category: "Elementos",
      content: `<div style="display: flex; justify-content: center; gap: 16px; padding: 40px 20px;"><div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;"><span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">07</span><span style="font-size: 11px; opacity: 0.5; color: white;">DIAS</span></div><div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;"><span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">12</span><span style="font-size: 11px; opacity: 0.5; color: white;">HORAS</span></div><div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;"><span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">45</span><span style="font-size: 11px; opacity: 0.5; color: white;">MIN</span></div></div>`,
    });

    // Load content - properly parse full HTML docs
    if (parsed.bodyHtml) {
      // Set CSS first, then components
      if (parsed.css) {
        editor.setStyle(parsed.css);
      }
      editor.setComponents(parsed.bodyHtml);
    }

    // Inject inline scripts into canvas after components load
    if (parsed.inlineScripts.length > 0) {
      editor.on("load", () => {
        const canvas = editor.Canvas;
        const frame = canvas.getFrameEl();
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

    editorRef.current = editor;
  };

  const getFullHtml = useCallback(() => {
    if (!editorRef.current) return "";
    const editor = editorRef.current;
    const html = editor.getHtml();
    const css = editor.getCss();

    // Rebuild a clean head using original head content if available
    let headContent = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle || title}</title>
${metaDescription ? `<meta name="description" content="${metaDescription}">` : ""}`;

    // Re-inject original links/fonts from originalHeadContent
    if (originalHeadContent) {
      const linkMatches = originalHeadContent.match(/<link[^>]*>/gi);
      if (linkMatches) {
        headContent += "\n" + linkMatches.join("\n");
      }
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
    if (error) { toast({ title: error.message, variant: "destructive" }); }
    else { toast({ title: "Página salva com sucesso!" }); }
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
    if (editorRef.current) {
      editorRef.current.setDevice(device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile");
    }
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col" style={{ background: "#1a1a1a" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 flex-wrap z-50" style={{ borderBottom: "1px solid #2a2a2a", background: "#111" }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2" style={{ color: "white" }}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
          </Button>
          <span className="text-xs font-semibold truncate max-w-[180px]" style={{ color: "white" }}>{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: isPublished ? "rgba(132,204,22,0.2)" : "rgba(255,255,255,0.1)", color: isPublished ? "#a3e635" : "rgba(255,255,255,0.5)" }}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.7)" }} title="Desfazer"><Undo2 className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.7)" }} title="Refazer"><Redo2 className="h-3.5 w-3.5" /></Button>
          <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
          {(["desktop", "tablet", "mobile"] as const).map(d => (
            <Button key={d} variant="ghost" size="sm" onClick={() => handleDevice(d)} className="h-7 px-1.5" style={{ color: activeDevice === d ? "#a3e635" : "rgba(255,255,255,0.4)" }}>
              {d === "desktop" ? <Monitor className="h-3.5 w-3.5" /> : d === "tablet" ? <Tablet className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
            </Button>
          ))}
          <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
          <Button variant="ghost" size="sm" onClick={handleViewCode} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.7)" }} title="Ver código"><Code className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.7)" }} title="Exportar"><Download className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-1.5" style={{ color: "rgba(255,255,255,0.7)" }} title="Importar"><Upload className="h-3.5 w-3.5" /></Button>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleImportHTML} className="hidden" />
          <div className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.1)" }} />
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-7 px-2" style={{ color: "rgba(255,255,255,0.7)" }}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 font-semibold" style={{ background: "#84CC16", color: "#000" }}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-4 py-3 space-y-3 z-40" style={{ borderBottom: "1px solid #2a2a2a", background: "#151515" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Título</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="text-sm" style={{ background: "#222", borderColor: "#333", color: "white" }} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Slug (URL)</label>
              <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="text-sm" style={{ background: "#222", borderColor: "#333", color: "white" }} />
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{systemUrl}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Domínio Próprio</label>
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com" className="text-sm" style={{ background: "#222", borderColor: "#333", color: "white" }} />
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
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{f.label}</label>
                <Input value={f.val} onChange={e => f.set(e.target.value)} className="text-sm" style={{ background: "#222", borderColor: "#333", color: "white" }} />
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
          <div className="flex items-center justify-between px-4 py-2" style={{ background: "#111", borderBottom: "1px solid #2a2a2a" }}>
            <span className="text-sm font-semibold" style={{ color: "white" }}>Código HTML</span>
            <Button variant="ghost" size="sm" onClick={() => setShowCode(false)} style={{ color: "white" }}>Fechar</Button>
          </div>
          <textarea
            value={codeContent}
            onChange={e => setCodeContent(e.target.value)}
            className="flex-1 w-full resize-none p-4 font-mono text-xs focus:outline-none leading-5"
            style={{ background: "#0a0a0a", color: "#a3e635" }}
            spellCheck={false}
          />
          <div className="flex gap-2 p-2" style={{ background: "#111", borderTop: "1px solid #2a2a2a" }}>
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
        <div className="w-10 flex flex-col items-center py-2 gap-1" style={{ background: "#111", borderRight: "1px solid #2a2a2a" }}>
          {([
            { id: "blocks", icon: LayoutGrid, label: "Blocos" },
            { id: "styles", icon: Paintbrush, label: "Estilos" },
            { id: "layers", icon: Layers, label: "Camadas" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActivePanel(activePanel === id ? null : id)}
              className="p-2 rounded"
              style={{ color: activePanel === id ? "#a3e635" : "rgba(255,255,255,0.4)", background: activePanel === id ? "rgba(132,204,22,0.15)" : "transparent" }}
              title={label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        {/* Side Panel */}
        {activePanel && (
          <div className="w-64 overflow-y-auto" style={{ background: "#151515", borderRight: "1px solid #2a2a2a" }}>
            <div className="p-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>
                {activePanel === "blocks" ? "Blocos" : activePanel === "styles" ? "Estilos" : "Camadas"}
              </h3>
            </div>
            <div id={activePanel === "blocks" ? "gjs-blocks" : activePanel === "styles" ? "gjs-styles" : "gjs-layers"} />
          </div>
        )}

        {/* Canvas */}
        <div ref={containerRef} className="flex-1" />
      </div>
    </div>
  );
};

export default GrapesEditor;
