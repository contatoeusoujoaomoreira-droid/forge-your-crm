/**
 * CRM Forecast Dashboard - Dashboard de Previsão de Receita
 * Exibe valor real vs valor probabilístico, LTV projetado e análises
 */

import { useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, DollarSign, Zap } from "lucide-react";
import { calculateProjectedLTV } from "@/lib/crm-enhancements";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  stage_id: string | null;
  position: number;
  notes: string | null;
  source: string | null;
  status: string;
  created_at: string;
  tags: string[];
  priority?: string | null;
  urgency?: string | null;
  revenue_type?: string | null;
  monthly_value?: number | null;
  contract_months?: number | null;
  probability?: number | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  website?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
}

interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
  pipeline_id?: string | null;
}

interface CRMForecastDashboardProps {
  leads: Lead[];
  stages: Stage[];
}

const CRMForecastDashboard = ({ leads, stages }: CRMForecastDashboardProps) => {
  // Calcular métricas de previsão
  const forecastData = useMemo(() => {
    const stageAnalysis = stages.map((stage) => {
      const stageLeads = leads.filter((l) => l.stage_id === stage.id);
      const realValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);
      const projectedValue = stageLeads.reduce((sum, l) => sum + calculateProjectedLTV(l), 0);
      const avgProbability = stageLeads.length > 0
        ? stageLeads.reduce((sum, l) => sum + (l.probability || 50), 0) / stageLeads.length
        : 0;

      return {
        name: stage.name,
        realValue,
        projectedValue,
        count: stageLeads.length,
        avgProbability: Math.round(avgProbability),
        color: stage.color || "#84cc16",
      };
    });

    const totalRealValue = stageAnalysis.reduce((sum, s) => sum + s.realValue, 0);
    const totalProjectedValue = stageAnalysis.reduce((sum, s) => sum + s.projectedValue, 0);
    const totalLeads = leads.length;
    const wonLeads = leads.filter((l) => l.status === "won");
    const totalWonValue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);

    // Análise de receita recorrente vs única
    const monthlyRevenueLeads = leads.filter((l) => l.revenue_type === "monthly");
    const monthlyProjectedValue = monthlyRevenueLeads.reduce((sum, l) => sum + calculateProjectedLTV(l), 0);
    const oneTimeRevenueLeads = leads.filter((l) => l.revenue_type !== "monthly");
    const oneTimeProjectedValue = oneTimeRevenueLeads.reduce((sum, l) => sum + calculateProjectedLTV(l), 0);

    // Top leads por LTV
    const topLeads = leads
      .map((l) => ({ ...l, ltv: calculateProjectedLTV(l) }))
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 5);

    return {
      stageAnalysis,
      totalRealValue,
      totalProjectedValue,
      totalLeads,
      wonLeads: wonLeads.length,
      totalWonValue,
      monthlyProjectedValue,
      oneTimeProjectedValue,
      topLeads,
      revenueDistribution: [
        { name: "Receita Recorrente", value: monthlyProjectedValue, fill: "#84cc16" },
        { name: "Receita Única", value: oneTimeProjectedValue, fill: "#3b82f6" },
      ].filter((d) => d.value > 0),
    };
  }, [leads, stages]);

  const conversionRate = forecastData.totalLeads > 0
    ? ((forecastData.wonLeads / forecastData.totalLeads) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(forecastData.totalRealValue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">Em negociação</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Valor Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(forecastData.totalProjectedValue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {forecastData.totalRealValue > 0
                ? `+${(((forecastData.totalProjectedValue - forecastData.totalRealValue) / forecastData.totalRealValue) * 100).toFixed(0)}%`
                : "Baseado em probabilidade"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(forecastData.totalWonValue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {forecastData.wonLeads} leads ({conversionRate}%)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Receita Recorrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(forecastData.monthlyProjectedValue / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground mt-1">/mês projetado</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valor Real vs Projetado por Etapa */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Valor Real vs Projetado por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={forecastData.stageAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(value) => `R$ ${(value as number).toLocaleString("pt-BR")}`}
                />
                <Legend />
                <Bar dataKey="realValue" fill="hsl(var(--primary))" name="Valor Real" radius={[8, 8, 0, 0]} />
                <Bar dataKey="projectedValue" fill="hsl(var(--primary) / 0.5)" name="Valor Projetado" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de Receita */}
        {forecastData.revenueDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold">Distribuição de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={forecastData.revenueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: R$ ${(value / 1000).toFixed(0)}k`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {forecastData.revenueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R$ ${(value as number).toLocaleString("pt-BR")}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Probabilidade Média por Etapa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Probabilidade Média por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={forecastData.stageAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line
                  type="monotone"
                  dataKey="avgProbability"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  name="Probabilidade (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Leads por LTV */}
      {forecastData.topLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Top 5 Leads por LTV Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {forecastData.topLeads.map((lead, index) => (
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company || "Sem empresa"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      R$ {lead.ltv.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">{lead.probability || 50}% prob.</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CRMForecastDashboard;
