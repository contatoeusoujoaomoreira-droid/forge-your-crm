import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Users, TrendingUp } from "lucide-react";
import { format, subDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  pageId: string;
}

const PageAnalytics = ({ pageId }: Props) => {
  const [stats, setStats] = useState({ total: 0, unique: 0, today: 0 });
  const [utmBreakdown, setUtmBreakdown] = useState<{ source: string; count: number }[]>([]);
  const [dailyViews, setDailyViews] = useState<{ date: string; views: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: views } = await supabase.from("page_views").select("*").eq("page_id", pageId);
      if (!views) return;
      const total = views.length;
      const uniqueVisitors = new Set(views.map((v: any) => v.visitor_id).filter(Boolean)).size;
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const today = views.filter((v: any) => v.created_at.startsWith(todayStr)).length;
      setStats({ total, unique: uniqueVisitors, today });

      const utmMap: Record<string, number> = {};
      views.forEach((v: any) => {
        const src = v.utm_source || "direto";
        utmMap[src] = (utmMap[src] || 0) + 1;
      });
      setUtmBreakdown(Object.entries(utmMap).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count));

      const daily: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) daily[format(subDays(new Date(), i), "MM/dd")] = 0;
      views.forEach((v: any) => {
        const d = format(new Date(v.created_at), "MM/dd");
        if (daily[d] !== undefined) daily[d]++;
      });
      setDailyViews(Object.entries(daily).map(([date, views]) => ({ date, views })));
    };
    fetchData();
  }, [pageId]);

  const statCards = [
    { label: "Total de Acessos", value: stats.total, icon: Eye, color: "text-primary" },
    { label: "Visitantes Únicos", value: stats.unique, icon: Users, color: "text-foreground" },
    { label: "Acessos Hoje", value: stats.today, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="surface-card rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Icon className="h-4 w-4" /> {c.label}
              </div>
              <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card rounded-lg p-4">
        <p className="text-sm font-medium text-foreground mb-4">Acessos por dia (14 dias)</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyViews}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
            <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="surface-card rounded-lg p-4">
        <p className="text-sm font-medium text-foreground mb-4">Fontes de Tráfego (UTM Source)</p>
        {utmBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum acesso registrado</p>
        ) : (
          <div className="space-y-2">
            {utmBreakdown.map((u) => (
              <div key={u.source} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{u.source}</span>
                <span className="text-primary font-semibold">{u.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageAnalytics;
