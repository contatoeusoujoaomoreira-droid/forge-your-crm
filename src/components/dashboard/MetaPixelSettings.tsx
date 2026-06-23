// Meta Pixel + Conversions API settings card with event tester
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, TestTube2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sendConversionsApi, newEventId } from "@/lib/metaPixel";

const MetaPixelSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cfg, setCfg] = useState<any>({ pixel_id: "", capi_access_token: "", test_event_code: "", capi_enabled: false, pixel_enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("meta_ads_configs").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setCfg({ ...cfg, ...data });
    const { data: l } = await supabase.from("meta_event_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15);
    setLogs(l || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      pixel_id: cfg.pixel_id || null,
      capi_access_token: cfg.capi_access_token || null,
      test_event_code: cfg.test_event_code || null,
      capi_enabled: !!cfg.capi_enabled,
      pixel_enabled: !!cfg.pixel_enabled,
    };
    const { data: existing } = await supabase.from("meta_ads_configs").select("id").eq("user_id", user.id).maybeSingle();
    let error;
    if (existing) ({ error } = await supabase.from("meta_ads_configs").update(payload as any).eq("user_id", user.id));
    else ({ error } = await supabase.from("meta_ads_configs").insert(payload as any));
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Configuração salva!" });
    load();
  };

  const sendTest = async () => {
    if (!user) return;
    setTesting(true);
    const r = await sendConversionsApi({
      user_id: user.id, source_type: "manual_test", event_name: "Lead", event_id: newEventId(),
      value: 0, currency: "BRL",
      custom_data: { test: true, content_name: "Manual Test" },
      event_source_url: window.location.href,
    });
    setTesting(false);
    if (r?.ok) toast({ title: "Evento enviado!", description: `HTTP ${r.http_status}` });
    else toast({ title: "Falha no envio", description: r?.error || "Veja o log abaixo", variant: "destructive" });
    load();
  };

  return (
    <Card className="surface-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Meta Ads — Pixel + Conversions API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Carregando…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Pixel ID</Label>
                <Input value={cfg.pixel_id || ""} onChange={e => setCfg({ ...cfg, pixel_id: e.target.value })} placeholder="123456789012345" className="h-9 text-sm bg-secondary/50 border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs">Test Event Code (opcional)</Label>
                <Input value={cfg.test_event_code || ""} onChange={e => setCfg({ ...cfg, test_event_code: e.target.value })} placeholder="TEST12345" className="h-9 text-sm bg-secondary/50 border-border mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Conversions API Access Token</Label>
              <Input type="password" value={cfg.capi_access_token || ""} onChange={e => setCfg({ ...cfg, capi_access_token: e.target.value })} placeholder="EAAxxxxx..." className="h-9 text-sm bg-secondary/50 border-border mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">Gere em: Gerenciador de Eventos → Configurações → Conversions API → Gerar token.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/50">
                <Label className="text-xs">Pixel no navegador</Label>
                <Switch checked={!!cfg.pixel_enabled} onCheckedChange={v => setCfg({ ...cfg, pixel_enabled: v })} />
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border/50">
                <Label className="text-xs">Conversions API (servidor)</Label>
                <Switch checked={!!cfg.capi_enabled} onCheckedChange={v => setCfg({ ...cfg, capi_enabled: v })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving} className="text-xs"><Save className="h-3 w-3 mr-1" /> {saving ? "Salvando…" : "Salvar"}</Button>
              <Button size="sm" variant="outline" onClick={sendTest} disabled={testing || !cfg.capi_enabled || !cfg.pixel_id || !cfg.capi_access_token} className="text-xs"><TestTube2 className="h-3 w-3 mr-1" /> {testing ? "Testando…" : "Testar evento (Lead)"}</Button>
            </div>

            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase">Últimos eventos enviados</p>
              {logs.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Nenhum evento ainda.</p>
              ) : logs.map(l => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/20 border border-border/30 text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    {l.status === "sent" ? <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" /> : <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
                    <span className="font-medium text-foreground truncate">{l.event_name}</span>
                    <Badge variant="secondary" className="text-[9px]">{l.source_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {l.http_status ? <span>HTTP {l.http_status}</span> : null}
                    {l.error ? <span className="text-red-400 truncate max-w-[150px]" title={l.error}>{l.error}</span> : null}
                    <span>{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetaPixelSettings;
