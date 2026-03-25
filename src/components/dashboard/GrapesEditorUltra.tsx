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
import { 
  Save, Code, Eye, Download, Upload, Smartphone, Tablet, Monitor, Settings, 
  Zap, Grid3x3, Layers, Palette, Type, Search, Copy, Trash2, RotateCcw, 
  ChevronDown, Sparkles, Wand2, Lock, Unlock, Eye as EyeIcon, EyeOff
} from "lucide-react";
import grapesjs from "grapesjs";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";
import { PROFESSIONAL_BLOCKS } from "./BlocksLibrary";

const GrapesEditorUltra = () => {
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
  const [searchBlocks, setSearchBlocks] = useState("");
  const [activeBlockCategory, setActiveBlockCategory] = useState("all");
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [showElementActions, setShowElementActions] = useState(false);
  const [zoom, setZoom] = useState(100);

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

  // Injetar CSS do GrapesJS via CDN
  useEffect(() => {
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

    // Listener para seleção de elementos
    editor.on("component:selected", (component: any) => {
      setSelectedElement(component);
    });

    editor.on("component:deselected", () => {
      setSelectedElement(null);
    });

    editorRef.current = editor;
  };

  // Adicionar blocos profissionais
  const addProfessionalBlocks = (editor: any) => {
    const bm = editor.Blocks;
    
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

  // Super Poderes: Duplicar elemento
  const duplicateElement = () => {
    if (selectedElement && editorRef.current) {
      const clone = selectedElement.clone();
      selectedElement.parent().append(clone);
      toast({ title: "✅ Elemento duplicado!" });
    }
  };

  // Super Poderes: Deletar elemento
  const deleteElement = () => {
    if (selectedElement) {
      selectedElement.remove();
      setSelectedElement(null);
      toast({ title: "✅ Elemento removido!" });
    }
  };

  // Super Poderes: Resetar elemento
  const resetElement = () => {
    if (selectedElement) {
      selectedElement.setStyle({});
      toast({ title: "✅ Estilos resetados!" });
    }
  };

  // Filtrar blocos
  const filteredBlocks = Object.entries(PROFESSIONAL_BLOCKS).filter(([_, block]: [string, any]) => {
    const matchesSearch = block.label.toLowerCase().includes(searchBlocks.toLowerCase());
    const matchesCategory = activeBlockCategory === "all" || block.category === activeBlockCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(Object.values(PROFESSIONAL_BLOCKS).map((b: any) => b.category)))];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Bar - Dark Mode Pro */}
      <div className="h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 flex items-center justify-between px-6 gap-4 shadow-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col gap-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da página"
              className="h-8 text-xs bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
            />
            <span className="text-xs text-slate-500">/p/{slug}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Selector */}
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={() => handleDevice("mobile")}
              className={`p-2 rounded transition-all ${activeDevice === "mobile" ? "bg-blue-600/80 text-blue-100 shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-300"}`}
              title="Mobile"
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDevice("tablet")}
              className={`p-2 rounded transition-all ${activeDevice === "tablet" ? "bg-blue-600/80 text-blue-100 shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-300"}`}
              title="Tablet"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDevice("desktop")}
              className={`p-2 rounded transition-all ${activeDevice === "desktop" ? "bg-blue-600/80 text-blue-100 shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-300"}`}
              title="Desktop"
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1 border border-slate-700/50">
            <span className="text-xs text-slate-400">{zoom}%</span>
            <input
              type="range"
              min="50"
              max="200"
              value={zoom}
              onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-20 h-1 bg-slate-700 rounded cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <Button onClick={handleViewCode} size="sm" variant="ghost" className="h-9 text-xs gap-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50">
            <Code className="h-4 w-4" /> Código
          </Button>

          <Button onClick={() => setShowSettings(!showSettings)} size="sm" variant="ghost" className="h-9 text-xs gap-2 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50">
            <Settings className="h-4 w-4" /> Config
          </Button>

          <Button onClick={handleSave} disabled={saving} size="sm" className="h-9 text-xs gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/20">
            <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>

          <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} /> 
            <span>Publicar</span>
          </label>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="h-32 bg-slate-800/30 border-b border-slate-700/50 overflow-y-auto p-4 space-y-3 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-slate-400">Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-100 mt-1 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Meta Description</Label>
              <Input
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-100 mt-1 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pixel Meta</Label>
              <Input
                value={pixelMeta}
                onChange={(e) => setPixelMeta(e.target.value)}
                className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-100 mt-1 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Pixel Google</Label>
              <Input
                value={pixelGoogle}
                onChange={(e) => setPixelGoogle(e.target.value)}
                className="h-7 text-xs bg-slate-800/50 border-slate-700 text-slate-100 mt-1 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden gap-0">
        {/* Left Sidebar - Blocks Library */}
        <div className="w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-700/50 overflow-hidden flex flex-col shadow-2xl">
          {/* Search */}
          <div className="p-4 border-b border-slate-700/50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar blocos..."
                value={searchBlocks}
                onChange={(e) => setSearchBlocks(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveBlockCategory(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    activeBlockCategory === cat
                      ? "bg-blue-600/80 text-blue-100 shadow-lg shadow-blue-500/20"
                      : "bg-slate-800/50 text-slate-400 hover:text-slate-300 border border-slate-700/50"
                  }`}
                >
                  {cat === "all" ? "Todos" : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Blocks Grid */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredBlocks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhum bloco encontrado</p>
              </div>
            ) : (
              filteredBlocks.map(([key, block]: [string, any]) => (
                <div
                  key={key}
                  draggable
                  onDragStart={(e) => {
                    if (editorRef.current) {
                      e.dataTransfer!.effectAllowed = "move";
                      editorRef.current.Blocks.getConfig("draggable:start");
                    }
                  }}
                  className="p-3 bg-gradient-to-br from-slate-800/50 to-slate-800/30 border border-slate-700/50 rounded-lg hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 cursor-move transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-2xl mt-1">{block.category === "Hero" ? "🎯" : block.category === "Features" ? "⚡" : block.category === "Pricing" ? "💰" : block.category === "Social Proof" ? "⭐" : block.category === "CTA" ? "🚀" : "📍"}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{block.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{block.category}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* GJS Blocks Container */}
          <div id="gjs-blocks" className="hidden" />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div ref={containerRef} className="flex-1" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} />
        </div>

        {/* Right Sidebar - Inspector & Layers */}
        <div className="w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-l border-slate-700/50 overflow-hidden flex flex-col shadow-2xl">
          <Tabs defaultValue="inspector" className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none bg-slate-800/50 border-b border-slate-700/50">
              <TabsTrigger value="inspector" className="text-xs">Inspector</TabsTrigger>
              <TabsTrigger value="layers" className="text-xs">Camadas</TabsTrigger>
              <TabsTrigger value="styles" className="text-xs">Estilos</TabsTrigger>
            </TabsList>

            <TabsContent value="inspector" className="flex-1 overflow-y-auto p-3 space-y-3">
              {selectedElement ? (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-100 mb-3">Ações Rápidas</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={duplicateElement}
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
                        title="Duplicar"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={resetElement}
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1 text-slate-300 hover:text-slate-100 hover:bg-slate-700/50"
                        title="Resetar"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                      <Button
                        onClick={deleteElement}
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        title="Deletar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div id="gjs-traits" className="space-y-2" />
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Selecione um elemento para editar</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="layers" className="flex-1 overflow-y-auto p-3">
              <div id="gjs-layers" className="space-y-1" />
            </TabsContent>

            <TabsContent value="styles" className="flex-1 overflow-y-auto p-3">
              <div id="gjs-styles" className="space-y-2" />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Code Modal */}
      {showCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-semibold text-slate-100">Código HTML</span>
              </div>
              <button onClick={() => setShowCode(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <span className="text-2xl">✕</span>
              </button>
            </div>
            <Textarea
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              className="flex-1 resize-none p-4 font-mono text-xs bg-slate-950 border-0 text-blue-400 focus:ring-0"
            />
            <div className="flex gap-2 p-4 border-t border-slate-700 bg-slate-900/50">
              <Button onClick={() => setShowCode(false)} size="sm" variant="ghost" className="text-slate-300 hover:text-slate-100">
                Fechar
              </Button>
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
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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

export default GrapesEditorUltra;
