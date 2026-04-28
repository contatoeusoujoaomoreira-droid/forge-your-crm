import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Activity, Coins, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Props { userId: string | null; }

export default function UserUsageStats({ userId }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase.rpc("user_usage_stats" as any, { _user_id: userId } as any).then(({ data, error }) => {
      setLoading(false);
      if (error) { setStats({ error: error.message }); return; }
      setStats(data);
    });
  }, [userId]);

  if (!userId) return <p className="text-xs text-muted-foreground">Aguardando primeiro login do usuário…</p>;
  if (loading) return <p className="text-xs text-muted-foreground">Carregando estatísticas…</p>;
  if (!stats || stats.error) return <p className="text-xs text-destructive">Erro ao carregar: {stats?.error || "desconhecido"}</p>;

  const byAction: Record<string, number> = stats.by_action || {};
  const top = Object.entries(byAction).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card className="p-2 text-center">
          <Coins className="h-4 w-4 mx-auto text-primary" />
          <div className="text-base font-bold">{stats.credits_consumed || 0}</div>
          <div className="text-[10px] text-muted-foreground">Créditos</div>
        </Card>
        <Card className="p-2 text-center">
          <Users className="h-4 w-4 mx-auto text-primary" />
          <div className="text-base font-bold">{stats.conversations || 0}</div>
          <div className="text-[10px] text-muted-foreground">Conversas</div>
        </Card>
        <Card className="p-2 text-center">
          <MessageCircle className="h-4 w-4 mx-auto text-primary" />
          <div className="text-base font-bold">{stats.total_messages || 0}</div>
          <div className="text-[10px] text-muted-foreground">Mensagens</div>
        </Card>
        <Card className="p-2 text-center">
          <ArrowDownLeft className="h-4 w-4 mx-auto text-primary" />
          <div className="text-base font-bold">{stats.inbound || 0}</div>
          <div className="text-[10px] text-muted-foreground">Recebidas</div>
        </Card>
        <Card className="p-2 text-center">
          <ArrowUpRight className="h-4 w-4 mx-auto text-primary" />
          <div className="text-base font-bold">{stats.outbound || 0}</div>
          <div className="text-[10px] text-muted-foreground">Enviadas</div>
        </Card>
      </div>
      {top.length > 0 && (
        <Card className="p-3">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Ações por categoria
          </p>
          <div className="flex flex-wrap gap-1">
            {top.map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">{k}: {v}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
