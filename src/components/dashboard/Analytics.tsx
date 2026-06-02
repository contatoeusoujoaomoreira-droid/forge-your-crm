import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, DollarSign, TrendingUp, Target, MessageCircle, Clock,
  CheckCircle2, XCircle, Calendar as CalendarIcon, ShoppingCart, FileText, FileQuestion,
} from "lucide-react";

const COLORS = ["#84cc16", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "all";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
  { key: "all", label: "Tudo" },
];

const getRange = (period: PeriodKey): { from: Date | null; to: Date | null } => {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  switch (period) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d": {
      const f = new Date(now); f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case "30d": {
      const f = new Date(now); f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
    case "last_month": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from: f, to: t };
    }
    case "all":
    default:
      return { from: null, to: null };
  }
};

const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 };

const Analytics = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const { from, to } = useMemo(() => getRange(period), [period]);

  const [crm, setCrm] = useState({
    totalLeads: 0, newLeads: 0, leadsToday: 0, leadsWeek: 0, leadsMonth: 0,
    wonLeads: 0, lostLeads: 0, activeLeads: 0,
    totalValue: 0, wonValue: 0, weightedValue: 0,
    conversionRate: "0", avgTicket: 0, avgCloseDays: 0,
    stageData: [] as { name: string; count: number; value: number }[],
    statusData: [] as { name: string; value: number }[],
    sourceData: [] as { name: string; value: number }[],
    monthlyData: [] as { month: string; leads: number; value: number }[],
  });

  const [chat, setChat] = useState({
    conversationsStarted: 0,
    conversationsActive: 0,
    conversationsClosed: 0,
    totalMessages: 0,
    avgFirstResponseMin: 0,
    chatToLeadConversion: 0,
  });

  const [extras, setExtras] = useState({
    orders: 0, revenue: 0, forms: 0, formResponses: 0,
    quizzes: 0, quizResponses: 0, appointments: 0,
  });

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      // Leads
      let leadsQ = supabase.from("leads").select("*").eq("user_id", user.id);
      if (from) leadsQ = leadsQ.gte("created_at", from.toISOString());
      if (to) leadsQ = leadsQ.lte("created_at", to.toISOString());
      const [leadsRes, stagesRes] = await Promise.all([
        leadsQ,
        supabase.from("pipeline_stages").select("*").eq("user_id", user.id).order("position"),
      ]);
      const leads = leadsRes.data || [];
      const stages = stagesRes.data || [];

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const totalLeads = leads.length;
      const leadsToday = leads.filter(l => l.created_at >= todayStart).length;
      const leadsWeek = leads.filter(l => new Date(l.created_at) >= weekStart).length;
      const leadsMonth = leads.filter(l => l.created_at >= monthStart).length;
      const wonLeads = leads.filter(l => l.status === "won");
      const lostLeads = leads.filter(l => l.status === "lost");
      const activeLeads = leads.filter(l => !["won", "lost"].includes(l.status)).length;

      const totalValue = leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const wonValue = wonLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const weightedValue = leads.reduce((s, l) => s + (Number(l.value) || 0) * ((Number(l.probability) || 50) / 100), 0);
      const conversionRate = totalLeads > 0 ? ((wonLeads.length / totalLeads) * 100).toFixed(1) : "0";
      const avgTicket = wonLeads.length > 0 ? Math.round(wonValue / wonLeads.length) : 0;

      // Average closing time (won leads)
      const closeDurations = wonLeads
        .map(l => (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime()) / 86_400_000)
        .filter(d => d >= 0);
      const avgCloseDays = closeDurations.length > 0
        ? Math.round(closeDurations.reduce((s, d) => s + d, 0) / closeDurations.length)
        : 0;

      const stageData = stages.map(stage => {
        const sl = leads.filter(l => l.stage_id === stage.id);
        return { name: stage.name, count: sl.length, value: sl.reduce((s, l) => s + (Number(l.value) || 0), 0) };
      });

      const statusLabels: Record<string, string> = {
        new: "Novo", contacted: "Contatado", qualified: "Qualificado",
        proposal: "Proposta", won: "Ganho", lost: "Perdido",
      };
      const statusCounts: Record<string, number> = {};
      leads.forEach(l => { statusCounts[l.status] = (statusCounts[l.status] || 0) + 1; });
      const statusData = Object.entries(statusCounts).map(([k, v]) => ({ name: statusLabels[k] || k, value: v }));

      const sourceCounts: Record<string, number> = {};
      leads.forEach(l => { if (l.source) sourceCounts[l.source] = (sourceCounts[l.source] || 0) + 1; });
      const sourceData = Object.entries(sourceCounts)
        .map(([k, v]) => ({ name: k, value: v }))
        .sort((a, b) => b.value - a.value).slice(0, 6);

      const monthlyData: { month: string; leads: number; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString("pt-BR", { month: "short" });
        const monthLeads = leads.filter(l => {
          const ld = new Date(l.created_at);
          return ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear();
        });
        monthlyData.push({ month: label, leads: monthLeads.length, value: monthLeads.reduce((s, l) => s + (Number(l.value) || 0), 0) });
      }

      setCrm({
        totalLeads, newLeads: leadsToday, leadsToday, leadsWeek, leadsMonth,
        wonLeads: wonLeads.length, lostLeads: lostLeads.length, activeLeads,
        totalValue, wonValue, weightedValue,
        conversionRate, avgTicket, avgCloseDays,
        stageData, statusData, sourceData, monthlyData,
      });

      // Chat
      let msgQ = supabase.from("messages").select("client_id,direction,created_at").eq("user_id", user.id);
      if (from) msgQ = msgQ.gte("created_at", from.toISOString());
      if (to) msgQ = msgQ.lte("created_at", to.toISOString());
      const { data: msgs } = await msgQ.limit(5000);
      const messages = msgs || [];

      const clientIds = new Set(messages.filter(m => m.client_id).map(m => m.client_id));
      const conversationsStarted = clientIds.size;
      const inbound = messages.filter(m => m.direction === "inbound");
      const totalMessages = messages.length;

      // First response time
      const byClient: Record<string, { inbound: number[]; outbound: number[] }> = {};
      messages.forEach(m => {
        if (!m.client_id) return;
        const t = new Date(m.created_at).getTime();
        const bucket = byClient[m.client_id] = byClient[m.client_id] || { inbound: [], outbound: [] };
        if (m.direction === "inbound") bucket.inbound.push(t);
        else bucket.outbound.push(t);
      });
      const responseTimes: number[] = [];
      Object.values(byClient).forEach(({ inbound, outbound }) => {
        if (inbound.length === 0 || outbound.length === 0) return;
        const firstIn = Math.min(...inbound);
        const firstOutAfter = outbound.filter(t => t > firstIn).sort()[0];
        if (firstOutAfter) responseTimes.push((firstOutAfter - firstIn) / 60_000);
      });
      const avgFirstResponseMin = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((s, n) => s + n, 0) / responseTimes.length)
        : 0;

      // Active vs closed (proxy: inbound in last 24h = active)
      const dayAgo = Date.now() - 86_400_000;
      const activeClientIds = new Set(
        inbound.filter(m => new Date(m.created_at).getTime() > dayAgo).map(m => m.client_id)
      );
      const conversationsActive = activeClientIds.size;
      const conversationsClosed = Math.max(0, conversationsStarted - conversationsActive);

      // Conversions originated by chat: leads whose source begins with "chat"/"whatsapp"
      const chatLeads = leads.filter(l => (l.source || "").toLowerCase().match(/chat|whatsapp/));
      const chatToLeadConversion = clientIds.size > 0
        ? Math.round((chatLeads.length / clientIds.size) * 100)
        : 0;

      setChat({
        conversationsStarted, conversationsActive, conversationsClosed,
        totalMessages, avgFirstResponseMin, chatToLeadConversion,
      });

      // Extras (orders + tools) — also period filtered when relevant
      let ordersQ = supabase.from("orders").select("total,created_at");
      if (from) ordersQ = ordersQ.gte("created_at", from.toISOString());
      if (to) ordersQ = ordersQ.lte("created_at", to.toISOString());

      let formRespQ = supabase.from("form_responses").select("id,completed_at");
      if (from) formRespQ = formRespQ.gte("completed_at", from.toISOString());
      if (to) formRespQ = formRespQ.lte("completed_at", to.toISOString());

      const [ordersRes, formsRes, formRespRes, quizzesRes, quizRespRes, appointmentsRes] = await Promise.all([
        ordersQ,
        supabase.from("forms").select("id"),
        formRespQ,
        supabase.from("quizzes").select("id"),
        supabase.from("quiz_responses").select("id"),
        supabase.from("appointments").select("id"),
      ]);
      setExtras({
        orders: ordersRes.data?.length || 0,
        revenue: (ordersRes.data || []).reduce((s: number, o: any) => s + (Number(o.total) || 0), 0),
        forms: formsRes.data?.length || 0,
        formResponses: formRespRes.data?.length || 0,
        quizzes: quizzesRes.data?.length || 0,
        quizResponses: quizRespRes.data?.length || 0,
        appointments: appointmentsRes.data?.length || 0,
      });
    };
    run();
  }, [user, from, to]);

  const fmtMoney = (v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Período:</span>
        {PERIODS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? "default" : "outline"}
            onClick={() => setPeriod(p.key)}
            className="h-8 text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* CRM KPIs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">CRM</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Ativos", value: crm.activeLeads, icon: Target, color: "text-blue-400" },
            { label: "Ganhos", value: crm.wonLeads, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Perdidos", value: crm.lostLeads, icon: XCircle, color: "text-red-400" },
            { label: "Conversão", value: `${crm.conversionRate}%`, icon: TrendingUp, color: "text-primary" },
            { label: "Ticket médio", value: fmtMoney(crm.avgTicket), icon: DollarSign, color: "text-yellow-400" },
            { label: "Fechamento (d)", value: crm.avgCloseDays, icon: Clock, color: "text-purple-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                  <m.icon className={`h-3.5 w-3.5 ${m.color} opacity-70`} />
                </div>
                <p className="text-lg font-bold text-foreground truncate">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="surface-card border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor pipeline</p>
            <p className="text-2xl font-bold mt-1">{fmtMoney(crm.totalValue)}</p>
          </CardContent></Card>
          <Card className="surface-card border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor ponderado</p>
            <p className="text-2xl font-bold mt-1">{fmtMoney(crm.weightedValue)}</p>
          </CardContent></Card>
          <Card className="surface-card border-border"><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor ganho</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400">{fmtMoney(crm.wonValue)}</p>
          </CardContent></Card>
        </div>
      </section>

      {/* Leads KPIs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Leads</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: crm.totalLeads, icon: Users },
            { label: "Hoje", value: crm.leadsToday, icon: CalendarIcon },
            { label: "7 dias", value: crm.leadsWeek, icon: CalendarIcon },
            { label: "Este mês", value: crm.leadsMonth, icon: CalendarIcon },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                  <m.icon className="h-3.5 w-3.5 text-primary opacity-70" />
                </div>
                <p className="text-2xl font-bold text-foreground">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Chat KPIs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Chat</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Iniciadas", value: chat.conversationsStarted, icon: MessageCircle, color: "text-blue-400" },
            { label: "Ativas (24h)", value: chat.conversationsActive, icon: MessageCircle, color: "text-emerald-400" },
            { label: "Encerradas", value: chat.conversationsClosed, icon: MessageCircle, color: "text-muted-foreground" },
            { label: "Mensagens", value: chat.totalMessages, icon: MessageCircle, color: "text-primary" },
            { label: "1ª resposta (min)", value: chat.avgFirstResponseMin || "—", icon: Clock, color: "text-yellow-400" },
            { label: "Conversão chat", value: `${chat.chatToLeadConversion}%`, icon: TrendingUp, color: "text-purple-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                  <m.icon className={`h-3.5 w-3.5 ${m.color} opacity-70`} />
                </div>
                <p className="text-lg font-bold text-foreground truncate">{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Operacional secundário */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Operacional</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Pedidos", value: extras.orders, sub: fmtMoney(extras.revenue), icon: ShoppingCart, color: "text-emerald-400" },
            { label: "Forms", value: extras.forms, sub: `${extras.formResponses} resp.`, icon: FileText, color: "text-primary" },
            { label: "Quiz", value: extras.quizzes, sub: `${extras.quizResponses} resp.`, icon: FileQuestion, color: "text-yellow-400" },
            { label: "Agendamentos", value: extras.appointments, sub: "total", icon: CalendarIcon, color: "text-purple-400" },
            { label: "Receita", value: fmtMoney(extras.revenue), sub: `${extras.orders} pedidos`, icon: DollarSign, color: "text-emerald-400" },
          ].map(m => (
            <Card key={m.label} className="surface-card border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                  <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                </div>
                <p className="text-lg font-bold text-foreground truncate">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Leads por etapa</CardTitle></CardHeader>
          <CardContent>
            {crm.stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={crm.stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados no período</p>}
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Status dos leads</CardTitle></CardHeader>
          <CardContent>
            {crm.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={crm.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {crm.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-sm text-center py-12">Sem dados no período</p>}
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Tendência mensal (6 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={crm.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader><CardTitle className="text-sm font-medium">Fontes de leads</CardTitle></CardHeader>
          <CardContent>
            {crm.sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={crm.sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
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
