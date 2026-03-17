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

interface Section { id: string; section_type: string; order: number; config: any; is_visible: boolean; }

const renderers: Record<string, React.FC<{ config: any; isEditor?: boolean }>> = {
  hero: HeroRenderer, benefits: BenefitsRenderer, pricing: PricingRenderer,
  cta: CTARenderer, testimonials: TestimonialsRenderer, faq: FAQRenderer,
  features: FeaturesRenderer, gallery: GalleryRenderer, contact_form: ContactFormRenderer,
  custom_html: CustomHTMLRenderer,
};

const SectionPreview = ({ sections, selectedId, onSelect }: {
  sections: Section[]; selectedId?: string | null; onSelect?: (id: string) => void;
}) => {
  const isEditor = !!onSelect;
  return (
    <div className="min-h-full">
      {sections.map((section) => {
        const Renderer = renderers[section.section_type];
        if (!Renderer) return null;
        return (
          <div key={section.id} onClick={() => onSelect?.(section.id)}
            className={`relative ${isEditor ? "cursor-pointer" : ""} transition-all ${
              selectedId === section.id
                ? "ring-2 ring-primary/40 ring-inset"
                : isEditor ? "hover:ring-1 hover:ring-border hover:ring-inset" : ""
            }`}>
            <Renderer config={section.config} isEditor={isEditor} />
          </div>
        );
      })}
      {sections.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Adicione seções para começar
        </div>
      )}
    </div>
  );
};

export default SectionPreview;
