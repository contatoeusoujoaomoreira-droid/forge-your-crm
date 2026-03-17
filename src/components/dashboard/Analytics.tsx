import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

const Analytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalValue: 0,
    wonValue: 0,
    totalBookings: 0,
    stageData: [] as { name: string; count: number; value: number }[],
    statusData: [] as { name: string; value: number }[],
    monthlyData: [] as { month: string; leads: number; value: number }[],
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      const [leadsRes, stagesRes, bookingsRes] = await Promise.all([
        supabase.from("leads").select("*").eq("user_id", user.id),
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
        supabase.from("bookings").select("id").eq("user_id", user.id),
      ]);

      const leads = leadsRes.data || [];
      const stages = stagesRes.data || [];

      const totalLeads = leads.length;
      const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
      const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + (l.value || 0), 0);
      const totalBookings = bookingsRes.data?.length || 0;

      const stageData = stages.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage_id === stage.id);
        return {
          name: stage.name,
          count: stageLeads.length,
          value: stageLeads.reduce((s, l) => s + (l.value || 0), 0),
        };
      });

      const statusCounts: Record<string, number> = {};
      leads.forEach((l) => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
      });
      const statusLabels: Record<string, string> = {
        new: "Novo", contacted: "Contatado", qualified: "Qualificado",
        proposal: "Proposta", won: "Ganho", lost: "Perdido",
      };
      const statusData = Object.entries(statusCounts).map(([k, v]) => ({
        name: statusLabels[k] || k,
        value: v,
      }));

      // Monthly data (last 6 months)
      const monthlyData: { month: string; leads: number; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString("pt-BR", { month: "short" });
        const monthLeads = leads.filter((l) => {
          const ld = new Date(l.created_at);
          return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
        });
        monthlyData.push({
          month: label,
          leads: monthLeads.length,
          value: monthLeads.reduce((s, l) => s + (l.value || 0), 0),
        });
      }

      setStats({ totalLeads, totalValue, wonValue, totalBookings, stageData, statusData, monthlyData });
    };

    fetchStats();
  }, [user]);

  const metricCards = [
    { label: "Total de Leads", value: stats.totalLeads, icon: Users, color: "text-blue-400" },
    { label: "Valor Total", value: `R$ ${stats.totalValue.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-lime" },
    { label: "Valor Ganho", value: `R$ ${stats.wonValue.toLocaleString("pt-BR")}`, icon: TrendingUp, color: "text-emerald-400" },
    { label: "Reservas", value: stats.totalBookings, icon: Calendar, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m) => (
          <Card key={m.label} className="surface-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
                </div>
                <m.icon className={`h-8 w-8 ${m.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by stage */}
        <Card className="surface-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Leads por Estágio</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                  <XAxis dataKey="name" stroke="hsl(0 0% 45%)" fontSize={12} />
                  <YAxis stroke="hsl(0 0% 45%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(0 0% 95%)" }}
                  />
                  <Bar dataKey="count" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card className="surface-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={stats.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {stats.statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-12">Sem dados ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly trend */}
        <Card className="surface-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-foreground">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 12%)" />
                <XAxis dataKey="month" stroke="hsl(0 0% 45%)" fontSize={12} />
                <YAxis stroke="hsl(0 0% 45%)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 4%)", border: "1px solid hsl(0 0% 12%)", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(0 0% 95%)" }}
                />
                <Line type="monotone" dataKey="leads" stroke="hsl(84 81% 44%)" strokeWidth={2} dot={{ fill: "hsl(84 81% 44%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
