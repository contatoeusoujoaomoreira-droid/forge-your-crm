// Central de Testes CAPI — lead fictício, simulação de arrasto e console realtime
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, TerminalSquare, TestTube2, UserPlus, Trash2 } from "lucide-react";

interface Stage { id: string; name: string; pipeline_id?: string | null; }
interface Pipeline { id: string; name: string; }
interface Lead { id: string; name: string; stage_id: string | null; }

const CapiTestConsole = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testCode, setTestCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [mockLeads, setMockLeads] = useState<Lead[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [creating, setCreating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [cfgRes, pRes, sRes, lRes, logRes] = await Promise.all([
      supabase.from("meta_ads_configs").select("test_event_code").eq("user_id", user.id).maybeSingle(),
      supabase.from("pipelines").select("id, name").eq("user_id", user.id),
      supabase.from("pipeline_stages").select("id, name, pipeline_id").eq("user_id", user.id).order("position"),
      supabase.from("leads").select("id, name, stage_id").eq("user_id", user.id).eq("source", "capi_test").order("created_at", { ascending: false }).limit(20),
      supabase.from("meta_event_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setTestCode((cfgRes.data as any)?.test_event_code || "");
    setPipelines((pRes.data as Pipeline[]) || []);
    setStages((sRes.data as Stage[]) || []);
    setMockLeads((lRes.data as Lead[]) || []);
    setLogs(((logRes.data as any[]) || []).reverse());
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("capi-console")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "meta_event_log", filter: `user_id=eq.${user.id}` },
        (payload) => setLogs(prev => [...prev.slice(-99), payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs.length]);

  const pipelineStages = useMemo(
    () => stages.filter(s => !pipelineId || s.pipeline_id === pipelineId),
    [stages, pipelineId],
  );

  const saveTestCode = async () => {
    if (!user) return;
    setSavingCode(true);
    const { data: existing } = await supabase.from("meta_ads_configs").select("id").eq("user_id", user.id).maybeSingle();
    const payload = { user_id: user.id, test_event_code: testCode || null };
    const { error } = existing
      ? await supabase.from("meta_ads_configs").update(payload as any).eq("user_id", user.id)
      : await supabase.from("meta_ads_configs").insert(payload as any);
    setSavingCode(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Test Event Code salvo" });
  };

  const createMockLead = async () => {
    if (!user) return;
    setCreating(true);
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const targetStage = stageId || pipelineStages[0]?.id || null;
    const { data, error } = await supabase.from("leads").insert({
      user_id: user.id,
      name: `Lead Teste ${rand}`,
      email: `lead.teste${rand}@exemplo.com`,
      phone: `55119${rand}0000`,
      value: 197,
      source: "capi_test",
      stage_id: targetStage,
      position: 0,
    } as any).select("id, name, stage_id").maybeSingle();
    setCreating(false);
    if (error) { toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" }); return; }
    if (data) { setMockLeads(prev => [data as Lead, ...prev]); setLeadId((data as Lead).id); }
    toast({ title: "Lead fictício criado", description: (data as Lead)?.name });
  };

  const deleteMockLeads = async () => {
    if (!user) return;
    await supabase.from("leads").delete().eq("user_id", user.id).eq("source", "capi_test");
    setMockLeads([]); setLeadId("");
    toast({ title: "Leads de teste removidos" });
  };

  const simulateDrag = async () => {
    if (!user || !leadId || !stageId) {
      toast({ title: "Selecione um lead e uma etapa de destino", variant: "destructive" });
      return;
    }
    setSimulating(true);
    await supabase.from("leads").update({ stage_id: stageId } as any).eq("id", leadId);
    const { data, error } = await supabase.functions.invoke("process-meta-capi", {
      body: { user_id: user.id, lead_id: leadId, stage_id: stageId, is_test: true, event_source_url: window.location.href },
    });
    setSimulating(false);
    if (error) { toast({ title: "Falha na simulação", description: error.message, variant: "destructive" }); return; }
    if ((data as any)?.ok) toast({ title: "Evento de teste enviado", description: `HTTP ${(data as any).http_status}` });
    else toast({ title: "Meta retornou erro", description: (data as any)?.error || "Veja o console abaixo", variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-secondary/10 border border-border space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><TestTube2 className="h-4 w-4 text-primary" /> Configuração de teste</h3>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Test Event Code (Meta)</Label>
            <div className="flex gap-2">
              <Input value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="TEST12345" className="h-10 bg-background border-border" />
              <Button onClick={saveTestCode} disabled={savingCode} className="h-10 gap-2 font-bold">
                {savingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Gerenciador de Eventos → Testar eventos → copie o código.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={createMockLead} disabled={creating} className="h-9 gap-2 text-xs border-primary/30 text-primary">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Gerar Lead Fictício
            </Button>
            <Button variant="ghost" size="sm" onClick={deleteMockLeads} className="h-9 gap-2 text-xs text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Limpar testes
            </Button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-secondary/10 border border-border space-y-4">
          <h3 className="text-sm font-bold">Simulador de arrasto</h3>
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Lead de teste</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Selecione o lead fictício" /></SelectTrigger>
                <SelectContent>
                  {mockLeads.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pipeline</Label>
                <Select value={pipelineId} onValueChange={(v) => { setPipelineId(v); setStageId(""); }}>
                  <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Funil" /></SelectTrigger>
                  <SelectContent>
                    {pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Etapa de destino</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger className="h-10 bg-background border-border"><SelectValue placeholder="Etapa" /></SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={simulateDrag} disabled={simulating || !leadId || !stageId} className="h-10 font-bold gap-2">
              {simulating ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : "Simular Arrasto"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-primary" /> Console em tempo real</h3>
          <Badge variant="secondary" className="text-[10px]">{logs.length} eventos</Badge>
        </div>
        <ScrollArea className="h-[380px] bg-[hsl(240_10%_6%)]">
          <div className="p-4 space-y-3 font-mono text-[11px] leading-relaxed">
            {loading && <p className="text-muted-foreground">carregando…</p>}
            {!loading && logs.length === 0 && <p className="text-muted-foreground">$ aguardando eventos…</p>}
            {logs.map((l, i) => (
              <div key={l.id || i} className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
                  <span className={l.status === "sent" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {l.status === "sent" ? `${l.http_status || 200} OK` : `ERRO ${l.http_status || ""}`}
                  </span>
                  <span className="text-primary">{l.event_name}</span>
                  <span className="text-muted-foreground">[{l.source_type}]</span>
                  {l.is_test && <span className="text-yellow-400">test</span>}
                </div>
                {l.error && <p className="text-red-400 whitespace-pre-wrap">{l.error}</p>}
                <pre className="text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(l.payload, null, 2)}</pre>
                {l.response && Object.keys(l.response || {}).length > 0 && (
                  <pre className="text-blue-300 whitespace-pre-wrap break-all">{JSON.stringify(l.response, null, 2)}</pre>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CapiTestConsole;
