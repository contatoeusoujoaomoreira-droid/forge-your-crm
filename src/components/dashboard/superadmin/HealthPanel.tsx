import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Activity, Database, AlertTriangle, Users, MessageCircle, Coins, TrendingUp, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Snapshot {
  db_size_mb: number;
  connections: number;
  connections_max: number;
  connections_pct: number;
  deadlocks: number;
  rolled_back: number;
  total_users: number;
  active_users_24h: number;
  messages_24h: number;
  inbound_24h: number;
  outbound_24h: number;
  leads_24h: number;
  credits_24h: number;
  top_msgs: Array<{ user_id: string; messages: number; email: string | null }>;
  top_credits: Array<{ user_id: string; credits: number; email: string | null }>;
  recent_alerts: Array<{ id: string; level: string; category: string; title: string; message: string | null; created_at: string; resolved: boolean }>;
  snapshot_at: string;
}

const Kpi = ({ icon: Icon, label, value, tone = "default", hint }: { icon: any; label: string; value: string | number; tone?: "default" | "warn" | "critical" | "good"; hint?: string }) => {
  const toneClass = tone === "critical" ? "text-destructive" : tone === "warn" ? "text-yellow-500" : tone === "good" ? "text-primary" : "text-foreground";
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider mb-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-2xl font-bold ${toneClass}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
};

const HealthPanel = () => {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("platform_health_snapshot" as any);
    if (error) {
      toast({ title: "Erro ao carregar saúde", description: error.message, variant: "destructive" });
    } else if (data && !(data as any).error) {
      setSnap(data as unknown as Snapshot);
    } else if ((data as any)?.error) {
      toast({ title: "Acesso negado", description: "Apenas super admins podem ver a saúde da plataforma.", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const connTone = snap && snap.connections_pct >= 70 ? "critical" : snap && snap.connections_pct >= 50 ? "warn" : "good";
  const diskHint = snap ? `${snap.db_size_mb} MB armazenados` : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Saúde da Plataforma
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {snap ? `Snapshot: ${new Date(snap.snapshot_at).toLocaleString("pt-BR")}` : "Carregando..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {!snap && loading && (
        <div className="text-center py-12"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>
      )}

      {snap && (
        <>
          {/* Infraestrutura */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Database className="h-3 w-3" /> Infraestrutura (Lovable Cloud)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Database} label="Banco de dados" value={`${snap.db_size_mb} MB`} hint="Total armazenado" />
              <Kpi icon={Activity} label="Conexões" value={`${snap.connections}/${snap.connections_max}`} tone={connTone} hint={`${snap.connections_pct}% utilizadas`} />
              <Kpi icon={AlertTriangle} label="Deadlocks (boot)" value={snap.deadlocks} tone={snap.deadlocks > 0 ? "warn" : "good"} hint="Acumulado desde reinício" />
              <Kpi icon={AlertTriangle} label="Transações revertidas" value={snap.rolled_back.toLocaleString("pt-BR")} hint="Acumulado desde reinício" />
            </div>
          </div>

          {/* Atividade 24h */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Atividade (últimas 24h)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi icon={Users} label="Contas ativas" value={snap.active_users_24h} hint={`${snap.total_users} contas totais`} />
              <Kpi icon={MessageCircle} label="Mensagens" value={snap.messages_24h.toLocaleString("pt-BR")} hint={`${snap.inbound_24h} in · ${snap.outbound_24h} out`} />
              <Kpi icon={Users} label="Leads novos" value={snap.leads_24h.toLocaleString("pt-BR")} />
              <Kpi icon={Coins} label="Créditos consumidos" value={snap.credits_24h.toLocaleString("pt-BR")} />
            </div>
          </div>

          {/* Top contas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-card border-border">
              <div className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-primary" /> Top contas por mensagens (24h)
              </div>
              {snap.top_msgs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem atividade no período</p>
              ) : (
                <div className="space-y-2">
                  {snap.top_msgs.map((t, i) => (
                    <div key={t.user_id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1">
                        <span className="text-muted-foreground/60 mr-1">#{i + 1}</span>
                        {t.email || t.user_id.slice(0, 8)}
                      </span>
                      <span className="font-semibold text-foreground">{t.messages.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-primary" /> Top contas por créditos (24h)
              </div>
              {snap.top_credits.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Sem consumo no período</p>
              ) : (
                <div className="space-y-2">
                  {snap.top_credits.map((t, i) => (
                    <div key={t.user_id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate flex-1">
                        <span className="text-muted-foreground/60 mr-1">#{i + 1}</span>
                        {t.email || t.user_id.slice(0, 8)}
                      </span>
                      <span className="font-semibold text-foreground">{t.credits.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Alertas */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3 w-3" /> Alertas recentes (24h)
            </div>
            {snap.recent_alerts.length === 0 ? (
              <div className="surface-card rounded-xl p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2 opacity-70" />
                <p className="text-xs text-muted-foreground">Nenhum alerta no período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {snap.recent_alerts.map(a => (
                  <div key={a.id} className="surface-card rounded-lg p-3 flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${a.level === "critical" ? "bg-destructive" : a.level === "warn" ? "bg-yellow-500" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{a.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">{a.category}</span>
                        {a.resolved && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Resolvido</span>}
                      </div>
                      {a.message && <p className="text-[11px] text-muted-foreground mt-0.5">{a.message}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{new Date(a.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HealthPanel;
