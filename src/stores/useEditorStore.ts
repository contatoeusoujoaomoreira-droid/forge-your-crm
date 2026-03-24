import { create } from "zustand";
import { temporal } from "zundo";
import { z } from "zod";

// ─── ZOD SCHEMAS ──────────────────────────────────────────────────────────────

export const AnimationTypeSchema = z.enum([
  "none", "fade-in", "slide-up", "slide-left", "scale-in", "bounce-in", "rotate-in",
]);
export type AnimationType = z.infer<typeof AnimationTypeSchema>;

export const SectionTypeSchema = z.enum([
  "hero", "benefits", "features", "pricing", "cta", "testimonials", "faq",
  "gallery", "contact_form", "custom_html", "video", "image_banner", "countdown",
  "logos", "stats", "divider", "marquee", "accordion", "tabs_section",
  "timeline", "comparison", "social_proof",
]);
export type SectionType = z.infer<typeof SectionTypeSchema>;

export const SectionConfigSchema = z.record(z.string(), z.any());
export type SectionConfig = z.infer<typeof SectionConfigSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  section_type: z.string(),
  order: z.number(),
  config: SectionConfigSchema,
  is_visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});
export type Section = z.infer<typeof SectionSchema>;

export const PageDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  is_published: z.boolean().default(false),
  meta_title: z.string().nullable().default(null),
  meta_description: z.string().nullable().default(null),
  pixel_meta_id: z.string().nullable().default(null),
  pixel_google_id: z.string().nullable().default(null),
  html_content: z.string().nullable().default(null),
  custom_domain: z.string().nullable().default(null),
  custom_css: z.string().nullable().default(null),
  global_font: z.string().default("Inter"),
  global_accent: z.string().default("#84CC16"),
  global_bg: z.string().default("#000000"),
});
export type PageData = z.infer<typeof PageDataSchema>;

// ─── SECTION DEFAULTS ─────────────────────────────────────────────────────────

