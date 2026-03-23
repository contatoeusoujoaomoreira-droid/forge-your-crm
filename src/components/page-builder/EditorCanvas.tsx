import { useRef, useCallback } from "react";
import { useEditorStore, Section } from "@/stores/useEditorStore";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import HeroRenderer from "./sections/HeroRenderer";
import BenefitsRenderer from "./sections/BenefitsRenderer";
import PricingRenderer from "./sections/PricingRenderer";
import CTARenderer from "./sections/CTARenderer";
import TestimonialsRenderer from "./sections/TestimonialsRenderer";
import FAQRenderer from "./sections/FAQRenderer";
import FeaturesRenderer from "./sections/FeaturesRenderer";
import GalleryRenderer from "./sections/GalleryRenderer";
import ContactFormRenderer from "./sections/ContactFormRenderer";
import CustomHTMLRenderer from "./sections/CustomHTMLRenderer";

const renderers: Record<string, React.FC<{ config: any; isEditor?: boolean }>> = {
  hero: HeroRenderer, benefits: BenefitsRenderer, pricing: PricingRenderer,
  cta: CTARenderer, testimonials: TestimonialsRenderer, faq: FAQRenderer,
  features: FeaturesRenderer, gallery: GalleryRenderer, contact_form: ContactFormRenderer,
  custom_html: CustomHTMLRenderer,
};

interface Props {
  onDropNewSection?: (type: string) => void;
}

const EditorCanvas = ({ onDropNewSection }: Props) => {
  const { sections, selectedSectionId, selectSection, canvasDevice, setCanvasDevice, updateSectionConfig, inlineEditingField, setInlineEditing } = useEditorStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const visibleSections = sections.filter(s => s.is_visible);

  const deviceWidth = canvasDevice === "mobile" ? "375px" : canvasDevice === "tablet" ? "768px" : "100%";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sectionType = e.dataTransfer.getData("section-type");
    if (sectionType && onDropNewSection) {
      onDropNewSection(sectionType);
    }
  };

  const handleInlineEdit = useCallback((sectionId: string, field: string, value: string) => {
    updateSectionConfig(sectionId, field, value);
  }, [updateSectionConfig]);

  const handleInlineBlur = useCallback(() => {
    setInlineEditing(null);
  }, [setInlineEditing]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-center gap-1 py-1.5 px-3 border-b border-border bg-card/50 shrink-0">
        {(["desktop", "tablet", "mobile"] as const).map(d => (
          <button
            key={d}
            onClick={() => setCanvasDevice(d)}
            className={`p-1.5 rounded-md transition-colors ${canvasDevice === d ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {d === "desktop" ? <Monitor className="h-4 w-4" /> : d === "tablet" ? <Tablet className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground ml-2">
          {canvasDevice === "mobile" ? "375px" : canvasDevice === "tablet" ? "768px" : "Full"}
        </span>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center" style={{ background: "var(--muted)" }}>
        <div
          ref={canvasRef}
          className="bg-background shadow-lg transition-all duration-300"
          style={{
            width: deviceWidth,
            maxWidth: "100%",
            minHeight: "100%",
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {visibleSections.map((section) => {
            const Renderer = renderers[section.section_type];
            if (!Renderer) {
              return (
                <div
                  key={section.id}
                  onClick={() => selectSection(section.id)}
                  className={`relative p-8 text-center cursor-pointer transition-all ${
                    selectedSectionId === section.id ? "ring-2 ring-primary ring-inset" : "hover:ring-1 hover:ring-border hover:ring-inset"
                  }`}
                  style={{ background: section.config.bgColor || "#111", color: section.config.textColor || "#fff" }}
                >
                  <p className="text-sm opacity-60">Seção: {section.section_type}</p>
                </div>
              );
            }

            return (
              <div
                key={section.id}
                onClick={() => selectSection(section.id)}
                className={`relative cursor-pointer transition-all ${
                  selectedSectionId === section.id
                    ? "ring-2 ring-primary ring-inset"
                    : "hover:ring-1 hover:ring-border/50 hover:ring-inset"
                }`}
              >
                {/* Selection overlay label */}
                {selectedSectionId === section.id && (
                  <div className="absolute top-0 left-0 z-10 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-br-md">
                    {section.section_type.replace("_", " ").toUpperCase()}
                  </div>
                )}

                {/* Inline editable wrapper */}
                <InlineEditableSection
                  section={section}
                  Renderer={Renderer}
                  isSelected={selectedSectionId === section.id}
                  editingField={inlineEditingField?.sectionId === section.id ? inlineEditingField.field : null}
                  onStartEdit={(field) => setInlineEditing({ sectionId: section.id, field })}
                  onEdit={handleInlineEdit}
                  onBlur={handleInlineBlur}
                />
              </div>
            );
          })}

          {visibleSections.length === 0 && (
            <div
              className="flex flex-col items-center justify-center h-96 text-muted-foreground"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="text-5xl mb-4">📄</div>
              <p className="text-sm font-medium mb-1">Canvas vazio</p>
              <p className="text-xs opacity-60">Arraste seções da biblioteca ou clique em + Novo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline editable layer over the renderer
const InlineEditableSection = ({
  section,
  Renderer,
  isSelected,
  editingField,
  onStartEdit,
  onEdit,
  onBlur,
}: {
  section: Section;
  Renderer: React.FC<{ config: any; isEditor?: boolean }>;
  isSelected: boolean;
  editingField: string | null;
  onStartEdit: (field: string) => void;
  onEdit: (sectionId: string, field: string, value: string) => void;
  onBlur: () => void;
}) => {
  // For inline text editing, we overlay contentEditable spans
  const editableFields = getEditableFields(section.section_type);

  if (!isSelected || editableFields.length === 0) {
    return <Renderer config={section.config} isEditor />;
  }

  return (
    <div className="relative">
      <Renderer config={section.config} isEditor />
      {/* Overlay editable text triggers */}
      {isSelected && (
        <div className="absolute inset-0 z-[5]" style={{ pointerEvents: "none" }}>
          {/* We show small edit indicators */}
          <div className="absolute top-2 right-2 flex gap-1" style={{ pointerEvents: "auto" }}>
            {editableFields.map(f => (
              <button
                key={f.key}
                onClick={(e) => { e.stopPropagation(); onStartEdit(f.key); }}
                className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm hover:bg-primary/80 transition-colors"
                title={`Editar ${f.label}`}
              >
                ✏️ {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function getEditableFields(type: string): { key: string; label: string }[] {
  switch (type) {
    case "hero": return [{ key: "headline", label: "Título" }, { key: "subtitle", label: "Subtítulo" }, { key: "ctaText", label: "Botão" }, { key: "badge", label: "Badge" }];
    case "cta": return [{ key: "headline", label: "Título" }, { key: "description", label: "Descrição" }, { key: "ctaText", label: "Botão" }];
    case "benefits": case "features": return [{ key: "title", label: "Título" }];
    case "pricing": return [{ key: "title", label: "Título" }];
    case "testimonials": return [{ key: "title", label: "Título" }];
    case "faq": return [{ key: "title", label: "Título" }];
    case "gallery": return [{ key: "title", label: "Título" }];
    case "contact_form": return [{ key: "title", label: "Título" }, { key: "subtitle", label: "Subtítulo" }];
    default: return [];
  }
}

export default EditorCanvas;
