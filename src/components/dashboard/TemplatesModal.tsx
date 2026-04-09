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
    name: "Omni Builder — Landing Page",
    description: "Template oficial do Omni Builder CRM. Dark mode com verde-lima, depoimentos, planos e CTA para WhatsApp.",
    preview: "⚡",
    category: "SaaS",
    isFullHTML: false,
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Acelere suas Vendas com IA", subtitle: "A plataforma all-in-one para capturar leads, criar landing pages e gerenciar seu pipeline.", ctaText: "Começar Agora →", ctaUrl: "https://wa.me/554999837-2865?text=Quero%20conhecer%20o%20Omni%20Builder", badge: "⚡ Omni Builder CRM", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "100", headingSize: "56", headingWeight: "900", fontFamily: "Inter", gradientText: true } },
      { section_type: "features", order: 1, config: { title: "Tudo que você precisa", bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "slide-up", paddingY: "60", items: [{ icon: "📊", title: "CRM Inteligente", description: "Pipeline visual com drag-and-drop." }, { icon: "🌐", title: "Landing Pages", description: "Crie páginas de alta conversão." }, { icon: "📝", title: "Quiz Builder", description: "Qualifique leads com quizzes." }, { icon: "📅", title: "Agendamento", description: "Sistema de reservas nativo." }, { icon: "🛒", title: "Checkout", description: "Vendas com PIX e WhatsApp." }, { icon: "📋", title: "Formulários", description: "Captura estilo Typeform." }] } },
      { section_type: "testimonials", order: 2, config: { title: "Quem usa, recomenda", bgColor: "#000000", textColor: "#ffffff", animation: "fade-in", paddingY: "60", items: [{ name: "Camila F.", role: "CEO, Lumiar Digital", text: "Minhas vendas triplicaram em 3 meses." }, { name: "Rafael O.", role: "Founder, Growth Lab", text: "O quiz capturou 4x mais leads qualificados." }, { name: "Juliana C.", role: "CMO, Vetta Marketing", text: "CRM intuitivo, sem precisar de manual." }] } },
      { section_type: "pricing", order: 3, config: { title: "Planos", bgColor: "#0A0A0A", textColor: "#ffffff", accentColor: "#84CC16", animation: "scale-in", paddingY: "60", plans: [{ name: "Básico", price: "67", features: ["CRM", "Landing Pages", "Formulários", "1 Domínio"], ctaText: "Começar →", highlight: false }, { name: "Pro", price: "97", features: ["Tudo do Básico", "Quiz Builder", "Agenda", "Checkout", "IA Nativa"], ctaText: "Assinar Pro →", highlight: true }, { name: "Enterprise", price: "Sob Consulta", features: ["Tudo do Pro", "Multi-usuários", "API Completa", "Suporte Prioritário"], ctaText: "Falar com Consultor →", highlight: false }] } },
      { section_type: "cta", order: 4, config: { headline: "Pronto para acelerar suas vendas?", description: "Comece agora e veja resultados em dias.", ctaText: "Falar com Especialista →", ctaUrl: "https://wa.me/554999837-2865?text=Quero%20o%20Omni%20Builder", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16", animation: "fade-in", paddingY: "80" } },
    ],
  },
  {
    name: "LAKS Company — Assessoria",
    description: "Dark mode com verde-lima neon. Estilo corporativo para agências e assessorias de marketing digital.",
    preview: "🏢",
    category: "Agência",
    isFullHTML: true,
    htmlFile: "/templates/laks-company.html",
    sections: [],
  },
  {
    name: "Funil Eterno — Infoproduto",
    description: "Tema laranja/dourado com urgência e escassez. Perfeito para cursos e métodos digitais.",
    preview: "🔥",
    category: "Infoproduto",
    isFullHTML: true,
    htmlFile: "/templates/funil-eterno.html",
    sections: [],
  },
  {
    name: "Clickmax — SaaS Platform",
    description: "Azul/roxo com grid pattern. Estilo moderno para plataformas SaaS e ferramentas digitais.",
    preview: "⚡",
    category: "SaaS",
    isFullHTML: true,
    htmlFile: "/templates/clickmax.html",
    sections: [],
  },
  {
    name: "MAV Mentoria — High Ticket",
    description: "Tema dourado elegante com serif fonts. Ideal para mentorias e serviços high-ticket.",
    preview: "👑",
    category: "Mentoria",
    isFullHTML: true,
    htmlFile: "/templates/mav-mentoria.html",
    sections: [],
  },
  {
    name: "Perpétuo Lucrativo — Templates",
    description: "Verde neon com scanlines. Estilo tech para venda de templates e materiais digitais.",
    preview: "🚀",
    category: "Templates",
    isFullHTML: true,
    htmlFile: "/templates/perpetuo-lucrativo.html",
    sections: [],
  },
  {
    name: "VSL — Vídeo de Vendas",
    description: "Página com vídeo de vendas, headline forte, urgência e escassez.",
    preview: "🎬",
    category: "Vendas",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Descubra o Método que Já Transformou +10.000 Vidas", subtitle: "Assista ao vídeo abaixo e veja como funciona.", ctaText: "QUERO ACESSO AGORA →", ctaUrl: "#pricing", badge: "🔥 OFERTA POR TEMPO LIMITADO", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" } },
      { section_type: "benefits", order: 1, config: { title: "Por Que Este Método Funciona?", items: [{ icon: "✅", title: "Resultado em 7 dias", description: "Veja mudanças na primeira semana." }, { icon: "🎯", title: "100% Prático", description: "Passo a passo direto ao ponto." }, { icon: "🔒", title: "Garantia de 30 Dias", description: "Devolvemos seu dinheiro." }] } },
      { section_type: "pricing", order: 2, config: { title: "Escolha Seu Plano", plans: [{ name: "Essencial", price: "97", features: ["Acesso completo", "Suporte 30 dias"], ctaText: "QUERO ESSE →", highlight: false }, { name: "Premium", price: "197", features: ["Tudo do Essencial", "Mentoria", "Acesso vitalício"], ctaText: "QUERO ESSE →", highlight: true }] } },
      { section_type: "cta", order: 3, config: { headline: "⏰ Essa Oferta Expira em Breve", description: "Garanta seu acesso agora.", ctaText: "GARANTIR MINHA VAGA →" } },
    ],
  },
  {
    name: "Squeeze — Captura de Leads",
    description: "Página curta e direta para capturar email/WhatsApp com isca digital.",
    preview: "🧲",
    category: "Captura",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "E-book Grátis: Guia Completo", subtitle: "Baixe agora o guia com estratégias comprovadas.", ctaText: "BAIXAR AGORA — É GRÁTIS →", badge: "📚 MATERIAL GRATUITO" } },
      { section_type: "benefits", order: 1, config: { title: "O Que Você Vai Aprender:", items: [{ icon: "📖", title: "Fundamentos", description: "A base que todo profissional precisa." }, { icon: "🎯", title: "Estratégias", description: "Táticas que geram resultados." }, { icon: "🚀", title: "Escala", description: "Como multiplicar resultados." }] } },
    ],
  },
  {
    name: "Webinar — Evento Online",
    description: "Página de inscrição para evento ao vivo com urgência.",
    preview: "🎙️",
    category: "Evento",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Masterclass Gratuita: Como Alcançar Resultados", subtitle: "Evento ao vivo — Vagas limitadas.", ctaText: "GARANTIR MINHA VAGA GRÁTIS →", badge: "🔴 AO VIVO E GRATUITO" } },
      { section_type: "benefits", order: 1, config: { title: "Nesta Masterclass Você Vai Aprender:", items: [{ icon: "🎯", title: "Estratégia #1", description: "O framework completo." }, { icon: "⚡", title: "Estratégia #2", description: "Como eliminar problemas." }, { icon: "💰", title: "Estratégia #3", description: "O método que gera resultados." }] } },
      { section_type: "cta", order: 2, config: { headline: "⚠️ Vagas Limitadas", description: "Apenas 500 vagas. Não deixe para depois.", ctaText: "QUERO PARTICIPAR →" } },
    ],
  },
];

interface Props {
  onSelect: (template: PageTemplate) => void;
  onClose: () => void;
}

const TemplatesModal = ({ onSelect, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Templates Prontos
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Escolha um modelo e personalize no editor.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">⚡ Templates Premium (HTML completo)</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {templates.filter(t => t.isFullHTML).map((t, i) => (
            <button
              key={`full-${i}`}
              onClick={() => onSelect(t)}
              className="text-left p-5 rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all group bg-primary/[0.02]"
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
  );
};

export default TemplatesModal;
