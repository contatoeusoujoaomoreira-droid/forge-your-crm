import { X, Sparkles } from "lucide-react";

export interface PageTemplate {
  name: string;
  description: string;
  preview: string;
  category: string;
  isFullHTML?: boolean;
  htmlFile?: string;
  sections: { section_type: string; order: number; config: any }[];
}

const templates: PageTemplate[] = [
  {
    name: "FORGE AI — Landing Page",
    description: "Template oficial do Forge AI. Dark mode com verde-lima, depoimentos, planos e CTA para WhatsApp.",
    preview: "⚡",
    category: "SaaS",
    isFullHTML: false,
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Acelere suas Vendas com IA", subtitle: "A plataforma all-in-one para capturar leads, criar landing pages e gerenciar seu pipeline.", ctaText: "Começar Agora →", ctaUrl: "https://wa.me/554999837-2865?text=Quero%20conhecer%20o%20Forge%20AI", badge: "⚡ Forge AI CRM", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "100", headingSize: "56", headingWeight: "900", fontFamily: "Inter", gradientText: true } },
      { section_type: "features", order: 1, config: { title: "Tudo que você precisa", bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "slide-up", paddingY: "60", items: [{ icon: "📊", title: "CRM Inteligente", description: "Pipeline visual com drag-and-drop." }, { icon: "🌐", title: "Landing Pages", description: "Crie páginas de alta conversão." }, { icon: "📝", title: "Quiz Builder", description: "Qualifique leads com quizzes." }, { icon: "📅", title: "Agendamento", description: "Sistema de reservas nativo." }, { icon: "🛒", title: "Checkout", description: "Vendas com PIX e WhatsApp." }, { icon: "📋", title: "Formulários", description: "Captura estilo Typeform." }] } },
      { section_type: "testimonials", order: 2, config: { title: "Quem usa, recomenda", bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60", items: [{ name: "Camila F.", role: "CEO, Lumiar Digital", text: "Minhas vendas triplicaram em 3 meses." }, { name: "Rafael O.", role: "Founder, Growth Lab", text: "O quiz capturou 4x mais leads qualificados." }, { name: "Juliana C.", role: "CMO, Vetta Marketing", text: "CRM intuitivo, sem precisar de manual." }] } },
      { section_type: "pricing", order: 3, config: { title: "Planos", bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "scale-in", paddingY: "60", plans: [{ name: "Básico", price: "67", features: ["CRM", "Landing Pages", "Formulários", "1 Domínio"], ctaText: "Começar →", highlight: false }, { name: "Pro", price: "97", features: ["Tudo do Básico", "Quiz Builder", "Agenda", "Checkout", "IA Nativa"], ctaText: "Assinar Pro →", highlight: true }, { name: "Enterprise", price: "Sob Consulta", features: ["Tudo do Pro", "Multi-usuários", "API Completa", "Suporte Prioritário"], ctaText: "Falar com Consultor →", highlight: false }] } },
      { section_type: "cta", order: 4, config: { headline: "Pronto para acelerar suas vendas?", description: "Comece agora e veja resultados em dias.", ctaText: "Falar com Especialista →", ctaUrl: "https://wa.me/554999837-2865?text=Quero%20o%20Forge%20AI", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" } },
    ],
  },
  {
    name: "Agência Digital Moderna",
    description: "Landing page completa para agência de marketing e design com portfólio.",
    preview: "🎨",
    category: "Agência",
    isFullHTML: true,
    htmlFile: "/templates/agencia-digital.html",
    sections: [],
  },
  {
    name: "SaaS Startup",
    description: "Landing page para produto SaaS com features, pricing e testimonials.",
    preview: "⚙️",
    category: "SaaS",
    isFullHTML: true,
    htmlFile: "/templates/saas-startup.html",
    sections: [],
  },
  {
    name: "E-commerce Moda",
    description: "Landing page para loja de moda com produtos em destaque.",
    preview: "👗",
    category: "E-commerce",
    isFullHTML: true,
    htmlFile: "/templates/ecommerce-moda.html",
    sections: [],
  },
  {
    name: "Clínica de Saúde",
    description: "Landing page para clínica médica com especialidades e agendamento.",
    preview: "⚕️",
    category: "Saúde",
    isFullHTML: true,
    htmlFile: "/templates/clinica-saude.html",
    sections: [],
  },
  {
    name: "Imobiliária Premium",
    description: "Landing page para imobiliária com propriedades em destaque.",
    preview: "🏠",
    category: "Real Estate",
    isFullHTML: true,
    htmlFile: "/templates/imobiliaria.html",
    sections: [],
  },
  {
    name: "Restaurante Gourmet",
    description: "Landing page para restaurante com menu e sistema de reservas.",
    preview: "🍽️",
    category: "Restaurante",
    isFullHTML: true,
    htmlFile: "/templates/restaurante.html",
    sections: [],
  },
  {
    name: "Plataforma de Cursos",
    description: "Landing page para plataforma de educação online com cursos.",
    preview: "📚",
    category: "Educação",
    isFullHTML: true,
    htmlFile: "/templates/plataforma-cursos.html",
    sections: [],
  },
  {
    name: "Escritório de Advocacia",
    description: "Landing page para escritório jurídico com áreas de atuação.",
    preview: "⚖️",
    category: "Advocacia",
    isFullHTML: true,
    htmlFile: "/templates/advocacia.html",
    sections: [],
  },
  {
    name: "Academia Fitness",
    description: "Landing page para academia com planos e classes.",
    preview: "💪",
    category: "Fitness",
    isFullHTML: true,
    htmlFile: "/templates/academia.html",
    sections: [],
  },
  {
    name: "Hotel Luxo",
    description: "Landing page para hotel com suítes e sistema de reservas.",
    preview: "🏨",
    category: "Hospedagem",
    isFullHTML: true,
    htmlFile: "/templates/hotel.html",
    sections: [],
  },
  {
    name: "Portfolio Criativo",
    description: "Landing page para portfólio profissional com projetos.",
    preview: "🎭",
    category: "Portfolio",
    isFullHTML: true,
    htmlFile: "/templates/portfolio.html",
    sections: [],
  },
  {
    name: "Startup Tech",
    description: "Landing page para startup de tecnologia com features e demo.",
    preview: "🚀",
    category: "Startup",
    isFullHTML: true,
    htmlFile: "/templates/startup-tech.html",
    sections: [],
  },
  {
    name: "Finanças & Investimentos",
    description: "Landing page para consultoria financeira em dark mode.",
    preview: "💰",
    category: "Finanças",
    isFullHTML: true,
    htmlFile: "/templates/financas.html",
    sections: [],
  },
  {
    name: "Agência de Viagens",
    description: "Landing page para agência de turismo com destinos e pacotes.",
    preview: "✈️",
    category: "Viagens",
    isFullHTML: true,
    htmlFile: "/templates/viagens.html",
    sections: [],
  },
  {
    name: "Conferência Tech",
    description: "Landing page para conferência de tecnologia com agenda.",
    preview: "🎟️",
    category: "Eventos",
    isFullHTML: true,
    htmlFile: "/templates/conferencia.html",
    sections: [],
  },
  {
    name: "Pet Care & Shop",
    description: "Landing page para loja e serviços pet com design amigável.",
    preview: "🐾",
    category: "Pet Shop",
    isFullHTML: true,
    htmlFile: "/templates/pet-care.html",
    sections: [],
  },
  {
    name: "Estúdio de Arquitetura",
    description: "Landing page para estúdio de arquitetura com portfólio.",
    preview: "🏗️",
    category: "Arquitetura",
    isFullHTML: true,
    htmlFile: "/templates/arquitetura.html",
    sections: [],
  },
  {
    name: "App Showcase",
    description: "Landing page para lançamento de aplicativo mobile.",
    preview: "📱",
    category: "App",
    isFullHTML: true,
    htmlFile: "/templates/app-showcase.html",
    sections: [],
  },
  {
    name: "Masterclass Infoproduto",
    description: "Landing page para masterclass e infoprodutos de alta conversão.",
    preview: "🎓",
    category: "Educação",
    isFullHTML: true,
    htmlFile: "/templates/masterclass.html",
    sections: [],
  },
  {
    name: "Webinar — Evento Online",
    description: "Página de inscrição para evento ao vivo com urgência.",
    preview: "🎙️",
    category: "Evento",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Webinar Exclusivo: O Futuro do Marketing", subtitle: "Aprenda as estratégias que vão dominar o mercado em 2024.", ctaText: "GARANTIR MINHA VAGA →", badge: "📅 EVENTO AO VIVO" } },
    ],
  },
];

interface TemplatesModalProps {
  onSelect: (template: PageTemplate) => void;
  onClose: () => void;
}

const TemplatesModal = ({ onSelect, onClose }: TemplatesModalProps) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Escolha um Template
            </h2>
            <p className="text-sm text-muted-foreground">Selecione uma base profissional para sua página</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">✨ Templates Premium (HTML)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => t.isFullHTML).map((t, i) => (
              <button
                key={`html-${i}`}
                onClick={() => onSelect(t)}
                className="text-left p-5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{t.preview}</span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{t.category}</span>
                </div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <p className="text-[10px] text-primary mt-2 font-medium">✨ Página completa editável</p>
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">📦 Templates por seções</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.filter(t => !t.isFullHTML).map((t, i) => (
              <button
                key={`sec-${i}`}
                onClick={() => onSelect(t)}
                className="text-left p-5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{t.preview}</span>
                  <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{t.category}</span>
                </div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{t.sections.length} seções pré-configuradas</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
