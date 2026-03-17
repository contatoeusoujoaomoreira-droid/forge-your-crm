import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  section: { id: string; section_type: string; config: any };
  onChange: (config: any) => void;
}

const animations = [
  { value: "none", label: "Nenhuma" },
  { value: "fade-in", label: "Fade In" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-left", label: "Slide Left" },
  { value: "scale-in", label: "Scale In" },
  { value: "bounce-in", label: "Bounce In" },
  { value: "rotate-in", label: "Rotate In" },
];

const bgPatterns = [
  { value: "none", label: "Nenhum" },
  { value: "dots", label: "Dots Grid" },
  { value: "squares", label: "Square Grid" },
  { value: "mesh", label: "Mesh Gradient" },
  { value: "noise", label: "Noise Texture" },
];

const fontFamilies = [
  { value: "Inter", label: "Inter" },
  { value: "system-ui", label: "System UI" },
  { value: "Georgia", label: "Georgia" },
  { value: "Courier New", label: "Monospace" },
];

const fontWeights = [
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

const ctaActions = [
  { value: "link", label: "Link externo" },
  { value: "scroll", label: "Scroll para ID" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "popup", label: "Popup formulário" },
];

const btnStyles = [
  { value: "solid", label: "Sólido" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "rounded-full", label: "Pill" },
];

const SectionEditor = ({ section, onChange }: Props) => {
  const c = section.config;
  const set = (key: string, value: any) => onChange({ ...c, [key]: value });

  const renderBackgroundEngine = () => (
    <div className="space-y-3 border-t border-border pt-4 mt-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">🎨 Background Engine</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Cor de fundo</Label>
          <div className="flex gap-1 mt-1">
            <input type="color" value={c.bgColor || "#000000"} onChange={(e) => set("bgColor", e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            <Input value={c.bgColor || "#000000"} onChange={(e) => set("bgColor", e.target.value)} className="h-8 text-xs bg-secondary border-border flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Cor do texto</Label>
          <div className="flex gap-1 mt-1">
            <input type="color" value={c.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            <Input value={c.textColor || "#ffffff"} onChange={(e) => set("textColor", e.target.value)} className="h-8 text-xs bg-secondary border-border flex-1" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Cor destaque</Label>
          <div className="flex gap-1 mt-1">
            <input type="color" value={c.accentColor || "#84CC16"} onChange={(e) => set("accentColor", e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
            <Input value={c.accentColor || "#84CC16"} onChange={(e) => set("accentColor", e.target.value)} className="h-8 text-xs bg-secondary border-border flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Padrão de fundo</Label>
          <select value={c.bgPattern || "none"} onChange={(e) => set("bgPattern", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {bgPatterns.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Gradiente (CSS)</Label>
        <Input value={c.bgGradient || ""} onChange={(e) => set("bgGradient", e.target.value)} placeholder="linear-gradient(135deg, #000, #1a1a2e)" className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Animação</Label>
          <select value={c.animation || "none"} onChange={(e) => set("animation", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {animations.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Padding (px)</Label>
          <Input type="number" value={c.paddingY || "60"} onChange={(e) => set("paddingY", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
      </div>
    </div>
  );

  const renderTextEditor = () => (
    <div className="space-y-3 border-t border-border pt-4 mt-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">✏️ Tipografia</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Fonte</Label>
          <select value={c.fontFamily || "Inter"} onChange={(e) => set("fontFamily", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Peso</Label>
          <select value={c.headingWeight || "700"} onChange={(e) => set("headingWeight", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {fontWeights.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Heading (px)</Label>
          <Input type="number" value={c.headingSize || "48"} onChange={(e) => set("headingSize", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
        <div>
          <Label className="text-[10px]">Body (px)</Label>
          <Input type="number" value={c.subtitleSize || "18"} onChange={(e) => set("subtitleSize", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={c.gradientText || false} onChange={(e) => set("gradientText", e.target.checked)} className="rounded" />
        Texto com gradiente (heading)
      </label>
    </div>
  );

  const renderActionManager = () => (
    <div className="space-y-3 border-t border-border pt-4 mt-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">🔗 Action Manager</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Texto do botão</Label>
          <Input value={c.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
        <div>
          <Label className="text-[10px]">Ação</Label>
          <select value={c.ctaAction || "link"} onChange={(e) => set("ctaAction", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {ctaActions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
      </div>
      {c.ctaAction === "whatsapp" ? (
        <div>
          <Label className="text-[10px]">Número WhatsApp</Label>
          <Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="5511999999999" className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
      ) : c.ctaAction === "scroll" ? (
        <div>
          <Label className="text-[10px]">ID do elemento</Label>
          <Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="pricing" className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
      ) : (
        <div>
          <Label className="text-[10px]">URL</Label>
          <Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." className="h-8 text-xs bg-secondary border-border mt-1" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px]">Estilo botão</Label>
          <select value={c.btnStyle || "solid"} onChange={(e) => set("btnStyle", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            {btnStyles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Tamanho botão</Label>
          <select value={c.btnSize || "md"} onChange={(e) => set("btnSize", e.target.value)} className="w-full h-8 text-xs bg-secondary border border-border rounded-lg px-2 mt-1">
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderListItems = (key: string, fields: { name: string; label: string; type?: string }[]) => {
    const items = c[key] || [];
    return (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Itens</p>
        {items.map((item: any, idx: number) => (
          <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-2 relative">
            <button onClick={() => set(key, items.filter((_: any, i: number) => i !== idx))}
              className="absolute top-2 right-2 p-0.5 text-destructive hover:bg-destructive/20 rounded-lg"><Trash2 className="w-3 h-3" /></button>
            {fields.map(f => (
              <div key={f.name}>
                <Label className="text-[10px]">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={item[f.name] || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], [f.name]: e.target.value }; set(key, n); }} className="text-xs bg-secondary border-border mt-0.5" rows={2} />
                ) : (
                  <Input value={item[f.name] || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], [f.name]: e.target.value }; set(key, n); }} className="h-7 text-xs bg-secondary border-border mt-0.5" />
                )}
              </div>
            ))}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { const ni: any = {}; fields.forEach(f => ni[f.name] = ""); set(key, [...items, ni]); }}><Plus className="w-3 h-3" /> Adicionar</Button>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
        {section.section_type.replace("_", " ")}
      </p>

      {(section.section_type === "hero" || section.section_type === "cta") && (
        <div className="space-y-3">
          <div><Label className="text-xs">Headline</Label><Input value={c.headline || ""} onChange={(e) => set("headline", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {section.section_type === "hero" && (<div><Label className="text-xs">Subtítulo</Label><Textarea value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="text-xs bg-secondary border-border mt-1" rows={2} /></div>)}
          {section.section_type === "cta" && (<div><Label className="text-xs">Descrição</Label><Textarea value={c.description || ""} onChange={(e) => set("description", e.target.value)} className="text-xs bg-secondary border-border mt-1" rows={2} /></div>)}
          {section.section_type === "hero" && (<div><Label className="text-xs">Badge</Label><Input value={c.badge || ""} onChange={(e) => set("badge", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>)}
          {renderActionManager()}
          {renderTextEditor()}
        </div>
      )}

      {section.section_type === "benefits" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "icon", label: "Ícone" }, { name: "title", label: "Título" }, { name: "description", label: "Descrição", type: "textarea" }])}
        </div>
      )}

      {section.section_type === "features" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "icon", label: "Ícone" }, { name: "title", label: "Título" }, { name: "description", label: "Descrição", type: "textarea" }])}
        </div>
      )}

      {section.section_type === "pricing" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Planos</p>
          {(c.plans || []).map((plan: any, idx: number) => (
            <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-2 relative">
              <button onClick={() => set("plans", (c.plans || []).filter((_: any, i: number) => i !== idx))} className="absolute top-2 right-2 p-0.5 text-destructive hover:bg-destructive/20 rounded-lg"><Trash2 className="w-3 h-3" /></button>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px]">Nome</Label><Input value={plan.name || ""} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], name: e.target.value }; set("plans", p); }} className="h-7 text-xs bg-secondary border-border mt-0.5" /></div>
                <div><Label className="text-[10px]">Preço</Label><Input value={plan.price || ""} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], price: e.target.value }; set("plans", p); }} className="h-7 text-xs bg-secondary border-border mt-0.5" /></div>
              </div>
              <div><Label className="text-[10px]">Features (uma/linha)</Label><Textarea value={(plan.features || []).join("\n")} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], features: e.target.value.split("\n") }; set("plans", p); }} className="text-xs bg-secondary border-border mt-0.5" rows={3} /></div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={plan.highlight || false} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], highlight: e.target.checked }; set("plans", p); }} /> Destacar</label>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => set("plans", [...(c.plans || []), { name: "", price: "", features: [], ctaText: "Escolher", ctaUrl: "#", highlight: false }])}><Plus className="w-3 h-3" /> Plano</Button>
        </div>
      )}

      {section.section_type === "testimonials" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "name", label: "Nome" }, { name: "role", label: "Cargo" }, { name: "text", label: "Depoimento", type: "textarea" }, { name: "avatar", label: "Avatar URL" }])}
        </div>
      )}

      {section.section_type === "faq" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "question", label: "Pergunta" }, { name: "answer", label: "Resposta", type: "textarea" }])}
        </div>
      )}

      {section.section_type === "gallery" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("images", [{ name: "url", label: "URL da imagem" }, { name: "alt", label: "Alt text" }])}
        </div>
      )}

      {section.section_type === "contact_form" && (
        <div className="space-y-3">
          <div><Label className="text-xs">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs">Subtítulo</Label><Input value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs">Texto do botão</Label><Input value={c.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
        </div>
      )}

      {section.section_type === "custom_html" && (
        <div>
          <Label className="text-xs">HTML</Label>
          <Textarea value={c.html || ""} onChange={(e) => set("html", e.target.value)} className="text-xs bg-secondary border-border mt-1 font-mono" rows={12} />
        </div>
      )}

      {renderBackgroundEngine()}
    </div>
  );
};

export default SectionEditor;
