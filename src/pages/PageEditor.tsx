import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Save, Eye, EyeOff, ChevronUp, ChevronDown, Trash2, Settings, GripVertical, Code, Layers } from "lucide-react";
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

const sectionIcons: Record<string, string> = {
  hero: "🎯", benefits: "✅", pricing: "💰", cta: "🚀",
  testimonials: "💬", faq: "❓", features: "⚡", gallery: "🖼️",
  contact_form: "📝", custom_html: "🧩",
};

const sectionLabels: Record<string, string> = {
  hero: "Hero", benefits: "Benefícios", pricing: "Preços", cta: "CTA",
  testimonials: "Depoimentos", faq: "FAQ", features: "Features", gallery: "Galeria",
  contact_form: "Formulário", custom_html: "HTML Livre",
};

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
  // Edit mode: "sections" or "html" — user can toggle
  const [editMode, setEditMode] = useState<"sections" | "html">("sections");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [pixelMeta, setPixelMeta] = useState("");
  const [pixelGoogle, setPixelGoogle] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
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

    // Determine initial edit mode
    if ((data as any).html_content) {
      setEditMode("html");
    } else {
      setEditMode("sections");
    }

    // Always fetch sections too
    const { data: secs } = await supabase.from("landing_page_sections").select("*").eq("page_id", id).order("order", { ascending: true });
    setSections((secs || []) as Section[]);

    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  // If user is in HTML mode, render GrapesEditor
  if (!loading && editMode as string === "html" && page) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mode toggle bar */}
        <div className="flex items-center gap-2 px-4 h-10 shrink-0 border-b border-border bg-card">
          <button onClick={() => navigate("/dashboard")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{title}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={editMode === "sections" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => {
                setEditMode("sections");
                toast({ title: "Modo alterado para Seções" });
              }}
            >
              <Layers className="h-3 w-3" /> Seções
            </Button>
            <Button
              variant={editMode === "html" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <Code className="h-3 w-3" /> HTML
            </Button>
          </div>
        </div>
        <div className="flex-1">
          <GrapesEditor pageId={id!} onBack={() => navigate("/dashboard")} />
        </div>
      </div>
    );
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
      <div className="flex items-center justify-between gap-2 px-4 h-12 shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{title}</span>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${isPublished ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {isPublished ? "Live" : "Draft"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => setEditMode("sections")} className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${editMode === "sections" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Layers className="h-3 w-3 inline mr-1" />Seções
            </button>
            <button
              onClick={async () => {
                setEditMode("html");
                // Ensure html_content is set if switching from sections for the first time
                if (!page?.html_content) {
                  await supabase.from("landing_pages").update({
                    html_content: "<section style='padding:80px 20px;text-align:center;background:#000;color:#fff;min-height:400px;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;'><div><h1 style='font-size:3rem;font-weight:800;'>Edite esta página</h1><p style='color:#999;margin-top:16px;'>Use o editor visual para personalizar</p></div></section>"
                  } as any).eq("id", id!);
                  setPage(p => p ? { ...p, html_content: "set" } : p);
                }
              }}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${editMode === "html" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Code className="h-3 w-3 inline mr-1" />HTML
            </button>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"}`}>
            <Settings className="h-4 w-4" />
          </button>
          {isPublished && slug && (
            <a href={slug === "_main_page" ? "/" : `/p/${slug}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <Eye className="h-4 w-4" />
            </a>
          )}
          <Button size="sm" onClick={handleSaveSettings} disabled={saving} className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5">
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-3 space-y-3 border-b border-border bg-card shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Título</label><Input value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs bg-secondary border-border" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Slug</label><Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))} className="h-8 text-xs bg-secondary border-border" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Domínio</label><Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="seudominio.com" className="h-8 text-xs bg-secondary border-border" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Title</label><Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="h-8 text-xs bg-secondary border-border" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Meta Description</label><Input value={metaDescription} onChange={e => setMetaDescription(e.target.value)} className="h-8 text-xs bg-secondary border-border" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Meta</label><Input value={pixelMeta} onChange={e => setPixelMeta(e.target.value)} className="h-8 text-xs bg-secondary border-border" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Pixel Google</label><Input value={pixelGoogle} onChange={e => setPixelGoogle(e.target.value)} className="h-8 text-xs bg-secondary border-border" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs"><Switch checked={isPublished} onCheckedChange={setIsPublished} /> Publicar</label>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Sections List */}
        <div className="w-60 border-r border-border bg-card overflow-y-auto shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seções</h3>
          </div>

          <div className="flex-1 p-2 space-y-0.5">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                onClick={() => setSelectedSectionId(section.id)}
                className={`flex items-center gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer text-xs transition-all group ${
                  selectedSectionId === section.id
                    ? "bg-primary/10 border border-primary/20 text-primary font-semibold"
                    : "hover:bg-secondary/80 text-foreground border border-transparent"
                }`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 cursor-grab" />
                <span className="text-base shrink-0">{sectionIcons[section.section_type] || "📄"}</span>
                <span className="truncate flex-1">{sectionLabels[section.section_type] || section.section_type}</span>

                <div className="flex items-center gap-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground mb-3">Nenhuma seção ainda</p>
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="text-xs h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/10">
                  <Plus className="h-3.5 w-3.5" /> Adicionar Seção
                </Button>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" /> Adicionar Seção
            </button>
          </div>
        </div>

        {/* CENTER — Preview */}
        <div className="flex-1 overflow-y-auto bg-background">
          <SectionPreview sections={visibleSections} selectedId={selectedSectionId} onSelect={setSelectedSectionId} />
        </div>

        {/* RIGHT — Section Editor */}
        <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0">
          {selectedSection ? (
            <SectionEditor section={selectedSection} onChange={(config) => handleUpdateSection(selectedSection.id, config)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-3xl mb-3">👆</div>
              <p className="text-sm font-medium text-foreground mb-1">Selecione uma seção</p>
              <p className="text-xs text-muted-foreground">Clique em uma seção no preview ou na lista à esquerda para editar suas propriedades.</p>
            </div>
          )}
        </div>
      </div>

      {showAddModal && <AddSectionModal onAdd={handleAddSection} onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default PageEditor;
