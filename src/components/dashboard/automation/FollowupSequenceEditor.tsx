import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, Wand2 } from "lucide-react";

type Step = { day: number; hours: number; message: string };

const DEFAULT_STEPS: Step[] = [
  { day: 0, hours: 2, message: "Oi! Vi que você estava interessado e queria saber se posso te ajudar com mais alguma informação. 😊" },
  { day: 1, hours: 24, message: "Olá! Passando para saber se você teve tempo de pensar sobre o que conversamos." },
  { day: 2, hours: 48, message: "Oi de novo! Não quero ser insistente, mas queria garantir que você tenha todas as informações." },
  { day: 3, hours: 72, message: "Olá! Tenho uma condição especial que pode te interessar. Posso te enviar?" },
  { day: 5, hours: 120, message: "Oi! Sei que você está ocupado, mas separei alguns minutos pra te enviar uma proposta personalizada." },
  { day: 7, hours: 168, message: "Oi! Já faz uma semana e não quero perder contato. Você ainda tem interesse no assunto?" },
  { day: 10, hours: 240, message: "Olá! Esse vai ser meu último contato sobre isso. Se quiser conversar a qualquer momento, é só me chamar. 👋" },
];

export const FollowupSequenceEditor = () => {
  const [steps, setSteps] = useState<Step[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("followup_global_templates" as any)
        .select("steps, enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const tplSteps = ((data as any).steps || []) as Step[];
        setSteps(tplSteps.length ? tplSteps : DEFAULT_STEPS);
        setEnabled((data as any).enabled !== false);
      } else {
        setSteps(DEFAULT_STEPS);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("followup_global_templates" as any)
      .upsert({ user_id: user.id, steps: steps as any, enabled }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else toast({ title: "Sequência salva", description: `${steps.length} passos ativos.` });
  };

  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const addStep = () => setSteps((s) => [...s, { day: (s[s.length - 1]?.day || 0) + 1, hours: ((s[s.length - 1]?.hours || 0) + 24), message: "" }]);
  const removeStep = (i: number) => setSteps((s) => s.filter((_, idx) => idx !== i));
  const resetDefaults = () => setSteps(DEFAULT_STEPS);

  if (loading) return <div className="text-sm text-muted-foreground">Carregando sequência…</div>;

  return (
    <Card className="bg-muted/30 border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Sequência de Follow-up D0 → D10
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="fu-enabled" className="text-xs">Ativa</Label>
          <Switch id="fu-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Sequência global aplicada a todos os agentes com follow-up ativado e <code className="text-[10px]">followup_use_global = true</code>.
          Variáveis: <code>{"{{nome}}"}</code>. O sistema para automaticamente quando o lead responde.
        </p>

        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/15 text-primary">D{step.day}</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    value={step.hours}
                    onChange={(e) => updateStep(i, { hours: Number(e.target.value) || 1 })}
                    className="h-7 w-20 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">horas após última interação</span>
                </div>
                <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => removeStep(i)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea
                value={step.message}
                onChange={(e) => updateStep(i, { message: e.target.value })}
                placeholder="Mensagem que será enviada nesse passo…"
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="h-4 w-4 mr-1" /> Passo
          </Button>
          <Button size="sm" variant="ghost" onClick={resetDefaults}>
            <Wand2 className="h-4 w-4 mr-1" /> Padrão D0–D10
          </Button>
          <Button size="sm" className="ml-auto" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar sequência"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
