import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Palette, Type, Layout, Calendar } from "lucide-react";

interface BookingConfig {
  brandName: string;
  logoUrl: string;
  tagline: string;
  description: string;
  bgColor: string;
  cardBgColor: string;
  textColor: string;
  accentColor: string;
  accentTextColor: string;
  fontFamily: string;
  headingSize: string;
  showAmenities: boolean;
  showCapacity: boolean;
  showPriceComparison: boolean;
  showGuestForm: boolean;
  customFieldLabel1: string;
  customFieldLabel2: string;
  customFieldEnabled1: boolean;
  customFieldEnabled2: boolean;
  ctaText: string;
  successMessage: string;
  bgPattern: string;
  bgGradient: string;
}

const defaultConfig: BookingConfig = {
  brandName: "Forge AI",
  logoUrl: "",
  tagline: "Reserve seu espaço",
  description: "Agende online e pague até 25% menos.",
  bgColor: "#000000",
  cardBgColor: "#0A0A0A",
  textColor: "#ffffff",
  accentColor: "#84CC16",
  accentTextColor: "#000000",
  fontFamily: "Inter",
  headingSize: "36",
  showAmenities: true,
  showCapacity: true,
  showPriceComparison: true,
  showGuestForm: true,
  customFieldLabel1: "",
  customFieldLabel2: "",
  customFieldEnabled1: false,
  customFieldEnabled2: false,
  ctaText: "Confirmar Reserva",
  successMessage: "Reserva confirmada com sucesso!",
  bgPattern: "none",
  bgGradient: "",
};

const BOOKING_PAGE_SLUG = "_booking_config";

const bgPatterns = [
  { value: "none", label: "Nenhum" },
  { value: "dots", label: "Dots Grid" },
  { value: "squares", label: "Square Grid" },
  { value: "noise", label: "Noise" },
];

const BookingPageEditor = () => {
  const [config, setConfig] = useState<BookingConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [pageId, setPageId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const { data } = await supabase.from("landing_pages").select("id, custom_css").eq("slug", BOOKING_PAGE_SLUG).maybeSingle();
    if (data) {
      setPageId(data.id);
      try {
        const parsed = JSON.parse(data.custom_css || "{}");
        setConfig({ ...defaultConfig, ...parsed });
      } catch { /* use defaults */ }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const configJson = JSON.stringify(config);
    if (pageId) {
      await supabase.from("landing_pages").update({ custom_css: configJson, updated_at: new Date().toISOString() }).eq("id", pageId);
    } else {
      const { data } = await supabase.from("landing_pages").insert({
        title: "Booking Config", slug: BOOKING_PAGE_SLUG, is_published: false, custom_css: configJson,
      }).select("id").single();
      if (data) setPageId(data.id);
    }
    toast({ title: "Configurações salvas!" });
    setSaving(false);
  };

  const set = (key: keyof BookingConfig, value: any) => setConfig({ ...config, [key]: value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Página de Reservas</h2>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Branding */}
      <div className="surface-card rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Type className="h-4 w-4 text-primary" /> Branding & Textos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Nome da Marca</Label>
            <Input value={config.brandName} onChange={(e) => set("brandName", e.target.value)} className="mt-1 h-9 text-sm bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Logo URL</Label>
            <Input value={config.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." className="mt-1 h-9 text-sm bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tagline</Label>
            <Input value={config.tagline} onChange={(e) => set("tagline", e.target.value)} className="mt-1 h-9 text-sm bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea value={config.description} onChange={(e) => set("description", e.target.value)} className="mt-1 text-sm bg-secondary border-border" rows={2} />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="surface-card rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Cores</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: "bgColor" as const, label: "Fundo" },
            { key: "cardBgColor" as const, label: "Fundo Card" },
            { key: "textColor" as const, label: "Texto" },
            { key: "accentColor" as const, label: "Destaque" },
            { key: "accentTextColor" as const, label: "Texto Destaque" },
          ].map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <input type="color" value={config[c.key]} onChange={(e) => set(c.key, e.target.value)} className="h-8 w-8 rounded border border-border cursor-pointer" />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-[10px] text-muted-foreground">{config[c.key]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div className="surface-card rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /> Layout & Seções</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "showAmenities" as const, label: "Mostrar amenidades" },
            { key: "showCapacity" as const, label: "Mostrar capacidade" },
            { key: "showPriceComparison" as const, label: "Comparação de preços" },
            { key: "showGuestForm" as const, label: "Formulário de hóspede" },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <Switch checked={config[s.key]} onCheckedChange={(v) => set(s.key, v)} />
              <Label className="text-xs text-muted-foreground">{s.label}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Fields */}
      <div className="surface-card rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Campos Customizados & CTA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={config.customFieldEnabled1} onCheckedChange={(v) => set("customFieldEnabled1", v)} />
              <Label className="text-xs text-muted-foreground">Campo 1</Label>
            </div>
            {config.customFieldEnabled1 && (
              <Input value={config.customFieldLabel1} onChange={(e) => set("customFieldLabel1", e.target.value)} placeholder="Label do campo" className="h-8 text-sm bg-secondary border-border" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={config.customFieldEnabled2} onCheckedChange={(v) => set("customFieldEnabled2", v)} />
              <Label className="text-xs text-muted-foreground">Campo 2</Label>
            </div>
            {config.customFieldEnabled2 && (
              <Input value={config.customFieldLabel2} onChange={(e) => set("customFieldLabel2", e.target.value)} placeholder="Label do campo" className="h-8 text-sm bg-secondary border-border" />
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Texto do botão CTA</Label>
            <Input value={config.ctaText} onChange={(e) => set("ctaText", e.target.value)} className="mt-1 h-9 text-sm bg-secondary border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Mensagem de sucesso</Label>
            <Input value={config.successMessage} onChange={(e) => set("successMessage", e.target.value)} className="mt-1 h-9 text-sm bg-secondary border-border" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Padrão de fundo</Label>
          <div className="flex gap-2 mt-1">
            {bgPatterns.map((p) => (
              <button
                key={p.value}
                onClick={() => set("bgPattern", p.value)}
                className={`text-xs px-3 py-1.5 rounded border transition-colors ${config.bgPattern === p.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="surface-card rounded-lg p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Preview</p>
        <div className="rounded-lg overflow-hidden border border-border" style={{ background: config.bgColor }}>
          <div className="p-8 text-center" style={{ color: config.textColor, fontFamily: config.fontFamily }}>
            {config.logoUrl && <img src={config.logoUrl} alt="logo" className="h-10 mx-auto mb-4" />}
            <p className="text-xs font-semibold mb-1" style={{ color: config.accentColor }}>{config.brandName}</p>
            <h3 style={{ fontSize: `${config.headingSize}px`, fontWeight: 800 }}>{config.tagline}</h3>
            <p className="text-sm mt-2 opacity-70">{config.description}</p>
            <button className="mt-6 px-6 py-3 rounded-lg font-semibold text-sm" style={{ background: config.accentColor, color: config.accentTextColor }}>
              {config.ctaText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPageEditor;
