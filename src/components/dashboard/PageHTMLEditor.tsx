import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Eye, Code, Monitor, Smartphone, Tablet, ExternalLink } from "lucide-react";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("landing_pages").select("*").eq("id", pageId).single();
      if (data) {
        setHtml((data as any).html_content || "");
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
      toast({ title: "Página salva com sucesso!" });
    }
  };

  const previewWidth = previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%";

  const systemUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isPublished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={view === "code" ? "default" : "ghost"} size="sm" onClick={() => setView("code")}>
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "split" ? "default" : "ghost"} size="sm" onClick={() => setView("split")}>
            <Monitor className="h-3.5 w-3.5 mr-1" /><Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant={view === "preview" ? "default" : "ghost"} size="sm" onClick={() => setView("preview")}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant={previewDevice === "desktop" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("desktop")} className="px-2">
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button variant={previewDevice === "tablet" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("tablet")} className="px-2">
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button variant={previewDevice === "mobile" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewDevice("mobile")} className="px-2">
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            ⚙️ Config
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

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
      <div className="flex-1 flex overflow-hidden">
        {(view === "code" || view === "split") && (
          <div className={`${view === "split" ? "w-1/2" : "w-full"} flex flex-col border-r border-border`}>
            <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              HTML Editor
            </div>
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="flex-1 w-full resize-none p-4 font-mono text-xs bg-background text-foreground focus:outline-none"
              spellCheck={false}
              placeholder="Cole ou edite o HTML da sua página aqui..."
            />
          </div>
        )}
        {(view === "preview" || view === "split") && (
          <div className={`${view === "split" ? "w-1/2" : "w-full"} flex flex-col bg-muted/30`}>
            <div className="px-3 py-1.5 bg-muted/50 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Preview
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
      </div>
    </div>
  );
};

export default PageHTMLEditor;
