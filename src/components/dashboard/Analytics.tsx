import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
import { Users, DollarSign, TrendingUp, Globe, FileText, FileQuestion, ShoppingCart, Eye, Target } from "lucide-react";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

const Analytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0, totalValue: 0, wonValue: 0, conversionRate: "0",
    totalPages: 0, totalPageViews: 0,
    totalForms: 0, totalFormResponses: 0,
    totalQuizzes: 0, totalQuizResponses: 0,
    totalOrders: 0, totalRevenue: 0,
    totalAppointments: 0,
    stageData: [] as { name: string; count: number; value: number }[],
    statusData: [] as { name: string; value: number }[],
    monthlyData: [] as { month: string; leads: number; value: number }[],
    sourceData: [] as { name: string; value: number }[],
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const [leadsRes, stagesRes, pagesRes, viewsRes, formsRes, formRespRes, quizzesRes, quizRespRes, ordersRes, appointmentsRes] = await Promise.all([
        supabase.from("leads").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("landing_pages").select("id"),
        supabase.from("page_views").select("id"),
        supabase.from("forms").select("id"),
        supabase.from("form_responses").select("id"),
        supabase.from("quizzes").select("id"),
        supabase.from("quiz_responses").select("id"),
        supabase.from("orders").select("total"),
        supabase.from("appointments").select("id"),
      ]);

      const leads = leadsRes.data || [];
      const stages = stagesRes.data || [];
      const totalLeads = leads.length;
      const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
      const wonLeads = leads.filter(l => l.status === "won");
      const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
      const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";

      const totalOrders = ordersRes.data?.length || 0;
      const totalRevenue = (ordersRes.data || []).reduce((s: number, o: any) => s + (o.total || 0), 0);

      const stageData = stages.map(stage => {
        const stageLeads = leads.filter(l => l.stage_id === stage.id);
        return { name: stage.name, count: stageLeads.length, value: stageLeads.reduce((s, l) => s + (l.value || 0), 0) };
      });

      const statusCounts: Record<string, number> = {};
      leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
      const statusLabels: Record<string, string> = { new: "Novo", contacted: "Contatado", qualified: "Qualificado", proposal: "Proposta", won: "Ganho", lost: "Perdido" };
      const statusData = Object.entries(statusCounts).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));

      const sourceCounts: Record<string, number> = {};
      leads.forEach(l => { if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1; });
      const sourceData = Object.entries(sourceCounts).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value).slice(0, 6);

      const monthlyData: { month: string; leads: number; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString("pt-BR", { month: "short" });
        const monthLeads = leads.filter(l => { const ld = new Date(l.created_at); return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear(); });
        monthlyData.push({ month: label, leads: monthLeads.length, value: monthLeads.reduce((s, l) => s + (l.value || 0), 0) });
      }

      setStats({
        totalLeads, totalValue, wonValue, conversionRate,
        totalPages: pagesRes.data?.length || 0, totalPageViews: viewsRes.data?.length || 0,
        totalForms: formsRes.data?.length || 0, totalFormResponses: formRespRes.data?.length || 0,
        totalQuizzes: quizzesRes.data?.length || 0, totalQuizResponses: quizRespRes.data?.length || 0,
        totalOrders, totalRevenue,
        totalAppointments: appointmentsRes.data?.length || 0,
        stageData, statusData, monthlyData, sourceData,
      });
    };
    fetchStats();
  }, [user]);

  const tooltipStyle = { background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400" },
          { label: "Valor Pipeline", value: `R$ ${stats.totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-primary" },
          { label: "Conversão", value: `${stats.conversionRate}%`, icon: Target, color: "text-emerald-400" },
          { label: "Valor Ganho", value: `R$ ${stats.wonValue.toLocaleString("pt-BR")}`, icon: TrendingUp, color: "text-purple-400" },
        ].map((m) => (
          <Card key={m.label} className="surface-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 break-words">{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Pages", value: stats.totalPages, sub: `${stats.totalPageViews} views`, icon: Globe, color: "text-blue-400" },
          { label: "Forms", value: stats.totalForms, sub: `${stats.totalFormResponses} respostas`, icon: FileText, color: "text-primary" },
          { label: "Quiz", value: stats.totalQuizzes, sub: `${stats.totalQuizResponses} respostas`, icon: FileQuestion, color: "text-yellow-400" },
          { label: "Pedidos", value: stats.totalOrders, sub: `R$ ${stats.totalRevenue.toLocaleString("pt-BR")}`, icon: ShoppingCart, color: "text-emerald-400" },
          { label: "Agendamentos", value: stats.totalAppointments, sub: "total", icon: Eye, color: "text-purple-400" },
        ].map((m) => (
          <Card key={m.label} className="surface-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Leads por Etapa</CardTitle></CardHeader>
          <CardContent>
            {stats.stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                  <XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={12} />
                  <YAxis stroke="hsl(0 0% 45%)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Status dos Leads</CardTitle></CardHeader>
          <CardContent>
            {stats.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Tendência Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                <XAxis dataKey="month" stroke="hsl(0 0% 45%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 45%)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="leads" stroke="hsl(84 81% 44%)" fill="hsl(84 81% 44% / 0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Fontes de Leads</CardTitle></CardHeader>
          <CardContent>
            {stats.sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                  <XAxis type="number" stroke="hsl(0 0% 45%)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(0 0% 45%)" fontSize={12} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Adicione fontes aos leads</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
