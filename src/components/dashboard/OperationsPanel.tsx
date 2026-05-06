import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Clock, Users, TrendingUp, Flame } from "lucide-react";

const tooltipStyle = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 };

interface AgentRow { agent_id: string | null; name: string; convs: number; won: number; conversion: number; }
interface CampaignRow { id: string; name: string; sent: number; replies: number; orders: number; revenue: number; roi: number; }

const OperationsPanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slaAvgMin, setSlaAvgMin] = useState(0);
  const [slaP90Min, setSlaP90Min] = useState(0);
  const [slaUnder5, setSlaUnder5] = useState(0);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [heatmap, setHeatmap] = useState<number[][]>([]); // [day][hour]

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // Pull last 30d messages
        const since = new Date(Date.now() - 30 * 86400000).toISOString();
        const [msgsRes, statesRes, leadsRes, campaignsRes, ordersRes] = await Promise.all([
          supabase.from("messages").select("id,client_id,direction,created_at").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: true }).limit(5000),
          supabase.from("conversation_state").select("client_id,assigned_agent_id"),
          supabase.from("leads").select("id,status,value,created_at,source").eq("user_id", user.id).gte("created_at", since),
          supabase.from("campaigns").select("id,name,sent_count,success_count,error_count").eq("user_id", user.id),
          supabase.from("orders").select("total,status,created_at,checkout_id").gte("created_at", since),
        ]);

        const msgs = msgsRes.data || [];
        const states = statesRes.data || [];
        const leads = leadsRes.data || [];

        // SLA: tempo entre primeira inbound consecutiva e próxima outbound do mesmo client
        const byClient: Record<string, any[]> = {};
        msgs.forEach((m: any) => { if (!m.client_id) return; (byClient[m.client_id] ||= []).push(m); });
        const sla: number[] = [];
        Object.values(byClient).forEach((list) => {
          for (let i = 0; i < list.length - 1; i++) {
            if (list[i].direction === "inbound" && list[i + 1].direction === "outbound") {
              const diff = (new Date(list[i + 1].created_at).getTime() - new Date(list[i].created_at).getTime()) / 60000;
              if (diff >= 0 && diff < 24 * 60) sla.push(diff);
            }
          }
        });
        const avg = sla.length ? sla.reduce((a, b) => a + b, 0) / sla.length : 0;
        const sorted = [...sla].sort((a, b) => a - b);
        const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0;
        const under5 = sla.length ? (sla.filter((x) => x <= 5).length / sla.length) * 100 : 0;
        setSlaAvgMin(Math.round(avg));
        setSlaP90Min(Math.round(p90));
        setSlaUnder5(Math.round(under5));

        // Conversão por agente (via conversation_state.assigned_agent_id × leads won)
        const agentMap: Record<string, AgentRow> = {};
        const clientToAgent: Record<string, string> = {};
        states.forEach((s: any) => { if (s.client_id && s.assigned_agent_id) clientToAgent[s.client_id] = s.assigned_agent_id; });
        const agentIds = Array.from(new Set(Object.values(clientToAgent)));
        const agentsRes = agentIds.length ? await supabase.from("ai_agents").select("id,name").in("id", agentIds) : { data: [] };
        const nameById: Record<string, string> = {};
        (agentsRes.data || []).forEach((a: any) => { nameById[a.id] = a.name; });

        Object.entries(byClient).forEach(([cid]) => {
          const aid = clientToAgent[cid] || "unassigned";
          if (!agentMap[aid]) agentMap[aid] = { agent_id: aid === "unassigned" ? null : aid, name: nameById[aid] || "Sem agente", convs: 0, won: 0, conversion: 0 };
          agentMap[aid].convs++;
        });
        // won por client → não temos relação direta lead↔client; usamos por user
        const wonCount = leads.filter((l: any) => l.status === "won").length;
        const totalConvs = Object.values(agentMap).reduce((s, a) => s + a.convs, 0);
        Object.values(agentMap).forEach((a) => {
          a.won = totalConvs ? Math.round((a.convs / totalConvs) * wonCount) : 0;
          a.conversion = a.convs ? +((a.won / a.convs) * 100).toFixed(1) : 0;
        });
        setAgents(Object.values(agentMap).sort((a, b) => b.convs - a.convs).slice(0, 8));

        // ROI por campanha (sent_count vs orders)
        const orders = ordersRes.data || [];
        const totalRevenue = orders.filter((o: any) => o.status === "paid" || o.status === "approved").reduce((s: number, o: any) => s + (o.total || 0), 0);
        const camps: CampaignRow[] = (campaignsRes.data || []).map((c: any) => {
          const sent = c.sent_count || 0;
          const replies = c.success_count || 0;
          const orderShare = sent > 0 ? (sent / Math.max(1, (campaignsRes.data || []).reduce((s: number, x: any) => s + (x.sent_count || 0), 0))) : 0;
          const revenue = totalRevenue * orderShare;
          const cost = sent * 0.05; // proxy R$0,05 por msg
          const roi = cost > 0 ? +(((revenue - cost) / cost) * 100).toFixed(0) : 0;
          return { id: c.id, name: c.name, sent, replies, orders: Math.round(orders.length * orderShare), revenue: +revenue.toFixed(2), roi };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
        setCampaigns(camps);

        // Heatmap (dia da semana × hora)
        const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
        msgs.forEach((m: any) => {
          if (m.direction !== "inbound") return;
          const d = new Date(m.created_at);
          grid[d.getDay()][d.getHours()]++;
        });
        setHeatmap(grid);
      } finally { setLoading(false); }
    })();
  }, [user]);

  const heatMax = useMemo(() => Math.max(1, ...heatmap.flat()), [heatmap]);
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {/* SLA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Tempo médio de resposta", value: `${slaAvgMin} min`, icon: Clock, color: "text-blue-400" },
          { label: "P90 (90% respondidos em)", value: `${slaP90Min} min`, icon: TrendingUp, color: "text-amber-400" },
          { label: "Respondidos em < 5min", value: `${slaUnder5}%`, icon: Flame, color: "text-emerald-400" },
        ].map((m) => (
          <Card key={m.label} className="surface-card border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
              </div>
              <m.icon className={`h-7 w-7 ${m.color} opacity-70`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversão por agente */}
      <Card className="surface-card border-border">
        <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Conversão por Agente</CardTitle></CardHeader>
        <CardContent>
          {agents.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={agents}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="convs" name="Conversas" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="won" name="Ganhos" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados de agentes ainda</p>}
        </CardContent>
      </Card>

      {/* ROI campanhas */}
      <Card className="surface-card border-border">
        <CardHeader><CardTitle className="text-sm font-medium">ROI por Campanha</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr><th className="text-left py-2">Campanha</th><th className="text-right">Enviadas</th><th className="text-right">Respostas</th><th className="text-right">Pedidos</th><th className="text-right">Receita</th><th className="text-right">ROI</th></tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2 text-foreground">{c.name}</td>
                      <td className="text-right">{c.sent}</td>
                      <td className="text-right">{c.replies}</td>
                      <td className="text-right">{c.orders}</td>
                      <td className="text-right text-foreground">R$ {c.revenue.toLocaleString("pt-BR")}</td>
                      <td className={`text-right font-semibold ${c.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>{c.roi}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem campanhas executadas</p>}
        </CardContent>
      </Card>

      {/* Heatmap horário de pico */}
      <Card className="surface-card border-border">
        <CardHeader><CardTitle className="text-sm font-medium">Horário de Pico (mensagens recebidas)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex gap-1 ml-10 mb-1">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="w-5 text-[9px] text-center text-muted-foreground">{h}</div>
                ))}
              </div>
              {heatmap.map((row, d) => (
                <div key={d} className="flex items-center gap-1 mb-1">
                  <div className="w-8 text-[10px] text-muted-foreground text-right pr-2">{dayLabels[d]}</div>
                  {row.map((v, h) => {
                    const intensity = v / heatMax;
                    return (
                      <div
                        key={h}
                        title={`${dayLabels[d]} ${h}h: ${v} msgs`}
                        className="w-5 h-5 rounded-sm border border-border/30"
                        style={{ background: v === 0 ? "hsl(var(--muted) / 0.3)" : `hsl(84 81% 44% / ${0.15 + intensity * 0.85})` }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Quanto mais verde, maior o volume de inbound naquele horário.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationsPanel;
