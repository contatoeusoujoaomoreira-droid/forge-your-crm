import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MousePointerClick, Users, DollarSign, ChevronDown, ChevronRight, Target } from "lucide-react";
import InfoTip from "@/components/InfoTip";
import FunnelAnalytics from "./FunnelAnalytics";
import MetaPixelSettings from "./MetaPixelSettings";

type Period = "today" | "7d" | "30d" | "month" | "all";

interface Touchpoint {
  id: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  landing_url: string | null;
  referrer: string | null;
  channel: string;
  conversion_value: number;
  lead_id: string | null;
  captured_at: string;
}

const periodLabels: Record<Period, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  all: "Tudo",
};

const getPeriodStart = (p: Period): Date | null => {
  const now = new Date();
  if (p === "all") return null;
  if (p === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
  if (p === "7d") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (p === "30d") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
};

const TrackingDashboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [spendByCampaign, setSpendByCampaign] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("attribution_touchpoints")
        .select("*")
        .eq("user_id", user.id)
        .order("captured_at", { ascending: false })
        .limit(2000);
      const start = getPeriodStart(period);
      if (start) q = q.gte("captured_at", start.toISOString());
      const { data } = await q;
      setTouchpoints((data || []) as Touchpoint[]);
      // Load manual spend (stored in localStorage for MVP)
      try {
        const s = JSON.parse(localStorage.getItem(`tracking_spend_${user.id}`) || "{}");
        setSpendByCampaign(s);
      } catch { setSpendByCampaign({}); }
      setLoading(false);
    };
    load();
  }, [user, period]);

  const saveSpend = (campaign: string, value: number) => {
    if (!user) return;
    const next = { ...spendByCampaign, [campaign]: value };
    setSpendByCampaign(next);
    localStorage.setItem(`tracking_spend_${user.id}`, JSON.stringify(next));
  };

  // Aggregate hierarchy: campaign → content → term
  const tree = useMemo(() => {
    const root: Record<string, { campaign: string; total: number; leads: Set<string>; revenue: number; content: Record<string, { content: string; total: number; leads: Set<string>; revenue: number; term: Record<string, { term: string; total: number; leads: Set<string>; revenue: number }> }> }> = {};
    for (const t of touchpoints) {
      const c = t.campaign || "(sem campanha)";
      const ct = t.content || "(sem conjunto)";
      const tm = t.term || "(sem anúncio)";
      if (!root[c]) root[c] = { campaign: c, total: 0, leads: new Set(), revenue: 0, content: {} };
      const cNode = root[c];
      cNode.total++;
      if (t.lead_id) cNode.leads.add(t.lead_id);
      cNode.revenue += Number(t.conversion_value || 0);
      if (!cNode.content[ct]) cNode.content[ct] = { content: ct, total: 0, leads: new Set(), revenue: 0, term: {} };
      const ctNode = cNode.content[ct];
      ctNode.total++;
      if (t.lead_id) ctNode.leads.add(t.lead_id);
      ctNode.revenue += Number(t.conversion_value || 0);
      if (!ctNode.term[tm]) ctNode.term[tm] = { term: tm, total: 0, leads: new Set(), revenue: 0 };
      const tmNode = ctNode.term[tm];
      tmNode.total++;
      if (t.lead_id) tmNode.leads.add(t.lead_id);
      tmNode.revenue += Number(t.conversion_value || 0);
    }
    return Object.values(root).sort((a, b) => b.total - a.total);
  }, [touchpoints]);

  const totals = useMemo(() => {
    const leadIds = new Set(touchpoints.filter(t => t.lead_id).map(t => t.lead_id!));
    const revenue = touchpoints.reduce((s, t) => s + Number(t.conversion_value || 0), 0);
    return {
      touchpoints: touchpoints.length,
      leads: leadIds.size,
      revenue,
      campaigns: new Set(touchpoints.map(t => t.campaign).filter(Boolean)).size,
    };
  }, [touchpoints]);

  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    touchpoints.forEach(t => {
      const k = `${t.source || "direct"} / ${t.medium || "(none)"}`;
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [touchpoints]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Rastreador Inteligente
            <InfoTip title="O que é">
              Rastreia origem (UTM, fbclid, gclid) de cada visita que vira lead, agrupando por campanha → conjunto → anúncio. Use parâmetros UTM nos seus links de anúncio para ver os resultados aqui.
            </InfoTip>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Atribuição via UTM e identificadores de ads. MVP — Meta API oficial vem em fase futura.</p>
        </div>
        <div className="flex gap-1">
          {(Object.keys(periodLabels) as Period[]).map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)} className="text-xs">
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toques", value: totals.touchpoints, icon: MousePointerClick, tip: "Cada visita ou submissão registrada com origem." },
          { label: "Leads atribuídos", value: totals.leads, icon: Users, tip: "Leads únicos com origem identificada." },
          { label: "Campanhas ativas", value: totals.campaigns, icon: Target, tip: "Valores distintos de utm_campaign no período." },
          { label: "Receita atribuída", value: `R$ ${totals.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, icon: DollarSign, tip: "Soma de valores de pedidos vinculados aos touchpoints." },
        ].map((m) => (
          <Card key={m.label} className="surface-card border-border">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {m.label}
                    <InfoTip>{m.tip}</InfoTip>
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
                </div>
                <m.icon className="h-7 w-7 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source/Medium */}
        <Card className="surface-card border-border lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Origem / Mídia
              <InfoTip title="utm_source / utm_medium">
                Ex.: <code>google / cpc</code>, <code>facebook / paid_social</code>, <code>direct / (none)</code>.
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem dados no período</p>
            ) : sourceBreakdown.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate">{k}</span>
                <Badge variant="secondary" className="ml-2">{v}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Hierarchical table */}
        <Card className="surface-card border-border lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Hierarquia Campanha → Conjunto → Anúncio
              <InfoTip title="Como funciona">
                Agrupa por <code>utm_campaign</code> (campanha), <code>utm_content</code> (conjunto) e <code>utm_term</code> (anúncio). Clique para expandir.
              </InfoTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
            ) : tree.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-6 space-y-2">
                <p>Nenhum dado de atribuição ainda.</p>
                <p className="text-[11px]">
                  Adicione UTMs aos seus links, ex:<br />
                  <code className="text-foreground">?utm_source=facebook&utm_medium=cpc&utm_campaign=blackfriday&utm_content=conjunto1&utm_term=criativo_a</code>
                </p>
              </div>
            ) : tree.map((c) => {
              const ckey = `c:${c.campaign}`;
              const open = expanded[ckey];
              const spend = spendByCampaign[c.campaign] || 0;
              const roas = spend > 0 ? (c.revenue / spend) : 0;
              return (
                <div key={c.campaign} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(e => ({ ...e, [ckey]: !open }))}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-secondary/30 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                      <span className="text-xs font-semibold text-foreground truncate">{c.campaign}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
                      <span>{c.total} toques</span>
                      <span>{c.leads.size} leads</span>
                      <span className="text-foreground">R$ {c.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                      {spend > 0 && <Badge variant={roas >= 1 ? "default" : "secondary"} className="text-[10px]">ROAS {roas.toFixed(2)}x</Badge>}
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-border/50 bg-secondary/10 p-2 space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          Gasto (R$)
                          <InfoTip>Informe quanto gastou nessa campanha para calcular ROAS.</InfoTip>
                        </Label>
                        <Input
                          type="number"
                          defaultValue={spend}
                          onBlur={(e) => saveSpend(c.campaign, Number(e.target.value) || 0)}
                          className="h-7 w-28 text-xs"
                        />
                      </div>
                      {Object.values(c.content).sort((a, b) => b.total - a.total).map(ct => {
                        const ctkey = `ct:${c.campaign}:${ct.content}`;
                        const ctopen = expanded[ctkey];
                        return (
                          <div key={ct.content} className="ml-4">
                            <button
                              onClick={() => setExpanded(e => ({ ...e, [ctkey]: !ctopen }))}
                              className="w-full flex items-center justify-between p-1.5 hover:bg-secondary/30 rounded text-left"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {ctopen ? <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                <span className="text-[11px] text-foreground truncate">{ct.content}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{ct.total} • {ct.leads.size}L</span>
                            </button>
                            {ctopen && (
                              <div className="ml-5 space-y-0.5">
                                {Object.values(ct.term).sort((a, b) => b.total - a.total).map(tm => (
                                  <div key={tm.term} className="flex items-center justify-between p-1 text-[10px] text-muted-foreground">
                                    <span className="truncate">↳ {tm.term}</span>
                                    <span>{tm.total} toques • {tm.leads.size} leads</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Como configurar
            <InfoTip>Passo a passo para começar a rastrear suas campanhas.</InfoTip>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong className="text-foreground">1.</strong> Em cada link de anúncio (Meta Ads, Google Ads, etc.), adicione parâmetros UTM:</p>
          <code className="block bg-secondary/40 p-2 rounded text-[10px] text-foreground">
            https://seusite.com/form/contato?utm_source=facebook&utm_medium=cpc&utm_campaign=blackfriday&utm_content=conjunto_video&utm_term=criativo_v1
          </code>
          <p><strong className="text-foreground">2.</strong> Quando alguém preencher o form/checkout, o sistema captura automaticamente origem, conjunto e anúncio.</p>
          <p><strong className="text-foreground">3.</strong> Informe o gasto da campanha aqui para calcular o <strong className="text-foreground">ROAS</strong> (retorno sobre o investimento).</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackingDashboard;
