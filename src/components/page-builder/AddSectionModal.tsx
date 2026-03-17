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
];

const AddSectionModal = ({ onAdd, onClose }: { onAdd: (type: string) => void; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-background border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base tracking-tight flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Adicionar Seção</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {sectionTypes.map(s => (
            <button key={s.type} onClick={() => onAdd(s.type)}
              className="text-left p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
              <span className="text-xl">{s.icon}</span>
              <p className="font-medium text-sm mt-2">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddSectionModal;
