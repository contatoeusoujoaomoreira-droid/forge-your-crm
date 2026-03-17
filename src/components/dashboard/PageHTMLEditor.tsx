import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  ArrowLeft, Save, Eye, Code, Monitor, Smartphone, Tablet,
  ExternalLink, Undo2, Redo2, Search, Replace, Download, Upload, Copy,
} from "lucide-react";

interface Props {
  pageId: string;
  onBack: () => void;
}

const PageHTMLEditor = ({ pageId, onBack }: Props) => {
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pixelMeta, setPixelMeta] = useState("");
  const [pixelGoogle, setPixelGoogle] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"code" | "preview" | "split">("split");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSavedHtml, setLastSavedHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("landing_pages").select("*").eq("id", pageId).single();
      if (data) {
        const content = (data as any).html_content || "";
        setHtml(content);
        setLastSavedHtml(content);
        setHistory([content]);
        setHistoryIndex(0);
        setTitle(data.title);
        setSlug(data.slug);
        setCustomDomain((data as any).custom_domain || "");
        setMetaTitle(data.meta_title || "");
        setMetaDescription(data.meta_description || "");
        setPixelMeta(data.pixel_meta_id || "");
        setPixelGoogle(data.pixel_google_id || "");
        setIsPublished(data.is_published);
      }
    };
    load();
  }, [pageId]);

  // Update preview iframe
  useEffect(() => {
    if (iframeRef.current && (view === "preview" || view === "split")) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html, view]);

  // Push to history on change (debounced)
  const pushHistory = useCallback((newHtml: string) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newHtml].slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleHtmlChange = (value: string) => {
    setHtml(value);
  };

  // Debounced history push
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (html !== history[historyIndex]) {
        pushHistory(html);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [html]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setHtml(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setHtml(history[newIndex]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_pages").update({
      html_content: html,
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
      setLastSavedHtml(html);
      toast({ title: "Página salva com sucesso!" });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [html, historyIndex, history]);

  const handleSearchReplace = () => {
    if (!searchTerm) return;
    const newHtml = html.split(searchTerm).join(replaceTerm);
    setHtml(newHtml);
    const count = (html.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    toast({ title: `${count} ocorrência(s) substituída(s)` });
  };

  const handleExportHTML = () => {
    const blob = new Blob([html], { type: "text/html" });
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
      setHtml(content);
      toast({ title: "HTML importado com sucesso!" });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(html);
    toast({ title: "HTML copiado!" });
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newVal = html.substring(0, start) + "  " + html.substring(end);
      setHtml(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";
  const hasUnsavedChanges = html !== lastSavedHtml;
  const systemUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  const lineCount = html.split("\n").length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Voltar
          </Button>
          <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">{title}</span>
          {hasUnsavedChanges && <span className="h-2 w-2 rounded-full bg-amber-500" title="Alterações não salvas" />}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isPublished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Undo/Redo */}
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="h-7 px-1.5" title="Desfazer (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="h-7 px-1.5" title="Refazer (Ctrl+Y)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />

          {/* View modes */}
          <Button variant={view === "code" ? "default" : "ghost"} size="sm" onClick={() => setView("code")} className="h-7 px-2">
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "split" ? "default" : "ghost"} size="sm" onClick={() => setView("split")} className="h-7 px-2">
            <Monitor className="h-3.5 w-3.5 mr-0.5" /><Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "preview" ? "default" : "ghost"} size="sm" onClick={() => setView("preview")} className="h-7 px-2">
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Device preview */}
          <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("desktop")} className="h-7 px-1.5">
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("tablet")} className="h-7 px-1.5">
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("mobile")} className="h-7 px-1.5">
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />

          {/* Tools */}
          <Button variant="ghost" size="sm" onClick={() => setShowSearch(!showSearch)} className="h-7 px-1.5" title="Buscar (Ctrl+F)">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyHTML} className="h-7 px-1.5" title="Copiar HTML">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} className="h-7 px-1.5" title="Exportar HTML">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-1.5" title="Importar HTML">
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleImportHTML} className="hidden" />
          <div className="w-px h-5 bg-border mx-1" />

          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-7 px-2 text-xs">
            ⚙️ Config
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Search/Replace bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/50">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="px-2 py-1 text-xs bg-background border border-border rounded w-48 focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <Replace className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={replaceTerm}
            onChange={e => setReplaceTerm(e.target.value)}
            placeholder="Substituir..."
            className="px-2 py-1 text-xs bg-background border border-border rounded w-48 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button variant="outline" size="sm" onClick={handleSearchReplace} className="h-6 text-[10px] px-2">
            Substituir Tudo
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {searchTerm ? `${(html.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length} encontrado(s)` : ""}
          </span>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-border bg-card px-4 py-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Título</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Slug (URL)</label>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-[10px] text-muted-foreground mt-0.5">{systemUrl}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio Próprio</label>
              <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com.br" className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Configure DNS apontando para este sistema</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Title (SEO)</label>
              <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Description</label>
              <input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Meta (ID)</label>
              <input value={pixelMeta} onChange={e => setPixelMeta(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Google (ID)</label>
              <input value={pixelGoogle} onChange={e => setPixelGoogle(e.target.value)} className="w-full px-3 py-1.5 text-sm bg-secondary/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="rounded" />
              Publicada (Live)
            </label>
            {isPublished && slug && (
              <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> Abrir página
              </a>
            )}
          </div>
        </div>
      )}

      {/* Editor + Preview */}
      <div className="flex-1 overflow-hidden">
        {view === "code" && (
          <div className="h-full flex flex-col">
            <EditorHeader lineCount={lineCount} charCount={html.length} />
            <textarea
              ref={textareaRef}
              value={html}
              onChange={e => handleHtmlChange(e.target.value)}
              onKeyDown={handleTabKey}
              className="flex-1 w-full resize-none p-4 font-mono text-xs bg-background text-foreground focus:outline-none leading-5"
              spellCheck={false}
              placeholder="Cole ou edite o HTML da sua página aqui..."
            />
          </div>
        )}
        {view === "preview" && (
          <div className="h-full flex flex-col bg-muted/30">
            <div className="px-3 py-1 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
              <span>Preview</span>
              <span>{previewDevice}</span>
            </div>
            <div className="flex-1 flex items-start justify-center overflow-auto p-4">
              <iframe
                ref={iframeRef}
                title="Preview"
                className="bg-white rounded shadow-lg border border-border"
                style={{ width: previewWidth, height: "100%", maxWidth: "100%" }}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}
        {view === "split" && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full flex flex-col border-r border-border">
                <EditorHeader lineCount={lineCount} charCount={html.length} />
                <textarea
                  ref={textareaRef}
                  value={html}
                  onChange={e => handleHtmlChange(e.target.value)}
                  onKeyDown={handleTabKey}
                  className="flex-1 w-full resize-none p-4 font-mono text-xs bg-background text-foreground focus:outline-none leading-5"
                  spellCheck={false}
                  placeholder="Cole ou edite o HTML da sua página aqui..."
                />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="h-full flex flex-col bg-muted/30">
                <div className="px-3 py-1 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
                  <span>Preview</span>
                  <span>{previewDevice}</span>
                </div>
                <div className="flex-1 flex items-start justify-center overflow-auto p-4">
                  <iframe
                    ref={iframeRef}
                    title="Preview"
                    className="bg-white rounded shadow-lg border border-border"
                    style={{ width: previewWidth, height: "100%", maxWidth: "100%" }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

const EditorHeader = ({ lineCount, charCount }: { lineCount: number; charCount: number }) => (
  <div className="px-3 py-1 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
    <span>HTML Editor</span>
    <span className="normal-case">{lineCount} linhas · {charCount.toLocaleString()} chars</span>
  </div>
);

export default PageHTMLEditor;
