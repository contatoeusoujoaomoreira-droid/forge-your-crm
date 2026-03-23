import { Plus, GripVertical, Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Search } from "lucide-react";
import { useState, useRef } from "react";
import { useEditorStore } from "@/stores/useEditorStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sectionTypes = [
  { type: "hero", label: "Hero", icon: "🎯", desc: "Headline, CTA e badge", category: "content" },
  { type: "benefits", label: "Benefícios", icon: "✅", desc: "Grid com ícones", category: "content" },
  { type: "features", label: "Features", icon: "⚡", desc: "Grid de funcionalidades", category: "content" },
  { type: "pricing", label: "Preços", icon: "💰", desc: "Tabela de planos", category: "content" },
  { type: "cta", label: "CTA", icon: "🚀", desc: "Chamada para ação", category: "content" },
  { type: "testimonials", label: "Depoimentos", icon: "💬", desc: "Cards de clientes", category: "content" },
  { type: "faq", label: "FAQ", icon: "❓", desc: "Perguntas frequentes", category: "content" },
  { type: "gallery", label: "Galeria", icon: "🖼️", desc: "Grid de imagens", category: "media" },
  { type: "contact_form", label: "Formulário", icon: "📝", desc: "Captura de lead", category: "content" },
  { type: "custom_html", label: "HTML Livre", icon: "🧩", desc: "Bloco personalizado", category: "advanced" },
  { type: "video", label: "Vídeo", icon: "🎬", desc: "YouTube/Vimeo embed", category: "media" },
  { type: "image_banner", label: "Banner", icon: "🏞️", desc: "Imagem fullwidth", category: "media" },
  { type: "countdown", label: "Countdown", icon: "⏰", desc: "Contador regressivo", category: "effects" },
  { type: "logos", label: "Logos", icon: "🤝", desc: "Grid de parceiros", category: "content" },
  { type: "stats", label: "Estatísticas", icon: "📊", desc: "Números de impacto", category: "content" },
  { type: "divider", label: "Divisor", icon: "➖", desc: "Separador visual", category: "effects" },
  { type: "marquee", label: "Marquee", icon: "📜", desc: "Texto/logos deslizando", category: "effects" },
  { type: "accordion", label: "Accordion", icon: "📂", desc: "Conteúdo expansível", category: "content" },
  { type: "tabs_section", label: "Tabs", icon: "📑", desc: "Conteúdo em abas", category: "content" },
  { type: "timeline", label: "Timeline", icon: "📅", desc: "Linha do tempo", category: "content" },
  { type: "comparison", label: "Comparação", icon: "⚖️", desc: "Tabela antes/depois", category: "content" },
  { type: "social_proof", label: "Prova Social", icon: "🏆", desc: "Badges e selos", category: "effects" },
];

const sectionLabels: Record<string, string> = {};
const sectionIcons: Record<string, string> = {};
sectionTypes.forEach(s => { sectionLabels[s.type] = s.label; sectionIcons[s.type] = s.icon; });
export { sectionLabels, sectionIcons };

interface Props {
  onAddSection: (type: string) => void;
}

const SectionLibrary = ({ onAddSection }: Props) => {
  const { sections, selectedSectionId, selectSection, toggleVisibility, removeSection, moveSection } = useEditorStore();
  const [showLibrary, setShowLibrary] = useState(false);
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); };
  const handleDrop = (idx: number) => {
    if (dragIndex !== null && dragIndex !== idx) moveSection(dragIndex, idx);
    setDragIndex(null);
  };

  const filteredTypes = sectionTypes.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [
    { key: "content", label: "Conteúdo" },
    { key: "media", label: "Mídia" },
    { key: "effects", label: "Efeitos" },
    { key: "advanced", label: "Avançado" },
  ];

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col shrink-0 h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {showLibrary ? "Biblioteca" : "Seções"}
        </h3>
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
        >
          {showLibrary ? "← Voltar" : "+ Novo"}
        </button>
      </div>

      {showLibrary ? (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar seções..."
              className="h-7 text-xs pl-7 bg-secondary border-border"
            />
          </div>
          {categories.map(cat => {
            const items = filteredTypes.filter(s => s.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 px-1">{cat.label}</p>
                <div className="space-y-1">
                  {items.map(s => (
                    <button
                      key={s.type}
                      onClick={() => { onAddSection(s.type); setShowLibrary(false); }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-secondary/40 border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left group"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("section-type", s.type)}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                onClick={() => selectSection(section.id)}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer text-xs transition-all group ${
                  selectedSectionId === section.id
                    ? "bg-primary/10 border border-primary/20 text-primary font-semibold"
                    : "hover:bg-secondary/80 text-foreground border border-transparent"
                } ${!section.is_visible ? "opacity-40" : ""}`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing" />
                <span className="text-sm shrink-0">{sectionIcons[section.section_type] || "📄"}</span>
                <span className="truncate flex-1">{sectionLabels[section.section_type] || section.section_type}</span>
                <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); moveSection(idx, Math.max(0, idx - 1)); }} className="p-0.5 hover:bg-background rounded" disabled={idx === 0}>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(idx, Math.min(sections.length - 1, idx + 1)); }} className="p-0.5 hover:bg-background rounded" disabled={idx === sections.length - 1}>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleVisibility(section.id); }} className="p-0.5 hover:bg-background rounded">
                    {section.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeSection(section.id); }} className="p-0.5 hover:bg-destructive/20 rounded text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="text-center py-12 px-4">
                <p className="text-xs text-muted-foreground mb-2">Nenhuma seção</p>
                <p className="text-[10px] text-muted-foreground/60 mb-4">Arraste da biblioteca ou clique + Novo</p>
              </div>
            )}
          </div>
          <div className="p-2 border-t border-border">
            <Button
              onClick={() => setShowLibrary(true)}
              className="w-full h-8 text-xs font-semibold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Seção
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SectionLibrary;
