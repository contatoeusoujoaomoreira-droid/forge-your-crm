import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Code, Eye, Download, Upload, Smartphone, Tablet, Monitor, Settings, Zap, Grid3x3, Layers, Palette, Type } from "lucide-react";
import grapesjs from "grapesjs";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";
import { PROFESSIONAL_BLOCKS } from "./BlocksLibrary";

const GrapesEditorPro = () => {
  const { id: pageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [activeDevice, setActiveDevice] = useState("desktop");
  const [showCode, setShowCode] = useState(false);
  const [codeContent, setCodeContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pixelMeta, setPixelMeta] = useState("");
  const [pixelGoogle, setPixelGoogle] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Injetar Tailwind CSS no iframe do canvas
  const injectTailwindIntoCanvas = useCallback((editor: any) => {
    try {
      const frame = editor.Canvas.getDocument();
      if (!frame) return;

      // Injetar Tailwind CDN
      const tailwindScript = frame.createElement("script");
      tailwindScript.src = "https://cdn.tailwindcss.com";
      tailwindScript.async = true;
      frame.head.appendChild(tailwindScript);

      // Injetar Google Fonts
      const fontLink = frame.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800;900&display=swap";
      frame.head.appendChild(fontLink);

      // Injetar estilos globais
      const styleTag = frame.createElement("style");
      styleTag.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Plus Jakarta Sans', sans-serif; }
      `;
      frame.head.appendChild(styleTag);
    } catch (e) {
      console.error("Erro ao injetar Tailwind:", e);
    }
  }, []);

  // Carregar página existente
  useEffect(() => {
    const loadPage = async () => {
      if (!pageId) return;
      const { data, error } = await supabase.from("landing_pages").select("*").eq("id", pageId).single();
      if (error || !data) {
        toast({ title: "Página não encontrada", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setTitle(data.title);
      setSlug(data.slug);
      setIsPublished(data.is_published);
      setMetaTitle(data.meta_title || "");
      setMetaDescription(data.meta_description || "");
      setPixelMeta(data.pixel_meta_id || "");
      setPixelGoogle(data.pixel_google_id || "");
      setCustomDomain(data.custom_domain || "");

      if (data.html_content) {
        initEditor(data.html_content);
      }
    };
    loadPage();
  }, [pageId, navigate, toast]);

  // Inicializar GrapesJS com Tailwind
  const initEditor = (htmlContent: string) => {
    if (editorRef.current) editorRef.current.destroy();

    const editor = grapesjs.init({
      container: containerRef.current!,
      height: "100%",
      width: "auto",
      fromElement: false,
      storageManager: false,
      undoManager: { maximumStackLength: 100 },
      canvas: {
        styles: [
          "https://cdn.tailwindcss.com",
          "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
        ],
      },
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
            buildProps: ["display", "flex-direction", "justify-content", "align-items", "gap", "padding", "margin"],
          },
          {
            name: "Tipografia",
            open: false,
            buildProps: ["font-family", "font-size", "font-weight", "color", "line-height", "text-align"],
          },
          {
            name: "Fundo & Bordas",
            open: false,
            buildProps: ["background-color", "background", "border-radius", "border", "box-shadow"],
          },
          {
            name: "Dimensão",
            open: false,
            buildProps: ["width", "height", "min-width", "max-width", "min-height", "max-height"],
          },
        ],
      },
    });

    // Injetar Tailwind após inicialização
    setTimeout(() => injectTailwindIntoCanvas(editor), 500);

    // Carregar HTML
    if (htmlContent) {
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        editor.setComponents(bodyMatch[1]);
      }
    }

    // Adicionar blocos profissionais customizados
    addProfessionalBlocks(editor);

    editorRef.current = editor;
  };

  // Adicionar blocos profissionais
  const addProfessionalBlocks = (editor: any) => {
    const bm = editor.Blocks;
    
    // Adicionar todos os blocos da biblioteca
    Object.entries(PROFESSIONAL_BLOCKS).forEach(([key, block]: [string, any]) => {
      bm.add(key, {
        label: block.label,
        category: block.category,
        content: block.content,
      });
    });
  };

  // Obter HTML completo
  const getFullHtml = useCallback(() => {
    if (!editorRef.current) return "";
    const editor = editorRef.current;
    const html = editor.getHtml();
    const css = editor.getCss();

    const headContent = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${metaTitle || title}</title>
${metaDescription ? `<meta name="description" content="${metaDescription}">` : ""}
<script src="https://cdn.tailwindcss.com"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${css}
</style>
    `;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${headContent}
</head>
<body>
${html}
</body>
</html>`;
  }, [title, metaTitle, metaDescription]);

  // Salvar página
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
      toast({ title: "✅ Página salva com sucesso!" });
    }
  };

  // Visualizar código
  const handleViewCode = () => {
    if (editorRef.current) {
      setCodeContent(getFullHtml());
      setShowCode(!showCode);
    }
  };

  // Mudar dispositivo
  const handleDevice = (device: string) => {
    setActiveDevice(device);
    if (editorRef.current) {
      const deviceName = device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Mobile";
      editorRef.current.setDevice(deviceName);
    }
  };

  useEffect(() => {
    // Injetar CSS do GrapesJS via CDN
    const link1 = document.createElement("link");
    link1.rel = "stylesheet";
    link1.href = "https://unpkg.com/grapesjs@latest/dist/grapes.min.css";
    document.head.appendChild(link1);

    const link2 = document.createElement("link");
    link2.rel = "stylesheet";
    link2.href = "https://unpkg.com/grapesjs-blocks-basic@latest/dist/grapesjs-blocks-basic.min.css";
    document.head.appendChild(link2);

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Top Bar */}
      <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da página"
            className="h-8 text-xs bg-slate-700 border-slate-600 text-white"
          />
          <span className="text-xs text-slate-400">/p/{slug}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-700 rounded p-1">
            <button
              onClick={() => handleDevice("mobile")}
              className={`p-1.5 rounded ${activeDevice === "mobile" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDevice("tablet")}
              className={`p-1.5 rounded ${activeDevice === "tablet" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDevice("desktop")}
              className={`p-1.5 rounded ${activeDevice === "desktop" ? "bg-blue-600 text-white" : "text-slate-400"}`}
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>

          <Button onClick={handleViewCode} size="sm" variant="outline" className="h-8 text-xs gap-1">
            <Code className="h-3 w-3" /> Código
          </Button>

          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="outline" className="h-8 text-xs gap-1">
            <Settings className="h-3 w-3" /> Config
          </Button>

          <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700">
            <Save className="h-3 w-3" /> {saving ? "Salvando..." : "Salvar"}
          </Button>

          <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} /> Publicar
          </label>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="h-32 bg-slate-800 border-b border-slate-700 overflow-y-auto p-4 space-y-3">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-slate-400">Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="h-7 text-xs bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Meta Description</Label>
              <Input
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="h-7 text-xs bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pixel Meta</Label>
              <Input
                value={pixelMeta}
                onChange={(e) => setPixelMeta(e.target.value)}
                className="h-7 text-xs bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pixel Google</Label>
              <Input
                value={pixelGoogle}
                onChange={(e) => setPixelGoogle(e.target.value)}
                className="h-7 text-xs bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Blocks */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto flex flex-col">
          <Tabs defaultValue="blocks" className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none bg-slate-700 border-b border-slate-600">
              <TabsTrigger value="blocks" className="text-xs">Blocos</TabsTrigger>
              <TabsTrigger value="layers" className="text-xs">Camadas</TabsTrigger>
              <TabsTrigger value="styles" className="text-xs">Estilos</TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="flex-1 overflow-y-auto p-2">
              <div id="gjs-blocks" className="space-y-2" />
            </TabsContent>

            <TabsContent value="layers" className="flex-1 overflow-y-auto p-2">
              <div id="gjs-layers" className="space-y-1" />
            </TabsContent>

            <TabsContent value="styles" className="flex-1 overflow-y-auto p-2">
              <div id="gjs-styles" className="space-y-2" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1" />

        {/* Right Sidebar - Traits */}
        <div className="w-64 bg-slate-800 border-l border-slate-700 overflow-y-auto p-2">
          <div id="gjs-traits" className="space-y-2" />
        </div>
      </div>

      {/* Code Modal */}
      {showCode && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <span className="text-sm font-semibold text-white">Código HTML</span>
              <button onClick={() => setShowCode(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <Textarea
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              className="flex-1 resize-none p-4 font-mono text-xs bg-slate-900 border-0 text-blue-400"
            />
            <div className="flex gap-2 p-4 border-t border-slate-700">
              <Button onClick={() => setShowCode(false)} size="sm">Fechar</Button>
              <Button
                onClick={() => {
                  if (editorRef.current) {
                    const bodyMatch = codeContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                    if (bodyMatch) {
                      editorRef.current.setComponents(bodyMatch[1]);
                      toast({ title: "✅ Código aplicado!" });
                      setShowCode(false);
                    }
                  }
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrapesEditorPro;
