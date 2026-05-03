/**
 * TeamRadarSettings - configuração global de notificações operacionais
 * Vários telefones, toggles por evento, salvar e testar.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Save, Send, Loader2 } from "lucide-react";

const EVENTS: { id: string; label: string; default: boolean }[] = [
  { id: "appointment_created", label: "📅 Agendamento criado", default: true },
  { id: "appointment_cancelled", label: "❌ Agendamento cancelado", default: true },
  { id: "appointment_reminder", label: "⏰ Lembrete (X min antes do compromisso)", default: true },
  { id: "lead_stage_change", label: "📊 Lead movido de etapa no CRM", default: true },
  { id: "lead_won", label: "🏆 Lead marcado como Ganho/Cliente", default: true },
  { id: "handoff_human", label: "🤝 Humano assumiu a conversa", default: true },
  { id: "order_created", label: "💰 Novo pedido no checkout", default: true },
  { id: "form_submitted", label: "📝 Formulário respondido", default: true },
  { id: "followup_sent", label: "🔁 Follow-up automático disparado", default: false },
  { id: "ai_error", label: "⚠️ Erro de IA / falha de envio", default: true },
];

const buildDefaults = () => Object.fromEntries(EVENTS.map((e) => [e.id, e.default]));

export default function TeamRadarSettings() {
  const { user } = useAuth();
  const [phones, setPhones] = useState<string[]>([""]);
  const [events, setEvents] = useState<Record<string, boolean>>(buildDefaults());
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("team_alerts_config" as any).select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const d: any = data;
        setPhones(Array.isArray(d.phones) && d.phones.length ? d.phones : [""]);
        setEvents({ ...buildDefaults(), ...(d.events || {}) });
        setEnabled(d.is_enabled !== false);
      }
      setLoading(false);
    })();
  }, [user]);

  const setPhone = (i: number, v: string) => setPhones((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addPhone = () => setPhones((p) => [...p, ""]);
  const removePhone = (i: number) => setPhones((p) => (p.length === 1 ? [""] : p.filter((_, idx) => idx !== i)));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const cleanPhones = phones.map((p) => p.replace(/\D/g, "")).filter((p) => p.length >= 10);
    const { error } = await supabase.from("team_alerts_config" as any).upsert({
      user_id: user.id, phones: cleanPhones, events, is_enabled: enabled,
    } as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPhones(cleanPhones.length ? cleanPhones : [""]);
    toast.success("Configurações salvas!");
  };

  const test = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cron-worker", {
        body: { event: "team_alert_test", user_id: user.id, payload: {} },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) toast.success(`✅ ${sent} mensagem(ns) de teste enviada(s)`);
      else toast.warning("Nenhuma mensagem enviada — verifique telefones, evento e conexão WhatsApp ativa.");
    } catch (e: any) {
      toast.error(e.message || "Falha no teste");
    } finally { setTesting(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card className="p-4 space-y-4 border-emerald-500/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold flex items-center gap-2 text-emerald-400">
            <Bell className="h-4 w-4" /> Radar da Equipe — Notificações Operacionais
          </h4>
          <p className="text-xs text-muted-foreground">
            Funciona com qualquer conexão WhatsApp ativa (umClique, Z-API, Evolution, UltraMsg).
            Os telefones abaixo recebem automaticamente os alertas selecionados.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs flex items-center justify-between">
          <span>Números que recebem alertas</span>
          <Badge variant="outline" className="text-[10px]">{phones.filter((p) => p.replace(/\D/g, "").length >= 10).length} ativo(s)</Badge>
        </Label>
        {phones.map((p, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={p}
              onChange={(e) => setPhone(i, e.target.value)}
              placeholder="5511999999999 (com DDI)"
              disabled={!enabled}
            />
            <Button size="icon" variant="ghost" onClick={() => removePhone(i)} disabled={!enabled}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={addPhone} disabled={!enabled}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar número
        </Button>
      </div>

      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs">Quais eventos disparam alerta?</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EVENTS.map((e) => (
            <label
              key={e.id}
              className={`flex items-center justify-between gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                events[e.id] ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/60"
              }`}
            >
              <span>{e.label}</span>
              <Switch
                checked={!!events[e.id]}
                onCheckedChange={(v) => setEvents((prev) => ({ ...prev, [e.id]: v }))}
                disabled={!enabled}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-t pt-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
        <Button variant="outline" onClick={test} disabled={testing || !enabled}>
          {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Testar agora
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground border-t pt-2">
        💡 Os alertas usam a conexão WhatsApp marcada como ativa em "Conexões". Caso nenhuma esteja ativa,
        os alertas ficam em fila silenciosamente.
      </p>
    </Card>
  );
}
