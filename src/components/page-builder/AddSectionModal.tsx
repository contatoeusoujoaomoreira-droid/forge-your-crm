import { X, Sparkles } from "lucide-react";

const sectionTypes = [
  { type: "hero", label: "Hero", icon: "🎯", desc: "Headline, CTA e badge" },
  { type: "benefits", label: "Benefícios", icon: "✅", desc: "Grid de benefícios com ícones" },
  { type: "pricing", label: "Preços", icon: "💰", desc: "Tabela de planos" },
  { type: "cta", label: "CTA", icon: "🚀", desc: "Chamada para ação" },
  { type: "testimonials", label: "Depoimentos", icon: "💬", desc: "Cards de clientes" },
  { type: "faq", label: "FAQ", icon: "❓", desc: "Perguntas frequentes" },
  { type: "features", label: "Features", icon: "⚡", desc: "Grid de funcionalidades" },
  { type: "gallery", label: "Galeria", icon: "🖼️", desc: "Grid de imagens" },
  { type: "contact_form", label: "Formulário", icon: "📝", desc: "Captura de lead" },
  { type: "custom_html", label: "HTML Livre", icon: "🧩", desc: "Bloco personalizado" },
  { type: "video", label: "Vídeo", icon: "🎬", desc: "Embed de vídeo (YouTube/Vimeo)" },
  { type: "image_banner", label: "Banner/Imagem", icon: "🏞️", desc: "Imagem fullwidth ou banner" },
  { type: "countdown", label: "Countdown", icon: "⏰", desc: "Contador regressivo de urgência" },
  { type: "logos", label: "Logos/Parceiros", icon: "🤝", desc: "Grid de logos de empresas" },
  { type: "stats", label: "Estatísticas", icon: "📊", desc: "Números e métricas de impacto" },
  { type: "divider", label: "Divisor", icon: "➖", desc: "Separador visual com efeitos" },
];

const AddSectionModal = ({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Adicionar Seção
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Conteúdo</p>
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {sectionTypes.slice(0, 10).map(s => (
            <button key={s.type} onClick={() => onAdd(s.type)}
              className="text-left p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="font-semibold text-sm text-foreground">{s.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Mídia & Efeitos</p>
        <div className="grid grid-cols-2 gap-2.5">
          {sectionTypes.slice(10).map(s => (
            <button key={s.type} onClick={() => onAdd(s.type)}
              className="text-left p-4 rounded-xl bg-primary/[0.02] border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all group">
              <span className="text-2xl block mb-2">{s.icon}</span>
              <p className="font-semibold text-sm text-foreground">{s.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddSectionModal;
