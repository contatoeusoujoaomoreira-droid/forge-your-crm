// Funnel Analytics for forms & quizzes (read funnel_events grouped per source)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Funnel, ArrowDown, FileText, HelpCircle } from "lucide-react";

interface Source { id: string; title: string; type: "form" | "quiz"; }
interface FE { source_id: string; source_type: string; event_type: string; step_index: number | null; session_id: string; utm_source: string | null; }

const FunnelAnalytics = () => {
  const { user } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [events, setEvents] = useState<FE[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [f, q, ev] = await Promise.all([
        supabase.from("forms").select("id,title").eq("user_id", user.id),
        supabase.from("quizzes").select("id,title").eq("user_id", user.id),
        supabase.from("funnel_events").select("source_id,source_type,event_type,step_index,session_id,utm_source").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(20000),
      ]);
      const all: Source[] = [
        ...((f.data || []).map((r: any) => ({ id: r.id, title: r.title, type: "form" as const }))),
        ...((q.data || []).map((r: any) => ({ id: r.id, title: r.title, type: "quiz" as const }))),
      ];
      setSources(all);
      setEvents((ev.data || []) as FE[]);
      if (all.length && !selected) setSelected(`${all[0].type}:${all[0].id}`);
      setLoading(false);
    })();
  }, [user]);

  const activeSource = sources.find(s => `${s.type}:${s.id}` === selected);
  const funnel = useMemo(() => {
    if (!activeSource) return null;
    const list = events.filter(e => e.source_id === activeSource.id && e.source_type === activeSource.type);
    const views = new Set(list.filter(e => e.event_type === "view").map(e => e.session_id)).size;
    const starts = new Set(list.filter(e => e.event_type === "start").map(e => e.session_id)).size;
    const completes = new Set(list.filter(e => e.event_type === "complete").map(e => e.session_id)).size;
    const steps: Record<number, Set<string>> = {};
    list.filter(e => e.event_type === "step" && e.step_index != null).forEach(e => {
      const k = e.step_index!;
      steps[k] = steps[k] || new Set();
      steps[k].add(e.session_id);
    });
    const stepRows = Object.entries(steps).sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => ({ idx: Number(k), count: v.size }));
    // Source breakdown
    const src: Record<string, number> = {};
    new Set(list.filter(e => e.event_type === "view").map(e => e.session_id)).forEach(sid => {
      const ev = list.find(e => e.session_id === sid && e.event_type === "view");
      const k = ev?.utm_source || "(direto)";
      src[k] = (src[k] || 0) + 1;
    });
    return { views, starts, completes, stepRows, src };
  }, [events, activeSource]);

  const totalRow = (label: string, count: number, base?: number) => {
    const pct = base && base > 0 ? Math.round((count / base) * 100) : null;
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
        <span className="text-xs text-foreground font-medium">{label}</span>
        <div className="flex items-center gap-3 text-xs">
          <span className="font-bold text-foreground">{count}</span>
          {pct != null && <Badge variant="secondary" className="text-[10px]">{pct}%</Badge>}
        </div>
      </div>
    );
  };

  return (
    <Card className="surface-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Funnel className="h-4 w-4 text-primary" /> Funil de Conversão (últimos 30 dias)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
        ) : sources.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Crie um formulário ou quiz para começar a rastrear o funil.</p>
        ) : (
          <>
            <select value={selected} onChange={e => setSelected(e.target.value)} className="w-full h-9 text-xs bg-secondary/50 border border-border rounded-md px-3 text-foreground">
              {sources.map(s => (
                <option key={`${s.type}:${s.id}`} value={`${s.type}:${s.id}`}>{s.type === "form" ? "📝" : "❓"} {s.title}</option>
              ))}
            </select>
            {funnel && (
              <>
                <div className="space-y-1.5">
                  {totalRow("Visualizações (page view)", funnel.views)}
                  <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                  {totalRow("Iniciaram", funnel.starts, funnel.views)}
                  {funnel.stepRows.map(s => (
                    <div key={s.idx}>
                      <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                      {totalRow(`Etapa ${s.idx + 1}`, s.count, funnel.starts)}
                    </div>
                  ))}
                  <div className="flex justify-center"><ArrowDown className="h-3 w-3 text-muted-foreground" /></div>
                  {totalRow("Concluíram (lead)", funnel.completes, funnel.views)}
                </div>
                <div className="border-t border-border pt-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase">Mapa de origem dos visitantes</p>
                  {Object.entries(funnel.src).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <Badge variant="secondary">{v}</Badge>
                    </div>
                  ))}
                  {Object.keys(funnel.src).length === 0 && <p className="text-[10px] text-muted-foreground">Nenhuma sessão registrada ainda.</p>}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FunnelAnalytics;
