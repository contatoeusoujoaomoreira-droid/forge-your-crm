import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, TrendingUp, DollarSign, Target, 
  Calendar, Search, Filter, Download,
  ArrowUpRight, ArrowDownRight, Briefcase,
  Globe, User, Phone, Mail, Clock
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, Legend
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  status: string;
  created_at: string;
  revenue_type: string | null;
  monthly_value: number | null;
  contract_months: number | null;
  source: string | null;
  utm_source: string | null;
  updated_at: string;
}

const CRMClientManagement = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  useEffect(() => {
    const fetchClients = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "won")
        .order("updated_at", { ascending: false });
      
      if (data) setLeads(data as Lead[]);
      setLoading(false);
    };

    fetchClients();
  }, [user]);

  const filteredClients = useMemo(() => {
    return leads.filter(client => {
      const clientDate = parseISO(client.updated_at || client.created_at);
      const isWithinDate = isWithinInterval(clientDate, {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end)
      });

      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase());

      return isWithinDate && matchesSearch;
    });
  }, [leads, searchTerm, dateRange]);

  const stats = useMemo(() => {
    const totalClients = filteredClients.length;
    const totalValue = filteredClients.reduce((sum, c) => sum + (c.value || 0), 0);
    const recurringValue = filteredClients
      .filter(c => c.revenue_type === "monthly")
      .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    
    const avgTicket = totalClients > 0 ? totalValue / totalClients : 0;

    // Agrupar por origem
    const sourceMap: Record<string, number> = {};
    filteredClients.forEach(c => {
      const src = c.source || c.utm_source || "Direto/Outros";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sourceData = Object.entries(sourceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Agrupar por mês de conversão
    const monthlyMap: Record<string, number> = {};
    filteredClients.forEach(c => {
      const month = format(parseISO(c.updated_at || c.created_at), "MMM/yy", { locale: ptBR });
      monthlyMap[month] = (monthlyMap[month] || 0) + (c.value || 0);
    });
    const monthlyData = Object.entries(monthlyMap).map(([name, value]) => ({ name, value }));

    return {
      totalClients,
      totalValue,
      recurringValue,
      avgTicket,
      sourceData,
      monthlyData
    };
  }, [filteredClients]);

  if (loading) return <div className="p-8 text-center">Carregando gestão de clientes...</div>;

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Clientes</h2>
          <p className="text-sm text-muted-foreground">Acompanhe seus resultados e base de clientes ativos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border">
            <Input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="h-8 w-36 bg-transparent border-none text-xs focus-visible:ring-0"
            />
            <span className="text-muted-foreground text-xs">até</span>
            <Input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="h-8 w-36 bg-transparent border-none text-xs focus-visible:ring-0"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-64 bg-secondary/30 border-border"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10"><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalClients}</div>
            <div className="flex items-center gap-1 mt-1 text-green-500 text-xs font-bold">
              <ArrowUpRight className="h-3 w-3" /> +12% este mês
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" /> Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              R$ {stats.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Valor acumulado no período</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> MRR (Recorrente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              R$ {stats.recurringValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Receita mensal recorrente</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" /> Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              R$ {stats.avgTicket.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Por cliente convertido</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Evolução de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }}
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Origem dos Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.sourceData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {stats.sourceData.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-xs font-medium text-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {((item.value / stats.totalClients) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card className="bg-card border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-secondary/10">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" /> Lista de Clientes Ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Empresa</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conversão</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{client.name}</p>
                          <p className="text-[10px] text-muted-foreground">{client.email || "Sem e-mail"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-foreground">{client.company || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                        client.revenue_type === "monthly" 
                          ? "text-blue-500 bg-blue-500/10 border-blue-500/20" 
                          : "text-orange-500 bg-orange-500/10 border-orange-500/20"
                      }`}>
                        {client.revenue_type === "monthly" ? "RECORRENTE" : "ÚNICO"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-foreground">
                        R$ {(client.revenue_type === "monthly" ? client.monthly_value : client.value)?.toLocaleString("pt-BR")}
                      </p>
                      {client.revenue_type === "monthly" && (
                        <p className="text-[10px] text-muted-foreground">{client.contract_months} meses</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(client.updated_at || client.created_at), "dd/MM/yyyy")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Mail className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhum cliente encontrado no período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMClientManagement;
