import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Save, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Globe, ExternalLink, Settings, Code } from "lucide-react";
import SectionPreview from "@/components/page-builder/SectionPreview";
import SectionEditor from "@/components/page-builder/SectionEditor";
import AddSectionModal from "@/components/page-builder/AddSectionModal";
import GrapesEditor from "@/components/dashboard/GrapesEditor";

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
  custom_domain: string | null;
}

const PageEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState<PageData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Settings form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pixelMeta, setPixelMeta] = useState("");
  const [pixelGoogle, setPixelGoogle] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchPage = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("landing_pages").select("*").eq("id", id).single();
    if (!data) { navigate("/dashboard"); return; }
    setPage(data as any);
    setTitle(data.title);
    setSlug(data.slug);
    setMetaTitle(data.meta_title || "");
    setMetaDescription(data.meta_description || "");
    setPixelMeta(data.pixel_meta_id || "");
    setPixelGoogle(data.pixel_google_id || "");
    setCustomDomain((data as any).custom_domain || "");
    setIsPublished(data.is_published);

    if (!(data as any).html_content) {
      const { data: secs } = await supabase.from("landing_page_sections").select("*").eq("page_id", id).order("order", { ascending: true });
      setSections((secs || []) as Section[]);
    }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  // If HTML page, render GrapesEditor
  if (!loading && page?.html_content !== null && page?.html_content !== undefined) {
    return <GrapesEditor pageId={id!} onBack={() => navigate("/dashboard")} />;
  }

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const handleAddSection = async (type: string) => {
    if (!id) return;
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0;
    const defaultConfigs: Record<string, any> = {
      hero: { headline: "Título Principal", subtitle: "Subtítulo", ctaText: "Comece Agora", ctaUrl: "#", badge: "🔥 Novo", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" },
      benefits: { title: "Benefícios", items: [{ icon: "✅", title: "Benefício 1", description: "Descrição" }], bgColor: "#0A0A0A", textColor: "#ffffff", animation: "slide-up", paddingY: "60" },
      features: { title: "Funcionalidades", items: [{ icon: "⚡", title: "Feature 1", description: "Descrição" }], bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "slide-up", paddingY: "60" },
      pricing: { title: "Planos", plans: [{ name: "Pro", price: "97", features: ["Feature 1", "Feature 2"], ctaText: "Assinar", ctaUrl: "#", highlight: true }], bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "scale-in", paddingY: "60" },
      cta: { headline: "Pronto para começar?", description: "Crie sua conta agora.", ctaText: "Começar →", ctaUrl: "#", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" },
      testimonials: { title: "Depoimentos", items: [{ name: "João", role: "CEO", text: "Excelente!", avatar: "" }], bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60" },
      faq: { title: "Perguntas Frequentes", items: [{ question: "Pergunta 1?", answer: "Resposta 1." }], bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60" },
      gallery: { title: "Galeria", images: [], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
      contact_form: { title: "Contato", subtitle: "Preencha o formulário", ctaText: "Enviar", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", paddingY: "60" },
      custom_html: { html: "<p>Seu HTML aqui</p>", bgColor: "#0A0A0A", paddingY: "40" },
    };

    const { data, error } = await supabase.from("landing_page_sections").insert({
      page_id: id, section_type: type, order: maxOrder, config: defaultConfigs[type] || {}, is_visible: true,
    }).select("*").single();

    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    setSections(prev => [...prev, data as Section]);
    setSelectedSectionId(data.id);
    setShowAddModal(false);
  };

  const handleUpdateSection = async (sectionId: string, config: any) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, config } : s));
    await supabase.from("landing_page_sections").update({ config }).eq("id", sectionId);
  };

  const handleDeleteSection = async (sectionId: string) => {
    await supabase.from("landing_page_sections").delete().eq("id", sectionId);
    setSections(prev => prev.filter(s => s.id !== sectionId));
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const handleToggleVisibility = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    const newVisible = !section.is_visible;
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, is_visible: newVisible } : s));
    await supabase.from("landing_page_sections").update({ is_visible: newVisible }).eq("id", sectionId);
  };

  const handleMoveSection = async (sectionId: string, direction: "up" | "down") => {
    const idx = sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sections.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newSections = [...sections];
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
    await Promise.all(newSections.map(s => supabase.from("landing_page_sections").update({ order: s.order }).eq("id", s.id)));
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("landing_pages").update({
      title, slug, meta_title: metaTitle || null, meta_description: metaDescription || null,
      pixel_meta_id: pixelMeta || null, pixel_google_id: pixelGoogle || null,
      custom_domain: customDomain || null, is_published: isPublished,
    } as any).eq("id", id);
    setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: "Configurações salvas!" });
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const visibleSections = sections.filter(s => s.is_visible);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 px-4 h-12 shrink-0 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{title}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${isPublished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {isPublished ? "LIVE" : "DRAFT"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className={`h-8 ${showSettings ? "text-primary" : ""}`}>
            <Settings className="h-4 w-4 mr-1" /> SEO
          </Button>
          {isPublished && slug && (
            <Button variant="ghost" size="sm" asChild className="h-8">
              <a href={slug === "_main_page" ? "/" : `/p/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Visualizar
              </a>
            </Button>
          )}
          <Button size="sm" onClick={handleSaveSettings} disabled={saving} className="h-8">
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="px-4 py-3 space-y-3 border-b border-border bg-muted/30 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Título</label><Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Slug</label><Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))} className="h-8 text-sm" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio</label><Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com" className="h-8 text-sm" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Title</label><Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Description</label><Input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Meta</label><Input value={pixelMeta} onChange={e => setPixelMeta(e.target.value)} className="h-8 text-sm" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Google</label><Input value={pixelGoogle} onChange={e => setPixelGoogle(e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs"><Switch checked={isPublished} onCheckedChange={setIsPublished} /> Publicar</label>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections List - Left */}
        <div className="w-64 border-r border-border bg-background overflow-y-auto shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seções</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowAddModal(true)} className="h-7 px-2">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="p-2 space-y-1">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${selectedSectionId === section.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <span className="truncate font-medium capitalize">{section.section_type.replace("_", " ")}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, "up"); }} className="p-0.5 hover:bg-background rounded" disabled={idx === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleMoveSection(section.id, "down"); }} className="p-0.5 hover:bg-background rounded" disabled={idx === sections.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(section.id); }} className="p-0.5 hover:bg-background rounded">
                    {section.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }} className="p-0.5 hover:bg-destructive/20 rounded text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground mb-2">Nenhuma seção</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Preview - Center */}
        <div className="flex-1 overflow-y-auto bg-muted/20">
          <SectionPreview sections={visibleSections} selectedId={selectedSectionId} onSelect={setSelectedSectionId} />
        </div>

        {/* Section Editor - Right */}
        {selectedSection && (
          <div className="w-80 border-l border-border bg-background overflow-y-auto shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configurações</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSectionId(null)} className="h-6 px-1.5 text-xs">✕</Button>
            </div>
            <SectionEditor section={selectedSection} onChange={(config) => handleUpdateSection(selectedSection.id, config)} />
          </div>
        )}
      </div>

      {showAddModal && <AddSectionModal onAdd={handleAddSection} onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default PageEditor;
