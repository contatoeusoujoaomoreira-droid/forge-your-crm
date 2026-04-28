import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Coins, Check, X } from "lucide-react";

interface Req { id: string; user_id: string; amount: number; message: string | null; status: string; created_at: string; }

export default function CreditRequestsTab({ users }: { users: { user_id: string | null; email: string; full_name: string | null }[] }) {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("credit_requests").select("*").order("created_at", { ascending: false }).limit(100);
    setReqs((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const userName = (uid: string) => {
    const u = users.find(x => x.user_id === uid);
    return u ? (u.full_name || u.email) : uid.slice(0, 8);
  };

  const approve = async (id: string) => {
    const { data, error } = await supabase.rpc("approve_credit_request", { _request_id: id } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Aprovado!", description: `+${(data as any)?.amount || 0} créditos adicionados.` });
    load();
  };

  const reject = async (id: string) => {
    await supabase.from("credit_requests").update({ status: "rejected" } as any).eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2"><Coins className="h-4 w-4 text-primary" /> Solicitações de Créditos</h3>
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
      ) : reqs.length === 0 ? (
        <div className="surface-card rounded-xl p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação</div>
      ) : (
        <div className="space-y-2">
          {reqs.map(r => (
            <div key={r.id} className="surface-card rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{userName(r.user_id)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">+{r.amount} créditos</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    r.status === "pending" ? "bg-amber-500/20 text-amber-500" :
                    r.status === "approved" ? "bg-primary/20 text-primary" :
                    "bg-destructive/20 text-destructive"
                  }`}>{r.status}</span>
                </div>
                {r.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.message}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => approve(r.id)}><Check className="h-3 w-3 mr-1" /> Aprovar</Button>
                  <Button size="sm" variant="ghost" onClick={() => reject(r.id)}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
