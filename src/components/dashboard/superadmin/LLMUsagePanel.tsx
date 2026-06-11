import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, DollarSign, Activity, AlertOctagon } from "lucide-react";

type Row = { provider: string; model: string; total_tokens: number; cost: number; calls: number };
type Circuit = { provider: string; model: string; state: string; consecutive_failures: number; next_retry_at: string | null; last_error: string | null };

export default function LLMUsagePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [total, setTotal] = useState({ cost: 0, tokens: 0, calls: 0 });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [{ data: usage }, { data: cs }] = await Promise.all([
      supabase.from("llm_usage").select("provider, model, total_tokens, estimated_cost_usd").gte("created_at", since).limit(5000),
      supabase.from("provider_circuit_state").select("*"),
    ]);
    const map = new Map<string, Row>();
    let tc = 0, tt = 0, tn = 0;
    (usage || []).forEach((u: any) => {
      const k = `${u.provider}::${u.model}`;
      const cur = map.get(k) || { provider: u.provider, model: u.model, total_tokens: 0, cost: 0, calls: 0 };
      cur.total_tokens += u.total_tokens || 0;
      cur.cost += Number(u.estimated_cost_usd || 0);
      cur.calls += 1;
      map.set(k, cur);
      tc += Number(u.estimated_cost_usd || 0);
      tt += u.total_tokens || 0;
      tn += 1;
    });
    setRows([...map.values()].sort((a, b) => b.cost - a.cost));
    setCircuits((cs as Circuit[]) || []);
    setTotal({ cost: tc, tokens: tt, calls: tn });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custos IA & Circuit Breakers (7 dias)</h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-2"><DollarSign className="h-3 w-3" /> Custo estimado</div><div className="text-2xl font-bold">${total.cost.toFixed(4)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-2"><Activity className="h-3 w-3" /> Tokens totais</div><div className="text-2xl font-bold">{total.tokens.toLocaleString()}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Chamadas</div><div className="text-2xl font-bold">{total.calls}</div></Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-medium mb-3">Por provedor/modelo</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left p-2">Provedor</th><th className="text-left p-2">Modelo</th><th className="text-right p-2">Chamadas</th><th className="text-right p-2">Tokens</th><th className="text-right p-2">Custo USD</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.provider}-${r.model}`} className="border-t border-border/40">
                  <td className="p-2 font-mono">{r.provider}</td><td className="p-2 font-mono">{r.model}</td>
                  <td className="p-2 text-right">{r.calls}</td><td className="p-2 text-right">{r.total_tokens.toLocaleString()}</td>
                  <td className="p-2 text-right">${r.cost.toFixed(5)}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Sem uso registrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-3"><AlertOctagon className="h-4 w-4 text-destructive" /> Estado dos provedores</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left p-2">Provedor</th><th className="text-left p-2">Modelo</th><th className="text-left p-2">Estado</th><th className="text-left p-2">Falhas seguidas</th><th className="text-left p-2">Próx. tentativa</th><th className="text-left p-2">Último erro</th></tr></thead>
            <tbody>
              {circuits.map((c, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="p-2 font-mono">{c.provider}</td><td className="p-2 font-mono">{c.model}</td>
                  <td className="p-2"><Badge variant={c.state === "open" ? "destructive" : c.state === "half_open" ? "default" : "secondary"}>{c.state}</Badge></td>
                  <td className="p-2">{c.consecutive_failures}</td>
                  <td className="p-2">{c.next_retry_at ? new Date(c.next_retry_at).toLocaleString("pt-BR") : "—"}</td>
                  <td className="p-2 text-destructive max-w-[260px] truncate">{c.last_error || "—"}</td>
                </tr>
              ))}
              {!circuits.length && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Todos os provedores saudáveis.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
