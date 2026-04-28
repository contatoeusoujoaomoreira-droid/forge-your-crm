import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, TrendingUp } from "lucide-react";

interface Cost {
  id: string;
  action: string;
  label: string;
  unit: string;
  credits_per_unit: number;
  provider_cost_estimate: number;
  markup_multiplier: number;
  notes: string | null;
}

export default function CreditCostsTab() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("credit_costs").select("*").order("action");
    setCosts((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, field: keyof Cost, value: any) => {
    await supabase.from("credit_costs").update({ [field]: value, updated_at: new Date().toISOString() } as any).eq("id", id);
    setCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } as Cost : c));
  };

  const profit = (c: Cost) => {
    const cost = Number(c.provider_cost_estimate || 0);
    // Assumes 1 crédito = $0.01 (escala configurável). Aqui só comparamos markup.
    if (cost <= 0) return Infinity;
    const charged = Number(c.credits_per_unit) * 0.01;
    return Math.round((charged / cost - 1) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Tabela de custos de créditos</h3>
        <Button size="sm" variant="outline" onClick={load}>Recarregar</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Cada ação consome créditos do usuário com base no custo real do provedor × markup.
        Mantenha o markup ≥ 3x (300% de lucro). Lucro estimado por ação na coluna direita.
      </p>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <div className="surface-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-2">Ação</th>
                <th className="text-left p-2">Unidade</th>
                <th className="text-right p-2">Custo provedor (USD)</th>
                <th className="text-right p-2">Markup</th>
                <th className="text-right p-2">Créditos / unidade</th>
                <th className="text-right p-2">Lucro est.</th>
              </tr>
            </thead>
            <tbody>
              {costs.map(c => {
                const p = profit(c);
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-secondary/20">
                    <td className="p-2">
                      <div className="font-semibold">{c.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{c.action}</div>
                    </td>
                    <td className="p-2 font-mono text-[10px]">{c.unit}</td>
                    <td className="p-2">
                      <Input type="number" step="0.001" value={c.provider_cost_estimate} onChange={(e) => update(c.id, "provider_cost_estimate", Number(e.target.value))} className="h-7 text-xs text-right w-24 ml-auto" />
                    </td>
                    <td className="p-2">
                      <Input type="number" step="0.5" value={c.markup_multiplier} onChange={(e) => update(c.id, "markup_multiplier", Number(e.target.value))} className="h-7 text-xs text-right w-16 ml-auto" />
                    </td>
                    <td className="p-2">
                      <Input type="number" step="0.5" value={c.credits_per_unit} onChange={(e) => update(c.id, "credits_per_unit", Number(e.target.value))} className="h-7 text-xs text-right w-20 ml-auto" />
                    </td>
                    <td className={`p-2 text-right font-bold ${p >= 200 ? "text-primary" : p >= 100 ? "text-amber-500" : "text-destructive"}`}>
                      <TrendingUp className="h-3 w-3 inline mr-1" />{Number.isFinite(p) ? `${p}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground p-3 surface-card rounded-xl">
        💡 Lucro = (créditos × $0.01) ÷ custo do provedor − 1. Ajuste markup ou créditos para garantir &gt;300%.
        Os créditos são debitados automaticamente da carteira do usuário pela função <code>deduct_credits_by_action</code>.
      </div>
    </div>
  );
}
