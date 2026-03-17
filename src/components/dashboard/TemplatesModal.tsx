import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PageTemplate {
  name: string;
  description: string;
  preview: string;
  category: string;
  sections: { section_type: string; order: number; config: any }[];
}

const templates: PageTemplate[] = [
  {
    name: "VSL — Vídeo de Vendas",
    description: "Página com vídeo de vendas, headline forte, urgência e escassez. Ideal para lançamentos.",
    preview: "🎬",
    category: "Vendas",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Descubra o Método que Já Transformou +10.000 Vidas", subtitle: "Assista ao vídeo abaixo e veja como funciona — antes que a oferta expire.", ctaText: "QUERO ACESSO AGORA →", ctaUrl: "#pricing", badge: "🔥 OFERTA POR TEMPO LIMITADO", bgColor: "#000000", textColor: "#ffffff", accentColor: "#84CC16" } },
      { section_type: "benefits", order: 1, config: { title: "Por Que Este Método Funciona?", items: [{ icon: "✅", title: "Resultado em 7 dias", description: "Veja as primeiras mudanças na primeira semana." }, { icon: "🎯", title: "100% Prático", description: "Passo a passo direto ao ponto." }, { icon: "🔒", title: "Garantia de 30 Dias", description: "Devolvemos seu dinheiro se não gostar." }] } },
      { section_type: "pricing", order: 2, config: { title: "Escolha Seu Plano", plans: [{ name: "Essencial", price: "97", features: ["Acesso completo", "Suporte 30 dias", "Comunidade"], ctaText: "QUERO ESSE →", highlight: false }, { name: "Premium", price: "197", features: ["Tudo do Essencial", "Mentoria em grupo", "Acesso vitalício"], ctaText: "QUERO ESSE →", highlight: true }] } },
      { section_type: "cta", order: 3, config: { headline: "⏰ Essa Oferta Expira em Breve", description: "Garanta seu acesso agora com desconto exclusivo.", ctaText: "GARANTIR MINHA VAGA →" } },
    ],
  },
  {
    name: "Squeeze — Captura de Leads",
    description: "Página curta e direta para capturar email/WhatsApp com isca digital.",
    preview: "🧲",
    category: "Captura",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "E-book Grátis: Guia Completo", subtitle: "Baixe agora o guia com estratégias comprovadas. 100% gratuito.", ctaText: "BAIXAR AGORA — É GRÁTIS →", badge: "📚 MATERIAL GRATUITO" } },
      { section_type: "benefits", order: 1, config: { title: "O Que Você Vai Aprender:", items: [{ icon: "📖", title: "Fundamentos", description: "A base que todo profissional precisa." }, { icon: "🎯", title: "Estratégias", description: "Táticas que geram resultados reais." }, { icon: "🚀", title: "Escala", description: "Como multiplicar seus resultados." }] } },
    ],
  },
  {
    name: "Webinar — Evento Online",
    description: "Página de inscrição para evento ao vivo com urgência. Ideal para lançamentos.",
    preview: "🎙️",
    category: "Evento",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Masterclass Gratuita: Como Alcançar Resultados", subtitle: "Evento ao vivo — Vagas limitadas a 500 participantes.", ctaText: "GARANTIR MINHA VAGA GRÁTIS →", badge: "🔴 AO VIVO E GRATUITO" } },
      { section_type: "benefits", order: 1, config: { title: "Nesta Masterclass Você Vai Aprender:", items: [{ icon: "🎯", title: "Estratégia #1", description: "O framework completo para resultados." }, { icon: "⚡", title: "Estratégia #2", description: "Como eliminar problemas da sua rotina." }, { icon: "💰", title: "Estratégia #3", description: "O método que gera resultados." }] } },
      { section_type: "cta", order: 2, config: { headline: "⚠️ Vagas Limitadas", description: "Apenas 500 vagas disponíveis. Não deixe para depois.", ctaText: "QUERO PARTICIPAR →" } },
    ],
  },
  {
    name: "Forge — Estilo Corporativo Tech",
    description: "Dark mode moderno com verde lima neon. Estilo Linear/Vercel para SaaS.",
    preview: "⚡",
    category: "SaaS",
    sections: [
      { section_type: "hero", order: 0, config: { headline: "Construa. Escale. Domine.", subtitle: "A plataforma all-in-one para acelerar suas vendas com automação inteligente.", ctaText: "Começar Gratuitamente →", badge: "✨ Novo: AI Copilot" } },
      { section_type: "features", order: 1, config: { title: "Tudo que você precisa", items: [{ icon: "📊", title: "Analytics em Tempo Real", description: "Dashboards com métricas que importam." }, { icon: "🤖", title: "Automação Inteligente", description: "Fluxos automatizados de follow-up." }, { icon: "🌐", title: "Landing Pages em Minutos", description: "Builder com templates de alta conversão." }] } },
      { section_type: "pricing", order: 2, config: { title: "Planos Transparentes", plans: [{ name: "Starter", price: "0", features: ["100 leads", "1 landing page", "Analytics básico"], ctaText: "Começar Grátis", highlight: false }, { name: "Pro", price: "97", features: ["Leads ilimitados", "Pages ilimitadas", "CRM completo"], ctaText: "Assinar Pro →", highlight: true }] } },
      { section_type: "cta", order: 3, config: { headline: "Pronto para acelerar?", description: "Comece gratuitamente e escale conforme cresce.", ctaText: "Criar Conta Grátis →" } },
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
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => onSelect(t)}
              className="text-left p-5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{t.preview}</span>
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{t.category}</span>
              </div>
              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
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
