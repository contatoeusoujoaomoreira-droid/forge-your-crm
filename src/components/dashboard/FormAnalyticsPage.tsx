import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Users, TrendingUp, Clock, Target, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface Props {
  sourceType: "form" | "quiz";
  sourceId: string;
  sourceTitle: string;
  onBack: () => void;
}

const PIE_COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"];

const FormAnalyticsPage = ({ sourceType, sourceId, sourceTitle, onBack }: Props) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const subTable = sourceType === "form" ? "form_submissions" : "quiz_submissions";
  const sourceFk = sourceType === "form" ? "form_id" : "quiz_id";
  const leadFk = sourceType === "form" ? "source_form_id" : "source_quiz_id";

  useEffect(() => {
    const f = async () => {
      if (!user) return;
      const [{ data: subs }, { data: events }, { data: lds }] = await Promise.all([
        (supabase as any).from(subTable).select("*").eq(sourceFk, sourceId).order("submitted_at", { ascending: false }).limit(2000),
        (supabase as any).from("funnel_events").select("*").eq("source_type", sourceType).eq("source_id", sourceId).order("created_at", { ascending: false }).limit(5000),
        (supabase as any).from("leads").select("*").eq("user_id", user.id).eq(leadFk, sourceId).limit(2000),
      ]);
      setSubmissions(subs || []);
      setFunnel(events || []);
      setLeads(lds || []);
      setLoading(false);
    };
    f();
  }, [user, sourceId]);

  const stats = useMemo(() => {
    const views = funnel.filter(e => e.event_type === "view").length;
    const starts = funnel.filter(e => e.event_type === "start").length;
    const completes = funnel.filter(e => e.event_type === "complete").length;
    const abandons = Math.max(0, starts - completes);
    const conv = views > 0 ? ((completes / views) * 100).toFixed(1) : "0";
    const now = Date.now();
    const today = leads.filter(l => new Date(l.created_at).getTime() > now - 86400000).length;
    const week = leads.filter(l => new Date(l.created_at).getTime() > now - 7 * 86400000).length;
    const month = leads.filter(l => new Date(l.created_at).getTime() > now - 30 * 86400000).length;
    const utmCount: Record<string, number> = {};
    leads.forEach(l => { const k = l.utm_source || "direct"; utmCount[k] = (utmCount[k] || 0) + 1; });
    const topUtm = Object.entries(utmCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    // avg fill time: time between start and complete
    const startMap: Record<string, number> = {};
    const fillTimes: number[] = [];
    funnel.forEach(e => {
      const k = e.session_id || e.user_agent || "";
      if (!k) return;
      if (e.event_type === "start") startMap[k] = new Date(e.created_at).getTime();
      if (e.event_type === "complete" && startMap[k]) {
        fillTimes.push((new Date(e.created_at).getTime() - startMap[k]) / 1000);
      }
    });
    const avgFill = fillTimes.length ? Math.round(fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length) : 0;
    return { views, starts, completes, abandons, conv, today, week, month, topUtm, avgFill, utmCount };
  }, [funnel, leads]);

  const dailyChart = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); days[d.toISOString().slice(0, 10)] = 0; }
    leads.forEach(l => { const k = l.created_at.slice(0, 10); if (k in days) days[k]++; });
    return Object.entries(days).map(([d, v]) => ({ date: d.slice(5), leads: v }));
  }, [leads]);

  const utmChart = useMemo(() => Object.entries(stats.utmCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8), [stats]);

  const deviceChart = useMemo(() => {
    const counts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    submissions.forEach(s => {
      const ua = (s.user_agent || "").toLowerCase();
      if (/tablet|ipad/.test(ua)) counts.tablet++;
      else if (/mobi|android|iphone/.test(ua)) counts.mobile++;
      else counts.desktop++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [submissions]);

  const utmTable = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach(l => { const k = `${l.utm_source || "-"} / ${l.utm_medium || "-"} / ${l.utm_campaign || "-"}`; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  const exportCsv = () => {
    const headers = ["name", "email", "phone", "created_at", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const csv = [headers.join(",")].concat(leads.map(l => headers.map(h => JSON.stringify(l[h] ?? "")).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${sourceTitle}-leads.csv`; a.click();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>;

  const kpis = [
    { label: "Total Leads", value: leads.length, icon: Users, color: "text-blue-400" },
    { label: "Taxa Conversão", value: `${stats.conv}%`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Tempo Médio", value: `${stats.avgFill}s`, icon: Clock, color: "text-purple-400" },
    { label: "Top Origem", value: stats.topUtm, icon: Target, color: "text-orange-400" },
    { label: "Hoje", value: stats.today, icon: Calendar, color: "text-primary" },
    { label: "Semana", value: stats.week, icon: Calendar, color: "text-primary" },
    { label: "Mês", value: stats.month, icon: Calendar, color: "text-primary" },
    { label: "Abandonos", value: stats.abandons, icon: TrendingUp, color: "text-red-400" },
  ];

  const funnelSteps = [
    { label: "Visualizações", value: stats.views },
    { label: "Iniciados", value: stats.starts },
    { label: "Completados", value: stats.completes },
  ];
  const maxFun = Math.max(...funnelSteps.map(s => s.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">📊 Métricas · {sourceTitle}</h2>
          <p className="text-xs text-muted-foreground">Analytics isolado deste {sourceType}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV</Button>
          <Button variant="ghost" size="sm" onClick={onBack}>← Voltar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="surface-card border-border"><CardContent className="p-3"><div className="flex items-center justify-between"><div><p className="text-[10px] text-muted-foreground uppercase">{k.label}</p><p className="text-lg font-bold text-foreground mt-0.5">{k.value}</p></div><k.icon className={`h-6 w-6 ${k.color} opacity-60`} /></div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="surface-card"><CardHeader><CardTitle className="text-sm">Funil de Conversão</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {funnelSteps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-32">{s.label}</span>
                <div className="flex-1 h-7 bg-secondary/30 rounded overflow-hidden">
                  <div className="h-full flex items-center px-2 text-[10px] font-bold text-background" style={{ width: `${(s.value / maxFun) * 100}%`, background: PIE_COLORS[i] }}>{s.value}</div>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Taxa final: {stats.conv}%</p>
          </CardContent>
        </Card>
        <Card className="surface-card"><CardHeader><CardTitle className="text-sm">Leads / dia (30d)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyChart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="date" stroke="hsl(0 0% 45%)" fontSize={10} /><YAxis stroke="hsl(0 0% 45%)" fontSize={10} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)" }} /><Line type="monotone" dataKey="leads" stroke="hsl(84 81% 44%)" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="surface-card"><CardHeader><CardTitle className="text-sm">Leads por UTM Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utmChart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" /><XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={10} /><YAxis stroke="hsl(0 0% 45%)" fontSize={10} /><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)" }} /><Bar dataKey="value" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="surface-card"><CardHeader><CardTitle className="text-sm">Dispositivos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart><Pie data={deviceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>{deviceChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)" }} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card"><CardHeader><CardTitle className="text-sm">Tabela UTM (source / medium / campaign)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {utmTable.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs border-b border-border/50 py-1.5">
                <span className="text-foreground">{k}</span>
                <Badge variant="secondary">{v}</Badge>
              </div>
            ))}
            {utmTable.length === 0 && <p className="text-muted-foreground text-xs text-center py-4">Sem dados</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormAnalyticsPage;
