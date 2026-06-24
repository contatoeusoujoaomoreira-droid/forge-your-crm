import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PixelConfig {
  meta?: {
    pixel_id?: string;
    access_token?: string;
    events?: { PageView?: boolean; Lead?: boolean; InitiateCheckout?: boolean; Custom?: { enabled?: boolean; name?: string } };
  };
  google?: {
    measurement_id?: string;
    api_secret?: string;
    events?: { page_view?: boolean; generate_lead?: boolean; begin_checkout?: boolean };
  };
}

interface Props {
  value: PixelConfig;
  onChange: (v: PixelConfig) => void;
  sourceType: "form" | "quiz";
  sourceId?: string;
  userId?: string;
}

const PixelConfigPanel = ({ value, onChange, sourceType, sourceId, userId }: Props) => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const v = value || {};
  const meta = v.meta || {};
  const google = v.google || {};
  const metaEvents = meta.events || {};
  const googleEvents = google.events || {};
  const custom = metaEvents.Custom || {};

  const upd = (patch: PixelConfig) => onChange({ ...v, ...patch });
  const updMeta = (m: any) => upd({ meta: { ...meta, ...m } });
  const updMetaEvents = (e: any) => updMeta({ events: { ...metaEvents, ...e } });
  const updGoogle = (g: any) => upd({ google: { ...google, ...g } });
  const updGoogleEvents = (e: any) => updGoogle({ events: { ...googleEvents, ...e } });

  const testMeta = async () => {
    if (!meta.pixel_id || !meta.access_token || !userId) { toast({ title: "Configure pixel + token primeiro", variant: "destructive" }); return; }
    setTesting(true);
    try {
      const { data } = await supabase.functions.invoke("meta-capi", {
        body: {
          user_id: userId, source_type: sourceType, source_id: sourceId,
          event_name: "TestEvent", event_id: `test_${Date.now()}`,
          test_event_code: "TEST12345",
          user_data: { email: "test@test.com" },
          event_source_url: window.location.href,
        },
      });
      toast({ title: data?.ok ? "Pixel testado com sucesso!" : "Falhou", description: data?.error || JSON.stringify(data).slice(0, 200) });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const testGoogle = async () => {
    if (!google.measurement_id || !google.api_secret) { toast({ title: "Configure measurement_id + api_secret", variant: "destructive" }); return; }
    setTesting(true);
    try {
      const { data } = await supabase.functions.invoke("google-ga4", {
        body: {
          measurement_id: google.measurement_id, api_secret: google.api_secret,
          event_name: "test_event", client_id: `test_${Date.now()}`,
          source_type: sourceType, source_id: sourceId,
        },
      });
      toast({ title: data?.ok ? "GA4 conectado!" : "Falhou", description: data?.error || JSON.stringify(data).slice(0, 200) });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <div className="surface-card rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📘 Pixel Meta (Facebook)</p>
          <Button size="sm" variant="outline" onClick={testMeta} disabled={testing}>{testing ? "Testando..." : "Testar pixel"}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div><Label className="text-[10px]">Pixel ID</Label><Input value={meta.pixel_id || ""} onChange={e => updMeta({ pixel_id: e.target.value })} className="h-8 text-xs bg-secondary/50 mt-1" /></div>
          <div><Label className="text-[10px]">Access Token (CAPI)</Label><Input type="password" value={meta.access_token || ""} onChange={e => updMeta({ access_token: e.target.value })} className="h-8 text-xs bg-secondary/50 mt-1" /></div>
        </div>
        <div className="space-y-1.5 border-t border-border pt-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Eventos</p>
          {[
            { k: "PageView", label: "PageView ao carregar" },
            { k: "InitiateCheckout", label: "InitiateCheckout ao iniciar" },
            { k: "Lead", label: "Lead ao completar" },
          ].map(ev => (
            <label key={ev.k} className="flex items-center justify-between text-xs"><span>{ev.label}</span><Switch checked={!!(metaEvents as any)[ev.k]} onCheckedChange={c => updMetaEvents({ [ev.k]: c })} /></label>
          ))}
          <div className="flex items-center gap-2">
            <Switch checked={!!custom.enabled} onCheckedChange={c => updMetaEvents({ Custom: { ...custom, enabled: c } })} />
            <Input value={custom.name || ""} onChange={e => updMetaEvents({ Custom: { ...custom, name: e.target.value } })} placeholder="Nome do evento custom" className="h-7 text-xs bg-secondary/50 flex-1" />
          </div>
        </div>
      </div>

      <div className="surface-card rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📊 Google GA4</p>
          <Button size="sm" variant="outline" onClick={testGoogle} disabled={testing}>{testing ? "Testando..." : "Testar conexão"}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div><Label className="text-[10px]">Measurement ID (G-XXXXX)</Label><Input value={google.measurement_id || ""} onChange={e => updGoogle({ measurement_id: e.target.value })} className="h-8 text-xs bg-secondary/50 mt-1" /></div>
          <div><Label className="text-[10px]">API Secret</Label><Input type="password" value={google.api_secret || ""} onChange={e => updGoogle({ api_secret: e.target.value })} className="h-8 text-xs bg-secondary/50 mt-1" /></div>
        </div>
        <div className="space-y-1.5 border-t border-border pt-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Eventos</p>
          {[
            { k: "page_view", label: "page_view ao carregar" },
            { k: "begin_checkout", label: "begin_checkout ao iniciar" },
            { k: "generate_lead", label: "generate_lead ao completar" },
          ].map(ev => (
            <label key={ev.k} className="flex items-center justify-between text-xs"><span>{ev.label}</span><Switch checked={!!(googleEvents as any)[ev.k]} onCheckedChange={c => updGoogleEvents({ [ev.k]: c })} /></label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PixelConfigPanel;
