import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Palette, Type, MousePointer, Layers, Sparkles } from "lucide-react";
import { useEditorStore, Section } from "@/stores/useEditorStore";

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
  { value: "dots", label: "Dots" },
  { value: "squares", label: "Grid" },
  { value: "mesh", label: "Mesh" },
  { value: "noise", label: "Noise" },
];

const fontFamilies = [
  { value: "Inter", label: "Inter" },
  { value: "system-ui", label: "System UI" },
  { value: "Georgia", label: "Georgia" },
  { value: "'Courier New'", label: "Monospace" },
  { value: "'Playfair Display'", label: "Playfair" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Roboto", label: "Roboto" },
];

const fontWeights = [
  { value: "300", label: "Light" },
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
  { value: "gradient", label: "Gradiente" },
];

const PropertyInspector = () => {
  const { sections, selectedSectionId, updateSectionConfig, updateSectionFullConfig } = useEditorStore();
  const section = sections.find(s => s.id === selectedSectionId);

  if (!section) {
    return (
      <div className="w-80 border-l border-border bg-card flex flex-col items-center justify-center h-full px-6 shrink-0">
        <div className="text-4xl mb-3">👆</div>
        <p className="text-sm font-medium text-foreground mb-1">Selecione uma seção</p>
        <p className="text-xs text-muted-foreground text-center">Clique em uma seção no canvas para editar suas propriedades.</p>
      </div>
    );
  }

  const c = section.config;
  const set = (key: string, value: any) => updateSectionConfig(section.id, key, value);

  const sectionLabel = section.section_type.replace("_", " ").toUpperCase();

  return (
    <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0 flex flex-col">
      <div className="px-3 py-2.5 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">{sectionLabel}</p>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-2 mt-2 h-8">
          <TabsTrigger value="content" className="text-[10px] h-7 gap-1"><Layers className="h-3 w-3" /> Conteúdo</TabsTrigger>
          <TabsTrigger value="style" className="text-[10px] h-7 gap-1"><Palette className="h-3 w-3" /> Estilo</TabsTrigger>
          <TabsTrigger value="typo" className="text-[10px] h-7 gap-1"><Type className="h-3 w-3" /> Tipo</TabsTrigger>
          <TabsTrigger value="action" className="text-[10px] h-7 gap-1"><MousePointer className="h-3 w-3" /> Ação</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* CONTENT TAB */}
          <TabsContent value="content" className="p-3 space-y-3 mt-0">
            <ContentEditor section={section} set={set} c={c} />
          </TabsContent>

          {/* STYLE TAB */}
          <TabsContent value="style" className="p-3 space-y-3 mt-0">
            <StyleEditor c={c} set={set} />
          </TabsContent>

          {/* TYPOGRAPHY TAB */}
          <TabsContent value="typo" className="p-3 space-y-3 mt-0">
            <TypographyEditor c={c} set={set} />
          </TabsContent>

          {/* ACTION TAB */}
          <TabsContent value="action" className="p-3 space-y-3 mt-0">
            <ActionEditor c={c} set={set} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// Sub-editors

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-[10px] text-muted-foreground">{label}</Label>
    <div className="flex gap-1.5 mt-1">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border border-border bg-transparent shrink-0" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs bg-secondary border-border flex-1" />
    </div>
  </div>
);

const SelectInput = ({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) => (
  <div>
    <Label className="text-[10px] text-muted-foreground">{label}</Label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-8 text-xs bg-secondary text-foreground border border-border rounded-lg px-2 mt-1">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const ContentEditor = ({ section, set, c }: { section: Section; set: (k: string, v: any) => void; c: any }) => {
  const type = section.section_type;

  const renderListItems = (key: string, fields: { name: string; label: string; type?: string }[]) => {
    const items = c[key] || [];
    return (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Itens</p>
        {items.map((item: any, idx: number) => (
          <div key={idx} className="bg-secondary/50 rounded-lg p-2.5 space-y-1.5 relative">
            <button onClick={() => set(key, items.filter((_: any, i: number) => i !== idx))} className="absolute top-1.5 right-1.5 p-0.5 text-destructive hover:bg-destructive/20 rounded"><Trash2 className="w-3 h-3" /></button>
            {fields.map(f => (
              <div key={f.name}>
                <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={item[f.name] || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], [f.name]: e.target.value }; set(key, n); }} className="text-xs bg-secondary border-border mt-0.5" rows={2} />
                ) : (
                  <Input value={item[f.name] || ""} onChange={(e) => { const n = [...items]; n[idx] = { ...n[idx], [f.name]: e.target.value }; set(key, n); }} className="h-7 text-xs bg-secondary border-border mt-0.5" />
                )}
              </div>
            ))}
          </div>
        ))}
        <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-primary hover:bg-primary/10" onClick={() => { const ni: any = {}; fields.forEach(f => ni[f.name] = ""); set(key, [...items, ni]); }}>
          <Plus className="w-3 h-3 mr-1" /> Adicionar
        </Button>
      </div>
    );
  };

  return (
    <>
      {(type === "hero" || type === "cta") && (
        <>
          <div><Label className="text-xs text-muted-foreground">Headline</Label><Input value={c.headline || ""} onChange={(e) => set("headline", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {type === "hero" && <div><Label className="text-xs text-muted-foreground">Subtítulo</Label><Textarea value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="text-xs bg-secondary border-border mt-1" rows={2} /></div>}
          {type === "cta" && <div><Label className="text-xs text-muted-foreground">Descrição</Label><Textarea value={c.description || ""} onChange={(e) => set("description", e.target.value)} className="text-xs bg-secondary border-border mt-1" rows={2} /></div>}
          {type === "hero" && <div><Label className="text-xs text-muted-foreground">Badge</Label><Input value={c.badge || ""} onChange={(e) => set("badge", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>}
          {type === "hero" && <div><Label className="text-xs text-muted-foreground">Imagem de fundo (URL)</Label><Input value={c.bgImage || ""} onChange={(e) => set("bgImage", e.target.value)} placeholder="https://..." className="h-8 text-xs bg-secondary border-border mt-1" /></div>}
        </>
      )}

      {(type === "benefits" || type === "features") && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Subtítulo</Label><Input value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <SelectInput label="Colunas" value={c.columns || "3"} options={[{ value: "2", label: "2 colunas" }, { value: "3", label: "3 colunas" }, { value: "4", label: "4 colunas" }]} onChange={(v) => set("columns", v)} />
          {renderListItems("items", [{ name: "icon", label: "Ícone" }, { name: "title", label: "Título" }, { name: "description", label: "Descrição", type: "textarea" }])}
        </>
      )}

      {type === "pricing" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Planos</p>
          {(c.plans || []).map((plan: any, idx: number) => (
            <div key={idx} className="bg-secondary/50 rounded-lg p-2.5 space-y-1.5 relative">
              <button onClick={() => set("plans", (c.plans || []).filter((_: any, i: number) => i !== idx))} className="absolute top-1.5 right-1.5 p-0.5 text-destructive hover:bg-destructive/20 rounded"><Trash2 className="w-3 h-3" /></button>
              <div className="grid grid-cols-2 gap-1.5">
                <div><Label className="text-[10px] text-muted-foreground">Nome</Label><Input value={plan.name || ""} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], name: e.target.value }; set("plans", p); }} className="h-7 text-xs bg-secondary border-border mt-0.5" /></div>
                <div><Label className="text-[10px] text-muted-foreground">Preço</Label><Input value={plan.price || ""} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], price: e.target.value }; set("plans", p); }} className="h-7 text-xs bg-secondary border-border mt-0.5" /></div>
              </div>
              <div><Label className="text-[10px] text-muted-foreground">Features (uma/linha)</Label><Textarea value={(plan.features || []).join("\n")} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], features: e.target.value.split("\n") }; set("plans", p); }} className="text-xs bg-secondary border-border mt-0.5" rows={3} /></div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={plan.highlight || false} onChange={(e) => { const p = [...(c.plans || [])]; p[idx] = { ...p[idx], highlight: e.target.checked }; set("plans", p); }} className="accent-primary" /> Destacar</label>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-primary" onClick={() => set("plans", [...(c.plans || []), { name: "", price: "", features: [], ctaText: "Escolher", ctaUrl: "#", highlight: false }])}>
            <Plus className="w-3 h-3 mr-1" /> Plano
          </Button>
        </>
      )}

      {type === "testimonials" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "name", label: "Nome" }, { name: "role", label: "Cargo" }, { name: "text", label: "Depoimento", type: "textarea" }, { name: "avatar", label: "Avatar URL" }])}
        </>
      )}

      {type === "faq" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("items", [{ name: "question", label: "Pergunta" }, { name: "answer", label: "Resposta", type: "textarea" }])}
        </>
      )}

      {type === "gallery" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("images", [{ name: "url", label: "URL" }, { name: "alt", label: "Alt" }])}
        </>
      )}

      {type === "contact_form" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Subtítulo</Label><Input value={c.subtitle || ""} onChange={(e) => set("subtitle", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Texto do botão</Label><Input value={c.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
        </>
      )}

      {type === "custom_html" && (
        <div>
          <Label className="text-xs text-muted-foreground">HTML</Label>
          <Textarea value={c.html || ""} onChange={(e) => set("html", e.target.value)} className="text-xs bg-secondary border-border mt-1 font-mono" rows={12} />
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">CSS Personalizado</Label>
            <Textarea value={c.customCss || ""} onChange={(e) => set("customCss", e.target.value)} className="text-xs bg-secondary border-border mt-1 font-mono" rows={6} placeholder="/* CSS adicional */" />
          </div>
        </div>
      )}

      {type === "video" && (
        <>
          <div><Label className="text-xs text-muted-foreground">URL do Vídeo</Label><Input value={c.videoUrl || ""} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
        </>
      )}

      {type === "image_banner" && (
        <>
          <div><Label className="text-xs text-muted-foreground">URL da Imagem</Label><Input value={c.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Alt Text</Label><Input value={c.altText || ""} onChange={(e) => set("altText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Overlay Text</Label><Input value={c.overlayText || ""} onChange={(e) => set("overlayText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <SelectInput label="Altura" value={c.height || "400"} options={[{ value: "200", label: "Pequeno" }, { value: "400", label: "Médio" }, { value: "600", label: "Grande" }, { value: "100vh", label: "Fullscreen" }]} onChange={(v) => set("height", v)} />
        </>
      )}

      {type === "countdown" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Data alvo (ISO)</Label><Input type="datetime-local" value={c.targetDate || ""} onChange={(e) => set("targetDate", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
        </>
      )}

      {type === "logos" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("logos", [{ name: "url", label: "Logo URL" }, { name: "name", label: "Nome" }])}
        </>
      )}

      {type === "stats" && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("stats", [{ name: "value", label: "Valor" }, { name: "label", label: "Label" }, { name: "icon", label: "Ícone" }])}
        </>
      )}

      {(type === "marquee") && (
        <>
          <div><Label className="text-xs text-muted-foreground">Texto</Label><Input value={c.text || ""} onChange={(e) => set("text", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <SelectInput label="Velocidade" value={c.speed || "normal"} options={[{ value: "slow", label: "Lento" }, { value: "normal", label: "Normal" }, { value: "fast", label: "Rápido" }]} onChange={(v) => set("speed", v)} />
        </>
      )}

      {(type === "timeline") && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("events", [{ name: "date", label: "Data" }, { name: "title", label: "Título" }, { name: "description", label: "Descrição", type: "textarea" }])}
        </>
      )}

      {(type === "comparison") && (
        <>
          <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={c.title || ""} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Coluna Esquerda</Label><Input value={c.leftLabel || ""} onChange={(e) => set("leftLabel", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          <div><Label className="text-xs text-muted-foreground">Coluna Direita</Label><Input value={c.rightLabel || ""} onChange={(e) => set("rightLabel", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
          {renderListItems("rows", [{ name: "left", label: "Esquerda" }, { name: "right", label: "Direita" }])}
        </>
      )}
    </>
  );
};

const StyleEditor = ({ c, set }: { c: any; set: (k: string, v: any) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <ColorInput label="Cor de fundo" value={c.bgColor || "#000000"} onChange={(v) => set("bgColor", v)} />
      <ColorInput label="Cor do texto" value={c.textColor || "#ffffff"} onChange={(v) => set("textColor", v)} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <ColorInput label="Cor destaque" value={c.accentColor || "#84CC16"} onChange={(v) => set("accentColor", v)} />
      <SelectInput label="Padrão de fundo" value={c.bgPattern || "none"} options={bgPatterns} onChange={(v) => set("bgPattern", v)} />
    </div>
    <div>
      <Label className="text-[10px] text-muted-foreground">Gradiente (CSS)</Label>
      <Input value={c.bgGradient || ""} onChange={(e) => set("bgGradient", e.target.value)} placeholder="linear-gradient(135deg, #000, #1a1a2e)" className="h-8 text-xs bg-secondary border-border mt-1" />
    </div>
    <div>
      <Label className="text-[10px] text-muted-foreground">Imagem de fundo (URL)</Label>
      <Input value={c.bgImage || ""} onChange={(e) => set("bgImage", e.target.value)} placeholder="https://..." className="h-8 text-xs bg-secondary border-border mt-1" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <SelectInput label="Animação" value={c.animation || "none"} options={animations} onChange={(v) => set("animation", v)} />
      <div>
        <Label className="text-[10px] text-muted-foreground">Padding (px)</Label>
        <Input type="number" value={c.paddingY || "60"} onChange={(e) => set("paddingY", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-[10px] text-muted-foreground">Padding H (px)</Label>
        <Input type="number" value={c.paddingX || "24"} onChange={(e) => set("paddingX", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Border Radius</Label>
        <Input type="number" value={c.borderRadius || "0"} onChange={(e) => set("borderRadius", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
    </div>
    <div>
      <Label className="text-[10px] text-muted-foreground">CSS Personalizado</Label>
      <Textarea value={c.customCss || ""} onChange={(e) => set("customCss", e.target.value)} placeholder=".section { ... }" className="text-xs bg-secondary border-border mt-1 font-mono" rows={4} />
    </div>
  </div>
);

const TypographyEditor = ({ c, set }: { c: any; set: (k: string, v: any) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <SelectInput label="Fonte" value={c.fontFamily || "Inter"} options={fontFamilies} onChange={(v) => set("fontFamily", v)} />
      <SelectInput label="Peso Heading" value={c.headingWeight || "700"} options={fontWeights} onChange={(v) => set("headingWeight", v)} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-[10px] text-muted-foreground">Heading (px)</Label>
        <Input type="number" value={c.headingSize || "48"} onChange={(e) => set("headingSize", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Body (px)</Label>
        <Input type="number" value={c.subtitleSize || "18"} onChange={(e) => set("subtitleSize", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-[10px] text-muted-foreground">Line Height</Label>
        <Input type="number" step="0.1" value={c.lineHeight || "1.4"} onChange={(e) => set("lineHeight", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
      <div>
        <Label className="text-[10px] text-muted-foreground">Letter Spacing</Label>
        <Input value={c.letterSpacing || "-0.025em"} onChange={(e) => set("letterSpacing", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
    </div>
    <label className="flex items-center gap-2 text-xs text-foreground">
      <input type="checkbox" checked={c.gradientText || false} onChange={(e) => set("gradientText", e.target.checked)} className="rounded accent-primary" />
      Texto com gradiente (heading)
    </label>
    <label className="flex items-center gap-2 text-xs text-foreground">
      <input type="checkbox" checked={c.textShadow || false} onChange={(e) => set("textShadow", e.target.checked)} className="rounded accent-primary" />
      Sombra no texto
    </label>
  </div>
);

const ActionEditor = ({ c, set }: { c: any; set: (k: string, v: any) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <div><Label className="text-[10px] text-muted-foreground">Texto do botão</Label><Input value={c.ctaText || ""} onChange={(e) => set("ctaText", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" /></div>
      <SelectInput label="Ação" value={c.ctaAction || "link"} options={ctaActions} onChange={(v) => set("ctaAction", v)} />
    </div>
    {c.ctaAction === "whatsapp" ? (
      <div><Label className="text-[10px] text-muted-foreground">WhatsApp</Label><Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="5511999999999" className="h-8 text-xs bg-secondary border-border mt-1" /></div>
    ) : c.ctaAction === "scroll" ? (
      <div><Label className="text-[10px] text-muted-foreground">ID do elemento</Label><Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="pricing" className="h-8 text-xs bg-secondary border-border mt-1" /></div>
    ) : (
      <div><Label className="text-[10px] text-muted-foreground">URL</Label><Input value={c.ctaUrl || ""} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="https://..." className="h-8 text-xs bg-secondary border-border mt-1" /></div>
    )}
    <div className="grid grid-cols-2 gap-3">
      <SelectInput label="Estilo" value={c.btnStyle || "solid"} options={btnStyles} onChange={(v) => set("btnStyle", v)} />
      <SelectInput label="Tamanho" value={c.btnSize || "md"} options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }, { value: "xl", label: "XL" }]} onChange={(v) => set("btnSize", v)} />
    </div>
    <ColorInput label="Cor do botão" value={c.btnColor || c.accentColor || "#84CC16"} onChange={(v) => set("btnColor", v)} />
    <div>
      <Label className="text-[10px] text-muted-foreground">Segundo botão (texto)</Label>
      <Input value={c.cta2Text || ""} onChange={(e) => set("cta2Text", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" placeholder="Opcional" />
    </div>
    {c.cta2Text && (
      <div>
        <Label className="text-[10px] text-muted-foreground">Segundo botão URL</Label>
        <Input value={c.cta2Url || ""} onChange={(e) => set("cta2Url", e.target.value)} className="h-8 text-xs bg-secondary border-border mt-1" />
      </div>
    )}
  </div>
);

export default PropertyInspector;