export const SECTION_DEFAULTS: Record<string, SectionConfig> = {
  hero: {
    headline: "Transforme Seu Negócio Hoje",
    subtitle: "A solução mais poderosa para escalar seus resultados com inteligência artificial.",
    badge: "Novidade",
    ctaText: "Começar Agora",
    ctaUrl: "#",
    ctaAction: "link",
    cta2Text: "Ver Demo",
    cta2Url: "#",
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    headingSize: 56,
    subtitleSize: 20,
    headingWeight: "800",
    gradientText: true,
    animation: "slide-up",
    paddingY: 100,
    bgPattern: "dots",
    fontFamily: "Inter",
  },
  benefits: {
    headline: "Por que escolher nossa solução?",
    subtitle: "Benefícios que fazem a diferença",
    items: [
      { icon: "⚡", title: "Velocidade", desc: "Resultados em tempo real" },
      { icon: "🎯", title: "Precisão", desc: "Dados confiáveis e precisos" },
      { icon: "🔒", title: "Segurança", desc: "Seus dados protegidos" },
    ],
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "slide-up",
    paddingY: 80,
    columns: 3,
  },
  features: {
    headline: "Funcionalidades Poderosas",
    subtitle: "Tudo que você precisa em um só lugar",
    items: [
      { icon: "🚀", title: "Deploy Rápido", desc: "Lance em minutos" },
      { icon: "📊", title: "Analytics", desc: "Métricas em tempo real" },
      { icon: "🤖", title: "IA Integrada", desc: "Automação inteligente" },
      { icon: "🔗", title: "Integrações", desc: "Conecte suas ferramentas" },
    ],
    bgColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
    layout: "grid",
  },
  pricing: {
    headline: "Planos para todos os tamanhos",
    subtitle: "Escolha o plano ideal para o seu negócio",
    plans: [
      {
        name: "Starter",
        price: "R$ 97",
        period: "/mês",
        description: "Ideal para começar",
        features: ["5 páginas", "1.000 leads/mês", "Suporte por email"],
        cta: "Começar",
        ctaUrl: "#",
        highlighted: false,
      },
      {
        name: "Pro",
        price: "R$ 197",
        period: "/mês",
        description: "Para negócios em crescimento",
        features: ["Páginas ilimitadas", "10.000 leads/mês", "Suporte prioritário", "IA avançada"],
        cta: "Assinar Pro",
        ctaUrl: "#",
        highlighted: true,
        badge: "Mais Popular",
      },
    ],
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "scale-in",
    paddingY: 80,
  },
  cta: {
    headline: "Pronto para começar?",
    subtitle: "Junte-se a milhares de empresas que já transformaram seus resultados.",
    ctaText: "Começar Gratuitamente",
    ctaUrl: "#",
    ctaAction: "link",
    bgColor: "#84CC16",
    textColor: "#000000",
    accentColor: "#000000",
    animation: "fade-in",
    paddingY: 80,
    layout: "centered",
  },
  testimonials: {
    headline: "O que nossos clientes dizem",
    subtitle: "Histórias reais de transformação",
    items: [
      { name: "Maria Silva", role: "CEO, TechCorp", text: "Incrível! Triplicamos nossas conversões em 30 dias.", avatar: "", rating: 5 },
      { name: "João Santos", role: "Fundador, StartupXYZ", text: "A melhor ferramenta que já usei. Recomendo demais!", avatar: "", rating: 5 },
      { name: "Ana Costa", role: "Diretora de Marketing", text: "Resultados além das expectativas.", avatar: "", rating: 5 },
    ],
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "slide-up",
    paddingY: 80,
    layout: "grid",
  },
  faq: {
    headline: "Perguntas Frequentes",
    subtitle: "Tire suas dúvidas",
    items: [
      { question: "Como funciona o período de teste?", answer: "Você tem 14 dias gratuitos sem precisar de cartão de crédito." },
      { question: "Posso cancelar a qualquer momento?", answer: "Sim, sem multas ou taxas de cancelamento." },
      { question: "Vocês oferecem suporte técnico?", answer: "Sim, suporte 24/7 via chat e email para todos os planos." },
    ],
    bgColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
  },
  gallery: {
    headline: "Nossa Galeria",
    subtitle: "Veja nossos trabalhos",
    items: [
      { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", alt: "Projeto 1" },
      { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800", alt: "Projeto 2" },
      { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800", alt: "Projeto 3" },
    ],
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "scale-in",
    paddingY: 80,
    columns: 3,
  },
  contact_form: {
    headline: "Entre em Contato",
    subtitle: "Responderemos em até 24 horas",
    fields: ["name", "email", "phone", "message"],
    ctaText: "Enviar Mensagem",
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
  },
  custom_html: {
    html: "<div style='padding:40px;text-align:center;color:#fff'><h2>HTML Personalizado</h2><p>Edite este bloco com seu próprio código HTML.</p></div>",
    bgColor: "#111111",
    paddingY: 0,
  },
  video: {
    headline: "Assista ao nosso vídeo",
    subtitle: "Descubra como funciona em 2 minutos",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
    aspectRatio: "16/9",
  },
  image_banner: {
    imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1600",
    alt: "Banner",
    height: 500,
    overlay: true,
    overlayColor: "rgba(0,0,0,0.5)",
    headline: "",
    textColor: "#ffffff",
    animation: "fade-in",
    objectFit: "cover",
  },
  countdown: {
    headline: "Oferta por tempo limitado!",
    subtitle: "Aproveite antes que acabe",
    targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ctaText: "Aproveitar Agora",
    ctaUrl: "#",
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
  },
  logos: {
    headline: "Empresas que confiam em nós",
    items: [
      { name: "Google", url: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" },
      { name: "Meta", url: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg" },
    ],
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 60,
    grayscale: true,
  },
  stats: {
    headline: "Números que impressionam",
    items: [
      { value: "10.000+", label: "Clientes ativos" },
      { value: "98%", label: "Satisfação" },
      { value: "3x", label: "Mais conversões" },
      { value: "24/7", label: "Suporte" },
    ],
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "scale-in",
    paddingY: 80,
  },
  divider: {
    style: "line",
    color: "rgba(255,255,255,0.1)",
    height: 1,
    paddingY: 20,
    bgColor: "transparent",
  },
  marquee: {
    items: ["⚡ Velocidade", "🎯 Precisão", "🔒 Segurança", "🚀 Escalabilidade", "💡 Inovação", "🤖 IA", "📊 Analytics"],
    speed: 30,
    direction: "left",
    bgColor: "#84CC16",
    textColor: "#000000",
    fontSize: 16,
    fontWeight: "600",
    gap: 60,
    pauseOnHover: true,
    paddingY: 16,
  },
  accordion: {
    headline: "Conteúdo Expansível",
    subtitle: "Clique para expandir cada item",
    items: [
      { title: "Seção 1", content: "Conteúdo detalhado da seção 1. Adicione seu texto aqui." },
      { title: "Seção 2", content: "Conteúdo detalhado da seção 2. Adicione seu texto aqui." },
      { title: "Seção 3", content: "Conteúdo detalhado da seção 3. Adicione seu texto aqui." },
    ],
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
    allowMultiple: false,
  },
  tabs_section: {
    headline: "Explore por Categoria",
    subtitle: "Navegue pelas abas para descobrir mais",
    tabs: [
      { label: "Recursos", icon: "⚡", content: "Conteúdo da aba Recursos. Descreva os principais recursos aqui." },
      { label: "Benefícios", icon: "🎯", content: "Conteúdo da aba Benefícios. Liste os benefícios do seu produto." },
      { label: "Casos de Uso", icon: "🚀", content: "Conteúdo da aba Casos de Uso. Mostre exemplos reais de uso." },
    ],
    bgColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
  },
  timeline: {
    headline: "Nossa Jornada",
    subtitle: "Os marcos que nos trouxeram até aqui",
    items: [
      { year: "2020", title: "Fundação", desc: "A empresa foi fundada com uma visão clara de transformar o mercado." },
      { year: "2021", title: "Primeiro Produto", desc: "Lançamos nosso produto principal e conquistamos os primeiros clientes." },
      { year: "2022", title: "Expansão", desc: "Expandimos para novos mercados e dobramos nossa equipe." },
      { year: "2023", title: "Série A", desc: "Captamos investimento e aceleramos o crescimento." },
      { year: "2024", title: "Liderança", desc: "Nos tornamos referência no setor com mais de 10.000 clientes." },
    ],
    bgColor: "#000000",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "slide-up",
    paddingY: 80,
    layout: "vertical",
  },
  comparison: {
    headline: "Por que nos escolher?",
    subtitle: "Compare e veja a diferença",
    ourLabel: "Nossa Solução",
    theirLabel: "Concorrência",
    items: [
      { feature: "Configuração", ours: "5 minutos", theirs: "Horas" },
      { feature: "Suporte", ours: "24/7", theirs: "Horário comercial" },
      { feature: "Preço", ours: "Justo", theirs: "Caro" },
      { feature: "IA Integrada", ours: true, theirs: false },
      { feature: "Sem contratos", ours: true, theirs: false },
    ],
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "fade-in",
    paddingY: 80,
  },
  social_proof: {
    headline: "Reconhecimento e Confiança",
    items: [
      { type: "badge", text: "Melhor do Ano 2024", icon: "🏆" },
      { type: "badge", text: "4.9/5 estrelas", icon: "⭐" },
      { type: "badge", text: "10.000+ clientes", icon: "👥" },
      { type: "badge", text: "ISO 27001", icon: "🔒" },
    ],
    bgColor: "#111111",
    textColor: "#ffffff",
    accentColor: "#84CC16",
    animation: "scale-in",
    paddingY: 60,
  },
};

// ─── FULL EDITOR STATE ────────────────────────────────────────────────────────

interface EditorState {
  page: PageData | null;
  sections: Section[];
  selectedSectionId: string | null;
  editMode: "sections" | "html";
  showSettings: boolean;
  saving: boolean;
  loading: boolean;
  dragOverIndex: number | null;
  canvasDevice: "desktop" | "tablet" | "mobile";
  inlineEditingField: { sectionId: string; field: string } | null;
  activeInspectorTab: "style" | "typography" | "spacing" | "animation" | "advanced";
  showGlobalSettings: boolean;

  setPage: (page: PageData) => void;
  updatePage: (partial: Partial<PageData>) => void;
  setSections: (sections: Section[]) => void;
  selectSection: (id: string | null) => void;
  updateSectionConfig: (id: string, key: string, value: any) => void;
  updateSectionFullConfig: (id: string, config: SectionConfig) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  addSection: (section: Section) => void;
  removeSection: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  duplicateSection: (id: string) => void;
  setEditMode: (mode: "sections" | "html") => void;
  setShowSettings: (show: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;
  setDragOverIndex: (index: number | null) => void;
  setCanvasDevice: (device: "desktop" | "tablet" | "mobile") => void;
  setInlineEditing: (field: { sectionId: string; field: string } | null) => void;
  setActiveInspectorTab: (tab: "style" | "typography" | "spacing" | "animation" | "advanced") => void;
  setShowGlobalSettings: (show: boolean) => void;
  reset: () => void;
}

const initialState = {
  page: null as PageData | null,
  sections: [] as Section[],
  selectedSectionId: null as string | null,
  editMode: "sections" as "sections" | "html",
  showSettings: false,
  saving: false,
  loading: true,
  dragOverIndex: null as number | null,
  canvasDevice: "desktop" as "desktop" | "tablet" | "mobile",
  inlineEditingField: null as { sectionId: string; field: string } | null,
  activeInspectorTab: "style" as "style" | "typography" | "spacing" | "animation" | "advanced",
  showGlobalSettings: false,
};

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      ...initialState,
      setPage: (page) => set({ page }),
      updatePage: (partial) => set((s) => ({ page: s.page ? { ...s.page, ...partial } : null })),
      setSections: (sections) => set({ sections }),
      selectSection: (id) => set({ selectedSectionId: id, inlineEditingField: null }),
      updateSectionConfig: (id, key, value) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, config: { ...sec.config, [key]: value } } : sec
          ),
        })),
      updateSectionFullConfig: (id, config) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, config } : sec
          ),
        })),
      moveSection: (fromIndex, toIndex) =>
        set((s) => {
          const newSections = [...s.sections];
          const [moved] = newSections.splice(fromIndex, 1);
          newSections.splice(toIndex, 0, moved);
          return { sections: newSections.map((sec, i) => ({ ...sec, order: i })), dragOverIndex: null };
        }),
      addSection: (section) =>
        set((s) => ({
          sections: [...s.sections, section],
          selectedSectionId: section.id,
        })),
      removeSection: (id) =>
        set((s) => ({
          sections: s.sections.filter((sec) => sec.id !== id),
          selectedSectionId: s.selectedSectionId === id ? null : s.selectedSectionId,
        })),
      toggleVisibility: (id) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, is_visible: !sec.is_visible } : sec
          ),
        })),
      toggleLock: (id) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, locked: !sec.locked } : sec
          ),
        })),
      duplicateSection: (id) =>
        set((s) => {
          const idx = s.sections.findIndex((sec) => sec.id === id);
          if (idx === -1) return {};
          const original = s.sections[idx];
          const duplicate: Section = {
            ...original,
            id: `${original.section_type}-${Date.now()}`,
            order: original.order + 0.5,
          };
          const newSections = [...s.sections];
          newSections.splice(idx + 1, 0, duplicate);
          return {
            sections: newSections.map((sec, i) => ({ ...sec, order: i })),
            selectedSectionId: duplicate.id,
          };
        }),
      setEditMode: (editMode) => set({ editMode }),
      setShowSettings: (showSettings) => set({ showSettings }),
      setSaving: (saving) => set({ saving }),
      setLoading: (loading) => set({ loading }),
      setDragOverIndex: (dragOverIndex) => set({ dragOverIndex }),
      setCanvasDevice: (canvasDevice) => set({ canvasDevice }),
      setInlineEditing: (inlineEditingField) => set({ inlineEditingField }),
      setActiveInspectorTab: (activeInspectorTab) => set({ activeInspectorTab }),
      setShowGlobalSettings: (showGlobalSettings) => set({ showGlobalSettings }),
      reset: () => set(initialState),
    }),
    {
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) =>
            ["sections", "selectedSectionId"].includes(key)
          )
        ),
      limit: 50,
    }
  )
);

// ─── UNDO/REDO HOOK ───────────────────────────────────────────────────────────

export const useEditorHistory = () => {
  const temporalStore = useEditorStore.temporal;
  return {
    undo: () => temporalStore.getState().undo(),
    redo: () => temporalStore.getState().redo(),
    canUndo: temporalStore.getState().pastStates.length > 0,
    canRedo: temporalStore.getState().futureStates.length > 0,
  };
};
