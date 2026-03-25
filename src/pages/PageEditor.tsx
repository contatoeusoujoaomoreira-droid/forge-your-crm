import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Eye, Settings, Code, Layers, Undo2, Redo2, Sparkles } from "lucide-react";
import { useEditorStore, Section, SECTION_DEFAULTS, useEditorHistory } from "@/stores/useEditorStore";
import SectionLibrary from "@/components/page-builder/SectionLibrary";
import EditorCanvas from "@/components/page-builder/EditorCanvas";
import PropertyInspector from "@/components/page-builder/PropertyInspector";
import GrapesEditorUltra from "@/components/dashboard/GrapesEditorUltra";
import { LayoutControls } from "@/components/page-builder/LayoutControls";
import { AnimationPresets } from "@/components/page-builder/AnimationPresets";
import { SectionAIAssistant } from "@/components/page-builder/SectionAIAssistant";

const defaultConfigs: Record<string, any> = {
  hero: { headline: "Título Principal", subtitle: "Subtítulo aqui", ctaText: "Comece Agora", ctaUrl: "#", badge: "🔥 Novo", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" },
  benefits: { title: "Benefícios", items: [{ icon: "✅", title: "Benefício 1", description: "Descrição" }], bgColor: "#0A0A0A", textColor: "#ffffff", animation: "slide-up", paddingY: "60" },
  features: { title: "Funcionalidades", items: [{ icon: "⚡", title: "Feature 1", description: "Descrição" }], bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "slide-up", paddingY: "60" },
  pricing: { title: "Planos", plans: [{ name: "Pro", price: "97", features: ["Feature 1", "Feature 2"], ctaText: "Assinar", ctaUrl: "#", highlight: true }], bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "scale-in", paddingY: "60" },
  cta: { headline: "Pronto para começar?", description: "Crie sua conta agora.", ctaText: "Começar →", ctaUrl: "#", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" },
  testimonials: { title: "Depoimentos", items: [{ name: "João", role: "CEO", text: "Excelente!", avatar: "" }], bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60" },
  faq: { title: "Perguntas Frequentes", items: [{ question: "Pergunta 1?", answer: "Resposta 1." }], bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60" },
  gallery: { title: "Galeria", images: [], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
  contact_form: { title: "Contato", subtitle: "Preencha o formulário", ctaText: "Enviar", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", paddingY: "60" },
  custom_html: { html: "<p>Seu HTML aqui</p>", bgColor: "#0A0A0A", paddingY: "40" },
  video: { videoUrl: "", title: "Vídeo", bgColor: "#000000", textColor: "#ffffff", paddingY: "60" },
  image_banner: { imageUrl: "", altText: "", overlayText: "", height: "400", bgColor: "#000000", textColor: "#ffffff", paddingY: "0" },
  countdown: { title: "Oferta termina em:", targetDate: "", bgColor: "#000000", textColor: "#ffffff", accentColor: "#ef4444", paddingY: "40" },
  logos: { title: "Parceiros", logos: [], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "40" },
  stats: { title: "", stats: [{ value: "1000+", label: "Clientes", icon: "👥" }], bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", paddingY: "60" },
  divider: { bgColor: "#000000", style: "line", paddingY: "20" },
  marquee: { text: "Texto deslizando...", speed: "normal", bgColor: "#84CC16", textColor: "#000000", paddingY: "10" },
  accordion: { title: "Saiba mais", items: [{ title: "Item 1", content: "Conteúdo" }], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
  tabs_section: { title: "Recursos", tabs: [{ label: "Tab 1", content: "Conteúdo" }], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
  timeline: { title: "Nossa História", events: [{ date: "2024", title: "Início", description: "Descrição" }], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
  comparison: { title: "Comparação", leftLabel: "Antes", rightLabel: "Depois", rows: [{ left: "Antigo", right: "Novo" }], bgColor: "#0A0A0A", textColor: "#ffffff", paddingY: "60" },
  social_proof: { title: "Confiança", badges: [], bgColor: "#000000", textColor: "#ffffff", paddingY: "40" },
};

const PageEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const store = useEditorStore();
  const { undo, redo, canUndo, canRedo } = useEditorHistory();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedSectionType, setSelectedSectionType] = useState<string>("hero");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => () => { store.reset(); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const fetchPage = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("landing_pages").select("*").eq("id", id).single();
    if (!data) { navigate("/dashboard"); return; }
    store.setPage(data as any);

    // Detectar se é HTML ou Sessão
    if ((data as any).html_content && (data as any).html_content.trim().startsWith("<")) {
      store.setEditMode("html");
    } else {
      store.setEditMode("sections");
    }

    const { data: secs } = await supabase.from("landing_page_sections").select("*").eq("page_id", id).order("order", { ascending: true });
    store.setSections((secs || []) as Section[]);
    store.setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const autoSaveSection = useCallback((sectionId: string, config: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("landing_page_sections").update({ config }).eq("id", sectionId).then();
    }, 800);
  }, []);

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.sections !== prev.sections && state.selectedSectionId) {
        const curr = state.sections.find(s => s.id === state.selectedSectionId);
        const old = prev.sections.find(s => s.id === state.selectedSectionId);
        if (curr && old && curr.config !== old.config) {
          autoSaveSection(curr.id, curr.config);
        }
      }
    });
    return unsub;
  }, [autoSaveSection]);

  const handleAddSection = async (type: string) => {
    if (!id) return;
    const maxOrder = store.sections.length > 0 ? Math.max(...store.sections.map(s => s.order)) + 1 : 0;
    const { data, error } = await supabase.from("landing_page_sections").insert({
      page_id: id, section_type: type, order: maxOrder, config: SECTION_DEFAULTS[type] || { bgColor: "#0a0a0a", textColor: "#fff", paddingY: 60 }, is_visible: true,
    }).select("*").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    store.addSection(data as Section);
  };

  const handleSaveSettings = async () => {
    if (!id || !store.page) return;
    store.setSaving(true);
    const { error } = await supabase.from("landing_pages").update({
      title: store.page.title, slug: store.page.slug, meta_title: store.page.meta_title || null,
      meta_description: store.page.meta_description || null, pixel_meta_id: store.page.pixel_meta_id || null,
      pixel_google_id: store.page.pixel_google_id || null, custom_domain: store.page.custom_domain || null,
      is_published: store.page.is_published,
    } as any).eq("id", id);
    await Promise.all(store.sections.map(s =>
      supabase.from("landing_page_sections").update({ order: s.order, is_visible: s.is_visible, config: s.config }).eq("id", s.id)
    ));
    store.setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: "Salvo com sucesso!" });
  };

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      const removed = prev.sections.filter(s => !state.sections.find(ns => ns.id === s.id));
      removed.forEach(s => supabase.from("landing_page_sections").delete().eq("id", s.id).then());
    });
    return unsub;
  }, []);

  if (store.loading || authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  // HTML mode - use GrapesEditorUltra
  if (store.editMode === "html" && store.page) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-2 px-4 h-10 shrink-0 border-b border-border bg-card">
          <button onClick={() => navigate("/dashboard")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{store.page.title}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => store.setEditMode("sections")}>
              <Layers className="h-3 w-3" /> Seções
            </Button>
            <Button variant="default" size="sm" className="h-7 text-xs gap-1">
              <Code className="h-3 w-3" /> HTML
            </Button>
          </div>
        </div>
        <div className="flex-1"><GrapesEditorUltra pageId={id!} onBack={() => navigate("/dashboard")} /></div>
      </div>
    );
  }

  // Sections mode
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 px-3 h-11 shrink-0 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/dashboard")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[180px]">{store.page?.title || "Sem título"}</span>
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider ${store.page?.is_published ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {store.page?.is_published ? "LIVE" : "DRAFT"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
            <button onClick={() => store.setEditMode("sections")} className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${store.editMode === "sections" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Layers className="h-3 w-3 inline mr-1" />Seções
            </button>
            <button onClick={() => store.setEditMode("html")} className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${store.editMode === "html" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Code className="h-3 w-3 inline mr-1" />HTML
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Desfazer (Ctrl+Z)"
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-secondary text-muted-foreground disabled:cursor-not-allowed"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Refazer (Ctrl+Y)"
              className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-secondary text-muted-foreground disabled:cursor-not-allowed"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* AI Assistant Button */}
          <button
            onClick={() => {
              if (store.selectedSectionId) {
                const section = store.sections.find(s => s.id === store.selectedSectionId);
                if (section) {
                  setSelectedSectionType(section.section_type);
                  setShowAIAssistant(!showAIAssistant);
                }
              }
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-yellow-600/20 text-yellow-400 flex items-center gap-1"
            title="Sugestões de IA"
          >
            <Sparkles className="h-4 w-4" />
          </button>

          <button onClick={() => store.setShowSettings(!store.showSettings)} className={`p-1.5 rounded-lg transition-colors ${store.showSettings ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"}`}>
            <Settings className="h-4 w-4" />
          </button>

          {store.page?.is_published && store.page?.slug && (
            <a href={store.page.slug === "_main_page" ? "/" : `/p/${store.page.slug}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
              <Eye className="h-4 w-4" />
            </a>
          )}

          <Button size="sm" onClick={handleSaveSettings} className="h-7 text-xs gap-1">
            <Save className="h-3 w-3" /> Salvar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Section Library */}
        <div className="w-64 border-r border-border overflow-y-auto bg-card/50">
          <SectionLibrary onAddSection={handleAddSection} />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <EditorCanvas />
        </div>

        {/* Right Sidebar - Property Inspector & Controls */}
        {store.selectedSectionId && (
          <div className="w-80 border-l border-border overflow-y-auto bg-card/50">
            <PropertyInspector />
            
            {/* Layout Controls */}
            <div className="p-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Layout</h3>
              <LayoutControls
                selectedId={store.selectedSectionId}
                onPaddingChange={() => {}}
                onMarginChange={() => {}}
                onDuplicate={() => {}}
                onDelete={() => store.deleteSection(store.selectedSectionId!)}
                onToggleVisibility={() => {}}
                onToggleLock={() => {}}
                isVisible={true}
                isLocked={false}
                padding={{ top: 0, bottom: 0, left: 0, right: 0 }}
                margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
              />
            </div>

            {/* Animation Presets */}
            <div className="p-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Animações</h3>
              <AnimationPresets
                onSelect={(preset) => {
                  const section = store.sections.find(s => s.id === store.selectedSectionId);
                  if (section) {
                    store.updateSection(store.selectedSectionId!, {
                      ...section,
                      config: { ...section.config, animation: preset.id }
                    });
                  }
                }}
                selectedAnimation={store.sections.find(s => s.id === store.selectedSectionId)?.config?.animation}
              />
            </div>

            {/* AI Assistant */}
            <div className="p-4 border-t border-border">
              <SectionAIAssistant
                sectionType={selectedSectionType}
                isOpen={showAIAssistant}
                onClose={() => setShowAIAssistant(false)}
                onApplySuggestion={(suggestion) => {
                  // Aplicar sugestão de IA
                  const section = store.sections.find(s => s.id === store.selectedSectionId);
                  if (section) {
                    toast({ title: `Sugestão aplicada: ${suggestion}` });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageEditor;
