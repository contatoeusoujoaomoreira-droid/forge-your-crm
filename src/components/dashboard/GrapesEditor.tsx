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
  Smartphone, Code, Eye, Undo2, Redo2, Download, Upload, Layers,
  Paintbrush, LayoutGrid, Type, Image, Video, BoxSelect,
} from "lucide-react";

interface Props {
  pageId: string;
  onBack: () => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load page data
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

        // Init GrapesJS after data loads
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
    const editor = grapesjs.init({
      container: containerRef.current!,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      undoManager: { maximumStackLength: 50 },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700;800;900&family=Montserrat:wght@300;400;500;600;700;800;900&family=Roboto:wght@300;400;500;700;900&family=Playfair+Display:wght@400;500;600;700;800;900&display=swap",
        ],
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
                  { value: "Inter, sans-serif", name: "Inter" },
                  { value: "Poppins, sans-serif", name: "Poppins" },
                  { value: "Montserrat, sans-serif", name: "Montserrat" },
                  { value: "Roboto, sans-serif", name: "Roboto" },
                  { value: "Playfair Display, serif", name: "Playfair Display" },
                  { value: "Georgia, serif", name: "Georgia" },
                  { value: "Arial, sans-serif", name: "Arial" },
                  { value: "Helvetica, sans-serif", name: "Helvetica" },
                  { value: "monospace", name: "Monospace" },
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

    // Add custom blocks
    const bm = editor.Blocks;

    bm.add("section-hero", {
      label: "Hero Section",
      category: "Seções",
      content: `<section style="padding: 80px 20px; text-align: center; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); color: white; min-height: 500px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <span style="display: inline-block; padding: 6px 16px; border-radius: 20px; background: rgba(132, 204, 22, 0.15); color: #84CC16; font-size: 14px; margin-bottom: 24px;">🔥 Destaque</span>
        <h1 style="font-size: 48px; font-weight: 800; margin: 0 0 16px; max-width: 800px; line-height: 1.1;">Título Principal da Sua Página</h1>
        <p style="font-size: 18px; opacity: 0.8; margin: 0 0 32px; max-width: 600px;">Subtítulo com a proposta de valor que convence seu visitante a agir agora.</p>
        <a href="#" style="display: inline-block; padding: 14px 32px; background: #84CC16; color: #000; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px;">Começar Agora →</a>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="10" x2="18" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>',
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
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso e seus benefícios.</p>
            </div>
            <div style="padding: 32px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
              <div style="font-size: 32px; margin-bottom: 16px;">⚡</div>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Recurso 2</h3>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso e seus benefícios.</p>
            </div>
            <div style="padding: 32px; background: #1a1a1a; border-radius: 12px; border: 1px solid #2a2a2a;">
              <div style="font-size: 32px; margin-bottom: 16px;">🎯</div>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Recurso 3</h3>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Descrição breve do recurso e seus benefícios.</p>
            </div>
          </div>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="12" width="6" height="6" rx="1"/><rect x="9" y="12" width="6" height="6" rx="1"/><rect x="16" y="12" width="6" height="6" rx="1"/></svg>',
    });

    bm.add("section-testimonials", {
      label: "Depoimentos",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #111; color: white;">
        <div style="max-width: 1000px; margin: 0 auto; text-align: center;">
          <h2 style="font-size: 32px; font-weight: 700; margin: 0 0 40px;">O que nossos clientes dizem</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;">
            <div style="padding: 24px; background: #1a1a1a; border-radius: 12px; text-align: left;">
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 16px;">"Depoimento incrível de um cliente satisfeito que amou o produto."</p>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #84CC16;"></div>
                <div>
                  <p style="font-size: 14px; font-weight: 600; margin: 0;">Nome do Cliente</p>
                  <p style="font-size: 12px; opacity: 0.5; margin: 0;">CEO da Empresa</p>
                </div>
              </div>
            </div>
            <div style="padding: 24px; background: #1a1a1a; border-radius: 12px; text-align: left;">
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 16px;">"Outro depoimento incrível de um cliente satisfeito que recomenda."</p>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6;"></div>
                <div>
                  <p style="font-size: 14px; font-weight: 600; margin: 0;">Nome do Cliente</p>
                  <p style="font-size: 12px; opacity: 0.5; margin: 0;">Diretor de Marketing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11h5v5H4z"/><path d="M15 11h5v5h-5z"/><path d="M4 8l2.5-3L9 8"/><path d="M15 8l2.5-3L20 8"/></svg>',
    });

    bm.add("section-pricing", {
      label: "Preços",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #0a0a0a; color: white;">
        <div style="max-width: 1000px; margin: 0 auto; text-align: center;">
          <h2 style="font-size: 36px; font-weight: 700; margin: 0 0 48px;">Planos e Preços</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
            <div style="padding: 32px; background: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;">
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Básico</h3>
              <p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$49<span style="font-size: 14px; opacity: 0.5;">/mês</span></p>
              <ul style="list-style: none; padding: 0; margin: 0 0 24px; text-align: left;">
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Recurso 1</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Recurso 2</li>
                <li style="padding: 8px 0; font-size: 14px; opacity: 0.4;">❌ Recurso 3</li>
              </ul>
              <a href="#" style="display: block; padding: 12px; background: #333; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Escolher</a>
            </div>
            <div style="padding: 32px; background: linear-gradient(135deg, #1a2e0a, #1a1a2e); border-radius: 16px; border: 2px solid #84CC16; transform: scale(1.05);">
              <span style="display: inline-block; padding: 4px 12px; background: #84CC16; color: #000; border-radius: 12px; font-size: 11px; font-weight: 700; margin-bottom: 12px;">POPULAR</span>
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Pro</h3>
              <p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$99<span style="font-size: 14px; opacity: 0.5;">/mês</span></p>
              <ul style="list-style: none; padding: 0; margin: 0 0 24px; text-align: left;">
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Tudo do Básico</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Recurso 3</li>
                <li style="padding: 8px 0; font-size: 14px;">✅ Recurso 4</li>
              </ul>
              <a href="#" style="display: block; padding: 12px; background: #84CC16; color: #000; border-radius: 8px; text-decoration: none; font-weight: 700;">Escolher</a>
            </div>
            <div style="padding: 32px; background: #1a1a1a; border-radius: 16px; border: 1px solid #2a2a2a;">
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Enterprise</h3>
              <p style="font-size: 36px; font-weight: 800; margin: 0 0 16px;">R$199<span style="font-size: 14px; opacity: 0.5;">/mês</span></p>
              <ul style="list-style: none; padding: 0; margin: 0 0 24px; text-align: left;">
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Tudo do Pro</li>
                <li style="padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 14px;">✅ Suporte Premium</li>
                <li style="padding: 8px 0; font-size: 14px;">✅ API Ilimitada</li>
              </ul>
              <a href="#" style="display: block; padding: 12px; background: #333; color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">Escolher</a>
            </div>
          </div>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="12" y1="9" x2="12" y2="20"/></svg>',
    });

    bm.add("section-cta", {
      label: "CTA Section",
      category: "Seções",
      content: `<section style="padding: 80px 20px; background: linear-gradient(135deg, #84CC16 0%, #65a30d 100%); text-align: center;">
        <div style="max-width: 700px; margin: 0 auto;">
          <h2 style="font-size: 36px; font-weight: 800; color: #000; margin: 0 0 16px;">Pronto para Começar?</h2>
          <p style="font-size: 18px; color: rgba(0,0,0,0.7); margin: 0 0 32px;">Junte-se a milhares de clientes satisfeitos que transformaram seus resultados.</p>
          <a href="#" style="display: inline-block; padding: 16px 40px; background: #000; color: white; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px;">Começar Agora →</a>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 14h8M10 10h4"/></svg>',
    });

    bm.add("section-faq", {
      label: "FAQ",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #111; color: white;">
        <div style="max-width: 700px; margin: 0 auto;">
          <h2 style="text-align: center; font-size: 32px; font-weight: 700; margin: 0 0 40px;">Perguntas Frequentes</h2>
          <div style="border-top: 1px solid #2a2a2a;">
            <div style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;">
              <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Como funciona o serviço?</h4>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Resposta detalhada sobre como o serviço funciona e quais os benefícios.</p>
            </div>
            <div style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;">
              <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Posso cancelar a qualquer momento?</h4>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Sim, você pode cancelar sua assinatura a qualquer momento sem taxas.</p>
            </div>
            <div style="padding: 20px 0; border-bottom: 1px solid #2a2a2a;">
              <h4 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Qual o suporte disponível?</h4>
              <p style="font-size: 14px; opacity: 0.7; margin: 0;">Oferecemos suporte via chat, email e telefone em horário comercial.</p>
            </div>
          </div>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 015.12-2.13 3 3 0 01-1.62 5.63H12v1"/><circle cx="12" cy="17" r=".5"/></svg>',
    });

    bm.add("section-form", {
      label: "Formulário",
      category: "Seções",
      content: `<section style="padding: 60px 20px; background: #0a0a0a; color: white;">
        <div style="max-width: 500px; margin: 0 auto;">
          <h2 style="text-align: center; font-size: 28px; font-weight: 700; margin: 0 0 8px;">Entre em contato</h2>
          <p style="text-align: center; font-size: 14px; opacity: 0.6; margin: 0 0 32px;">Preencha o formulário e entraremos em contato.</p>
          <form style="display: flex; flex-direction: column; gap: 16px;">
            <input type="text" placeholder="Seu nome" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px;" />
            <input type="email" placeholder="Seu email" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px;" />
            <input type="tel" placeholder="Seu telefone" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px;" />
            <textarea placeholder="Sua mensagem" rows="4" style="padding: 12px 16px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: white; font-size: 14px; resize: vertical;"></textarea>
            <button type="submit" style="padding: 14px; background: #84CC16; color: #000; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Enviar</button>
          </form>
        </div>
      </section>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="12" y2="16"/></svg>',
    });

    bm.add("section-footer", {
      label: "Footer",
      category: "Seções",
      content: `<footer style="padding: 40px 20px; background: #050505; color: white; text-align: center;">
        <div style="max-width: 1000px; margin: 0 auto;">
          <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 24px;">
            <a href="#" style="color: #84CC16; text-decoration: none; font-size: 14px;">Início</a>
            <a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Recursos</a>
            <a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Preços</a>
            <a href="#" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 14px;">Contato</a>
          </div>
          <p style="font-size: 12px; opacity: 0.4; margin: 0;">© 2026 Sua Empresa. Todos os direitos reservados.</p>
        </div>
      </footer>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="14" width="20" height="6" rx="1"/><line x1="6" y1="17" x2="18" y2="17"/></svg>',
    });

    bm.add("gradient-heading", {
      label: "Título Gradiente",
      category: "Elementos",
      content: `<h2 style="font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #84CC16, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-align: center; margin: 0; padding: 20px;">Texto com Gradiente</h2>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
    });

    bm.add("video-embed", {
      label: "Vídeo YouTube",
      category: "Elementos",
      content: `<div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px;">
          <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
        </div>
      </div>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16"/></svg>',
    });

    bm.add("image-full", {
      label: "Imagem Full",
      category: "Elementos",
      content: `<div style="padding: 20px;">
        <img src="https://placehold.co/1200x600/1a1a2e/84CC16?text=Sua+Imagem" alt="Imagem" style="width: 100%; height: auto; border-radius: 12px; display: block;" />
      </div>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    });

    bm.add("divider", {
      label: "Divisor",
      category: "Elementos",
      content: `<hr style="border: none; height: 1px; background: linear-gradient(90deg, transparent, #84CC16, transparent); margin: 40px auto; max-width: 600px;" />`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="12" x2="20" y2="12"/></svg>',
    });

    bm.add("spacer", {
      label: "Espaçador",
      category: "Elementos",
      content: `<div style="height: 60px;"></div>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="4" x2="12" y2="20"/><line x1="8" y1="4" x2="16" y2="4"/><line x1="8" y1="20" x2="16" y2="20"/></svg>',
    });

    bm.add("button-cta", {
      label: "Botão CTA",
      category: "Elementos",
      content: `<div style="text-align: center; padding: 20px;">
        <a href="#" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #84CC16, #65a30d); color: #000; font-weight: 700; border-radius: 8px; text-decoration: none; font-size: 16px; box-shadow: 0 4px 15px rgba(132, 204, 22, 0.3);">Clique Aqui →</a>
      </div>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="8" width="16" height="8" rx="4"/><line x1="9" y1="12" x2="15" y2="12"/></svg>',
    });

    bm.add("countdown", {
      label: "Contador",
      category: "Elementos",
      content: `<div style="display: flex; justify-content: center; gap: 16px; padding: 40px 20px;">
        <div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;">
          <span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">07</span>
          <span style="font-size: 11px; opacity: 0.5; color: white;">DIAS</span>
        </div>
        <div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;">
          <span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">12</span>
          <span style="font-size: 11px; opacity: 0.5; color: white;">HORAS</span>
        </div>
        <div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;">
          <span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">45</span>
          <span style="font-size: 11px; opacity: 0.5; color: white;">MINUTOS</span>
        </div>
        <div style="text-align: center; background: #1a1a1a; padding: 20px; border-radius: 12px; min-width: 80px; border: 1px solid #2a2a2a;">
          <span style="font-size: 36px; font-weight: 800; color: #84CC16; display: block;">30</span>
          <span style="font-size: 11px; opacity: 0.5; color: white;">SEGUNDOS</span>
        </div>
      </div>`,
      media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    });

    // Load initial content
    if (htmlContent) {
      editor.setComponents(htmlContent);
      // Extract styles from HTML
      const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatch) {
        const cssContent = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
        editor.setStyle(cssContent);
      }
    }

    editorRef.current = editor;
  };

  const getFullHtml = useCallback(() => {
    if (!editorRef.current) return "";
    const editor = editorRef.current;
    const html = editor.getHtml();
    const css = editor.getCss();
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle || title}</title>
${metaDescription ? `<meta name="description" content="${metaDescription}">` : ""}
<style>${css}</style>
</head>
<body>${html}</body>
</html>`;
  }, [metaTitle, title, metaDescription]);

  const handleSave = async () => {
    setSaving(true);
    const fullHtml = getFullHtml();
    const { error } = await supabase.from("landing_pages").update({
      html_content: fullHtml,
      title,
      slug,
      custom_domain: customDomain || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      pixel_meta_id: pixelMeta || null,
      pixel_google_id: pixelGoogle || null,
      is_published: isPublished,
    } as any).eq("id", pageId);
    setSaving(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
    } else {
      toast({ title: "Página salva com sucesso!" });
    }
  };

  const handleExportHTML = () => {
    const fullHtml = getFullHtml();
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportHTML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (editorRef.current) {
        editorRef.current.setComponents(content);
        const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (styleMatch) {
          const css = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
          editorRef.current.setStyle(css);
        }
        toast({ title: "HTML importado!" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [title, slug, metaTitle, metaDescription, pixelMeta, pixelGoogle, isPublished, customDomain]);

  const systemUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#1a1a1a]">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#2a2a2a] bg-[#111] flex-wrap z-50">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2 text-white hover:bg-white/10">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
          </Button>
          <span className="text-xs font-semibold text-white truncate max-w-[180px]">{title}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isPublished ? "bg-lime-500/20 text-lime-400" : "bg-white/10 text-white/50"}`}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={handleUndo} className="h-7 px-1.5 text-white/70 hover:bg-white/10" title="Desfazer">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} className="h-7 px-1.5 text-white/70 hover:bg-white/10" title="Refazer">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Devices */}
          <Button variant="ghost" size="sm" onClick={() => handleDevice("desktop")} className={`h-7 px-1.5 ${activeDevice === "desktop" ? "text-lime-400" : "text-white/50"} hover:bg-white/10`}>
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDevice("tablet")} className={`h-7 px-1.5 ${activeDevice === "tablet" ? "text-lime-400" : "text-white/50"} hover:bg-white/10`}>
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDevice("mobile")} className={`h-7 px-1.5 ${activeDevice === "mobile" ? "text-lime-400" : "text-white/50"} hover:bg-white/10`}>
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button variant="ghost" size="sm" onClick={handleViewCode} className="h-7 px-1.5 text-white/70 hover:bg-white/10" title="Ver código">
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} className="h-7 px-1.5 text-white/70 hover:bg-white/10" title="Exportar">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-1.5 text-white/70 hover:bg-white/10" title="Importar">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleImportHTML} className="hidden" />
          <div className="w-px h-5 bg-white/10 mx-1" />

          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-7 px-2 text-white/70 hover:bg-white/10">
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 bg-lime-500 text-black hover:bg-lime-400 font-semibold">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-[#2a2a2a] bg-[#151515] px-4 py-3 space-y-3 z-40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Título</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Slug (URL)</label>
              <Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="bg-[#222] border-[#333] text-white text-sm" />
              <p className="text-[10px] text-white/30 mt-0.5">{systemUrl}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Domínio Próprio</label>
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com" className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Meta Title</label>
              <Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Meta Description</label>
              <Input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Pixel Meta</label>
              <Input value={pixelMeta} onChange={e => setPixelMeta(e.target.value)} className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Pixel Google</label>
              <Input value={pixelGoogle} onChange={e => setPixelGoogle(e.target.value)} className="bg-[#222] border-[#333] text-white text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              Publicada
            </label>
            {isPublished && slug && (
              <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-400 flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> Abrir
              </a>
            )}
          </div>
        </div>
      )}

      {/* Code Viewer Overlay */}
      {showCode && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-[#111] border-b border-[#2a2a2a]">
            <span className="text-sm text-white font-semibold">Código HTML</span>
            <Button variant="ghost" size="sm" onClick={() => setShowCode(false)} className="text-white hover:bg-white/10">Fechar</Button>
          </div>
          <textarea
            value={codeContent}
            onChange={e => setCodeContent(e.target.value)}
            className="flex-1 w-full resize-none p-4 font-mono text-xs bg-[#0a0a0a] text-lime-300 focus:outline-none leading-5"
            spellCheck={false}
          />
          <div className="flex gap-2 p-2 bg-[#111] border-t border-[#2a2a2a]">
            <Button size="sm" onClick={() => {
              if (editorRef.current) {
                editorRef.current.setComponents(codeContent);
                const styleMatch = codeContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
                if (styleMatch) {
                  const css = styleMatch.map(s => s.replace(/<\/?style[^>]*>/gi, "")).join("\n");
                  editorRef.current.setStyle(css);
                }
                setShowCode(false);
                toast({ title: "HTML aplicado!" });
              }
            }} className="bg-lime-500 text-black hover:bg-lime-400">
              Aplicar Código
            </Button>
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Panel Switcher */}
        <div className="w-10 bg-[#111] border-r border-[#2a2a2a] flex flex-col items-center py-2 gap-1">
          <button
            onClick={() => setActivePanel(activePanel === "blocks" ? null : "blocks")}
            className={`p-2 rounded ${activePanel === "blocks" ? "bg-lime-500/20 text-lime-400" : "text-white/40 hover:text-white/70"}`}
            title="Blocos"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "styles" ? null : "styles")}
            className={`p-2 rounded ${activePanel === "styles" ? "bg-lime-500/20 text-lime-400" : "text-white/40 hover:text-white/70"}`}
            title="Estilos"
          >
            <Paintbrush className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")}
            className={`p-2 rounded ${activePanel === "layers" ? "bg-lime-500/20 text-lime-400" : "text-white/40 hover:text-white/70"}`}
            title="Camadas"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>

        {/* Side Panel Content */}
        {activePanel && (
          <div className="w-64 bg-[#151515] border-r border-[#2a2a2a] overflow-y-auto">
            <div className="p-3 border-b border-[#2a2a2a]">
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                {activePanel === "blocks" ? "Blocos" : activePanel === "styles" ? "Estilos" : "Camadas"}
              </h3>
            </div>
            <div id={activePanel === "blocks" ? "gjs-blocks" : activePanel === "styles" ? "gjs-styles" : "gjs-layers"} />
          </div>
        )}

        {/* GrapesJS Canvas */}
        <div ref={containerRef} className="flex-1" />
      </div>
    </div>
  );
};

export default GrapesEditor;
