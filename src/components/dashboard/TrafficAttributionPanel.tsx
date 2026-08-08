// Painel de atribuição de tráfego: ROAS por origem, top campanhas e saúde da CAPI
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, RefreshCw, Trophy, TrendingUp } from "lucide-react";
import { useTrafficAnalytics } from "@/hooks/useTrafficAnalytics";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const TrafficAttributionPanel = () => {
  const { loading, sources, campaigns, health, reload } = useTrafficAnalytics(30);

  return (
    <div className="space-y-4">
      <Card className="surface-card border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> ROAS por origem (30 dias)
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>
          ) : sources.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum lead com origem registrada nos últimos 30 dias.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Origem</TableHead>
                  <TableHead className="text-xs text-right">Leads</TableHead>
                  <TableHead className="text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-xs text-right">Receita</TableHead>
                  <TableHead className="text-xs text-right">Investido</TableHead>
                  <TableHead className="text-xs text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.slice(0, 10).map((r) => (
                  <TableRow key={r.source}>
                    <TableCell className="text-xs font-medium truncate max-w-[160px]">{r.source}</TableCell>
                    <TableCell className="text-xs text-right">{r.leads}</TableCell>
                    <TableCell className="text-xs text-right">{r.sales}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{brl(r.revenue)}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{r.spend > 0 ? brl(r.spend) : "—"}</TableCell>
                    <TableCell className="text-xs text-right">
                      {r.roas != null ? (
                        <Badge variant={r.roas >= 1 ? "default" : "destructive"}>{r.roas.toFixed(2)}x</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Top 5 campanhas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem campanhas rastreadas ainda.</p>
            ) : campaigns.map((c) => (
              <div key={c.campaign} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-xs font-medium truncate max-w-[45%]">{c.campaign}</span>
                <div className="flex items-center gap-3 text-xs">
                  <Badge variant="secondary">{c.leads} leads</Badge>
                  <span className="font-bold">{brl(c.revenue)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Saúde da CAPI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-lg font-bold">{health.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Eventos</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-lg font-bold text-primary">{health.sent}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Enviados</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-lg font-bold text-destructive">{health.failed}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Falhas</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Taxa de sucesso</span>
              <Badge variant={health.successRate >= 90 ? "default" : "destructive"}>{health.successRate}%</Badge>
            </div>
            {health.lastError && (
              <p className="text-[11px] text-destructive/90 break-words">Último erro: {health.lastError}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrafficAttributionPanel;
