// Dialog de configuração do disparo Meta CAPI por etapa do Kanban (Módulo CRM)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Activity, Info, Loader2 } from "lucide-react";

export interface CapiStage {
  id: string;
  name: string;
  capi_event_active?: boolean | null;
  capi_event_name?: string | null;
  capi_event_value?: number | null;
  capi_currency?: string | null;
  send_advanced_emq?: boolean | null;
}

const STANDARD_EVENTS = ["Lead", "Purchase", "AddToCart", "Schedule", "CompleteRegistration", "Contact"];

interface Props {
  stage: CapiStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const StageCapiDialog = ({ stage, open, onOpenChange, onSaved }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(false);
  const [eventMode, setEventMode] = useState<"standard" | "custom">("standard");
  const [eventName, setEventName] = useState("Lead");
  const [customName, setCustomName] = useState("");
  const [valueMode, setValueMode] = useState<"lead" | "fixed">("lead");
  const [fixedValue, setFixedValue] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [emq, setEmq] = useState(true);

  useEffect(() => {
    if (!stage || !open) return;
    setActive(!!stage.capi_event_active);
    const name = stage.capi_event_name || "Lead";
    const isStandard = STANDARD_EVENTS.includes(name);
    setEventMode(isStandard ? "standard" : "custom");
    setEventName(isStandard ? name : "Lead");
    setCustomName(isStandard ? "" : name);
    setValueMode(stage.capi_event_value != null ? "fixed" : "lead");
    setFixedValue(stage.capi_event_value != null ? String(stage.capi_event_value) : "");
    setCurrency(stage.capi_currency || "BRL");
    setEmq(stage.send_advanced_emq !== false);
  }, [stage, open]);

  const save = async () => {
    if (!stage) return;
    const finalName = eventMode === "custom" ? customName.trim() : eventName;
    if (active && !finalName) {
      toast({ title: "Informe o nome do evento", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("pipeline_stages")
      .update({
        capi_event_active: active,
        capi_event_name: finalName || null,
        capi_event_value: valueMode === "fixed" ? parseFloat(fixedValue) || 0 : null,
        capi_currency: currency,
        send_advanced_emq: emq,
      } as any)
      .eq("id", stage.id);
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Integração Meta salva", description: `Etapa "${stage.name}" atualizada.` });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Integração Meta — {stage?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-bold">Disparar evento para o Meta Ads</Label>
              <p className="text-xs text-muted-foreground">Ao mover um lead para esta etapa.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          <div className={active ? "space-y-5" : "space-y-5 opacity-50 pointer-events-none"}>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evento</Label>
              <Select
                value={eventMode === "custom" ? "__custom" : eventName}
                onValueChange={(v) => {
                  if (v === "__custom") { setEventMode("custom"); return; }
                  setEventMode("standard"); setEventName(v);
                }}
              >
                <SelectTrigger className="h-10 bg-secondary/30 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STANDARD_EVENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  <SelectItem value="__custom">Personalizado…</SelectItem>
                </SelectContent>
              </Select>
              {eventMode === "custom" && (
                <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: ReuniaoAgendada" className="h-10 bg-secondary/30 border-border" />
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor do evento</Label>
              <RadioGroup value={valueMode} onValueChange={(v) => setValueMode(v as "lead" | "fixed")} className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border">
                  <RadioGroupItem value="lead" id="capi-value-lead" />
                  <Label htmlFor="capi-value-lead" className="text-sm cursor-pointer">Usar valor preenchido no Lead</Label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border">
                  <RadioGroupItem value="fixed" id="capi-value-fixed" />
                  <Label htmlFor="capi-value-fixed" className="text-sm cursor-pointer">Definir valor fixo para a etapa</Label>
                </div>
              </RadioGroup>
              {valueMode === "fixed" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground">R$</span>
                  <Input type="number" min="0" step="0.01" value={fixedValue} onChange={e => setFixedValue(e.target.value)} placeholder="0,00" className="h-10 bg-secondary/30 border-border" />
                  <Input value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} className="h-10 w-24 bg-secondary/30 border-border" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-bold">Enviar dados avançados (EMQ)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Envia e-mail, telefone e nome com hash SHA-256, além do IP, User-Agent e cookies FBC/FBP quando disponíveis. Aumenta a qualidade da correspondência de eventos (EMQ) no Meta.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch checked={emq} onCheckedChange={setEmq} />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="w-full h-10 font-bold">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</> : "Salvar configuração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StageCapiDialog;
