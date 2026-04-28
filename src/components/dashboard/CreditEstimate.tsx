import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: string;            // e.g. "page_generate"
  quantity?: number;         // default 1
  label?: string;            // friendly label
  onConfirm: () => void;
}

/**
 * Pre-action credit cost preview. Reads credit_costs table to estimate the
 * charge before performing an AI action, so users always know what it costs.
 */
export default function CreditEstimate({ open, onOpenChange, action, quantity = 1, label, onConfirm }: Props) {
  const [cost, setCost] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data: c }, { data: u }] = await Promise.all([
        supabase.from("credit_costs").select("credits_per_unit,label").eq("action", action).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      const perUnit = Number(c?.credits_per_unit ?? 1);
      setCost(Math.max(1, Math.ceil(perUnit * quantity)));
      if (u?.user?.id) {
        const { data: p } = await supabase.from("profiles").select("credits_balance").eq("user_id", u.user.id).maybeSingle();
        setBalance(p?.credits_balance ?? 0);
      }
      setLoading(false);
    })();
  }, [open, action, quantity]);

  const insufficient = balance !== null && cost !== null && balance < cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> Confirmação de créditos
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Calculando custo…</p>
        ) : (
          <div className="space-y-3">
            <div className="surface-card rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ação</span>
                <span className="font-medium">{label || action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo estimado</span>
                <span className="font-bold text-primary">{cost} créditos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seu saldo</span>
                <span className={`font-medium ${insufficient ? "text-destructive" : "text-foreground"}`}>{balance ?? "—"}</span>
              </div>
            </div>
            {insufficient && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Saldo insuficiente. Solicite mais créditos no header (ícone +).
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={loading || insufficient} onClick={() => { onOpenChange(false); onConfirm(); }}>
            Confirmar e usar {cost ?? "?"} créditos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
