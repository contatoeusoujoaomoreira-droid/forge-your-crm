import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Globe, Pencil, Copy, Trash2, ExternalLink, BarChart3, X, Sparkles, Home } from "lucide-react";
import PageAnalytics from "@/components/dashboard/PageAnalytics";
import TemplatesModal, { type PageTemplate } from "@/components/dashboard/TemplatesModal";

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  pixel_meta_id: string | null;
  pixel_google_id: string | null;
  created_at: string;
  _viewCount?: number;
}

const MAIN_PAGE_SLUG = "_main_page";

const LandingPagesList = () => {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [mainPage, setMainPage] = useState<LandingPage | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", meta_title: "", meta_description: "", pixel_meta_id: "", pixel_google_id: "" });
  const { toast } = useToast();

  const fetchPages = async () => {
    const { data } = await supabase.from("landing_pages").select("*").order("created_at", { ascending: false });
    if (!data) return;
    const { data: views } = await supabase.from("page_views").select("page_id");
    const viewMap: Record<string, number> = {};
    (views || []).forEach((v: any) => { viewMap[v.page_id] = (viewMap[v.page_id] || 0) + 1; });
    const allPages = data.map((p: any) => ({ ...p, _viewCount: viewMap[p.id] || 0 }));
    setMainPage(allPages.find((p: LandingPage) => p.slug === MAIN_PAGE_SLUG) || null);
    setPages(allPages.filter((p: LandingPage) => p.slug !== MAIN_PAGE_SLUG && !p.slug.startsWith("_")));
  };

  useEffect(() => { fetchPages(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.slug) { toast({ title: "Preencha título e slug", variant: "destructive" }); return; }
    const { data, error } = await supabase.from("landing_pages").insert({
      title: form.title, slug: form.slug, meta_title: form.meta_title || null, meta_description: form.meta_description || null,
      pixel_meta_id: form.pixel_meta_id || null, pixel_google_id: form.pixel_google_id || null, is_published: false,
    }).select("id").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    await supabase.from("landing_page_sections").insert({
      page_id: data.id, section_type: "hero", order: 0,
      config: { headline: "Título Principal", subtitle: "Subtítulo da sua landing page", ctaText: "Comece Agora", ctaUrl: "#", badge: "🔥 Oferta Especial", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" },
    });
    toast({ title: "Landing Page criada!" });
    setShowForm(false);
    setForm({ title: "", slug: "", meta_title: "", meta_description: "", pixel_meta_id: "", pixel_google_id: "" });
    fetchPages();
  };

  const handleCreateFromTemplate = async (template: PageTemplate) => {
    const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
    const { data, error } = await supabase.from("landing_pages").insert({
      title: template.name, slug, is_published: false,
    }).select("id").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    await supabase.from("landing_page_sections").insert(
      template.sections.map((s) => ({ page_id: data.id, section_type: s.section_type, order: s.order, config: s.config, is_visible: true }))
    );
    toast({ title: `Página criada a partir do template "${template.name}"!` });
    setShowTemplates(false);
    fetchPages();
  };

  const handleCreateMainPage = async () => {
    const { data, error } = await supabase.from("landing_pages").insert({
      title: "Página Principal", slug: MAIN_PAGE_SLUG, is_published: true,
    }).select("id").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    await supabase.from("landing_page_sections").insert([
      { page_id: data.id, section_type: "hero", order: 0, config: { headline: "Acelere suas Vendas com IA", subtitle: "A plataforma all-in-one para capturar leads e gerenciar seu pipeline.", ctaText: "Começar Grátis →", badge: "⚡ Forge AI CRM" } },
      { page_id: data.id, section_type: "features", order: 1, config: { title: "Tudo que você precisa", items: [{ icon: "📊", title: "CRM Inteligente", description: "Pipeline visual com drag-and-drop." }, { icon: "🌐", title: "Landing Pages", description: "Crie páginas de alta conversão." }, { icon: "📝", title: "Quiz Builder", description: "Qualifique leads com quizzes." }] } },
    ]);
    toast({ title: "Página principal criada!" });
    fetchPages();
  };

  const handleDuplicate = async (page: LandingPage) => {
    const newSlug = `${page.slug}-copy-${Date.now().toString(36)}`;
    const { data, error } = await supabase.from("landing_pages").insert({
      title: `${page.title} (Cópia)`, slug: newSlug, is_published: false,
      meta_title: page.meta_title, meta_description: page.meta_description, pixel_meta_id: page.pixel_meta_id, pixel_google_id: page.pixel_google_id,
    }).select("id").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    const { data: sections } = await supabase.from("landing_page_sections").select("*").eq("page_id", page.id);
    if (sections && sections.length > 0) {
      await supabase.from("landing_page_sections").insert(sections.map((s: any) => ({ page_id: data.id, section_type: s.section_type, order: s.order, config: s.config, is_visible: s.is_visible })));
    }
    toast({ title: "Página duplicada!" });
    fetchPages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("landing_page_sections").delete().eq("page_id", id);
    await supabase.from("landing_pages").delete().eq("id", id);
    toast({ title: "Página excluída" });
    fetchPages();
  };

  const handleTogglePublish = async (id: string, current: boolean) => {
    await supabase.from("landing_pages").update({ is_published: !current }).eq("id", id);
    fetchPages();
  };

  if (showAnalytics) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Analytics da Página</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(null)}>← Voltar</Button>
        </div>
        <PageAnalytics pageId={showAnalytics} />
      </div>
    );
  }

  const renderPageCard = (page: LandingPage, isMain = false) => (
    <div key={page.id} className="surface-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          {isMain && <Home className="h-4 w-4 text-primary" />} {page.title}
        </h3>
        <Switch checked={page.is_published} onCheckedChange={() => handleTogglePublish(page.id, page.is_published)} />
      </div>
      <p className="text-xs text-muted-foreground">{isMain ? "/" : `/p/${page.slug}`}</p>
      <div className="flex items-center gap-2 text-xs">
        <span className={page.is_published ? "text-primary" : "text-muted-foreground"}>
          {page.is_published ? "Live" : "Draft"}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-muted-foreground">{page._viewCount} views</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setShowAnalytics(page.id)}><BarChart3 className="h-3 w-3" /></Button>
        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(page)} title="Duplicar"><Copy className="h-3 w-3" /></Button>
        {!isMain && <Button variant="ghost" size="sm" onClick={() => handleDelete(page.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">Landing Pages</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Templates
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X className="h-4 w-4 mr-1" /> Cancelar</> : <><Plus className="h-4 w-4 mr-1" /> Nova Página</>}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="surface-card rounded-lg p-5 space-y-4">
          <h3 className="font-semibold text-foreground">Nova Landing Page</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Minha Landing Page" className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="minha-pagina" className="mt-1 bg-secondary/50 border-border" />
              <p className="text-[10px] text-muted-foreground mt-1">/p/{form.slug || "..."}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Title (SEO)</Label>
              <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meta Description</Label>
              <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pixel Meta (ID)</Label>
              <Input value={form.pixel_meta_id} onChange={(e) => setForm({ ...form, pixel_meta_id: e.target.value })} className="mt-1 bg-secondary/50 border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pixel Google (ID)</Label>
              <Input value={form.pixel_google_id} onChange={(e) => setForm({ ...form, pixel_google_id: e.target.value })} className="mt-1 bg-secondary/50 border-border" />
            </div>
          </div>
          <Button onClick={handleCreate}>Criar Página</Button>
        </div>
      )}

      {/* Main Page Section */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">🏠 Página Principal</p>
        {mainPage ? renderPageCard(mainPage, true) : (
          <div className="surface-card rounded-lg p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Sua página principal ainda não existe</p>
            <Button size="sm" onClick={handleCreateMainPage}>Criar Página Principal</Button>
          </div>
        )}
      </div>

      {/* Landing Pages */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">🌐 Landing Pages</p>
        {pages.length === 0 ? (
          <div className="surface-card rounded-lg p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Nenhuma landing page</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>Usar Template</Button>
              <Button size="sm" onClick={() => setShowForm(true)}>Criar do Zero</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page) => renderPageCard(page))}
          </div>
        )}
      </div>

      {showTemplates && <TemplatesModal onSelect={handleCreateFromTemplate} onClose={() => setShowTemplates(false)} />}
    </div>
  );
};

export default LandingPagesList;
