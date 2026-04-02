/**
 * CRM Clients Module - Gestão de Clientes
 * Dashboard completo com KPIs, filtros e lista de clientes convertidos
 */

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, DollarSign, TrendingUp, Target, Search, Calendar,
  ArrowRight, Building, Mail, Phone, Tag, RefreshCw, Zap
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  value: number;
  revenue_type: string | null;
  monthly_value: number | null;
  contract_months: number | null;
  source: string | null;
  created_at: string;
  tags: string[];
  priority: string | null;
  pipeline_id: string | null;
}

interface DateFilter {
  label: string;
  value: string;
  getRange: () => { start: Date; end: Date };
}

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

const dateFilters: DateFilter[] = [
  {
    label: "Hoje", value: "today",
    getRange: () => {
      const now = new Date();
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
    }
  },
  {
    label: "Esta Semana", value: "week",
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end: new Date() };
    }
  },
  {
    label: "Este Mês", value: "month",
    getRange: () => {
      const now = new Date();
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date() };
    }
  },
  {
    label: "Todos", value: "all",
    getRange: () => ({ start: new Date(2020, 0, 1), end: new Date() })
  },
];

const CRMClients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [revenueFilter, setRevenueFilter] = useState("all");

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "won")
      .order("created_at", { ascending: false });
    
    setClients((data || []).map((l: any) => ({
      ...l,
      tags: Array.isArray(l.tags) ? l.tags : [],
    })));
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const filteredClients = useMemo(() => {
    const filter = dateFilters.find(f => f.value === dateFilter);
    const range = filter?.getRange();
    
    return clients.filter(c => {
      // Date filter
      if (range && dateFilter !== "all") {
        const created = new Date(c.created_at);
        if (created < range.start || created > range.end) return false;
      }
      // Revenue type filter
      if (revenueFilter !== "all" && c.revenue_type !== revenueFilter) return false;
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!c.name.toLowerCase().includes(term) &&
            !c.email?.toLowerCase().includes(term) &&
            !c.company?.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [clients, searchTerm, dateFilter, revenueFilter]);

  // KPIs
  const totalRevenue = filteredClients.reduce((s, c) => s + (c.value || 0), 0);
  const recurringClients = filteredClients.filter(c => c.revenue_type === "recorrente");
  const mrr = recurringClients.reduce((s, c) => s + (c.monthly_value || 0), 0);
  const ltv = filteredClients.length > 0
    ? filteredClients.reduce((s, c) => {
        if (c.revenue_type === "recorrente") return s + (c.monthly_value || 0) * (c.contract_months || 12);
        return s + (c.value || 0);
      }, 0) / filteredClients.length
    : 0;
  const avgTicket = filteredClients.length > 0 ? totalRevenue / filteredClients.length : 0;

  // Charts
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredClients.forEach(c => {
      const src = c.source || "Desconhecido";
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredClients]);

  const revenueTypeData = useMemo(() => [
    { name: "Pagamento Único", value: filteredClients.filter(c => c.revenue_type !== "recorrente").length, color: "#3b82f6" },
    { name: "Recorrente", value: recurringClients.length, color: "#84cc16" },
  ].filter(d => d.value > 0), [filteredClients, recurringClients]);

  if (loading) return <div className="flex items-center justify-center h-32 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Clientes</h2>
          <p className="text-sm text-muted-foreground">Clientes convertidos do seu CRM</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchClients}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar</Button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-2">
        {dateFilters.map(f => (
          <Button key={f.value} variant={dateFilter === f.value ? "default" : "outline"} size="sm"
            onClick={() => setDateFilter(f.value)} className="text-xs">{f.label}</Button>
        ))}
        <div className="ml-4 flex items-center gap-2">
          <Button variant={revenueFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setRevenueFilter("all")} className="text-xs">Todos</Button>
          <Button variant={revenueFilter === "one_time" ? "default" : "outline"} size="sm" onClick={() => setRevenueFilter("one_time")} className="text-xs">Pagamento Único</Button>
          <Button variant={revenueFilter === "recorrente" ? "default" : "outline"} size="sm" onClick={() => setRevenueFilter("recorrente")} className="text-xs">Recorrente</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Clientes", value: filteredClients.length.toString(), icon: Users, color: "text-primary", bgColor: "from-primary/10 to-primary/5", borderColor: "border-primary/20" },
          { label: "Receita Total", value: `R$ ${(totalRevenue / 1000).toFixed(1)}k`, icon: DollarSign, color: "text-emerald-500", bgColor: "from-emerald-500/10 to-emerald-500/5", borderColor: "border-emerald-500/20" },
          { label: "MRR", value: `R$ ${mrr.toLocaleString("pt-BR")}`, icon: RefreshCw, color: "text-blue-500", bgColor: "from-blue-500/10 to-blue-500/5", borderColor: "border-blue-500/20" },
          { label: "LTV Médio", value: `R$ ${ltv.toFixed(0)}`, icon: TrendingUp, color: "text-purple-500", bgColor: "from-purple-500/10 to-purple-500/5", borderColor: "border-purple-500/20" },
          { label: "Ticket Médio", value: `R$ ${avgTicket.toFixed(0)}`, icon: Target, color: "text-orange-500", bgColor: "from-orange-500/10 to-orange-500/5", borderColor: "border-orange-500/20" },
        ].map(kpi => (
          <div key={kpi.label} className={`p-5 rounded-2xl bg-gradient-to-br ${kpi.bgColor} border ${kpi.borderColor} space-y-2`}>
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-secondary/5 border-border">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Origem dos Clientes</h3>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-border">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground mb-4">Tipo de Receita</h3>
            {revenueTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {revenueTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar clientes..." className="pl-10 bg-secondary/30 border-border" />
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente encontrado</p>
          <p className="text-xs mt-1">Leads com status "Ganho" aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(client => (
            <div key={client.id} className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{client.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {client.company && <span className="text-xs text-muted-foreground flex items-center gap-1"><Building className="h-3 w-3" />{client.company}</span>}
                      {client.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">R$ {client.value.toLocaleString("pt-BR")}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      client.revenue_type === "recorrente" 
                        ? "bg-blue-500/20 text-blue-500" 
                        : "bg-emerald-500/20 text-emerald-500"
                    }`}>
                      {client.revenue_type === "recorrente" ? "Recorrente" : "Único"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Origem</p>
                    <p className="text-xs font-bold text-foreground">{client.source || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Conversão</p>
                    <p className="text-xs font-bold text-foreground">{new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </div>
              {client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {client.tags.map(tag => (
                    <span key={tag} className="text-[9px] bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full font-bold">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CRMClients;
